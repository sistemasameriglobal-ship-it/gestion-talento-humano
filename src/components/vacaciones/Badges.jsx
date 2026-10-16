import { useState } from 'react'
import { ESTADOS, ESTADO_STYLES, TIPO_STYLES } from '../../utils/vacacionesConstants'

// ─── Badge estado ─────────────────────────────────────────────────────────────
export function EstadoBadge({ estado }) {
  const s = ESTADO_STYLES[estado] || ESTADO_STYLES['Pendiente']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 9px',
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap'
    }}>{estado}</span>
  )
}

// Badge de estado editable: clic para ciclar entre los estados posibles
export function EditableEstadoBadge({ estado, rowId, onSave }) {
  const [saving, setSaving] = useState(false)
  const current = estado || 'Pendiente'
  const handleClick = async (e) => {
    e.stopPropagation()
    if (saving) return
    const idx = ESTADOS.indexOf(current)
    const next = ESTADOS[(idx + 1) % ESTADOS.length]
    setSaving(true)
    await onSave(rowId, next)
    setSaving(false)
  }
  return (
    <span
      onClick={onSave ? handleClick : undefined}
      title={onSave ? "Clic para cambiar el estado" : undefined}
      style={{ cursor: onSave ? (saving ? 'wait' : 'pointer') : 'default', opacity: saving ? 0.6 : 1, display: 'inline-flex' }}
    >
      <EstadoBadge estado={current} />
    </span>
  )
}

// ─── Badge tipo de vacación ───────────────────────────────────────────────────
export function TipoBadge({ tipo }) {
  const s = TIPO_STYLES[tipo] || TIPO_STYLES['Vacaciones']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 9px',
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap'
    }}>{tipo || 'Vacaciones'}</span>
  )
}
