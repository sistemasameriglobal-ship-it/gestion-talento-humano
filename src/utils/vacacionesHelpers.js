import { diasHabilesEntre, obtenerFechaRegresoLaboral } from './diasHabiles'
import { hoyISO } from './fecha'

export function aFechaInputDate(val) {
  if (!val) return ''
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const str = String(val).trim()
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (str.length >= 10 && str.charAt(4) === '-' && str.charAt(7) === '-') {
    return str.slice(0, 10)
  }
  return str.slice(0, 10)
}

export function calcDias(inicio, fin) {
  if (!inicio || !fin) return ''
  const d1 = new Date(inicio), d2 = new Date(fin)
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return ''
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
}

export function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Gestión de Continuidad Laboral (Ascensos y Cambios de Cargo) ─────────────
/**
 * Obtiene la lista de periodos continuos que preceden y enlazan al periodo de referencia.
 * Si un periodo tiene `continuidad_laboral === true`, se enlaza con el anterior respetando
 * la antigüedad acumulada y las vacaciones causadas.
 * Retorna los periodos de la cadena continua ordenados cronológicamente (más antiguo al más reciente).
 */
export function obtenerCadenaPeriodosContinuos(periodoActivo, listaPeriodos = []) {
  if (!periodoActivo) return []
  if (!listaPeriodos || listaPeriodos.length === 0) return [periodoActivo]

  // Ordenar cronológicamente todos los periodos del empleado
  const ordenados = [...listaPeriodos].sort((a, b) => {
    const fA = a.fecha_ingreso || ''
    const fB = b.fecha_ingreso || ''
    if (fA !== fB) return fA.localeCompare(fB)
    return (a.numero_periodo || 1) - (b.numero_periodo || 1)
  })

  // Encontrar el índice del periodo de referencia
  let idx = ordenados.findIndex(p =>
    (periodoActivo.id && p.id === periodoActivo.id) ||
    (periodoActivo.numero_periodo && p.numero_periodo === periodoActivo.numero_periodo) ||
    (p.es_periodo_actual && periodoActivo.es_periodo_actual)
  )

  if (idx === -1) {
    idx = ordenados.length - 1
  }

  // Recorrer hacia atrás mientras haya continuidad laboral
  const cadena = [ordenados[idx]]
  let curr = ordenados[idx]

  while (idx > 0 && curr?.continuidad_laboral === true) {
    idx--
    curr = ordenados[idx]
    cadena.unshift(curr)
  }

  return cadena
}

/**
 * Obtiene la fecha de ingreso raíz o inicial de la cadena continua de periodos.
 * Si el periodo tiene continuidad_laboral = true, retorna la fecha del primer contrato enlazado.
 */
export function obtenerFechaIngresoContinua(periodoActivo, listaPeriodos = []) {
  if (!periodoActivo) return null
  const cadena = obtenerCadenaPeriodosContinuos(periodoActivo, listaPeriodos)
  if (cadena.length > 0 && cadena[0].fecha_ingreso) {
    return cadena[0].fecha_ingreso
  }
  return periodoActivo.fecha_ingreso || null
}

// Antigüedad del empleado desde la fecha de ingreso hasta fechaFin (o hoy)
// Retorna: { texto: 'X años, Y meses', anios, meses, dias, totalDiasTrabajados }
export function calcAntiguedad(fechaIngreso, fechaFin = null, listaPeriodos = []) {
  if (!fechaIngreso) return null

  // Si se pasa un objeto periodo completo, resolver fecha continua si aplica
  let isoIngreso
  let isoFin = fechaFin ? String(fechaFin).split('T')[0] : null

  if (typeof fechaIngreso === 'object' && fechaIngreso !== null) {
    const periodo = fechaIngreso
    const fContinua = obtenerFechaIngresoContinua(periodo, listaPeriodos)
    isoIngreso = String(fContinua || periodo.fecha_ingreso || '').split('T')[0]
    if (!isoFin && periodo.es_periodo_actual === false && periodo.fecha_retiro) {
      isoFin = String(periodo.fecha_retiro).split('T')[0]
    }
  } else {
    isoIngreso = String(fechaIngreso).split('T')[0]
  }

  if (!isoIngreso) return null
  const ingreso = new Date(isoIngreso + 'T00:00:00')
  if (isNaN(ingreso.getTime())) return null

  const hoy = new Date()
  const isoHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const finFinal = isoFin || isoHoy
  const fin = new Date(finFinal + 'T00:00:00')

  if (isNaN(fin.getTime()) || ingreso > fin) {
    return {
      texto: '0 meses',
      anios: 0,
      meses: 0,
      dias: 0,
      totalDiasTrabajados: 0,
      toString() { return this.texto },
    }
  }

  // Días totales transcurridos
  const totalDiasTrabajados = Math.max(0, Math.round((fin.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  let years = fin.getFullYear() - ingreso.getFullYear()
  let months = fin.getMonth() - ingreso.getMonth()
  let days = fin.getDate() - ingreso.getDate()

  if (days < 0) {
    months--
    const prevMonthDays = new Date(fin.getFullYear(), fin.getMonth(), 0).getDate()
    days += prevMonthDays
  }

  if (months < 0) {
    years--
    months += 12
  }

  let texto
  if (years === 0 && months === 0) {
    texto = days <= 1 ? '1 día' : `${days} días`
  } else {
    const yStr = years === 1 ? '1 año' : `${years} años`
    const mStr = months === 1 ? '1 mes' : `${months} meses`
    if (years === 0) texto = mStr
    else if (months === 0) texto = yStr
    else texto = `${yStr}, ${mStr}`
  }

  return {
    texto,
    anios: Math.max(0, years),
    meses: Math.max(0, months),
    dias: Math.max(0, days),
    totalDiasTrabajados,
    toString() { return this.texto },
  }
}

/**
 * Calcula la antigüedad de un colaborador considerando su cadena de periodos laborales y continuidad.
 */
export function calcAntiguedadEmpleado(emp, periodosEmp = []) {
  if (!emp) return null
  const pActivo = (periodosEmp || []).find(p => p.es_periodo_actual) || periodosEmp[0] || null
  const fIngresoContinua = pActivo
    ? obtenerFechaIngresoContinua(pActivo, periodosEmp)
    : emp.fecha_ingreso
  const fFin = emp.activo === false ? (pActivo?.fecha_retiro || emp.fecha_retiro) : null
  return calcAntiguedad(fIngresoContinua || emp.fecha_ingreso, fFin)
}

/**
 * Calcula los años completos cumplidos de servicio (periodos de 12 meses completos).
 */
export function calcularAniosCumplidos(fechaIngreso, fechaCorte = null) {
  if (!fechaIngreso) return 0
  const antig = calcAntiguedad(fechaIngreso, fechaCorte)
  if (!antig) return 0
  return Math.max(0, Math.floor(antig.anios || 0))
}

/**
 * Calcula los días de vacaciones causados (habilitados para disfrute) por cada año cumplido de servicio (12 meses = 15 días).
 */
export function calcularDiasCausadosVacaciones(fechaIngreso, fechaCorte = null) {
  const aniosCumplidos = calcularAniosCumplidos(fechaIngreso, fechaCorte)
  return aniosCumplidos * 15
}

export const ESTADOS_VALIDOS_VACACIONES = ['Aprobada', 'En curso', 'Finalizada']

/**
 * Normaliza etiquetas de períodos (ej: "2024-2025" o "2024 - 2025" -> "2024-2025")
 */
export function normalizarPeriodoVacaciones(str) {
  if (!str) return ''
  return String(str).replace(/\s+/g, '').trim().toLowerCase()
}

/**
 * Calcula los ciclos anuales de vacaciones individuales de un colaborador
 * a partir de la fecha de inicio del contrato vigente (o cadena continua de contratos).
 * Retorna cada período con su causación independiente (15d por año cumplido),
 * días disfrutados en tiempo, compensados en dinero, ajuste manual y saldo restante.
 *
 * @param {Object|string} empleado - Objeto empleado, periodo o fecha
 * @param {Array} solicitudesVacaciones - Array de solicitudes de la tabla `vacaciones`
 * @param {Array} listaPeriodos - Array de periodos laborales (`empleado_periodos`)
 * @returns {Array} Array de ciclos con propiedades añadidas (.saldoTotal, .saldoTotalDisponible, etc.)
 */
export function obtenerPeriodosVacacionesEmpleado(empleado, solicitudesVacaciones = [], listaPeriodos = []) {
  if (!empleado) {
    const empty = []
    empty.periodos = []
    empty.ciclos = []
    empty.saldoTotal = 0
    empty.saldoTotalDisponible = 0
    empty.totalCausados = 0
    empty.totalDisfrutados = 0
    empty.totalEnDinero = 0
    empty.totalAjusteManual = 0
    return empty
  }

  // 1. Resolver periodo activo y fecha de ingreso continua
  const empObj = typeof empleado === 'object' ? empleado : null
  const empNombre = (empObj?.nombre_completo || empObj?.nombre_empleado || (typeof empleado === 'string' && !empleado.includes('-') ? empleado : '')).trim().toLowerCase()
  const empId = empObj?.id || null

  const periodosEmp = (listaPeriodos || []).filter(p => (empId && p.empleado_id === empId))
  const pActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[0] || null

  const fIngRaw = pActivo
    ? (obtenerFechaIngresoContinua(pActivo, periodosEmp) || pActivo.fecha_ingreso)
    : (empObj?.fecha_ingreso || (typeof empleado === 'string' && empleado.includes('-') ? empleado : null))

  if (!fIngRaw) {
    const empty = []
    empty.periodos = []
    empty.ciclos = []
    empty.saldoTotal = 0
    empty.saldoTotalDisponible = 0
    empty.totalCausados = 0
    empty.totalDisfrutados = 0
    empty.totalEnDinero = 0
    empty.totalAjusteManual = 0
    return empty
  }

  const cleanIng = String(fIngRaw).slice(0, 10)
  const partsIng = cleanIng.split('-').map(Number)
  if (partsIng.length !== 3 || partsIng.some(isNaN)) {
    const empty = []
    empty.periodos = []
    empty.ciclos = []
    empty.saldoTotal = 0
    empty.saldoTotalDisponible = 0
    empty.totalCausados = 0
    empty.totalDisfrutados = 0
    empty.totalEnDinero = 0
    empty.totalAjusteManual = 0
    return empty
  }

  const [yIng, mIng, dIng] = partsIng
  const hoy = hoyISO()
  const fechaCorte = (empObj && empObj.activo === false)
    ? (empObj.fecha_retiro || pActivo?.fecha_retiro || hoy)
    : hoy

  const corteParts = String(fechaCorte).slice(0, 10).split('-').map(Number)
  const dCorte = new Date(corteParts[0], corteParts[1] - 1, corteParts[2])

  // 2. Generar los ciclos anuales completos
  const ciclos = []
  let i = 0

  while (true) {
    const anioInicio = yIng + i
    const anioFin = yIng + i + 1
    const dIniCiclo = new Date(anioInicio, mIng - 1, dIng)

    if (dIniCiclo > dCorte) {
      break
    }

    const dFinCiclo = new Date(anioFin, mIng - 1, dIng - 1)

    const pad = n => String(n).padStart(2, '0')
    const fIniISO = `${dIniCiclo.getFullYear()}-${pad(dIniCiclo.getMonth() + 1)}-${pad(dIniCiclo.getDate())}`
    const fFinISO = `${dFinCiclo.getFullYear()}-${pad(dFinCiclo.getMonth() + 1)}-${pad(dFinCiclo.getDate())}`

    const esCumplido = dCorte >= dFinCiclo
    const estadoCiclo = esCumplido ? 'cumplido' : 'en_curso'
    const numeroCiclo = i + 1
    const etiqueta = `${anioInicio}-${anioFin}`
    const etiquetaVisual = `${anioInicio} - ${anioFin}`
    const subtitulo = esCumplido ? `Año ${numeroCiclo} cumplido` : `Año ${numeroCiclo} en curso`

    let diasCausados
    let diasProporcionales

    if (esCumplido) {
      diasCausados = 15
      diasProporcionales = 15
    } else {
      const diffMs = Math.max(0, dCorte.getTime() - dIniCiclo.getTime())
      const diasTrabajados = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1
      diasProporcionales = Math.min(15, Math.round(((diasTrabajados * 15) / 360) * 10) / 10)
      diasCausados = 0
    }

    ciclos.push({
      numero_ciclo: numeroCiclo,
      etiqueta,
      etiquetaVisual,
      subtitulo,
      fecha_inicio_ciclo: fIniISO,
      fecha_fin_ciclo: fFinISO,
      estado_ciclo: estadoCiclo,
      es_cumplido: esCumplido,
      dias_causados: diasCausados,
      dias_proporcionales: diasProporcionales,
      dias_disfrutados: 0,
      dias_en_dinero: 0,
      dias_ajuste_manual: 0,
      dias_consumidos: 0,
      saldo_restante: diasCausados,
      solicitudes: [],
    })

    if (!esCumplido) {
      break
    }

    i++
    if (i > 60) break
  }

  // 3. Filtrar solicitudes válidas del empleado
  const ESTADOS_VALIDOS = ['Aprobada', 'En curso', 'Finalizada', 'Pendiente_Preview']
  const vacsEmp = (solicitudesVacaciones || []).filter(v => {
    if (!v) return false
    const matchId = empId && v.empleado_id && v.empleado_id === empId
    const matchNom = empNombre && (v.nombre_empleado || '').trim().toLowerCase() === empNombre
    if (!matchId && !matchNom) return false
    if (v.estado && !ESTADOS_VALIDOS.includes(v.estado)) return false
    return true
  })

  // 4. Imputar solicitudes a los períodos correspondientes
  const solicitudesNoAsignadas = []

  vacsEmp.forEach(v => {
    const rawPeriodo = v.periodo_vacaciones || v.ciclo_vacaciones || v.periodo
    const pNorm = normalizarPeriodoVacaciones(rawPeriodo)

    let cicloAsignado = null
    if (pNorm) {
      cicloAsignado = ciclos.find(c =>
        normalizarPeriodoVacaciones(c.etiqueta) === pNorm ||
        normalizarPeriodoVacaciones(c.etiquetaVisual) === pNorm ||
        pNorm === `año${c.numero_ciclo}` ||
        pNorm === `ano${c.numero_ciclo}`
      )
    }

    if (cicloAsignado) {
      const dinero = Number(v.dias_en_dinero) || (v.tipo_vacacion === 'Vacaciones en dinero' ? (Number(v.total_dias) || 15) : 0)
      const tiempo = v.tipo_vacacion === 'Vacaciones en dinero' ? 0 : (
        Number(v.dias_disfrutados) || Number(v.total_dias) || (
          (v.fecha_inicio && v.fecha_fin) ? (diasHabilesEntre(v.fecha_inicio, v.fecha_fin) || 0) : 0
        )
      )

      cicloAsignado.dias_disfrutados += tiempo
      cicloAsignado.dias_en_dinero += dinero
      cicloAsignado.solicitudes.push({
        ...v,
        dias_tiempo_calc: tiempo,
        dias_dinero_calc: dinero,
      })
    } else {
      solicitudesNoAsignadas.push(v)
    }
  })

  // Imputar solicitudes no asignadas históricas mediante FIFO (del ciclo cumplido más antiguo al más reciente)
  solicitudesNoAsignadas.sort((a, b) =>
    (a.fecha_inicio || a.fecha_solicitud || a.created_at || '').localeCompare(b.fecha_inicio || b.fecha_solicitud || b.created_at || '')
  )

  solicitudesNoAsignadas.forEach(v => {
    const dinero = Number(v.dias_en_dinero) || (v.tipo_vacacion === 'Vacaciones en dinero' ? (Number(v.total_dias) || 15) : 0)
    const tiempo = v.tipo_vacacion === 'Vacaciones en dinero' ? 0 : (
      Number(v.dias_disfrutados) || Number(v.total_dias) || (
        (v.fecha_inicio && v.fecha_fin) ? (diasHabilesEntre(v.fecha_inicio, v.fecha_fin) || 0) : 0
      )
    )

    const cicloConSaldo = ciclos.find(c => c.es_cumplido && (c.dias_causados - c.dias_disfrutados - c.dias_en_dinero) > 0)
    const cicloDestino = cicloConSaldo || ciclos.find(c => c.es_cumplido) || ciclos[0]

    if (cicloDestino) {
      cicloDestino.dias_disfrutados += tiempo
      cicloDestino.dias_en_dinero += dinero
      cicloDestino.solicitudes.push({
        ...v,
        dias_tiempo_calc: tiempo,
        dias_dinero_calc: dinero,
        imputacion_automatica: true,
      })
    }
  })

  // 5. Ajustes manuales históricos (dias_vacaciones_tomados_manual)
  const ajustesEspecificos = empObj?.ajustes_periodos_vacaciones || {}
  let remanenteManual = Number(
    empObj?.dias_vacaciones_tomados_manual != null
      ? empObj.dias_vacaciones_tomados_manual
      : (pActivo?.dias_vacaciones_tomados_manual || 0)
  ) || 0

  ciclos.forEach(c => {
    const aj = Number(ajustesEspecificos[c.etiqueta] || ajustesEspecificos[c.etiquetaVisual] || 0)
    if (aj > 0) {
      c.dias_ajuste_manual += aj
      remanenteManual = Math.max(0, remanenteManual - aj)
    }
  })

  if (remanenteManual > 0) {
    for (const c of ciclos) {
      if (remanenteManual <= 0) break
      if (!c.es_cumplido) continue
      const saldoPreAjuste = Math.max(0, c.dias_causados - c.dias_disfrutados - c.dias_en_dinero - c.dias_ajuste_manual)
      const aDescontar = Math.min(remanenteManual, saldoPreAjuste)
      c.dias_ajuste_manual += aDescontar
      remanenteManual -= aDescontar
    }
    if (remanenteManual > 0 && ciclos.length > 0) {
      ciclos[0].dias_ajuste_manual += remanenteManual
    }
  }

  // 6. Consolidar métricas y saldos por ciclo
  ciclos.forEach(c => {
    c.dias_disfrutados = Math.round(c.dias_disfrutados * 10) / 10
    c.dias_en_dinero = Math.round(c.dias_en_dinero * 10) / 10
    c.dias_ajuste_manual = Math.round(c.dias_ajuste_manual * 10) / 10
    c.dias_consumidos = Math.round((c.dias_disfrutados + c.dias_en_dinero + c.dias_ajuste_manual) * 10) / 10
    c.saldo_restante = Math.max(0, Math.round((c.dias_causados - c.dias_consumidos) * 10) / 10)

    if (c.saldo_restante % 1 === 0) c.saldo_restante = Math.round(c.saldo_restante)
    if (c.dias_consumidos % 1 === 0) c.dias_consumidos = Math.round(c.dias_consumidos)
    if (c.dias_disfrutados % 1 === 0) c.dias_disfrutados = Math.round(c.dias_disfrutados)
    if (c.dias_en_dinero % 1 === 0) c.dias_en_dinero = Math.round(c.dias_en_dinero)
    if (c.dias_ajuste_manual % 1 === 0) c.dias_ajuste_manual = Math.round(c.dias_ajuste_manual)
  })

  // 7. Calcular totales globales
  const ciclosCumplidos = ciclos.filter(c => c.es_cumplido)
  const saldoTotal = ciclosCumplidos.reduce((acc, c) => acc + c.saldo_restante, 0)
  const totalCausados = ciclosCumplidos.reduce((acc, c) => acc + c.dias_causados, 0)
  const totalDisfrutados = ciclos.reduce((acc, c) => acc + c.dias_disfrutados, 0)
  const totalEnDinero = ciclos.reduce((acc, c) => acc + c.dias_en_dinero, 0)
  const totalAjusteManual = ciclos.reduce((acc, c) => acc + c.dias_ajuste_manual, 0)

  const resultado = [...ciclos]
  resultado.periodos = ciclos
  resultado.ciclos = ciclos
  resultado.periodosCumplidos = ciclosCumplidos
  resultado.periodoEnCurso = ciclos.find(c => !c.es_cumplido) || null
  resultado.saldoTotal = saldoTotal % 1 === 0 ? Math.round(saldoTotal) : Math.round(saldoTotal * 10) / 10
  resultado.saldoTotalDisponible = resultado.saldoTotal
  resultado.totalCausados = totalCausados
  resultado.totalDisfrutados = totalDisfrutados
  resultado.totalEnDinero = totalEnDinero
  resultado.totalAjusteManual = totalAjusteManual

  return resultado
}

/**
 * Calcula el balance consolidado de vacaciones para un periodo laboral:
 * En casos de continuidad laboral (ascenso/cambio de cargo), respeta toda la antigüedad
 * acumulada de la cadena continua y descuenta los días disfrutados/compensados en dichos periodos.
 * Retorna: { aniosCumplidos, diasCausados, diasManuales, diasDisfrutados, diasEnDinero, saldoPendiente, esContinuo, fechaIngresoRaiz, cadenaPeriodos, periodosVacaciones }
 */
export function calcularSaldoVacacionesPeriodo(periodoActivo, listaVacaciones = [], listaPeriodos = [], empleado = null) {
  if (!periodoActivo || (!periodoActivo.fecha_ingreso && typeof periodoActivo !== 'string')) {
    return { aniosCumplidos: 0, diasCausados: 0, diasManuales: 0, diasDisfrutados: 0, diasEnDinero: 0, saldoPendiente: 0, esContinuo: false, periodosVacaciones: [] }
  }

  const periodoObj = typeof periodoActivo === 'string'
    ? { fecha_ingreso: periodoActivo, es_periodo_actual: true }
    : periodoActivo

  // Resolver cadena continua de periodos
  const cadena = obtenerCadenaPeriodosContinuos(periodoObj, listaPeriodos)
  const primerPeriodo = cadena[0] || periodoObj
  const fechaIngresoRaiz = primerPeriodo.fecha_ingreso || periodoObj.fecha_ingreso

  const empRef = empleado || periodoObj
  const infoCiclos = obtenerPeriodosVacacionesEmpleado(empRef, listaVacaciones, listaPeriodos)

  return {
    aniosCumplidos: infoCiclos.periodosCumplidos.length,
    diasCausados: infoCiclos.totalCausados,
    diasManuales: infoCiclos.totalAjusteManual,
    diasDisfrutados: infoCiclos.totalDisfrutados,
    diasEnDinero: infoCiclos.totalEnDinero,
    saldoPendiente: infoCiclos.saldoTotal,
    esContinuo: cadena.length > 1,
    fechaIngresoRaiz,
    cadenaPeriodos: cadena,
    periodosVacaciones: infoCiclos,
  }
}

// Días hábiles tomados por un empleado en un año dado (no cuenta "Vacaciones en dinero").
// excludeId permite no contar el propio registro que se está editando.
export function diasAcumuladosAnio(rows, nombreEmpleado, anio, excludeId = null) {
  if (!nombreEmpleado) return 0
  const nombreNorm = nombreEmpleado.trim().toLowerCase()
  return rows
    .filter(r =>
      r.id !== excludeId &&
      r.nombre_empleado?.trim().toLowerCase() === nombreNorm &&
      r.tipo_vacacion !== 'Vacaciones en dinero' &&
      (r.fecha_inicio || '').startsWith(String(anio))
    )
    .reduce((acc, r) => {
      const habiles = (r.fecha_inicio && r.fecha_fin)
        ? diasHabilesEntre(r.fecha_inicio, r.fecha_fin)
        : (parseFloat(r.total_dias) || 0)
      return acc + (habiles || 0)
    }, 0)
}

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/**
 * Calcula la fecha real de reincorporación laboral tras finalizar un periodo de vacaciones:
 * el primer día hábil siguiente a `fechaFin` (lunes a viernes, excluyendo festivos en Colombia).
 * Si `fechaFin` es viernes o sábado, el regreso a laborar es el lunes siguiente (o martes si es festivo).
 */
export function obtenerFechaRegresoVacaciones(fechaFin) {
  if (!fechaFin) return ''
  return obtenerFechaRegresoLaboral(fechaFin)
}

/**
 * Formatea una fecha ISO 'YYYY-MM-DD' en formato corto con día de la semana, ej: "Lun 26/10"
 */
export function formatearFechaCortaRegreso(fechaISO) {
  if (!fechaISO) return '—'
  const clean = String(fechaISO).trim().slice(0, 10)
  const parts = clean.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return clean
  const dt = new Date(parts[0], parts[1] - 1, parts[2])
  const diaSemana = DIAS_SEMANA_CORTO[dt.getDay()] || ''
  const dd = String(parts[2]).padStart(2, '0')
  const mm = String(parts[1]).padStart(2, '0')
  return `${diaSemana} ${dd}/${mm}`
}

function normalizarNombreComparacion(s) {
  return (s || '')
    .toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Determina si un empleado se encuentra actualmente de vacaciones (hoy) o tiene vacaciones programadas a futuro.
 * Criterios:
 *  - Activa: fecha actual (hoy) entre fecha_inicio y fecha_fin (hoy >= fIni && hoy <= fFin)
 *            o en puente previo a su fecha real de reincorporación laboral (hoy >= fIni && hoy < fechaRegreso).
 *  - Programada: fecha_inicio futura (hoy < fIni).
 *  - Concluida: hoy >= fechaRegreso -> retorna null (vacación finalizada, ya regresó a laborar).
 */
export function getEstadoVacacionActual(empleado, listaVacaciones = [], listaNovedades = []) {
  if (!empleado) return null
  const hoy = hoyISO()
  const empNombreRaw = typeof empleado === 'string'
    ? empleado.trim()
    : (empleado.nombre_completo || empleado.nombre_empleado || '').trim()
  const empNombreNorm = normalizarNombreComparacion(empNombreRaw)
  const empId = typeof empleado === 'object' ? empleado.id : null

  // 1. Filtrar solicitudes de vacaciones del empleado
  // Excluir 'Rechazada' y 'Vacaciones en dinero' (estas últimas no implican ausencia física de descanso)
  const vacs = (listaVacaciones || []).filter(v => {
    if (!v || v.estado === 'Rechazada') return false
    if (v.tipo_vacacion === 'Vacaciones en dinero') return false
    const matchId = empId && v.empleado_id && v.empleado_id === empId
    const matchNombre = empNombreNorm && normalizarNombreComparacion(v.nombre_empleado) === empNombreNorm
    return matchId || matchNombre
  })

  // 2. Filtrar novedades del empleado con concepto Vacaciones
  const novs = (listaNovedades || []).filter(n => {
    if (!n || !n.fecha_inicio) return false
    const matchId = empId && n.empleado_id && n.empleado_id === empId
    const matchNombre = empNombreNorm && normalizarNombreComparacion(n.nombre_empleado) === empNombreNorm
    const esVac = (n.concepto || '').toLowerCase().includes('vacacion')
    return (matchId || matchNombre) && esVac
  })

  // Agrupar registros con rangos válidos
  const registros = [
    ...vacs.map(v => ({
      tipo: 'vacacion',
      id: v.id,
      estado: v.estado,
      fecha_inicio: String(v.fecha_inicio || '').trim().slice(0, 10),
      fecha_fin: String(v.fecha_fin || v.fecha_inicio || '').trim().slice(0, 10),
      raw: v,
    })),
    ...novs.map(n => ({
      tipo: 'novedad',
      id: n.id,
      estado: 'Aprobada',
      fecha_inicio: String(n.fecha_inicio || '').trim().slice(0, 10),
      fecha_fin: String(n.fecha_fin || n.fecha_inicio || '').trim().slice(0, 10),
      raw: n,
    })),
  ].filter(r => r.fecha_inicio)

  // -------------------------------------------------------------
  // CASO 1: ACTIVAMENTE DE VACACIONES HOY (fIni <= hoy && (hoy <= fFin || hoy < fechaRegreso))
  // Estados válidos: 'En curso', 'Aprobada', 'Disfrutadas', 'Finalizada', o novedad
  // -------------------------------------------------------------
  const activa = registros.find(r => {
    if (r.estado && !['En curso', 'Aprobada', 'Disfrutadas', 'Finalizada'].includes(r.estado)) return false
    const fIni = r.fecha_inicio
    const fFin = r.fecha_fin || fIni
    const fReg = obtenerFechaRegresoVacaciones(fFin)
    return fIni <= hoy && (hoy <= fFin || (fReg && hoy < fReg))
  })

  if (activa) {
    const fechaInicio = activa.fecha_inicio
    const fechaFin = activa.fecha_fin || fechaInicio
    const fechaRegreso = obtenerFechaRegresoVacaciones(fechaFin) || fechaFin
    const fechaRegresoCorta = formatearFechaCortaRegreso(fechaRegreso)
    const fechaRegresoFormateada = formatFecha(fechaRegreso)

    const hoyD = new Date(hoy + 'T00:00:00')
    const regD = new Date(fechaRegreso + 'T00:00:00')
    const diffTime = regD.getTime() - hoyD.getTime()
    // Días restantes reales hasta la fecha efectiva de regreso laboral
    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))

    const esUltimoDia = diffDays === 1
    let countdownTexto
    let badgeTexto
    let textoLargo

    if (esUltimoDia) {
      countdownTexto = `Regresa mañana (${fechaRegresoCorta})`
      badgeTexto = `De vacaciones • Regresa mañana (${fechaRegresoCorta})`
      textoLargo = `De vacaciones • Regresa mañana (${fechaRegresoCorta})`
    } else {
      countdownTexto = `Regresa en ${diffDays} días (${fechaRegresoCorta})`
      badgeTexto = `De vacaciones • Regresa en ${diffDays} días (${fechaRegresoCorta})`
      textoLargo = `De vacaciones • Regresa en ${diffDays} días (${fechaRegresoCorta})`
    }

    const badgeModal = textoLargo

    return {
      estaDeVacaciones: true,
      esProgramada: false,
      fechaInicio,
      fechaFin,
      fechaRegreso,
      fechaRegresoCorta,
      fechaRegresoFormateada,
      diffDays,
      diasParaRegreso: diffDays,
      esUltimoDia,
      countdownTexto,
      badgeTexto,
      badgeModal,
      textoLargo,
      record: activa.raw,
    }
  }

  // -------------------------------------------------------------
  // CASO 2: VACACIONES PROGRAMADAS A FUTURO (hoy < fIni)
  // Estados válidos: 'Aprobada', 'En curso', 'Pendiente'
  // -------------------------------------------------------------
  const futuras = registros
    .filter(r => {
      if (r.estado && !['Aprobada', 'En curso', 'Pendiente'].includes(r.estado)) return false
      return hoy < r.fecha_inicio
    })
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  if (futuras.length > 0) {
    const proxima = futuras[0]
    const fechaInicio = proxima.fecha_inicio
    const fechaFin = proxima.fecha_fin || fechaInicio
    const fechaRegreso = obtenerFechaRegresoVacaciones(fechaFin) || fechaFin
    const fechaRegresoCorta = formatearFechaCortaRegreso(fechaRegreso)
    const fechaRegresoFormateada = formatFecha(fechaRegreso)

    const hoyD = new Date(hoy + 'T00:00:00')
    const iniD = new Date(fechaInicio + 'T00:00:00')
    const diffTime = iniD.getTime() - hoyD.getTime()
    const diasParaInicio = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))

    const countdownTexto = diasParaInicio === 1 ? 'Inician mañana' : `Inician en ${diasParaInicio} días`
    const badgeTexto = `Programadas • ${countdownTexto} (Regresa: ${fechaRegresoCorta})`
    const badgeModal = `Vacaciones programadas • ${countdownTexto} (${formatFecha(fechaInicio)})`
    const textoLargo = `Vacaciones programadas • ${countdownTexto} (Regresa: ${fechaRegresoCorta})`

    return {
      estaDeVacaciones: false,
      esProgramada: true,
      fechaInicio,
      fechaFin,
      fechaRegreso,
      fechaRegresoCorta,
      fechaRegresoFormateada,
      diasParaInicio,
      diffDays: diasParaInicio,
      esUltimoDia: false,
      countdownTexto,
      badgeTexto,
      badgeModal,
      textoLargo,
      record: proxima.raw,
    }
  }

  // -------------------------------------------------------------
  // CASO 3: YA CONCLUYERON (hoy >= fechaRegreso) O NO TIENE VACACIONES
  // -------------------------------------------------------------
  return null
}

/**
 * Extrae los días solicitados en dinero de una novedad o registro de vacaciones.
 */
export function extraerDiasEnDinero(novedad, vacacion = null) {
  if (vacacion && vacacion.dias_en_dinero != null && vacacion.dias_en_dinero !== '') {
    return Number(vacacion.dias_en_dinero) || 0
  }
  if (novedad?.dias_en_dinero != null && novedad.dias_en_dinero !== '') {
    return Number(novedad.dias_en_dinero) || 0
  }
  const texto = `${novedad?.observacion_contabilidad || ''} ${novedad?.observacion || ''}`
  const match = texto.match(/(?:compensaci[oó]n:?\s*|\+\s*)?(\d+(?:\.\d+)?)\s*(?:d[ií]as?|d)?\s*(?:en\s+dinero|dinero)/i)
  if (match) return parseFloat(match[1]) || 0
  return 0
}

