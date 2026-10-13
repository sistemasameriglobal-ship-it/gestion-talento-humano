import { diasHabilesEntre } from './diasHabiles'

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

// Antigüedad del empleado desde la fecha de ingreso hasta fechaFin (o hoy)
// Retorna: { texto: 'X años, Y meses', anios, meses, dias, totalDiasTrabajados }
export function calcAntiguedad(fechaIngreso, fechaFin = null) {
  if (!fechaIngreso) return null
  const isoIngreso = String(fechaIngreso).split('T')[0]
  const ingreso = new Date(isoIngreso + 'T00:00:00')
  if (isNaN(ingreso.getTime())) return null

  const hoy = new Date()
  const isoHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const isoFin = fechaFin ? String(fechaFin).split('T')[0] : isoHoy
  const fin = new Date(isoFin + 'T00:00:00')

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
 * Ejemplo: Si lleva 1 año y 2 meses, tiene 15 días habilitados del año 1;
 * los días del segundo año se habilitan únicamente al cumplir los 2 años exactos.
 */
export function calcularDiasCausadosVacaciones(fechaIngreso, fechaCorte = null) {
  const aniosCumplidos = calcularAniosCumplidos(fechaIngreso, fechaCorte)
  return aniosCumplidos * 15
}

export const ESTADOS_VALIDOS_VACACIONES = ['Aprobada', 'En curso', 'Finalizada']

/**
 * Calcula el balance consolidado de vacaciones para un periodo laboral:
 * Suma días disfrutados y en dinero de solicitudes aprobadas, en curso o finalizadas del periodo vigente.
 * Retorna: { aniosCumplidos, diasCausados, diasDisfrutados, diasEnDinero, saldoPendiente }
 */
export function calcularSaldoVacacionesPeriodo(periodoActivo, listaVacaciones = []) {
  if (!periodoActivo || !periodoActivo.fecha_ingreso) {
    return { aniosCumplidos: 0, diasCausados: 0, diasDisfrutados: 0, diasEnDinero: 0, saldoPendiente: 0 }
  }

  const aniosCumplidos = calcularAniosCumplidos(
    periodoActivo.fecha_ingreso,
    periodoActivo.fecha_retiro || null
  )
  const diasCausados = aniosCumplidos * 15

  const vacs = (listaVacaciones || []).filter(r => {
    // Solo solicitudes en estados donde los días ya fueron consumidos o comprometidos
    if (!r.estado || !ESTADOS_VALIDOS_VACACIONES.includes(r.estado)) return false

    // Si ambos tienen periodo_id, comprobar coincidencia
    if (periodoActivo.id && r.periodo_id) {
      return r.periodo_id === periodoActivo.id
    }

    // Si hay fecha de inicio/solicitud y el periodo tiene rango
    const fIni = r.fecha_inicio || r.fecha_solicitud
    if (fIni && periodoActivo.fecha_ingreso) {
      const matchIngreso = fIni >= periodoActivo.fecha_ingreso
      const matchRetiro = !periodoActivo.fecha_retiro || fIni <= periodoActivo.fecha_retiro
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
  // Si no ha cumplido el primer año (menos de 12 meses), el saldo disponible es 0 días habilitados
  const saldoPendiente = aniosCumplidos < 1
    ? 0
    : Math.max(0, diasCausados - (diasDisfrutados + diasEnDinero))

  return {
    aniosCumplidos,
    diasCausados,
    diasDisfrutados,
    diasEnDinero,
    saldoPendiente,
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
