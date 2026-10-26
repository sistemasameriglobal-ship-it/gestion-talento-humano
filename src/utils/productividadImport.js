// =============================================================
// src/utils/productividadImport.js
// -------------------------------------------------------------
// "Exportar para importar" / "Importar Excel" de las 3 secciones de
// Productividad: Ventas, UW-BS (modo 'clientes') y Cierre (modo 'cierre').
//
// El Excel usa formato LARGO: una fila por persona + año + mes.
//   clientes: Nombre | Año | Mes | Clientes Asignados | Clientes Resueltos
//   cierre:   Nombre | Año | Mes | Clientes Asignados | Clientes Resueltos |
//             Monto Total Gestionado | Capital Colocado
// El % de resolución NO va en el archivo: siempre se calcula (resueltos ÷ asignados).
//
// El importador lee por NOMBRE de columna (no por posición), así que se puede
// reordenar o agregar columnas al editar. Celda vacía = "no tocar ese valor".
// Todo este módulo es puro (sin Supabase ni React) para poder probarlo aislado.
// =============================================================
import { MESES_FULL } from './productividadConstants'
import { normalizarNombre, levenshtein } from './novedadesImport'

export const COLS_CLIENTES = ['Nombre', 'Año', 'Mes', 'Clientes Asignados', 'Clientes Resueltos', 'Clientes en Frío']
export const COLS_CIERRE = [...COLS_CLIENTES, 'Monto Total Gestionado', 'Capital Colocado']
export const ANCHOS_CLIENTES = [30, 8, 14, 20, 20, 20]
export const ANCHOS_CIERRE = [...ANCHOS_CLIENTES, 24, 20]

// Campos numéricos de cada modo → clave interna
const CAMPOS = {
  clientes: ['asignados', 'resueltos', 'frios'],
  cierre: ['asignados', 'resueltos', 'monto', 'capital'],
}

const norm = (s) => (s ?? '').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')

// Nombres de encabezado aceptados (ya normalizados) → clave interna
const ALIAS = {
  nombre: ['nombre', 'nombre completo', 'empleado', 'colaborador', 'analista', 'vendedor', 'nombre empleado', 'nombre_empleado'],
  anio: ['ano', 'anio', 'year', 'año'],
  mes: ['mes', 'periodo', 'month'],
  asignados: ['clientes asignados', 'asignados', 'casos asignados', 'cierres asignados'],
  resueltos: ['clientes resueltos', 'resueltos', 'casos resueltos', 'cierres cerrados', 'cierres resueltos'],
  frios: ['clientes en frio', 'clientes frios', 'frios', 'clientes en frío', 'clientes fríos', 'prospeccion', 'redes sociales', 'redes', 'clientes redes'],
  monto: ['monto total gestionado', 'monto total', 'monto', 'total plata', 'total gestionado'],
  capital: ['capital colocado', 'capital', 'plata prestada', 'dinero prestado', 'colocado'],
}
const claveDeEncabezado = (h) => {
  const n = norm(h)
  return Object.keys(ALIAS).find(k => ALIAS[k].includes(n)) || null
}

const MES_ABREV = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, sept: 8, oct: 9, nov: 10, dic: 11 }
/** 'Ene', 'enero', 'MARZO', 3 → 'Marzo'. Devuelve null si no se reconoce. */
export function parseMes(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number' || /^\d{1,2}$/.test(String(v).trim())) {
    const n = Number(v)
    return n >= 1 && n <= 12 ? MESES_FULL[n - 1] : null
  }
  const s = norm(v)
  const completo = MESES_FULL.find(m => norm(m) === s)
  if (completo) return completo
  const ab = s.replace(/\./g, '')
  return ab in MES_ABREV ? MESES_FULL[MES_ABREV[ab]] : null
}

/** Número de una celda: acepta 1234, "1.234,5", "1,234.5", "$ 1.200". vacio=true si está en blanco. */
export function parseNumero(v) {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return { vacio: true }
  if (typeof v === 'number') return Number.isFinite(v) ? { n: v } : { error: true }
  let s = String(v).trim().replace(/[$\s]/g, '')
  if (!s) return { vacio: true }
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (s.includes(',')) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isNaN(n) ? { error: true } : { n }
}

// ── EXPORTAR ────────────────────────────────────────────────────────────────
// Una fila por persona × 12 meses del año. Los meses sin datos quedan en
// blanco (no en 0) y el importador los ignora.

/** datos: personas de la vista (Productividad.jsx) con .asignados[12], .resueltos[12] y .frios[12]. */
export function filasExportClientes(datos, anio) {
  const filas = []
  const orden = [...datos].sort((a, b) => a.nombre.localeCompare(b.nombre))
  orden.forEach(p => {
    MESES_FULL.forEach((mes, i) => {
      const asig = p.asignados?.[i] || 0
      const resu = p.resueltos?.[i] || 0
      const fr = p.frios?.[i] || 0
      const hayDatos = asig > 0 || resu > 0 || fr > 0
      filas.push({
        'Nombre': p.nombre, 'Año': anio, 'Mes': mes,
        'Clientes Asignados': hayDatos ? asig : '',
        'Clientes Resueltos': hayDatos ? resu : '',
        'Clientes en Frío': hayDatos ? fr : '',
      })
    })
  })
  return filas
}

/** empleados: [{nombre}], datosPorMes: { Mes: { nombre: {cierres_asignados, ...} } } */
export function filasExportCierre(empleados, datosPorMes, anio) {
  const filas = []
  const orden = [...empleados].sort((a, b) => a.nombre.localeCompare(b.nombre))
  orden.forEach(e => {
    MESES_FULL.forEach(mes => {
      const d = datosPorMes?.[mes]?.[e.nombre]
      const v = (x) => (d && x ? x : '')
      filas.push({
        'Nombre': e.nombre, 'Año': anio, 'Mes': mes,
        'Clientes Asignados': v(d?.cierres_asignados), 'Clientes Resueltos': v(d?.cierres_cerrados),
        'Monto Total Gestionado': v(d?.total_plata), 'Capital Colocado': v(d?.plata_prestada),
      })
    })
  })
  return filas
}

/** Hoja "Instrucciones" que acompaña al archivo exportado (el importador solo lee la primera hoja). */
export function filasInstrucciones(modo) {
  const base = [
    { 'Columna': 'Nombre', 'Qué poner': 'Exactamente como está en Empleados (activo, del departamento). No cambies los nombres.' },
    { 'Columna': 'Año', 'Qué poner': 'Año de la fila (ej. 2026). Si lo dejas vacío se usa el año que tenías abierto al importar.' },
    { 'Columna': 'Mes', 'Qué poner': 'Nombre del mes (Enero…Diciembre), abreviatura (Ene, Feb…) o número 1–12.' },
    { 'Columna': 'Clientes Asignados', 'Qué poner': 'Número entero ≥ 0. Vacío = no se modifica el valor actual.' },
    { 'Columna': 'Clientes Resueltos', 'Qué poner': 'Número entero ≥ 0. Vacío = no se modifica el valor actual.' },
    { 'Columna': 'Clientes en Frío', 'Qué poner': 'Número entero ≥ 0 (prospectados en redes sociales). Vacío = no se modifica.' },
  ]
  if (modo === 'cierre') {
    base.push(
      { 'Columna': 'Monto Total Gestionado', 'Qué poner': 'Dinero (puede llevar decimales). Vacío = no se modifica.' },
      { 'Columna': 'Capital Colocado', 'Qué poner': 'Dinero (puede llevar decimales). Vacío = no se modifica.' },
    )
  }
  base.push({ 'Columna': '% de resolución', 'Qué poner': 'No se escribe: siempre se calcula (resueltos ÷ asignados, meta 40%).' })
  base.push({ 'Columna': 'Antes de guardar', 'Qué poner': 'Al importar verás una vista previa: nada se guarda hasta que confirmes.' })
  return base
}

// ── IMPORTAR ────────────────────────────────────────────────────────────────

/** Map(nombreNormalizado → nombreOriginal) para validar contra Empleados. */
export function indexarEmpleados(nombres) {
  return new Map(nombres.map(n => [normalizarNombre(n), n]))
}

function sugerirNombre(nombre, index) {
  const n = normalizarNombre(nombre)
  let mejor = null, dist = Infinity
  for (const [k, original] of index) {
    const d = levenshtein(n, k)
    if (d < dist) { dist = d; mejor = original }
  }
  return mejor && dist <= (n.length <= 8 ? 1 : 3) ? mejor : null
}

/**
 * raw: matriz de filas (sheet_to_json con header:1).
 * Devuelve { filas, ignoradasVacias, encabezadoDetectado }.
 * Cada fila: { omitir, motivoOmision, filaOriginal } | { omitir:false, payload, advertencias }.
 */
export function parsearImportProductividad(raw, { modo, empleadosIndex, anioDefault }) {
  const campos = CAMPOS[modo]
  const cols = modo === 'cierre' ? COLS_CIERRE : COLS_CLIENTES
  const claves = ['nombre', 'anio', 'mes', ...campos]

  // Mapa clave → índice de columna. Con encabezado: por nombre; sin él: por posición.
  let mapa = {}
  let inicio = 0
  let encabezadoDetectado = false
  const primeras = raw.slice(0, 6)
  const idxHeader = primeras.findIndex(r => (r || []).some(c => claveDeEncabezado(c) === 'nombre'))
  if (idxHeader >= 0) {
    encabezadoDetectado = true
    inicio = idxHeader + 1
    raw[idxHeader].forEach((h, i) => {
      const k = claveDeEncabezado(h)
      if (k && !(k in mapa)) mapa[k] = i
    })
  } else {
    claves.forEach((k, i) => { mapa[k] = i })
  }
  const faltan = ['nombre', 'mes', ...campos].filter(k => !(k in mapa))
  if (faltan.length) {
    const legibles = faltan.map(k => cols[claves.indexOf(k)] || k)
    throw new Error(`Faltan columnas en el archivo: ${legibles.join(', ')}. Usa el archivo de "Exportar para importar" como plantilla.`)
  }

  const celdas = raw.slice(inicio).filter(r => (r || []).some(c => (c ?? '').toString().trim() !== ''))
  const parsed = []
  let ignoradasVacias = 0
  const vistos = new Map() // clave persona|anio|mes → índice en parsed

  celdas.forEach((row) => {
    const get = (k) => (k in mapa ? row[mapa[k]] : undefined)
    const nombreRaw = (get('nombre') ?? '').toString().trim()
    const mesRaw = get('mes')

    // Fila de la plantilla sin ningún valor: se ignora en silencio (no es un error)
    const numeros = {}
    let algunError = null
    let hayValor = false
    campos.forEach(k => {
      const r = parseNumero(get(k))
      if (r.vacio) return
      if (r.error) { algunError = algunError || `"${get(k)}" no es un número (${cols[claves.indexOf(k)]})`; return }
      hayValor = true
      numeros[k] = r.n
    })
    if (!algunError && !hayValor) { ignoradasVacias++; return }

    const omitir = (motivo) => parsed.push({ omitir: true, motivoOmision: motivo, filaOriginal: row })

    if (!nombreRaw) return omitir('Falta el nombre')
    const nombreEnBD = empleadosIndex.get(normalizarNombre(nombreRaw))
    if (!nombreEnBD) {
      const sug = sugerirNombre(nombreRaw, empleadosIndex)
      return omitir(sug
        ? `"${nombreRaw}" no es un empleado activo de esta sección (¿"${sug}"?)`
        : `"${nombreRaw}" no es un empleado activo de esta sección`)
    }
    const mes = parseMes(mesRaw)
    if (!mes) return omitir(`Mes no reconocido: "${mesRaw ?? ''}"`)

    let anio = anioDefault
    const anioRaw = get('anio')
    if (anioRaw !== undefined && String(anioRaw).trim() !== '') {
      const a = Number(String(anioRaw).trim())
      if (!Number.isInteger(a) || a < 2000 || a > 2100) return omitir(`Año no válido: "${anioRaw}"`)
      anio = a
    }
    if (algunError) return omitir(algunError)

    const negativo = Object.entries(numeros).find(([, n]) => n < 0)
    if (negativo) return omitir('No se permiten valores negativos')
    const noEntero = ['asignados', 'resueltos', 'frios'].find(k => k in numeros && !Number.isInteger(numeros[k]))
    if (noEntero) return omitir(`${cols[claves.indexOf(noEntero)]} debe ser un número entero`)

    const advertencias = []
    if ('asignados' in numeros && 'resueltos' in numeros && numeros.resueltos > numeros.asignados) {
      advertencias.push('Resueltos supera a asignados')
    }

    const key = `${normalizarNombre(nombreEnBD)}|${anio}|${mes}`
    if (vistos.has(key)) {
      const previo = parsed[vistos.get(key)]
      parsed[vistos.get(key)] = { omitir: true, motivoOmision: 'Repetida en el archivo (se usa la última)', filaOriginal: previo.filaOriginal || row }
    }
    vistos.set(key, parsed.length)
    parsed.push({
      omitir: false, filaOriginal: row, advertencias,
      payload: { nombre: nombreEnBD, anio, mes, ...numeros },
    })
  })

  return { filas: parsed, ignoradasVacias, encabezadoDetectado }
}

/**
 * Compara una fila válida con lo que ya hay guardado.
 * existente: { asignados, resueltos, monto, capital } | null | undefined (año no cargado → 'desconocido').
 * → 'nuevo' | 'actualiza' | 'igual' | 'desconocido'
 */
export function estadoContraExistente(payload, existente, modo) {
  if (existente === undefined) return 'desconocido'
  if (!existente) return 'nuevo'
  const distinto = CAMPOS[modo].some(k => k in payload && Number(payload[k]) !== Number(existente[k] || 0))
  return distinto ? 'actualiza' : 'igual'
}

