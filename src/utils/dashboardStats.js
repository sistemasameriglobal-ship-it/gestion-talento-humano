import { hoyISO, sumarDiasISO, mesActualISO, mesRelativoISO } from './fecha'
import { obtenerFechaRegresoLaboral } from './diasHabiles'
import { normalizarConcepto, CONCEPTO_COLORS } from './parseExcel'
import { MESES_DASHBOARD as MESES } from './dashboardConstants'

// Filtra las novedades con los mismos criterios del Dashboard. `incluirConcepto`
// controla si el filtro de concepto participa o no (la "base" de la tasa de
// ausentismo debe ignorarlo para que el denominador sea comparable).
export function filtrarNovedades(allData, {
  filterPeriodo, filterConcepto, filterDependencia, filterAnio, filterMeses, rangoMes,
  incluirConcepto = true,
}) {
  return allData.filter(r => {
    if (incluirConcepto && filterConcepto && normalizarConcepto(r.concepto) !== filterConcepto) return false
    if (filterPeriodo && r.periodo !== filterPeriodo) return false
    if (filterDependencia && (r.dependencia || 'Sin área') !== filterDependencia) return false
    if (rangoMes) {
      return r.fecha_inicio >= rangoMes.ini && r.fecha_inicio <= rangoMes.fin
    }
    if (filterAnio && filterMeses.length === 0) {
      return r.fecha_inicio?.startsWith(filterAnio) || r.periodo?.startsWith(filterAnio)
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
export function calcularStats(data, allData, diasPeriodoBase, diasPeriodoLabel, empleadosActivosPeriodo) {
  const total = data.length
  const empleadosUnicos = new Set(data.map(r => r.nombre_empleado)).size
  // Denominador de la tasa de ausentismo: colaboradores realmente activos en
  // el período (tabla `empleados`, cruzando fecha_ingreso/fecha_retiro), no
  // solo quienes tienen novedades registradas. No cambia según filterConcepto.
  const empleadosUnicosBase = empleadosActivosPeriodo.length

  const CONCEPTOS_DASHBOARD = ['Incapacidad', 'LNR', 'LR']

  // Conceptos que representan una ausencia real del puesto de trabajo — se
  // usan para la tasa de ausentismo global. Quedan fuera: Vacaciones (tiempo
  // libre ganado), Ingreso/Terminación/Renuncia/Retiro/Cambio de Área (eventos
  // administrativos, no ausencias), Recargo Dominical o Festivos (es trabajo
  // extra, no una ausencia), y Día Familia/Embargo (por decisión explícita).
  const CONCEPTOS_AUSENTISMO = [
    'Incapacidad', 'LNR', 'LR', '1/2 LR y 1/2 LNR', 'Maternidad', 'Paternidad',
    'Calamidad/Luto', 'Hospitalización', 'Ausente', 'Suspensión',
  ]

  // ── Por concepto: métricas para CADA tipo presente ──────────────────────
  const conceptosPresentes = [...new Set(data.map(r => normalizarConcepto(r.concepto)))]
    .filter(c => CONCEPTOS_DASHBOARD.includes(c))
    .sort((a, b) => CONCEPTOS_DASHBOARD.indexOf(a) - CONCEPTOS_DASHBOARD.indexOf(b))

  // Para cada concepto calculamos sus métricas propias
  const porConceptoDetalle = {}
  conceptosPresentes.forEach(concepto => {
    const filas = data.filter(r => normalizarConcepto(r.concepto) === concepto)
    const totalDias = filas.reduce((s, r) => s + (parseFloat(r.total_dias) || 0), 0)
    const empUnicos = new Set(filas.map(r => r.nombre_empleado)).size

    // Reincidentes del concepto (2+ registros mismo empleado)
    const reincMap = {}
    filas.forEach(r => {
      const k = r.nombre_empleado || '—'
      if (!reincMap[k]) reincMap[k] = { nombre: k, area: r.dependencia || '—', episodios: 0 }
      reincMap[k].episodios++
      if (r.dependencia) reincMap[k].area = r.dependencia
    })
    const reincidentes = Object.values(reincMap).filter(e => e.episodios >= 2).sort((a, b) => b.episodios - a.episodios)

    // Top empleados por días
    const empMap = {}
    filas.forEach(r => {
      const k = r.nombre_empleado || '—'
      if (!empMap[k]) empMap[k] = { nombre: k, area: r.dependencia || '—', episodios: 0, dias: 0, prorroga: 0, registros: [] }
      empMap[k].episodios++
      empMap[k].dias += parseFloat(r.total_dias) || 0
      if (r.dependencia) empMap[k].area = r.dependencia
      const v = (r.prorroga || '').toLowerCase().trim()
      if (v === 'sí' || v === 'si') empMap[k].prorroga++
      empMap[k].registros.push(r)
    })
    const topEmpleados = Object.values(empMap).sort((a, b) => b.dias - a.dias).slice(0, 10)

    // Por área
    const porDep = {}
    filas.forEach(r => {
      const d = r.dependencia || 'Sin área'
      porDep[d] = (porDep[d] || 0) + 1
    })
    const depOrdenadas = Object.entries(porDep).sort((a, b) => b[1] - a[1])

    // Alertas (campos de gestión vacíos — aplica a todos los conceptos con fecha)
    const sinRadicacion = allData.filter(r => normalizarConcepto(r.concepto) === concepto && !(r.radicacion_incapacidad || '').trim())
    const sinNomina     = allData.filter(r => normalizarConcepto(r.concepto) === concepto && !(r.nomina_electronica || '').trim())
    const sinSegSocial  = allData.filter(r => normalizarConcepto(r.concepto) === concepto && !(r.seguridad_social || '').trim())
    const pendientesValidar = allData.filter(r => {
      const v = (r.validacion_incapacidad || '').toLowerCase().trim()
      return normalizarConcepto(r.concepto) === concepto && (v === '' || v === 'validar')
    })

    // Próximos vencimientos (7 días) — datos globales (basado en fecha real de regreso laboral)
    const hoy = hoyISO()
    const hasta7 = sumarDiasISO(hoy, 7)
    const proxVencimientos = allData
      .filter(r => normalizarConcepto(r.concepto) === concepto && r.fecha_fin)
      .map(r => ({
        ...r,
        fecha_regreso: obtenerFechaRegresoLaboral(r.fecha_fin),
      }))
      .filter(r => r.fecha_regreso >= hoy && (r.fecha_regreso <= hasta7 || r.fecha_fin <= hasta7))
      .sort((a, b) => (a.fecha_regreso || a.fecha_fin).localeCompare(b.fecha_regreso || b.fecha_fin))

    // Activos hoy
    const activasHoy = allData.filter(r =>
      normalizarConcepto(r.concepto) === concepto && r.fecha_inicio && r.fecha_fin &&
      r.fecha_inicio <= hoy && r.fecha_fin >= hoy
    )

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
      color: CONCEPTO_COLORS[concepto] || '#374151',
    }
  })

  // ── Resumen global (para gráficas generales) ────────────────────────────
  // Si normalizarConcepto no reconoce el valor, usamos el texto original del
  // concepto (ej. "Suspensión") en lugar de agruparlo genéricamente como "Otro".
  // Se excluyen por completo del dashboard (tarjetas, donut y export): Día
  // Familia, Embargo y Renuncia (decisión explícita).
  const CONCEPTOS_EXCLUIDOS_DASHBOARD = ['Día Familia', 'Embargo', 'Renuncia']
  const porConcepto = {}
  data.forEach(r => {
    const c = normalizarConcepto(r.concepto) || (r.concepto || '').trim() || 'Sin concepto'
    if (CONCEPTOS_EXCLUIDOS_DASHBOARD.includes(c)) return
    porConcepto[c] = (porConcepto[c] || 0) + 1
  })
  const conceptosOrdenados = Object.entries(porConcepto).sort((a, b) => b[1] - a[1])

  const porDepTodos = {}
  data.forEach(r => {
    const d = r.dependencia || 'Sin área'
    porDepTodos[d] = (porDepTodos[d] || 0) + 1
  })
  const depTodosOrdenadas = Object.entries(porDepTodos).sort((a, b) => b[1] - a[1])

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
  const filasAusentismo = data.filter(r => CONCEPTOS_AUSENTISMO.includes(normalizarConcepto(r.concepto)))
  const diasAusentismoTotal = filasAusentismo.reduce((s, r) => s + (parseFloat(r.total_dias) || 0), 0)
  const tasaAusentismoGlobal = empleadosUnicosBase > 0 ? (diasAusentismoTotal / (empleadosUnicosBase * diasPeriodoBase) * 100) : 0

  return {
    total, empleadosUnicos, empleadosUnicosBase,
    conceptosPresentes, porConceptoDetalle,
    conceptosOrdenados, depTodosOrdenadas, tendencia,
    mesActual, mesAnterior, mismoMesAnioPassado,
    cntMesActual, cntMesAnterior, cntMismoMesAnio,
    varMesAnterior, varAnioAnterior,
    diasAusentismoTotal, tasaAusentismoGlobal, diasPeriodoBase, diasPeriodoLabel,
  }
}