import { diasHabilesEntre } from './diasHabiles'
import { hoyISO } from './fecha'

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
 * Calcula el balance consolidado de vacaciones para un periodo laboral:
 * En casos de continuidad laboral (ascenso/cambio de cargo), respeta toda la antigüedad
 * acumulada de la cadena continua y descuenta los días disfrutados/compensados en dichos periodos.
 * Retorna: { aniosCumplidos, diasCausados, diasDisfrutados, diasEnDinero, saldoPendiente, esContinuo, fechaIngresoRaiz, cadenaPeriodos }
 */
export function calcularSaldoVacacionesPeriodo(periodoActivo, listaVacaciones = [], listaPeriodos = []) {
  if (!periodoActivo || (!periodoActivo.fecha_ingreso && typeof periodoActivo !== 'string')) {
    return { aniosCumplidos: 0, diasCausados: 0, diasDisfrutados: 0, diasEnDinero: 0, saldoPendiente: 0, esContinuo: false }
  }

  const periodoObj = typeof periodoActivo === 'string'
    ? { fecha_ingreso: periodoActivo, es_periodo_actual: true }
    : periodoActivo

  // Resolver cadena continua de periodos
  const cadena = obtenerCadenaPeriodosContinuos(periodoObj, listaPeriodos)
  const primerPeriodo = cadena[0] || periodoObj
  const fechaIngresoRaiz = primerPeriodo.fecha_ingreso || periodoObj.fecha_ingreso

  const aniosCumplidos = calcularAniosCumplidos(
    fechaIngresoRaiz,
    periodoObj.fecha_retiro || null
  )
  const diasCausados = aniosCumplidos * 15

  // Conjunto de IDs de periodos que componen la cadena continua
  const idsCadena = new Set(cadena.map(p => p.id).filter(Boolean))

  const vacs = (listaVacaciones || []).filter(r => {
    // Solo solicitudes en estados donde los días ya fueron consumidos o comprometidos
    if (!r.estado || !ESTADOS_VALIDOS_VACACIONES.includes(r.estado)) return false

    // Si la vacación tiene periodo_id y está enlazada a la cadena continua
    if (r.periodo_id && idsCadena.size > 0) {
      return idsCadena.has(r.periodo_id)
    }

    // Si hay fecha de inicio/solicitud y la cadena tiene rango de fechas
    const fIni = r.fecha_inicio || r.fecha_solicitud
    if (fIni && fechaIngresoRaiz) {
      const matchIngreso = fIni >= fechaIngresoRaiz
      const matchRetiro = !periodoObj.fecha_retiro || fIni <= periodoObj.fecha_retiro
      return matchIngreso && matchRetiro
    }

    return true
  })

  let diasDisfrutados = 0
  let diasEnDinero = 0

  vacs.forEach(r => {
    if (r.tipo_vacacion === 'Vacaciones en dinero') {
      const dinero = Number(r.dias_en_dinero) || Number(r.total_dias) || 15
      diasEnDinero += dinero
    } else {
      // Días tomados en tiempo: prioridad a dias_disfrutados o total_dias
      const diasTiempo = Number(r.dias_disfrutados) || Number(r.total_dias) || (
        (r.fecha_inicio && r.fecha_fin) ? (diasHabilesEntre(r.fecha_inicio, r.fecha_fin) || 0) : 0
      )
      diasDisfrutados += diasTiempo

      if (r.dias_en_dinero) {
        diasEnDinero += Number(r.dias_en_dinero) || 0
      }
    }
  })

  diasDisfrutados = Math.round(diasDisfrutados)
  diasEnDinero = Math.round(diasEnDinero)

  // Saldo disponible final = días totales ganados habilitados - (días disfrutados + días en dinero)
  const saldoPendiente = aniosCumplidos < 1
    ? 0
    : Math.max(0, diasCausados - (diasDisfrutados + diasEnDinero))

  return {
    aniosCumplidos,
    diasCausados,
    diasDisfrutados,
    diasEnDinero,
    saldoPendiente,
    esContinuo: cadena.length > 1,
    fechaIngresoRaiz,
    cadenaPeriodos: cadena,
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

/**
 * Determina si un empleado se encuentra actualmente de vacaciones (hoy) o tiene vacaciones programadas a futuro.
 * Criterios:
 *  - Activa: fecha actual (hoy) entre fecha_inicio y fecha_fin (hoy >= fIni && hoy <= fFin).
 *  - Programada: fecha_inicio futura (hoy < fIni).
 *  - Concluida: fecha_fin en el pasado (hoy > fFin) -> retorna null (vacación finalizada).
 */
export function getEstadoVacacionActual(empleado, listaVacaciones = [], listaNovedades = []) {
  if (!empleado) return null
  const hoy = hoyISO()
  const empNombre = typeof empleado === 'string'
    ? empleado.trim().toLowerCase()
    : (empleado.nombre_completo || empleado.nombre_empleado || '').trim().toLowerCase()
  const empId = typeof empleado === 'object' ? empleado.id : null

  // 1. Filtrar solicitudes de vacaciones del empleado
  // Excluir 'Rechazada' y 'Vacaciones en dinero' (estas últimas no implican ausencia física de descanso)
  const vacs = (listaVacaciones || []).filter(v => {
    if (!v || v.estado === 'Rechazada') return false
    if (v.tipo_vacacion === 'Vacaciones en dinero') return false
    const matchId = empId && v.empleado_id && v.empleado_id === empId
    const matchNombre = (v.nombre_empleado || '').trim().toLowerCase() === empNombre
    return matchId || matchNombre
  })

  // 2. Filtrar novedades del empleado con concepto Vacaciones
  const novs = (listaNovedades || []).filter(n => {
    if (!n || !n.fecha_inicio) return false
    const matchNombre = (n.nombre_empleado || '').trim().toLowerCase() === empNombre
    const esVac = (n.concepto || '').toLowerCase().includes('vacacion')
    return matchNombre && esVac
  })

  // Agrupar registros con rangos válidos
  const registros = [
    ...vacs.map(v => ({
      tipo: 'vacacion',
      id: v.id,
      estado: v.estado,
      fecha_inicio: v.fecha_inicio,
      fecha_fin: v.fecha_fin || v.fecha_inicio,
      raw: v,
    })),
    ...novs.map(n => ({
      tipo: 'novedad',
      id: n.id,
      estado: 'Aprobada',
      fecha_inicio: n.fecha_inicio,
      fecha_fin: n.fecha_fin || n.fecha_inicio,
      raw: n,
    })),
  ].filter(r => r.fecha_inicio)

  // -------------------------------------------------------------
  // CASO 1: ACTIVAMENTE DE VACACIONES HOY (fIni <= hoy && hoy <= fFin)
  // Estados válidos: 'En curso', 'Aprobada', o novedad
  // -------------------------------------------------------------
  const activa = registros.find(r => {
    if (r.estado && !['En curso', 'Aprobada'].includes(r.estado)) return false
    const fIni = r.fecha_inicio
    const fFin = r.fecha_fin || fIni
    return fIni <= hoy && hoy <= fFin
  })

  if (activa) {
    const fechaInicio = activa.fecha_inicio
    const fechaFin = activa.fecha_fin || fechaInicio
    const hoyD = new Date(hoy + 'T00:00:00')
    const finD = new Date(fechaFin + 'T00:00:00')
    const diffTime = finD.getTime() - hoyD.getTime()
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)))

    const esUltimoDia = (hoy === fechaFin) || (diffDays === 0)
    let countdownTexto
    let badgeTexto
    let textoLargo

    if (esUltimoDia) {
      countdownTexto = 'Regresa mañana'
      badgeTexto = 'Último día de vacaciones'
      textoLargo = '🌴 Actualmente en Vacaciones • Regresa mañana'
    } else if (diffDays === 1) {
      countdownTexto = 'Regresa en 1 día'
      badgeTexto = 'Regresa en: 1 día'
      textoLargo = '🌴 Actualmente en Vacaciones • Regresa en: 1 día'
    } else {
      countdownTexto = `Regresa en ${diffDays} días`
      badgeTexto = `Regresa en: ${diffDays} días`
      textoLargo = `🌴 Actualmente en Vacaciones • Regresa en: ${diffDays} días`
    }

    return {
      estaDeVacaciones: true,
      esProgramada: false,
      fechaInicio,
      fechaFin,
      diffDays,
      esUltimoDia,
      countdownTexto,
      badgeTexto,
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
    const hoyD = new Date(hoy + 'T00:00:00')
    const iniD = new Date(fechaInicio + 'T00:00:00')
    const diffTime = iniD.getTime() - hoyD.getTime()
    const diasParaInicio = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))

    const countdownTexto = diasParaInicio === 1 ? 'Inician mañana' : `Inician en ${diasParaInicio} días`
    const badgeTexto = diasParaInicio === 1 ? 'Inician mañana' : `Inician en: ${diasParaInicio} días`
    const textoLargo = diasParaInicio === 1 ? '🌴 Vacaciones programadas • Inician mañana' : `🌴 Vacaciones programadas • Inician en: ${diasParaInicio} días`

    return {
      estaDeVacaciones: false,
      esProgramada: true,
      fechaInicio,
      fechaFin,
      diasParaInicio,
      diffDays: diasParaInicio,
      esUltimoDia: false,
      countdownTexto,
      badgeTexto,
      textoLargo,
      record: proxima.raw,
    }
  }

  // -------------------------------------------------------------
  // CASO 3: YA CONCLUYERON (hoy > fecha_fin) O NO TIENE VACACIONES
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

