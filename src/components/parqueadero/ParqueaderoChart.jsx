export default function ParqueaderoChart({
  conteoMes, maxConteo, filterMes, filterAnio, setFilterMes, setFilterAnio, setPage,
}) {
  if (conteoMes.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Registros por mes</h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clic en fila para filtrar</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {conteoMes.map(e => {
          const isActive = filterMes === e.mes && filterAnio === e.anio
          return (
            <div key={`${e.mes}${e.anio}`} style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              borderRadius: 8, padding: '5px 8px',
              background: isActive ? 'var(--primary-light,#E1F5EE)' : 'transparent',
              transition: 'background .15s',
            }}
              onClick={() => { setFilterMes(isActive ? '' : e.mes); setFilterAnio(isActive ? '' : e.anio); setPage(1) }}>
              <div style={{ width: 120, fontSize: 12, color: isActive ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isActive ? 700 : 400, flexShrink: 0 }}>
                {e.mes} {e.anio}
              </div>
              <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 999, height: 8, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999,
                  width: `${(e.total / maxConteo) * 100}%`,
                  background: isActive ? 'var(--primary)' : '#94A3B8',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'width .4s ease, background .15s',
                }} />
              </div>
              <div style={{ width: 22, fontSize: 12, fontWeight: 700, textAlign: 'right', color: isActive ? 'var(--primary)' : 'var(--text)' }}>{e.total}</div>
              <div style={{ display: 'flex', gap: 4, minWidth: 60 }}>
                {e.carros > 0 && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, background: 'var(--info-bg)', color: 'var(--info-text)' }}>{e.carros}🚗</span>}
                {e.motos > 0 && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>{e.motos}🏍</span>}
                {e.bicicletas > 0 && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, background: '#D1FAE5', color: '#047857' }}>{e.bicicletas}🚲</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
