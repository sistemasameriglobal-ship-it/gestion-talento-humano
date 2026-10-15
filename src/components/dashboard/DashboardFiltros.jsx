import { X } from 'lucide-react'
import { MESES_DASHBOARD as MESES } from '../../utils/dashboardConstants'

const basePill = {
  padding: '5px 12px',
  borderRadius: 20,
  fontSize: 12,
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.15s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
}

const pillStyle = (activo) => ({
  ...basePill,
  background: activo ? 'var(--primary)' : 'var(--bg)',
  color: activo ? '#fff' : 'var(--text-muted)',
  outline: activo ? 'none' : '1px solid var(--border)',
  fontWeight: activo ? 600 : 400,
  boxShadow: activo ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
})

const formatPeriodoLabel = (p) => {
  if (!p) return ''
  const parts = p.split('-')
  if (parts.length === 2) {
    const y = parts[0]
    const m = parts[1]
    const mesObj = MESES.find(x => x.val === m || parseInt(x.val, 10) === parseInt(m, 10))
    if (mesObj) return `${p} · ${mesObj.label} ${y}`
  }
  return p
}

export default function DashboardFiltros({
  aniosDisponibles, filterAnio, setFilterAnio,
  filterMeses, setFilterMeses, toggleMes,
  periodosDisponibles, filterPeriodo, setFilterPeriodo,
  filterConcepto, setFilterConcepto,
  filterDependencia, setFilterDependencia,
  dataLength, hasFilter, clearFilters,
}) {
  // Mostramos solo los 3 periodos más recientes como acceso rápido
  const periodosRecientes = periodosDisponibles.slice(0, 3)
  const isPeriodoEnRecientes = periodosRecientes.includes(filterPeriodo)

  return (
    <div className="card" style={{ marginBottom: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* ── Fila 1: Año y Periodo Rápido ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 68, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Año
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { setFilterAnio(''); setFilterMeses([]); setFilterPeriodo('') }}
            style={pillStyle(!filterAnio && !filterPeriodo)}
          >
            Todos
          </button>
          {aniosDisponibles.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => { setFilterAnio(a); setFilterMeses([]); setFilterPeriodo('') }}
              style={pillStyle(filterAnio === a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* ── Fila 2: Meses (cuando hay un año seleccionado) ── */}
      {filterAnio && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', paddingLeft: 78 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>Meses:</span>
            <button
              type="button"
              onClick={() => setFilterMeses([])}
              style={{
                ...basePill,
                padding: '3px 10px',
                fontSize: 11.5,
                background: filterMeses.length === 0 ? 'var(--primary)' : 'var(--bg)',
                color: filterMeses.length === 0 ? '#fff' : 'var(--text-muted)',
                outline: filterMeses.length === 0 ? 'none' : '1px solid var(--border)',
                fontWeight: filterMeses.length === 0 ? 600 : 400,
              }}
            >
              Todos ({filterAnio})
            </button>
            {MESES.map(m => {
              const seleccionado = filterMeses.includes(m.val)
              const enRango = !seleccionado && filterMeses.length > 1 &&
                m.val > filterMeses[0] && m.val < filterMeses[filterMeses.length - 1]
              return (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => { toggleMes(m.val); setFilterPeriodo('') }}
                  style={{
                    ...basePill,
                    padding: '3px 10px',
                    fontSize: 11.5,
                    background: seleccionado ? 'var(--primary)' : enRango ? 'color-mix(in srgb, var(--primary) 18%, var(--bg))' : 'var(--bg)',
                    color: seleccionado ? '#fff' : 'var(--text-muted)',
                    outline: seleccionado ? 'none' : '1px solid var(--border)',
                    fontWeight: seleccionado ? 600 : 400,
                  }}
                >
                  {m.label.substring(0, 3)}
                </button>
              )
            })}
          </div>
          {filterMeses.length > 1 && (
            <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4, width: '100%', fontWeight: 500 }}>
              Rango seleccionado: {MESES.find(m => m.val === filterMeses[0])?.label} – {MESES.find(m => m.val === filterMeses[filterMeses.length - 1])?.label} {filterAnio}
            </div>
          )}
        </div>
      )}

      {/* ── Fila 3: Periodo Rápido y Selector Desplegable ── */}
      {periodosDisponibles.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 68, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Periodo
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Accesos rápidos a los 3 más recientes */}
            {periodosRecientes.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setFilterPeriodo(filterPeriodo === p ? '' : p)
                  setFilterAnio('')
                  setFilterMeses([])
                }}
                style={pillStyle(filterPeriodo === p)}
                title={`Filtrar por ${formatPeriodoLabel(p)}`}
              >
                {p}
              </button>
            ))}

            {/* Si hay un periodo seleccionado que no está en los 3 más recientes */}
            {filterPeriodo && !isPeriodoEnRecientes && (
              <span
                style={{
                  ...basePill,
                  background: 'var(--primary)',
                  color: '#fff',
                  fontWeight: 600,
                  gap: 6,
                }}
              >
                {filterPeriodo}
                <X
                  size={13}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setFilterPeriodo('')}
                  title="Quitar filtro de periodo"
                />
              </span>
            )}

            {/* Selector desplegable compacto con el histórico completo */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{
                  padding: '4px 28px 4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  height: 29,
                  background: 'var(--bg)',
                  borderColor: filterPeriodo && !isPeriodoEnRecientes ? 'var(--primary)' : 'var(--border)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  width: 'auto',
                  minWidth: 160,
                }}
                value={filterPeriodo || ''}
                onChange={e => {
                  const val = e.target.value
                  setFilterPeriodo(val)
                  if (val) {
                    setFilterAnio('')
                    setFilterMeses([])
                  }
                }}
              >
                <option value="">📅 Más periodos ({periodosDisponibles.length})...</option>
                {periodosDisponibles.map(p => (
                  <option key={p} value={p}>
                    {formatPeriodoLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Fila 4: Concepto ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 68, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Concepto
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setFilterConcepto('')}
            style={pillStyle(!filterConcepto)}
          >
            Todos
          </button>
          
          {/* Incapacidad */}
          <button
            type="button"
            onClick={() => setFilterConcepto(filterConcepto === 'Incapacidad' ? '' : 'Incapacidad')}
            style={{
              ...basePill,
              background: filterConcepto === 'Incapacidad' ? '#ef4444' : 'var(--bg)',
              color: filterConcepto === 'Incapacidad' ? '#fff' : 'var(--text-muted)',
              outline: filterConcepto === 'Incapacidad' ? 'none' : '1px solid var(--border)',
              fontWeight: filterConcepto === 'Incapacidad' ? 600 : 400,
              boxShadow: filterConcepto === 'Incapacidad' ? '0 2px 8px rgba(239,68,68,0.35)' : 'none',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: filterConcepto === 'Incapacidad' ? '#fff' : '#ef4444',
            }} />
            Incapacidad
          </button>

          {/* LNR */}
          <button
            type="button"
            onClick={() => setFilterConcepto(filterConcepto === 'LNR' ? '' : 'LNR')}
            style={{
              ...basePill,
              background: filterConcepto === 'LNR' ? '#f59e0b' : 'var(--bg)',
              color: filterConcepto === 'LNR' ? '#fff' : 'var(--text-muted)',
              outline: filterConcepto === 'LNR' ? 'none' : '1px solid var(--border)',
              fontWeight: filterConcepto === 'LNR' ? 600 : 400,
              boxShadow: filterConcepto === 'LNR' ? '0 2px 8px rgba(245,158,11,0.35)' : 'none',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: filterConcepto === 'LNR' ? '#fff' : '#f59e0b',
            }} />
            LNR
          </button>

          {/* LR */}
          <button
            type="button"
            onClick={() => setFilterConcepto(filterConcepto === 'LR' ? '' : 'LR')}
            style={{
              ...basePill,
              background: filterConcepto === 'LR' ? '#3b82f6' : 'var(--bg)',
              color: filterConcepto === 'LR' ? '#fff' : 'var(--text-muted)',
              outline: filterConcepto === 'LR' ? 'none' : '1px solid var(--border)',
              fontWeight: filterConcepto === 'LR' ? 600 : 400,
              boxShadow: filterConcepto === 'LR' ? '0 2px 8px rgba(59,130,246,0.35)' : 'none',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: filterConcepto === 'LR' ? '#fff' : '#3b82f6',
            }} />
            LR
          </button>
        </div>
      </div>

      {/* ── Fila de Área Activa (si viene de drill-down de gráfica) ── */}
      {filterDependencia && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 78 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 600, background: 'var(--info-bg)', color: 'var(--info-text)',
          }}>
            🏢 Área: {filterDependencia}
            <X size={13} style={{ cursor: 'pointer' }} onClick={() => setFilterDependencia('')} title="Quitar filtro de área" />
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(filtrado al hacer clic en gráfica de área)</span>
        </div>
      )}

      {/* ── Barra inferior: Contador de Registros y Limpiar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, marginTop: 2, borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{dataLength.toLocaleString()}</strong> registro{dataLength !== 1 ? 's' : ''} {hasFilter ? 'filtrados' : 'totales'}
          </span>
        </div>

        {hasFilter && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}
          >
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

    </div>
  )
}
