import { Search, X, Calendar } from 'lucide-react'
import FiltroEmpleadoSelect from './FiltroEmpleadoSelect'

const formatPeriodo = (p, meses) => {
  if (!p) return ''
  const parts = String(p).trim().split('-')
  if (parts.length === 2) {
    const m = parts[1]
    const mesObj = (meses || []).find(x => x.val === m || parseInt(x.val, 10) === parseInt(m, 10))
    if (mesObj) return `${p} · ${mesObj.label}`
  }
  return p
}

const agruparPeriodos = (items) => {
  const grupos = {}
  for (const p of items) {
    if (!p) continue
    const y = p.includes('-') ? p.split('-')[0] : 'Otros'
    if (!grupos[y]) grupos[y] = []
    grupos[y].push(p)
  }
  return grupos
}

// Barra de filtros de la página de Novedades. Vive aparte porque es un
// bloque grande y con mucha lógica de reset combinado (año limpia mes y
// periodo, etc.).
export default function NovedadesFiltros({
  searchInput, setSearchInput,
  empleadoFiltro, setEmpleadoFiltro, empleadosActivos = [],
  filterConcepto, setFilterConcepto,
  filterDep, setFilterDep, depsEnDatos,
  filterDiagnostico, setFilterDiagnostico,
  filterAnio, setFilterAnio,
  filterMes, setFilterMes,
  periodos, filterPeriodo, setFilterPeriodo,
  soloActivas, setSoloActivas,
  rangoMes, hasFilter, clearFilters,
  conceptos, meses, aniosDisponibles, setPage,
}) {
  const periodosVisibles = filterAnio
    ? periodos.filter(p => p.startsWith(filterAnio))
    : periodos

  const gruposPeriodos = agruparPeriodos(periodosVisibles)

  return (
    <div className="filters-row" style={{ flexWrap: 'wrap', gap: 8 }}>
      {/* Búsqueda */}
      <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="form-control search-input" style={{ paddingLeft: 32 }} placeholder="Buscar empleado, área..."
          value={searchInput} onChange={e => setSearchInput(e.target.value)} />
      </div>

      {/* Selector / Filtro por empleado con buscador interno */}
      <FiltroEmpleadoSelect
        value={empleadoFiltro}
        onChange={val => { setEmpleadoFiltro(val); setPage(1) }}
        empleados={empleadosActivos}
        placeholder="Todos los empleados"
      />

      {/* Concepto */}
      <select className="form-control" style={{ flex: '1 1 140px', minWidth: 130 }} value={filterConcepto}
        onChange={e => { setFilterConcepto(e.target.value); setPage(1) }}>
        <option value="">Todos los conceptos</option>
        {conceptos.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Área / Dependencia */}
      <select className="form-control" style={{ flex: '1 1 140px', minWidth: 130 }} value={filterDep}
        onChange={e => { setFilterDep(e.target.value); setPage(1) }}>
        <option value="">Todas las áreas</option>
        {depsEnDatos.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* Diagnóstico (código) */}
      <div style={{ position: 'relative', flex: '0 1 150px', minWidth: 130 }}>
        <input className="form-control" placeholder="Código diagnóstico..."
          value={filterDiagnostico} onChange={e => { setFilterDiagnostico(e.target.value); setPage(1) }} />
      </div>

      {/* Año */}
      <select className="form-control" style={{ flex: '0 0 100px' }} value={filterAnio}
        onChange={e => { setFilterAnio(e.target.value); setFilterMes(''); setFilterPeriodo(''); setPage(1) }}>
        <option value="">Año</option>
        {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      {/* Mes */}
      <select className="form-control" style={{ flex: '0 0 130px' }} value={filterMes}
        onChange={e => { setFilterMes(e.target.value); setPage(1) }} disabled={!filterAnio}>
        <option value="">Mes</option>
        {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
      </select>

      {/* Periodo contable agrupado con nombre de mes */}
      {periodos.length > 0 && (
        <select
          className="form-control"
          style={{
            flex: '0 0 180px',
            minWidth: 160,
            borderColor: filterPeriodo ? 'var(--primary)' : undefined,
            fontWeight: filterPeriodo ? 600 : 400,
          }}
          value={filterPeriodo}
          onChange={e => {
            const val = e.target.value
            setFilterPeriodo(val)
            if (val) {
              setFilterAnio('')
              setFilterMes('')
            }
            setPage(1)
          }}
        >
          <option value="">📅 Periodo contable...</option>
          {Object.entries(gruposPeriodos).map(([anio, items]) => (
            <optgroup key={anio} label={`Año ${anio}`}>
              {items.map(p => (
                <option key={p} value={p}>
                  {formatPeriodo(p, meses)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      {/* Novedades activas o próximas (aún no vencidas) */}
      <button
        type="button"
        onClick={() => { setSoloActivas(v => !v); setPage(1) }}
        title="Mostrar novedades vigentes hoy y también las programadas a futuro (que aún no han vencido)"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto',
          padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
          background: soloActivas ? 'var(--success-bg)' : 'var(--surface)',
          color: soloActivas ? 'var(--success-text)' : 'var(--text-muted)',
          border: soloActivas ? '1px solid color-mix(in srgb, var(--success) 35%, transparent)' : '1px solid var(--border)',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: soloActivas ? '#22C55E' : 'var(--border)', flexShrink: 0,
        }} />
        ✅ Novedad activa
      </button>

      {/* Rango mes activo */}
      {rangoMes && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--primary-light)', borderRadius: 8, fontSize: 12, color: 'var(--primary)', fontWeight: 600, flex: '0 0 auto' }}>
          <Calendar size={13} />
          {rangoMes.ini} → {rangoMes.fin}
          <span style={{ marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>({rangoMes.lastDay}d)</span>
        </div>
      )}

      {hasFilter && (
        <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={13} />Limpiar</button>
      )}
    </div>
  )
}