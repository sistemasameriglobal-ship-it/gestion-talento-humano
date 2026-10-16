import { ArrowUpDown } from 'lucide-react'
import StatCard from './StatCard'
import BarChart from './BarChart'
import { hoyISO } from '../../utils/fecha'
import { obtenerFechaRegresoLaboral } from '../../utils/diasHabiles'

function Th({ col, children, center, sortBy, tieneDias, color, onSort }) {
  return (
    <th
      style={{ textAlign: center ? 'center' : 'left', cursor: tieneDias ? 'pointer' : 'default', userSelect: 'none' }}
      onClick={tieneDias ? () => onSort(col) : undefined}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: sortBy === col ? color : undefined }}>
        {children}
        {tieneDias && <ArrowUpDown size={11} style={{ opacity: sortBy === col ? 1 : 0.35 }} />}
      </span>
    </th>
  )
}

// Bloque completo de una sección de concepto (Incapacidad / LNR / LR...): KPIs
// propios, alertas de gestión pendiente, gráfico por área, vencimientos
// próximos, y la tabla de "Top colaboradores" con orden dinámico.
export default function ConceptoSeccion({
  concepto, d, idx, empleadosUnicosBase, diasPeriodoBase, diasPeriodoLabel,
  filterDependencia, setFilterDependencia,
  sortBy, setSortBy, setPersonaDetalle,
}) {
  const color = d.color
  const tieneDias = d.totalDias > 0
  const reincSet = new Set(d.reincidentes.map(e => e.nombre))
  const sorted = [...d.topEmpleados].sort((a, b) => {
    if (sortBy === 'episodios') return b.episodios - a.episodios
    if (sortBy === 'prom') return (b.episodios ? b.dias / b.episodios : 0) - (a.episodios ? a.dias / a.episodios : 0)
    return b.dias - a.dias
  })

  return (
    <div className="db-anim-card" style={{ marginBottom: 8, animationDelay: `${idx * 70}ms` }}>
      {/* Encabezado de sección */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 10px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span className="tag-c tag-c--line" style={{
          '--tag': color, padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>{concepto}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* KPIs del concepto — 4 esenciales */}
      <div className="stat-grid" style={{ marginBottom: 12 }}>
        <StatCard label="Registros" value={d.count} sub={`${d.empUnicos} colaboradores`} color={color} delay={0} />
        {tieneDias && <StatCard label="Total días" value={Math.round(d.totalDias)} sub={`Prom. ${d.promDias.toFixed(1)} días/registro`} color={color} delay={60} />}
        {tieneDias && <StatCard label="Tasa ausentismo" value={d.tasaAusentismo} decimals={1} suffix="%" sub={`días / (${empleadosUnicosBase} colaboradores activos × ${diasPeriodoBase})`} title={`Tasa de ${concepto} sobre el total de colaboradores activos en el período (no solo los que tuvieron ${concepto}, y sin contar a quien ya se había retirado). Período usado: ${diasPeriodoLabel}.`} color="#0369A1" delay={120} />}
        {d.reincidentes.length > 0 && <StatCard label="Reincidentes" value={d.reincidentes.length} sub="con 2+ episodios" color="var(--danger-text)" delay={180} />}
      </div>

      {/* Alertas de gestión */}
      {(d.sinRadicacion > 0 || d.sinNomina > 0 || d.sinSegSocial > 0 || d.pendientesValidar > 0) && (
        <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning-text)', marginBottom: 8 }}>⚠ Pendientes de gestión ({concepto})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
            {[
              { label: 'Sin radicación', val: d.sinRadicacion, c: '#DC2626', bg: 'rgba(220,38,38,.08)' },
              { label: 'Sin nómina electrónica', val: d.sinNomina, c: '#D97706', bg: 'rgba(217,119,6,.08)' },
              { label: 'Sin seguridad social', val: d.sinSegSocial, c: '#7C3AED', bg: 'rgba(124,58,237,.08)' },
              { label: 'Pendientes validar', val: d.pendientesValidar, c: '#0369A1', bg: 'rgba(3,105,161,.08)' },
            ].filter(a => a.val > 0).map(a => (
              <div key={a.label} style={{ background: a.bg, borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: a.c, fontWeight: 600 }}>{a.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: a.c }}>{a.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Por área */}
        {d.depOrdenadas.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{concepto} por área</h3>
            <BarChart
              items={d.depOrdenadas}
              color={color}
              maxItems={6}
              activeLabel={filterDependencia}
              onBarClick={(area) => setFilterDependencia(filterDependencia === area ? '' : area)}
            />
          </div>
        )}

        {/* Próximos vencimientos */}
        {d.proxVencimientos.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Vencimientos próximos — 7 días</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th style={{ textAlign: 'center' }}>Fin incapacidad / Regreso</th>
                    <th style={{ textAlign: 'center' }}>Días</th>
                  </tr>
                </thead>
                <tbody>
                  {d.proxVencimientos.slice(0, 6).map((r, i) => {
                    const fechaRegreso = r.fecha_regreso || obtenerFechaRegresoLaboral(r.fecha_fin)
                    const hoyStr = hoyISO()
                    const hoyUTC = new Date(hoyStr + 'T00:00:00Z').getTime()
                    const regUTC = new Date(fechaRegreso + 'T00:00:00Z').getTime()
                    const diasRest = Math.max(0, Math.round((regUTC - hoyUTC) / 86400000))
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{r.nombre_empleado}</td>
                        <td style={{ textAlign: 'center', fontSize: 11.5 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Fecha Fin: {r.fecha_fin}</span>
                          <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>•</span>
                          <strong style={{ color: 'var(--text)' }}>Regresa: {fechaRegreso}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            title={`Regresa a laborar el día hábil ${fechaRegreso} (fin de reposo: ${r.fecha_fin})`}
                            style={{ background: diasRest <= 2 ? 'rgba(220,38,38,.14)' : 'rgba(217,119,6,.14)', color: diasRest <= 2 ? 'var(--danger-text)' : 'var(--warning-text)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}
                          >
                            {diasRest === 0 ? 'Hoy' : `${diasRest}d`}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tabla unificada: Top colaboradores (reincidentes resaltados, orden dinámico) */}
      {d.topEmpleados.length > 0 && (
        <div className="card" style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700 }}>Top colaboradores{tieneDias ? ' — clic en encabezado para ordenar' : ''}</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {d.reincidentes.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--danger-text)', background: 'var(--danger-bg)', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                  {d.reincidentes.length} reincidentes
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top {Math.min(sorted.length, 10)}</span>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Colaborador</th><th>Área</th>
                  <Th col="episodios" center sortBy={sortBy} tieneDias={tieneDias} color={color} onSort={setSortBy}>Ep.</Th>
                  {tieneDias && <Th col="dias" center sortBy={sortBy} tieneDias={tieneDias} color={color} onSort={setSortBy}>Días</Th>}
                  {tieneDias && <Th col="prom" center sortBy={sortBy} tieneDias={tieneDias} color={color} onSort={setSortBy}>Prom.</Th>}
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 10).map((emp, i) => {
                  const esReincidente = reincSet.has(emp.nombre)
                  return (
                    <tr
                      key={emp.nombre}
                      onClick={() => setPersonaDetalle({ nombre: emp.nombre, concepto, color, registros: emp.registros })}
                      style={{ cursor: 'pointer', ...(esReincidente ? { background: 'rgba(220,38,38,.08)' } : {}) }}
                      title="Ver detalle de esta persona"
                    >
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary)' }}>
                        {emp.nombre}
                        {esReincidente && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--danger-text)', fontWeight: 700 }}>●</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{emp.area}</td>
                      <td style={{ textAlign: 'center' }}>{emp.episodios}</td>
                      {tieneDias && <td style={{ textAlign: 'center' }}><strong style={{ color }}>{Math.round(emp.dias)}</strong></td>}
                      {tieneDias && <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{emp.episodios ? (emp.dias / emp.episodios).toFixed(1) : '—'}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {d.reincidentes.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--danger-text)', marginTop: 8 }}>● reincidente (2+ episodios)</div>
          )}
        </div>
      )}
    </div>
  )
}
