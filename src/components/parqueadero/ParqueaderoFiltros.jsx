import { Search, X, LayoutGrid, List } from 'lucide-react'
import { MESES, TIPOS } from '../../utils/parqueaderoConstants'

export default function ParqueaderoFiltros({
  rows, carros, motos, bicicletas = 0, exentos, sinReporte,
  filterTab, setFilterTab, setFilterTipo,
  vista, setVista,
  search, setSearch,
  filterAnio, setFilterAnio, aniosDisponibles,
  filterMes, setFilterMes,
  filterTipo,
  filterEstado, setFilterEstado,
  hasFilter, clearAll, activeChips,
  filtered,
  setPage,
}) {
  const tabs = [
    { val: '', label: `Todos (${rows.length})` },
    { val: 'CARRO', label: `🚗 Carros (${carros})` },
    { val: 'MOTO', label: `🏍 Motos (${motos})` },
    { val: 'BICICLETA', label: `🚲 Bicicletas (${bicicletas})` },
    { val: 'exentos', label: `✓ Exentos (${exentos})` },
    ...(sinReporte > 0 ? [{ val: 'sin_rep', label: `📤 Sin reporte (${sinReporte})`, warn: true }] : []),
  ]

  return (
    <>
      {/* ── Tabs rápidos ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.val} onClick={() => { setFilterTab(t.val); setFilterTipo(''); setPage(1) }} style={{
            padding: '5px 13px', borderRadius: 999, fontSize: 11, cursor: 'pointer', fontWeight: filterTab === t.val ? 700 : 400,
            border: filterTab === t.val ? (t.warn ? '1.5px solid color-mix(in srgb, var(--info) 35%, transparent)' : '1.5px solid var(--primary)') : (t.warn ? '1px solid color-mix(in srgb, var(--info) 35%, transparent)' : '1px solid var(--border)'),
            color: filterTab === t.val ? '#fff' : (t.warn ? 'var(--info-text)' : 'var(--text-muted)'),
            background: filterTab === t.val ? (t.warn ? '#4338CA' : 'var(--primary)') : (t.warn ? 'var(--info-bg)' : 'var(--surface,var(--bg))'),
            transition: 'all .15s',
          }}>{t.label}</button>
        ))}

        {/* Toggle vista */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: 3, marginLeft: 'auto', flexShrink: 0 }}>
          <button className="park-view-btn" onClick={() => setVista('tabla')}
            style={{ background: vista === 'tabla' ? 'var(--surface)' : 'transparent', boxShadow: vista === 'tabla' ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
            <List size={14} style={{ color: vista === 'tabla' ? 'var(--primary)' : 'var(--text-muted)' }} />
          </button>
          <button className="park-view-btn" onClick={() => setVista('cards')}
            style={{ background: vista === 'cards' ? 'var(--surface)' : 'transparent', boxShadow: vista === 'cards' ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
            <LayoutGrid size={14} style={{ color: vista === 'cards' ? 'var(--primary)' : 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="filters-row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control search-input" style={{ paddingLeft: 32 }} placeholder="Buscar nombre, placa, cédula..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="form-control" style={{ flex: '0 0 100px' }} value={filterAnio} onChange={e => { setFilterAnio(e.target.value); setPage(1) }}>
          <option value="">Año</option>
          {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="form-control" style={{ flex: '0 0 140px' }} value={filterMes} onChange={e => { setFilterMes(e.target.value); setPage(1) }}>
          <option value="">Todos los meses</option>
          {MESES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="form-control" style={{ flex: '0 0 120px' }} value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1) }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-control" style={{ flex: '0 0 130px' }} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          <option value="activos">✓ Activos</option>
          <option value="retirados">⛔ Retirados</option>
        </select>
        {hasFilter && <button className="btn btn-ghost btn-sm" onClick={clearAll}><X size={13} /> Limpiar todo</button>}
      </div>

      {/* ── Chips filtros activos ── */}
      {activeChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {activeChips.map((chip, i) => (
            <span key={i} className="park-chip" style={{ animationDelay: `${i * 0.05}s` }}>
              {chip.label}
              <button onClick={chip.clear}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Contador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}{hasFilter ? ' filtrados' : ' totales'}</span>
      </div>
    </>
  )
}
