// =============================================================
// src/components/ui/SearchableSelect.jsx
// -------------------------------------------------------------
// Select de empleado con buscador (activos / inactivos).
// Compartido por los formularios de Novedades y Procesos
// Disciplinarios.
// =============================================================
import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown } from 'lucide-react'

export default function SearchableSelect({ value, onChange, activos = [], inactivos = [], placeholder = '— Seleccionar —', onCustomSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, ref])

  const q = query.toLowerCase()
  const filtActivos = activos.filter(n => n.toLowerCase().includes(q))
  const filtInactivos = inactivos.filter(n => n.toLowerCase().includes(q))
  const totalResultados = filtActivos.length + filtInactivos.length

  const select = (nombre) => {
    onChange(nombre)
    setOpen(false)
    setQuery('')
  }

  const displayValue = value || placeholder

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--surface)', color: value ? 'var(--text)' : 'var(--text-muted)',
          fontSize: 14, cursor: 'pointer', gap: 8, textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {displayValue}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          {/* Buscador */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar empleado..."
              style={{
                width: '100%', padding: '5px 8px 5px 26px', border: '1px solid var(--border)',
                borderRadius: 6, fontSize: 13, background: 'var(--bg)', color: 'var(--text)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {/* Opción vacía */}
            <div
              onClick={() => select('')}
              style={{
                padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)',
                background: !value ? 'var(--primary-light)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = !value ? 'var(--primary-light)' : 'transparent'}
            >
              {placeholder}
            </div>

            {totalResultados === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 13, textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: onCustomSelect && query.trim() ? 8 : 0 }}>
                  Sin resultados
                </div>
                {onCustomSelect && query.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onCustomSelect(query.trim())
                      setOpen(false)
                      setQuery('')
                    }}
                    style={{
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex',
                      alignItems: 'center', gap: 4
                    }}
                  >
                    <span>➕</span> Usar "{query.trim()}" (persona externa)
                  </button>
                )}
              </div>
            )}

            {filtActivos.length > 0 && (
              <>
                <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  ✅ Activos ({filtActivos.length})
                </div>
                {filtActivos.map(nombre => (
                  <div
                    key={nombre}
                    onClick={() => select(nombre)}
                    style={{
                      padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                      background: value === nombre ? 'var(--primary-light)' : 'transparent',
                      color: value === nombre ? 'var(--primary)' : 'var(--text)',
                      fontWeight: value === nombre ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (value !== nombre) e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = value === nombre ? 'var(--primary-light)' : 'transparent' }}
                  >
                    {nombre}
                  </div>
                ))}
              </>
            )}

            {filtInactivos.length > 0 && (
              <>
                <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  ⚪ Inactivos / Retirados ({filtInactivos.length})
                </div>
                {filtInactivos.map(nombre => (
                  <div
                    key={nombre}
                    onClick={() => select(nombre)}
                    style={{
                      padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                      background: value === nombre ? 'var(--primary-light)' : 'transparent',
                      color: value === nombre ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: value === nombre ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (value !== nombre) e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = value === nombre ? 'var(--primary-light)' : 'transparent' }}
                  >
                    {nombre}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}