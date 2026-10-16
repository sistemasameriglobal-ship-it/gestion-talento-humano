// Colombia no tiene horario de verano, siempre es UTC-5 (America/Bogota).
// No usar new Date().toISOString() para "la fecha de hoy": toISOString()
// convierte a UTC, y entre las 7pm y la medianoche hora colombiana, UTC ya
// marca el día siguiente — eso hacía que los formularios mostraran fechas
// adelantadas respecto a Colombia. Estas funciones siempre calculan la
// fecha/hora real de Bogotá, sin importar en qué zona horaria esté el
// navegador o el servidor donde corre la app.

export function hoyISO() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const obj = Object.fromEntries(partes.map(p => [p.type, p.value]))
  return `${obj.year}-${obj.month}-${obj.day}` // yyyy-mm-dd
}

export function mesActualISO() {
  return hoyISO().slice(0, 7) // yyyy-mm
}

// Un mes yyyy-mm relativo al mes actual en Colombia (offsetMeses puede ser
// negativo). Útil para comparativos "mes anterior" / "mismo mes año pasado".
export function mesRelativoISO(offsetMeses) {
  const [anio, mes] = mesActualISO().split('-').map(Number)
  const totalMeses = (anio * 12 + (mes - 1)) + offsetMeses
  const anioResult = Math.floor(totalMeses / 12)
  const mesResult = (totalMeses % 12) + 1
  return `${anioResult}-${String(mesResult).padStart(2, '0')}`
}

// Suma (o resta, con un número negativo) días a una fecha yyyy-mm-dd sin
// arrastrar el problema de zona horaria — trabaja en UTC internamente
// porque una fecha sin hora siempre se interpreta igual sin importar dónde
// esté el navegador.
export function sumarDiasISO(fechaISO, dias) {
  const d = new Date(fechaISO + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().split('T')[0]
}

export function horaColombia() {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const obj = Object.fromEntries(partes.map(p => [p.type, p.value]))
  return `${obj.hour}:${obj.minute}:${obj.second}`
}

// Para timestamps completos que se guardan en la base (timestamptz), el
// valor UTC real sigue siendo correcto — Postgres lo interpreta bien sin
// importar la zona del navegador. Esta función es solo para dejarlo
// explícito en el código de dónde viene cada fecha/hora que se usa.
export function ahoraTimestamp() {
  return new Date().toISOString()
}

// Calcula la duración entre dos fechas ISO en formato legible ("2 años y 3 meses")
export function formatDuracion(iso1, iso2) {
  const d1 = new Date(iso1 + 'T00:00:00')
  const d2 = new Date(iso2 + 'T00:00:00')
  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
  // Fecha "base": d1 avanzada `months` meses. Los días sobrantes son la
  // diferencia entre d2 y esa base. Si d2 cae antes que la base (porque el
  // día del mes de d2 es menor que el de d1), restamos un mes y recalculamos.
  let base = new Date(d1.getFullYear(), d1.getMonth() + months, d1.getDate())
  if (base > d2) {
    months -= 1
    base = new Date(d1.getFullYear(), d1.getMonth() + months, d1.getDate())
  }
  if (months < 0) months = 0
  const restDias = Math.max(0, Math.round((d2 - base) / 86400000))

  const years = Math.floor(months / 12)
  const restMonths = months % 12

  if (years === 0 && restMonths === 0) {
    const dias = Math.max(0, Math.round((d2 - d1) / 86400000))
    return `${dias} día${dias !== 1 ? 's' : ''}`
  }

  const parts = []
  if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`)
  if (restMonths > 0) parts.push(`${restMonths} mes${restMonths !== 1 ? 'es' : ''}`)
  if (restDias > 0) parts.push(`${restDias} día${restDias !== 1 ? 's' : ''}`)
  return parts.join(' y ')
}

export { obtenerFechaRegresoLaboral, evaluarEstadoTemporalAusencia } from './diasHabiles'

