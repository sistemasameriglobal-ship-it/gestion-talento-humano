import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { CICLOS, statusPill, camposFaltantes } from './pillsConstants'

// ── Pill editable (clic cicla entre opciones) ───────────────────────────────
export function EditablePill({ field, value, rowId, onSave }) {
  const [saving, setSaving] = useState(false)
  const opciones = CICLOS[field] || []
  const handleClick = async () => {
    if (saving) return
    const idx = opciones.indexOf(value || '')
    const next = opciones[(idx + 1) % opciones.length]
    setSaving(true)
    await onSave(rowId, field, next)
    setSaving(false)
  }
  return (
    <span
      onClick={onSave ? handleClick : undefined}
      title={onSave ? "Clic para cambiar" : undefined}
      style={{ cursor: onSave ? (saving ? 'wait' : 'pointer') : 'default', opacity: saving ? 0.6 : 1, display: 'inline-flex' }}
    >
      {statusPill(value)}
    </span>
  )
}

// ── Icono de orden ──────────────────────────────────────────────────────────
export function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={11} style={{ opacity: 0.2, marginLeft: 2 }} />
  return sortDir === 'asc'
    ? <ChevronUp size={11} style={{ opacity: 1, color: 'var(--primary)', marginLeft: 2 }} />
    : <ChevronDown size={11} style={{ opacity: 1, color: 'var(--primary)', marginLeft: 2 }} />
}

// ── Indicador de campos faltantes ───────────────────────────────────────────
export function IncompleteIndicator({ row }) {
  const campos = camposFaltantes(row)
  if (!campos.length) return null
  return (
    <span
      title={campos.join('\n')}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: '50%', background: 'var(--warning-bg)',
        color: 'var(--warning-text)', fontSize: 10, fontWeight: 800, cursor: 'default',
        border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)', marginLeft: 4, flexShrink: 0,
      }}
    >!</span>
  )
}