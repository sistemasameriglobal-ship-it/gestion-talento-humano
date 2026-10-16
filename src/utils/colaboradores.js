// =============================================================
// src/utils/colaboradores.js
// -------------------------------------------------------------
// Constantes y funciones puras de la página Colaboradores
// (cálculo de productividad, avatares, fechas, conceptos).
// =============================================================

export const PAGE_SIZE = 12
export const UMBRAL_ALERTA_PD = 3 // mismo umbral que usa la pestaña de Procesos Disciplinarios

import { DEPTOS, METRICA, METRICA_RESUELTOS } from './productividadConstants'

export const CONCEPTOS_CON_FECHA = [
  'Incapacidad','Vacaciones','LNR','LR','1/2 LR y 1/2 LNR','Maternidad','Paternidad',
  'Calamidad/Luto','Día Familia','Hospitalización','Embargo','Suspensión','Ausente','Sustitución Patronal','Otro'
]

// Para la tasa de ausentismo: todos los conceptos con fecha EXCEPTO Vacaciones
// (tiempo libre ganado, no una ausencia), Embargo (descuento salarial) y Sustitución Patronal (traslado de empresa).
export const CONCEPTOS_AUSENTISMO = CONCEPTOS_CON_FECHA.filter(c => c !== 'Vacaciones' && c !== 'Embargo' && c !== 'Sustitución Patronal')

export const CONCEPTOS_LIST = [
  'Incapacidad','Vacaciones','LNR','LR','1/2 LR y 1/2 LNR','Maternidad','Paternidad',
  'Calamidad/Luto','Renuncia/Retiro','Ingreso','Terminación','Día Familia','Hospitalización',
  'Embargo','Suspensión','Ausente','Sustitución Patronal','Otro'
]

// ── Productividad (leída directamente de Supabase — mismas tablas que usa la
// página Productividad: "productividad" para Ventas/UW-BS y "cierre_meses"
// para Cierre) ──
export const PRODUCTIVIDAD_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
// Relaciona la dependencia del empleado (empleados.dependencia) con el
// departamento de Productividad (mismos valores que usa Productividad.jsx en
// DEPTOS / CIERRE_CFG.departamento)
export const PRODUCTIVIDAD_DEPTS = {
  VENTAS:        { departamento: 'Ventas',  label: 'Clientes resueltos' },
  UNDERWRITING:  { departamento: 'UW - BS', label: 'Clientes resueltos' },
  CIERRE:        { departamento: 'Cierre',  label: 'Total cerrado', money: true },
}
export const normalizeNombreProd = (s) => (s || '').trim().toLowerCase()

// Arma { [anio]: { [departamento]: { [nombreNormalizado]: { [mesNombre]: valor } } } }
// a partir de las filas crudas de "productividad" (Ventas/UW-BS) y "cierre_meses" (Cierre).
// Ventas y UW-BS guardan "Clientes Asignados" y "Clientes Resueltos": para
// Colaboradores se usa "Clientes Resueltos". Los demás departamentos siguen
// con la métrica de un solo valor "Producción". Con usaClientes=false (Global
// Link) todos los departamentos usan "Producción".
const DEPTS_CLIENTES = Object.values(DEPTOS).filter(d => d.usaClientes).map(d => d.departamento)

export function construirProductividad(prodRows, cierreRows, { usaClientes = true } = {}) {
  const data = {}
  ;(prodRows || []).forEach(r => {
    const anio = r.anio
    const dep = r.departamento
    if (!anio || !dep) return
    const metricaEsperada = usaClientes && DEPTS_CLIENTES.includes(dep) ? METRICA_RESUELTOS : METRICA
    if (r.metrica && r.metrica !== metricaEsperada) return
    if (!data[anio]) data[anio] = {}
    if (!data[anio][dep]) data[anio][dep] = {}
    const key = normalizeNombreProd(r.nombre_empleado)
    if (!key) return
    if (!data[anio][dep][key]) data[anio][dep][key] = {}
    data[anio][dep][key][r.periodo] = Number(r.valor) || 0
  })
  ;(cierreRows || []).forEach(r => {
    const anio = r.anio
    const dep = 'Cierre'
    if (!anio) return
    if (!data[anio]) data[anio] = {}
    if (!data[anio][dep]) data[anio][dep] = {}
    const key = normalizeNombreProd(r.nombre_empleado)
    if (!key) return
    if (!data[anio][dep][key]) data[anio][dep][key] = {}
    data[anio][dep][key][r.mes] = Number(r.plata_prestada ?? r.total_plata ?? r.total_dollars ?? r.renewal_dollars) || 0
  })
  return data
}

// Año a usar: si hay un mes filtrado se usa ese año; si no, el más reciente
// que tenga datos capturados en Productividad.
export function anioProductividadEfectivo(dataProd, filterMes) {
  if (filterMes) return filterMes.slice(0, 4)
  const years = Object.keys(dataProd || {}).sort()
  return years.length ? years[years.length - 1] : `${new Date().getFullYear()}`
}

// Suma la métrica principal de cada empleado, por departamento. Si se pasa un
// mes concreto, solo suma ese mes; si no, suma los 12 meses del año.
export function productividadPorEmpleado(dataProd, year, mesNombre) {
  const acc = {}
  const meses = mesNombre ? [mesNombre] : PRODUCTIVIDAD_MESES
  Object.values(PRODUCTIVIDAD_DEPTS).forEach(cfg => {
    const deptData = dataProd?.[year]?.[cfg.departamento] || {}
    Object.entries(deptData).forEach(([nombreKey, mesesValores]) => {
      const total = meses.reduce((sum, mes) => sum + (Number(mesesValores?.[mes]) || 0), 0)
      acc[nombreKey] = { total, cfg }
    })
  })
  return acc
}

export function formatProductividad(total, cfg) {
  if (!cfg) return total
  if (cfg.money) return total.toLocaleString('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  return total.toLocaleString('es-CO')
}

// ── Meses ──────────────────────────────────────────────────────────────────
export const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
// Convierte 'YYYY-MM' -> 'Mes YYYY'
export function labelMes(ym) {
  const [y, m] = ym.split('-')
  return `${MESES_NOMBRES[parseInt(m, 10) - 1]} ${y}`
}

// ── Paleta de iniciales ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#DBEAFE','#1D4ED8'], ['#F3E8FF','#6B21A8'], ['#DCFCE7','#166534'],
  ['#FEF3C7','#92400E'], ['#FCE7F3','#9D174D'], ['#E0F2FE','#0369A1'],
  ['#FEE2E2','#991B1B'], ['#F0FDF4','#14532D'],
]
export function avatarColor(nombre) {
  const i = (nombre || '').charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}
export function initials(nombre) {
  const parts = (nombre || '').trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0] || '?')[0].toUpperCase()
}

// Cuenta días calendario entre dos fechas, ambas inclusive (una incapacidad
// corre todos los días, no solo de lunes a viernes).
export function diasCalendarioEntre(desde, hasta) {
  if (!desde || !hasta) return 0
  const d = new Date(desde)
  const fin = new Date(hasta)
  if (isNaN(d) || isNaN(fin) || d > fin) return 0
  return Math.round((fin - d) / 86400000) + 1
}

// Días calendario totales de un mes 'YYYY-MM' (de principio a fin del mes).
// Se usa como período de referencia fijo cuando hay un mes filtrado, para que
// la tasa de ausentismo sea comparable entre todos los colaboradores.
export function diasCalendarioDelMes(ym) {
  const [y, m] = ym.split('-').map(Number)
  const ultimoDia = new Date(y, m, 0).getDate()
  return diasCalendarioEntre(`${ym}-01`, `${ym}-${String(ultimoDia).padStart(2, '0')}`)
}