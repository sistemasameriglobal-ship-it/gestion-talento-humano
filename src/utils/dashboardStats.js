import { hoyISO, sumarDiasISO, mesActualISO, mesRelativoISO } from './fecha'
import { obtenerFechaRegresoLaboral, evaluarEstadoTemporalAusencia, diasHabilesEntre } from './diasHabiles'
import { normalizarConcepto, CONCEPTO_COLORS } from './parseExcel'
import { MESES_DASHBOARD as MESES } from './dashboardConstants'

// Calcula los días de una novedad que caen ESTRICTAMENTE dentro del período filtrado
// (prorratea incapacidades, vacaciones y ausencias que cruzan de un mes a otro).
export function calcularDiasEnPeriodo(r, periodoIni, periodoFin) {
  const diasOriginales = parseFloat(r?.total_dias) || 0
  if (diasOriginales === 0) return 0
  if (Number(r?.total_dias) === 0.5 || r?.jornada === 'Medio día') {
    if (!periodoIni || !periodoFin) return 0.5
    const fIni = r?.fecha_inicio
    return (fIni && fIni >= periodoIni && fIni <= periodoFin) ? 0.5 : 0
  }
  if (!periodoIni || !periodoFin || !r?.fecha_inicio) return diasOriginales

  const fIni = r.fecha_inicio
  let fFin = r.fecha_fin
  if (!fFin && diasOriginales > 1) {
    const dIni = new Date(fIni + 'T12:00:00')
    dIni.setDate(dIni.getDate() + (Math.round(diasOriginales) - 1))
    const y = dIni.getFullYear()
    const m = String(dIni.getMonth() + 1).padStart(2, '0')
    const d = String(dIni.getDate()).padStart(2, '0')
    fFin = `${y}-${m}-${d}`
  } else if (!fFin) {
    fFin = fIni
  }

  // Si no hay solapamiento con el período filtrado
  if (fFin < periodoIni || fIni > periodoFin) return 0

  // Fechas de inicio y fin recortadas a los límites del período
  const overlapIni = fIni < periodoIni ? periodoIni : fIni
  const overlapFin = fFin > periodoFin ? periodoFin : fFin

  const conceptoNorm = normalizarConcepto(r?.concepto)
  if (conceptoNorm === 'Vacaciones') {
    const habiles = diasHabilesEntre(overlapIni, overlapFin)
    const dias = typeof habiles === 'number' ? habiles : (Math.round((new Date(overlapFin + 'T12:00:00').getTime() - new Date(overlapIni + 'T12:00:00').getTime()) / 86400000) + 1)
    return Math.min(Math.max(1, dias), diasOriginales)
  }

  const diffMs = new Date(overlapFin + 'T12:00:00').getTime() - new Date(overlapIni + 'T12:00:00').getTime()
  const diasCalculados = Math.max(1, Math.round(diffMs / 86400000) + 1)
  return Math.min(diasCalculados, diasOriginales)
}

// Filtra las novedades con los mismos criterios del Dashboard.
// Permite que novedades que iniciaron en un mes previo pero cruzan al mes filtrado
// sean incluidas correctamente, considerando el solapamiento de fechas.
export function filtrarNovedades(allData, {
  filterPeriodo, filterConcepto, filterDependencia, filterAnio, filterMeses, rangoMes,
  periodoIni, periodoFin,
  incluirConcepto = true,
}) {
  return allData.filter(r => {
    if (incluirConcepto && filterConcepto && normalizarConcepto(r.concepto) !== filterConcepto) return false
    if (filterDependencia && (r.dependencia || 'Sin área') !== filterDependencia) return false

    // Si tenemos rango exacto de fechas (por mes(es) seleccionados)
    if (rangoMes || (periodoIni && periodoFin)) {
      const ini = rangoMes?.ini || periodoIni
      const fin = rangoMes?.fin || periodoFin
      if (r.fecha_inicio) {
        let fFin = r.fecha_fin
        const totalDias = parseFloat(r.total_dias) || 0
        if (!fFin && totalDias > 1) {
          const dIni = new Date(r.fecha_inicio + 'T12:00:00')
          dIni.setDate(dIni.getDate() + (Math.round(totalDias) - 1))
          const y = dIni.getFullYear()
          const m = String(dIni.getMonth() + 1).padStart(2, '0')
          const d = String(dIni.getDate()).padStart(2, '0')
          fFin = `${y}-${m}-${d}`
        } else if (!fFin) {
          fFin = r.fecha_inicio
        }
        // Solapamiento: fin de la novedad >= inicio del periodo Y inicio de la novedad <= fin del periodo
        return fFin >= ini && r.fecha_inicio <= fin
      }
      // Si no tiene fecha_inicio, fallback por periodo texto
      if (r.periodo) {
        return r.periodo >= ini.substring(0, 7) && r.periodo <= fin.substring(0, 7)
      }
      return false
    }

    if (filterPeriodo) {
      if (r.periodo === filterPeriodo) return true
      const match = filterPeriodo.match(/^(\d{4})-(\d{1,2})$/)
      if (match && r.fecha_inicio) {
        const y = parseInt(match[1]), mo = parseInt(match[2])
        const lastDay = new Date(y, mo, 0).getDate()
        const ini = `${y}-${String(mo).padStart(2, '0')}-01`
        const fin = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        const fFin = r.fecha_fin || r.fecha_inicio
        return fFin >= ini && r.fecha_inicio <= fin
      }
      return false
    }

    if (filterAnio && filterMeses?.length === 0) {
      const ini = `${filterAnio}-01-01`
      const fin = `${filterAnio}-12-31`
      if (r.fecha_inicio) {
        const fFin = r.fecha_fin || r.fecha_inicio
        return fFin >= ini && r.fecha_inicio <= fin
      }
      return r.periodo?.startsWith(filterAnio)
    }

    return true
  })
}

// Días calendario REALES del período que está filtrado (respeta meses de
// 28/29/30/31 días y años bisiestos). Devuelve además una etiqueta legible y
// el rango de fechas del período, usados por el denominador de la tasa de
// ausentismo y por el filtro de colaboradores activos.
export function calcularDiasPeriodo({ rangoMes, filterAnio, filterMeses, filterPeriodo, dataBase }) {
  const ahora = new Date()
  // Se usa la fecha calendario de HOY a medianoche (sin la hora actual), para
  // no mezclar "un instante con hora" contra fechas que son solo calendario
  // (fecha_inicio no tiene hora). Si no se hace así, la diferencia de horas
  // por zona horaria puede sumar un día de más al redondear.
  const hoyUTCMidnight = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const nombreMes = (mo) => MESES.find(x => parseInt(x.val) === mo)?.label || mo
  if (rangoMes) {
    const y = parseInt(filterAnio)
    const dias = Math.round((new Date(rangoMes.fin).getTime() - new Date(rangoMes.ini).getTime()) / 86400000) + 1
    const label = filterMeses.length === 1
      ? `mes completo de ${nombreMes(parseInt(filterMeses[0]))} ${y} (${dias} días)`
      : `de ${nombreMes(parseInt(filterMeses[0]))} a ${nombreMes(parseInt(filterMeses[filterMeses.length - 1]))} ${y} (${dias} días)`
    return { diasPeriodoBase: dias, diasPeriodoLabel: label, periodoIni: rangoMes.ini, periodoFin: rangoMes.fin }
  }
  if (filterPeriodo) {
    const match = filterPeriodo.match(/^(\d{4})-(\d{1,2})$/)
    if (match) {
      const y = parseInt(match[1]), mo = parseInt(match[2])
      const dias = new Date(y, mo, 0).getDate()
      const ini = `${y}-${String(mo).padStart(2, '0')}-01`
      const fin = `${y}-${String(mo).padStart(2, '0')}-${String(dias).padStart(2, '0')}`
      return { diasPeriodoBase: dias, diasPeriodoLabel: `mes completo de ${nombreMes(mo)} ${y} (${dias} días)`, periodoIni: ini, periodoFin: fin }
    }
  }
  if (filterAnio && filterMeses.length === 0) {
    const y = parseInt(filterAnio)
    const dias = ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365
    return { diasPeriodoBase: dias, diasPeriodoLabel: `año completo ${y} (${dias} días)`, periodoIni: `${y}-01-01`, periodoFin: `${y}-12-31` }
  }
  const conFecha = dataBase.filter(r => r.fecha_inicio)
  if (!conFecha.length) return { diasPeriodoBase: 30, diasPeriodoLabel: 'sin novedades con fecha (30 días por defecto)', periodoIni: null, periodoFin: hoyISO() }
  const minFecha = conFecha.reduce((min, r) => (r.fecha_inicio < min ? r.fecha_inicio : min), conFecha[0].fecha_inicio)
  const dias = Math.max(1, Math.round((hoyUTCMidnight - new Date(minFecha).getTime()) / 86400000) + 1)
  return { diasPeriodoBase: dias, diasPeriodoLabel: `desde ${minFecha} hasta hoy (${dias} días)`, periodoIni: minFecha, periodoFin: hoyISO() }
}

// ── Estadísticas derivadas del Dashboard ─────────────────────────────────────
export function calcularStats(data, allData, diasPeriodoBase, diasPeriodoLabel, empleadosActivosPeriodo, rangoPeriodo = {}) {
  const { periodoIni, periodoFin } = rangoPeriodo
  const total = data.length
  const empleadosUnicos = new Set(data.map(r => (r.nombre_empleado || '').trim()).filter(Boolean)).size
  // Denominador de la tasa de ausentismo: colaboradores realmente activos en
  // el período (tabla `empleados`, cruzando fecha_ingreso/fecha_retiro), no
  // solo quienes tienen novedades registradas. No cambia según filterConcepto.
  const empleadosUnicosBase = empleadosActivosPeriodo.length

  const CONCEPTOS_PRIORITARIOS = ['Incapacidad', 'LNR', 'LR', 'Ausente', 'Vacaciones']

  // Conceptos que representan una ausencia real del puesto de trabajo — se
  // usan para la tasa de ausentismo global.
  const CONCEPTOS_AUSENTISMO = [
    'Incapacidad', 'LNR', 'LR', '1/2 LR y 1/2 LNR', 'Maternidad', 'Paternidad',
    'Calamidad/Luto', 'Hospitalización', 'Ausente', 'Suspensión',
  ]

  const CONCEPTOS_AUSENCIA_ACTIVA = [...CONCEPTOS_AUSENTISMO, 'Vacaciones']

  // Se excluyen por completo del dashboard (tarjetas, donut y export): Día
  // Familia, Embargo, Renuncia y Sustitución Patronal (decisión explícita: no son ausencias operativas).
  const CONCEPTOS_EXCLUIDOS_DASHBOARD = ['Día Familia', 'Embargo', 'Renuncia', 'Renuncia/Retiro', 'Sustitución Patronal']

  const enriquecerRegistro = (r) => {
    const cNorm = normalizarConcepto(r.concepto) || (r.concepto || '').trim() || 'Sin concepto'
    const finEfectiva = r.fecha_fin || r.fecha_inicio || null
    const diasEnPeriodo = calcularDiasEnPeriodo(r, periodoIni, periodoFin)
    return {
      ...r,
      conceptoNorm: cNorm,
      color: CONCEPTO_COLORS[cNorm] || '#6366F1',
      fecha_regreso: finEfectiva ? obtenerFechaRegresoLaboral(finEfectiva) : null,
      dias_en_periodo: diasEnPeriodo,
    }
  }

  // ── Resumen global por concepto ─────────────────────────────────────────
  const porConcepto = {}
  data.forEach(r => {
    const c = normalizarConcepto(r.concepto) || (r.concepto || '').trim() || 'Sin concepto'
    if (CONCEPTOS_EXCLUIDOS_DASHBOARD.includes(c)) return
    porConcepto[c] = (porConcepto[c] || 0) + 1
  })
  const conceptosOrdenados = Object.entries(porConcepto).sort((a, b) => b[1] - a[1])

  // ── Por concepto: métricas detalladas para CADA concepto presente ───────
  const conceptosPresentes = Object.keys(porConcepto).sort((a, b) => {
    const ia = CONCEPTOS_PRIORITARIOS.indexOf(a)
    const ib = CONCEPTOS_PRIORITARIOS.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return (porConcepto[b] || 0) - (porConcepto[a] || 0)
  })

  const hoy = hoyISO()
  const hasta7 = sumarDiasISO(hoy, 7)

  const porConceptoDetalle = {}
  conceptosPresentes.forEach(concepto => {
    const filas = data
      .filter(r => (normalizarConcepto(r.concepto) || (r.concepto || '').trim() || 'Sin concepto') === concepto)
      .map(enriquecerRegistro)
    const totalDias = filas.reduce((s, r) => s + (parseFloat(r.dias_en_periodo != null ? r.dias_en_periodo : r.total_dias) || 0), 0)
    const empUnicos = new Set(filas.map(r => (r.nombre_empleado || '').trim()).filter(Boolean)).size || (filas.length > 0 ? 1 : 0)

    // Reincidentes del concepto (2+ registros mismo empleado)
    const reincMap = {}
    filas.forEach(r => {
      const k = r.nombre_empleado || '—'
      if (!reincMap[k]) reincMap[k] = { nombre: k, area: r.dependencia || '—', episodios: 0 }
      reincMap[k].episodios++
      if (r.dependencia) reincMap[k].area = r.dependencia
    })
    const reincidentes = Object.values(reincMap).filter(e => e.episodios >= 2).sort((a, b) => b.episodios - a.episodios)

    // Top empleados por días (o por episodios si días es 0)
    const empMap = {}
    filas.forEach(r => {
      const k = r.nombre_empleado || '—'
      if (!empMap[k]) empMap[k] = { nombre: k, area: r.dependencia || '—', episodios: 0, dias: 0, prorroga: 0, registros: [] }
      empMap[k].episodios++
      empMap[k].dias += parseFloat(r.dias_en_periodo != null ? r.dias_en_periodo : r.total_dias) || 0
      if (r.dependencia) empMap[k].area = r.dependencia
      const v = (r.prorroga || '').toLowerCase().trim()
      if (v === 'sí' || v === 'si') empMap[k].prorroga++
      empMap[k].registros.push(r)
    })
    const topEmpleados = Object.values(empMap)
      .sort((a, b) => (b.dias - a.dias) || (b.episodios - a.episodios))
      .slice(0, 10)

    // Por área
    const porDep = {}
    filas.forEach(r => {
      const d = r.dependencia || 'Sin área'
      porDep[d] = (porDep[d] || 0) + 1
    })
    const depOrdenadas = Object.entries(porDep).sort((a, b) => b[1] - a[1])

    // Alertas (campos de gestión vacíos)
    const sinRadicacion = allData.filter(r => {
      if (normalizarConcepto(r.concepto) !== concepto) return false
      const dias = parseFloat(r.total_dias) || 0
      return dias >= 3 && !(r.radicacion_incapacidad || '').trim()
    })
    const sinNomina     = allData.filter(r => normalizarConcepto(r.concepto) === concepto && !(r.nomina_electronica || '').trim())
    const sinSegSocial  = allData.filter(r => normalizarConcepto(r.concepto) === concepto && !(r.seguridad_social || '').trim())
    const pendientesValidar = allData.filter(r => {
      const v = (r.validacion_incapacidad || '').toLowerCase().trim()
      return normalizarConcepto(r.concepto) === concepto && (v === '' || v === 'validar')
    })

    // Próximos vencimientos (7 días): fecha_regreso estrictamente >= hoy y <= hasta7
    const proxVencimientos = allData
      .filter(r => normalizarConcepto(r.concepto) === concepto && (r.fecha_fin || r.fecha_inicio))
      .map(enriquecerRegistro)
      .filter(r => {
        if (!r.fecha_regreso) return false
        return r.fecha_regreso >= hoy && r.fecha_regreso <= hasta7
      })
      .sort((a, b) => (a.fecha_regreso || '').localeCompare(b.fecha_regreso || ''))

    // Activos hoy (estrictamente: hoy >= fecha_inicio && hoy < fechaRegreso)
    const activasHoy = allData
      .filter(r => {
        if (normalizarConcepto(r.concepto) !== concepto || !r.fecha_inicio) return false
        const estado = evaluarEstadoTemporalAusencia(r, hoy)
        return estado?.esActivaHoy === true
      })
      .map(enriquecerRegistro)

    const conProrroga = filas.filter(r => {
      const v = (r.prorroga || '').toLowerCase().trim()
      return v === 'sí' || v === 'si'
    }).length

    const sinValidar = filas.filter(r => {
      const v = (r.validacion_incapacidad || '').trim()
      return v === '' || v.toLowerCase() === 'validar'
    }).length

    porConceptoDetalle[concepto] = {
      count: filas.length,
      filas,
      totalDias,
      empUnicos,
      promDias: filas.length ? totalDias / filas.length : 0,
      conProrroga,
      sinValidar,
      reincidentes,
      topEmpleados,
      depOrdenadas,
      sinRadicacion: sinRadicacion.length,
      sinNomina: sinNomina.length,
      sinSegSocial: sinSegSocial.length,
      pendientesValidar: pendientesValidar.length,
      proxVencimientos,
      activasHoy,
      tasaAusentismo: empleadosUnicosBase > 0 ? (totalDias / (empleadosUnicosBase * diasPeriodoBase) * 100) : 0,
      color: CONCEPTO_COLORS[concepto] || '#6366F1',
    }
  })

  // ── Agrupación por Área / Dependencia (con detalle de filas) ────────────
  const porDepTodos = {}
  const porDepDetalle = {}
  data.forEach(r => {
    const d = r.dependencia || 'Sin área'
    porDepTodos[d] = (porDepTodos[d] || 0) + 1
    if (!porDepDetalle[d]) porDepDetalle[d] = []
    porDepDetalle[d].push(enriquecerRegistro(r))
  })
  const depTodosOrdenadas = Object.entries(porDepTodos).sort((a, b) => b[1] - a[1])

  // ── Colaboradores Ausentes Hoy (estrictamente activos hoy: hoy >= fIni && hoy < fReg) ─────────
  const ausentesHoy = allData
    .filter(r => {
      const c = normalizarConcepto(r.concepto)
      if (!CONCEPTOS_AUSENCIA_ACTIVA.includes(c) || !r.fecha_inicio) return false
      const estado = evaluarEstadoTemporalAusencia(r, hoy)
      return estado?.esActivaHoy === true
    })
    .map(enriquecerRegistro)
    .sort((a, b) => (a.fecha_regreso || '').localeCompare(b.fecha_regreso || ''))

  // ── Ausencias registradas en el periodo filtrado ────────────────────────
  const ausenciasPeriodo = data
    .filter(r => CONCEPTOS_AUSENCIA_ACTIVA.includes(normalizarConcepto(r.concepto)))
    .map(enriquecerRegistro)
    .sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || ''))

  // ── Últimas 5 novedades registradas del periodo filtrado ────────────────
  const ultimasNovedades = [...data]
    .sort((a, b) => {
      const cmpFecha = (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')
      if (cmpFecha !== 0) return cmpFecha
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
    .slice(0, 5)
    .map(enriquecerRegistro)

  // ── Pendientes por validar en el periodo filtrado ───────────────────────
  const pendientesValidarTotal = data.filter(r => {
    const c = normalizarConcepto(r.concepto)
    if (c !== 'Incapacidad') return false
    const v = (r.validacion_incapacidad || '').toLowerCase().trim()
    return v === '' || v === 'validar'
  }).length

  // Tendencia mensual (todos los conceptos filtrados)
  const porMes = {}
  data.forEach(r => {
    if (r.fecha_inicio) {
      const m = r.fecha_inicio.substring(0, 7)
      porMes[m] = (porMes[m] || 0) + 1
    }
  })
  const tendencia = Object.entries(porMes).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)

  // Comparativo mensual global
  const mesActual = mesActualISO()
  const mesAnterior = mesRelativoISO(-1)
  const mismoMesAnioPassado = mesRelativoISO(-12)
  const cntMesActual   = allData.filter(r => r.fecha_inicio?.startsWith(mesActual)).length
  const cntMesAnterior = allData.filter(r => r.fecha_inicio?.startsWith(mesAnterior)).length
  const cntMismoMesAnio = allData.filter(r => r.fecha_inicio?.startsWith(mismoMesAnioPassado)).length
  const varMesAnterior  = cntMesAnterior > 0  ? Math.round(((cntMesActual - cntMesAnterior) / cntMesAnterior) * 100) : null
  const varAnioAnterior = cntMismoMesAnio > 0 ? Math.round(((cntMesActual - cntMismoMesAnio) / cntMismoMesAnio) * 100) : null

  // ── Tasa de ausentismo global (todos los conceptos de ausencia real) ────
  const filasAusentismo = data.filter(r => CONCEPTOS_AUSENTISMO.includes(normalizarConcepto(r.concepto))).map(enriquecerRegistro)
  const diasAusentismoTotal = filasAusentismo.reduce((s, r) => s + (parseFloat(r.dias_en_periodo != null ? r.dias_en_periodo : r.total_dias) || 0), 0)
  const tasaAusentismoGlobal = empleadosUnicosBase > 0 ? (diasAusentismoTotal / (empleadosUnicosBase * diasPeriodoBase) * 100) : 0

  return {
    total, empleadosUnicos, empleadosUnicosBase,
    conceptosPresentes, porConceptoDetalle,
    conceptosOrdenados, depTodosOrdenadas, porDepDetalle, tendencia,
    ausentesHoy, ausenciasPeriodo, ultimasNovedades, pendientesValidarTotal,
    mesActual, mesAnterior, mismoMesAnioPassado,
    cntMesActual, cntMesAnterior, cntMismoMesAnio,
    varMesAnterior, varAnioAnterior,
    diasAusentismoTotal, tasaAusentismoGlobal, diasPeriodoBase, diasPeriodoLabel,
  }
}