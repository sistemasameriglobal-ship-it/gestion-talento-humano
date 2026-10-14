import { CONCEPTOS_LIST } from './novedadesConstants'

// ── Normalización de conceptos para la importación masiva desde Excel ──────
// Convierte variantes/typos comunes del Excel de origen a los conceptos
// oficiales de CONCEPTOS_LIST. Reglas acordadas con el usuario:
//  - "LRN" es un error de tipeo de "LNR".
//  - "1/2 <concepto>" (ej. "1/2 LNR") = ese concepto pero medio día.
//  - "LR/ Situación Médica" y similares = concepto base + el resto como
//    observación adicional.
//  - "No superación P. Prueba" = "Terminación de Contrato".
//  - Cualquier otra cosa que no se reconozca cae en "Otros", conservando el
//    texto original en la observación para no perder información.
export function normalizarConceptoImportado(raw) {
  const original = (raw || '').toString().trim()
  if (!original) return { concepto: '', medioDia: false, observacionExtra: '' }
  const s = original.toLowerCase()

  const exacto = CONCEPTOS_LIST.find(c => c.toLowerCase() === s)
  if (exacto) return { concepto: exacto, medioDia: false, observacionExtra: '' }

  const mitad = s.match(/^1\/2\s*(.+)$/)
  if (mitad) {
    const base = mitad[1].trim()
    const baseMatch = CONCEPTOS_LIST.find(c => c.toLowerCase() === base)
    if (baseMatch) return { concepto: baseMatch, medioDia: true, observacionExtra: '' }
    if (base === 'lnr') return { concepto: 'LNR', medioDia: true, observacionExtra: '' }
    if (base === 'lr') return { concepto: 'LR', medioDia: true, observacionExtra: '' }
  }

  if (s === 'lrn') return { concepto: 'LNR', medioDia: false, observacionExtra: '' }
  if (s === 'incapacidad') return { concepto: 'Incapacidad', medioDia: false, observacionExtra: '' }

  if (/^lr[/\s-]/.test(s)) {
    const resto = original.replace(/^lr[/\s-]*/i, '').trim()
    return { concepto: 'LR', medioDia: false, observacionExtra: resto }
  }
  if (/^lnr[/\s-]/.test(s)) {
    const resto = original.replace(/^lnr[/\s-]*/i, '').trim()
    return { concepto: 'LNR', medioDia: false, observacionExtra: resto }
  }

  if (s.includes('superaci') && s.includes('prueba')) {
    return { concepto: 'Terminación de Contrato', medioDia: false, observacionExtra: original }
  }

  return { concepto: 'Otros', medioDia: false, observacionExtra: `Concepto original: ${original}` }
}

// Convierte el serial numérico de fecha de Excel (días desde 1899-12-30) a
// { y, m, d }. 25569 = días entre la "época" de Excel y el epoch Unix.
// Sustituye a XLSX.SSF.parse_date_code para no cargar la librería xlsx
// completa solo por este cálculo.
function serialExcelAFecha(serial) {
  const ms = Math.round((serial - 25569) * 86400000)
  const d = new Date(ms)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}

import { parsearFecha } from './parseExcel'

// Convierte dd/mm/yyyy, fechas de Excel (Date o serial) o yyyy-mm-dd a 'yyyy-mm-dd'
export function parseFechaImportada(val) {
  return parsearFecha(val)
}

// Normaliza nombres para compararlos sin importar mayúsculas, tildes o
// espacios extra (mismo criterio que usa Empleados.jsx para detectar duplicados).
export function normalizarNombre(s) {
  return (s || '')
    .toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// Limpia un valor de celda de Excel: recorta espacios y trata "N/A" como vacío.
export function clean(v) {
  const t = (v || '').toString().trim()
  return (!t || t.toUpperCase() === 'N/A') ? null : t
}

// yyyy-mm-dd → dd/mm/yyyy (mismo formato que usa la plantilla de importación)
export function aFechaDDMMYYYY(iso) {
  if (!iso) return ''
  const m = iso.toString().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}
