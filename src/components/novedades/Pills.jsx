import { useState, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { CICLOS, statusPill, camposFaltantes } from './pillsConstants'

// ── Diagnóstico editable inline (clic para escribir y guardar en BD) ─────────
export function EditableDiagnostico({ value, rowId, onSave }) {
  const [editing, setEditing] = useState(false)
  const [tempVal, setTempVal] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setTempVal(value || '')
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleStart = (e) => {
    if (!onSave) return
    e.stopPropagation()
    setTempVal(value || '')
    setEditing(true)
  }

  const handleCommit = async () => {
    setEditing(false)
    const clean = (tempVal || '').trim().toUpperCase()
    if (clean === (value || '').trim().toUpperCase()) return
    setSaving(true)
    try {
      await onSave(rowId, 'diagnostico', clean || null)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCommit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setTempVal(value || '')
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={tempVal}
          onChange={e => setTempVal(e.target.value.toUpperCase())}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          placeholder="J00X"
          maxLength={10}
          style={{
            width: 68,
            padding: '2px 5px',
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'monospace',
            textAlign: 'center',
            textTransform: 'uppercase',
            borderRadius: 5,
            border: '1.5px solid var(--primary)',
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            boxShadow: '0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent)',
          }}
        />
      </div>
    )
  }

  const hasVal = Boolean((value || '').trim())

  return (
    <span
      onClick={handleStart}
      title={onSave ? "Clic para editar código de diagnóstico" : undefined}
      style={{
        cursor: onSave ? 'pointer' : 'default',
        opacity: saving ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {hasVal ? (
        <span
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '2px 6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'border-color .15s, background .15s, box-shadow .15s',
          }}
          onMouseEnter={e => {
            if (onSave) {
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--primary)'
            }
          }}
          onMouseLeave={e => {
            if (onSave) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          {value.trim().toUpperCase()}
          {saving && <span style={{ fontSize: 9 }}>⏳</span>}
        </span>
      ) : (
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            padding: '2px 6px',
            borderRadius: 4,
            transition: 'all .15s',
            display: 'inline-flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => {
            if (onSave) {
              e.currentTarget.style.color = 'var(--primary)'
              e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 12%, transparent)'
            }
          }}
          onMouseLeave={e => {
            if (onSave) {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {saving ? '⏳' : '—'}
        </span>
      )}
    </span>
  )
}

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