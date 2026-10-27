import { normalizarConcepto } from '../../utils/parseExcel'

// ── Pills de estado ─────────────────────────────────────────────────────────
// Constantes y funciones "no-componente" compartidas por el módulo de Novedades.
// Se mantienen fuera de Pills.jsx para no romper el fast-refresh de React
// (regla react-refresh/only-export-components).

export const PILL_BASE = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
  whiteSpace: 'nowrap', letterSpacing: '0.02em'
}
export const PILL_STYLES = {
  ok: { ...PILL_BASE, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)' },
  si: { ...PILL_BASE, background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid color-mix(in srgb, var(--info) 35%, transparent)' },
  no: { ...PILL_BASE, background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)' },
  na: { ...PILL_BASE, background: 'var(--bg)', color: '#374151', border: '1px solid #D1D5DB' },
  validar: { ...PILL_BASE, background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)' },
  empty: { ...PILL_BASE, background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' },
  other: { ...PILL_BASE, background: 'var(--purple-bg)', color: 'var(--purple-text)', border: '1px solid color-mix(in srgb, var(--purple) 35%, transparent)' },
}

export function statusPill(val) {
  if (!val || val.trim() === '') return <span style={PILL_STYLES.empty}>—</span>
  const v = val.toLowerCase().trim()
  if (v === 'ok') return <span style={PILL_STYLES.ok}>✓ OK</span>
  if (v.startsWith('ok-')) {
    const nombre = val.substring(3)
    return <span style={PILL_STYLES.ok}>✓ OK — <span style={{ fontStyle: 'italic' }}>{nombre}</span></span>
  }
  if (v === 'sí' || v === 'si') return <span style={PILL_STYLES.si}>● Sí</span>
  if (v === 'no') return <span style={PILL_STYLES.no}>✗ No</span>
  if (v === 'n/a') return <span style={PILL_STYLES.na}>N/A</span>
  if (v === 'validar') return <span style={PILL_STYLES.validar}>⚠ Validar</span>
  return <span style={PILL_STYLES.other}>{val}</span>
}

// ── Pill editable (clic cicla entre opciones) ───────────────────────────────
export const CICLOS = {
  validacion_incapacidad: ['', 'OK', 'Validar', 'N/A'],
  prorroga: ['', 'Sí', 'Validar', 'N/A'],
  radicacion_incapacidad: ['', 'OK', 'Validar', 'N/A'],
  observacion_contabilidad: ['', 'OK-DIANA', 'OK-ANDRES', 'OK-ALEJANDRO', 'VALIDAR'],
  nomina_electronica: ['', 'OK-DIANA', 'OK-ANDRES', 'OK-ALEJANDRO', 'VALIDAR'],
  seguridad_social: ['', 'OK-DIANA', 'OK-ANDRES', 'OK-ALEJANDRO', 'VALIDAR'],
}

// ── Indicador de campos faltantes ───────────────────────────────────────────
export function camposFaltantes(row) {
  const campos = []
  if (normalizarConcepto(row.concepto) === 'Incapacidad') {
    const dias = parseFloat(row.total_dias) || 0
    if (dias >= 3 && !(row.radicacion_incapacidad || '').trim()) campos.push('Sin radicación (≥3 días)')
    if (!(row.nomina_electronica || '').trim()) campos.push('Sin nómina e.')
    if (!(row.seguridad_social || '').trim()) campos.push('Sin seg. social')
    const v = (row.validacion_incapacidad || '').toLowerCase().trim()
    if (v === '' || v === 'validar') campos.push('Pendiente validar')
  }
  return campos
}