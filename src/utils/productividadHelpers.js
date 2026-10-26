import { MESES_FULL, META_RESOLUCION_PCT, META_FRIOS_MINIMO } from './productividadConstants'

export function fmtMoneda(v) {
  const n = Number(v) || 0
  return `$ ${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Porcentaje de resolución: clientes resueltos ÷ clientes asignados (entero).
// Si no hay asignados, devuelve 0 (evita dividir por cero).
export function calcPct(resueltos, asignados) {
  const a = Number(asignados) || 0
  const r = Number(resueltos) || 0
  return a > 0 ? Math.round((r / a) * 100) : 0
}

export function cumpleMetaResolucion(pct) {
  return Number(pct) >= META_RESOLUCION_PCT
}

export function cumpleMetaFrios(frios) {
  return Number(frios) >= META_FRIOS_MINIMO
}

// Escala de color de desempeño para las métricas en % con base en la meta del 40%
export function colorPct(v) {
  if (v >= 60) return '#10B981' // Supera con creces
  if (v >= META_RESOLUCION_PCT) return '#059669' // Cumple meta (>= 40%)
  if (v >= 30) return '#F59E0B' // Cerca de la meta
  return '#EF4444' // No cumple (< 30%)
}

// ¿Esta persona todavía no había ingresado en el mes/año dado?
// Se usa para no confundir "no ingresó todavía" con "mal desempeño".
export function noHabiaIngresado(empleado, mes, anio) {
  if (!empleado.ingreso) return false
  const ingresoDate = new Date(empleado.ingreso + 'T00:00:00')
  if (Number.isNaN(ingresoDate.getTime())) return false
  const mesIdx = MESES_FULL.indexOf(mes)
  if (mesIdx < 0) return false
  const inicioMes = new Date(anio, mesIdx, 1)
  const inicioMesIngreso = new Date(ingresoDate.getFullYear(), ingresoDate.getMonth(), 1)
  return inicioMes < inicioMesIngreso
}

export function iniciales(nombre) {
  return nombre.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export function fmtFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
