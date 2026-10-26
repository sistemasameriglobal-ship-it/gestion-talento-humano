import { useState } from 'react'
import { X, Pencil } from 'lucide-react'
import { MESES, MESES_FULL } from '../../utils/productividadConstants'
import { iniciales, fmtFecha, noHabiaIngresado, calcPct, colorPct } from '../../utils/productividadHelpers'

const ceros = () => Array(MESES.length).fill(0)
const suma = (arr) => arr.reduce((s, v) => s + v, 0)

export default function DetalleModal({ persona, anio, cfg, onCerrar, onEditar }) {
  const [anioVista, setAnioVista] = useState(anio)

  const aniosConDatos = Array.from(new Set([
    ...Object.keys(persona.resueltosPorAnio || {}),
    ...Object.keys(persona.asignadosPorAnio || {}),
    ...Object.keys(persona.friosPorAnio || {}),
  ])).map(Number).sort((a, b) => b - a)

  const histResueltos = aniosConDatos.reduce((s, a) => s + suma(persona.resueltosPorAnio?.[a] || ceros()), 0)
  const histAsignados = aniosConDatos.reduce((s, a) => s + suma(persona.asignadosPorAnio?.[a] || ceros()), 0)
  const histFrios = aniosConDatos.reduce((s, a) => s + suma(persona.friosPorAnio?.[a] || ceros()), 0)
  const histTotalGen = histResueltos + histFrios

  const resueltos = persona.resueltosPorAnio?.[anioVista] || ceros()
  const asignados = persona.asignadosPorAnio?.[anioVista] || ceros()
  const frios = persona.friosPorAnio?.[anioVista] || ceros()
  const totalResueltosAnio = suma(resueltos)
  const totalAsignadosAnio = suma(asignados)
  const totalFriosAnio = suma(frios)
  const totalGenAnio = totalResueltosAnio + totalFriosAnio
  const pctAnio = calcPct(totalResueltosAnio, totalAsignadosAnio)

  return (
    <div className="pr-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <div className="pr-modal" style={{ maxWidth: cfg.usaClientes ? 740 : 540 }}>
        <div className="pr-modal-head">
          <div className="pr-view-head">
            <div className="pr-view-avatar">{iniciales(persona.nombre)}</div>
            <div>
              <div className="pr-view-name">{persona.nombre}</div>
              <div className="pr-view-sub">{persona.cargo || 'Sin cargo'} · Ingreso: {fmtFecha(persona.ingreso)}</div>
            </div>
          </div>
          <button className="pr-modal-close" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="pr-modal-body">
          <div className="pr-view-stats" style={{ gridTemplateColumns: cfg.usaClientes ? 'repeat(auto-fit, minmax(130px, 1fr))' : 'repeat(2, 1fr)' }}>
            {cfg.usaClientes ? (
              <>
                <div className="pr-view-stat">
                  <div className="pr-view-stat-val">{histAsignados.toLocaleString('es-CO')}</div>
                  <div className="pr-view-stat-label">Asignados (histórico)</div>
                </div>
                <div className="pr-view-stat">
                  <div className="pr-view-stat-val">{histResueltos.toLocaleString('es-CO')}</div>
                  <div className="pr-view-stat-label">Resueltos (histórico)</div>
                </div>
                <div className="pr-view-stat">
                  <div className="pr-view-stat-val" style={{ color: histAsignados > 0 ? colorPct(calcPct(histResueltos, histAsignados)) : undefined }}>
                    {calcPct(histResueltos, histAsignados)}%
                  </div>
                  <div className="pr-view-stat-label">% Resolución (Meta 40%)</div>
                </div>
                <div className="pr-view-stat">
                  <div className="pr-view-stat-val" style={{ color: '#0284C7' }}>{histFrios.toLocaleString('es-CO')}</div>
                  <div className="pr-view-stat-label">Clientes en frío</div>
                </div>
                <div className="pr-view-stat" style={{ borderColor: 'var(--primary)' }}>
                  <div className="pr-view-stat-val" style={{ color: 'var(--primary)' }}>{histTotalGen.toLocaleString('es-CO')}</div>
                  <div className="pr-view-stat-label" style={{ color: 'var(--primary)', fontWeight: 800 }}>Total General</div>
                </div>
              </>
            ) : (
              <div className="pr-view-stat">
                <div className="pr-view-stat-val">{histResueltos}</div>
                <div className="pr-view-stat-label">Total histórico</div>
              </div>
            )}
            <div className="pr-view-stat">
              <div className="pr-view-stat-val" style={{ color: (persona.procesos?.length || 0) > 0 ? '#DC2626' : undefined }}>
                {persona.procesos?.length || 0}
              </div>
              <div className="pr-view-stat-label">Procesos disciplinarios</div>
            </div>
          </div>

          {aniosConDatos.length === 0 ? (
            <div className="pr-view-empty">
              {cfg.usaClientes
                ? 'Todavía no hay clientes registrados para esta persona.'
                : `Todavía no hay ${cfg.unidadPlural} registradas para esta persona.`}
            </div>
          ) : (
            <div className="pr-view-year-block">
              <div className="pr-view-year-title">
                {aniosConDatos.length > 1 ? (
                  <select className="pr-select" value={anioVista} onChange={e => setAnioVista(Number(e.target.value))}>
                    {aniosConDatos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                ) : (
                  <span>{anioVista}</span>
                )}
                <span className="pr-view-year-total">
                  {cfg.usaClientes
                    ? `${totalGenAnio} total (${totalResueltosAnio} asig. + ${totalFriosAnio} fríos) · ${pctAnio}%`
                    : `${totalResueltosAnio} ${cfg.unidadPlural}`}
                </span>
              </div>
              <div className="pr-detail-grid">
                {MESES.map((m, i) => {
                  const sinIngreso = noHabiaIngresado(persona, MESES_FULL[i], anioVista)
                  const asig = asignados[i] || 0
                  const resu = resueltos[i] || 0
                  const fr = frios[i] || 0
                  const totalMes = resu + fr
                  const pct = calcPct(resu, asig)
                  return (
                    <div className="pr-detail-chip" key={m}>
                      <span className="pr-detail-mes">{m}</span>
                      {sinIngreso ? (
                        <span className="ci-na-cell" title={`Ingresó el ${fmtFecha(persona.ingreso)}`}>N/A</span>
                      ) : cfg.usaClientes ? (
                        <>
                          <span className="pr-detail-valor" style={{ color: totalMes > 0 ? 'var(--primary)' : undefined }}>
                            {totalMes}
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}> total</span>
                          </span>
                          <span className="pr-detail-sub" style={{ fontSize: 9.5 }}>
                            {resu}/{asig} asig · <span style={{ color: fr >= 11 ? '#059669' : (fr > 0 ? '#0284C7' : 'inherit'), fontWeight: fr >= 11 ? 800 : 600 }}>{fr} frío{fr >= 11 ? ' ✓' : ''}</span>
                          </span>
                          <span className="pr-detail-sub" style={asig > 0 ? { color: colorPct(pct), fontWeight: 800 } : undefined}>
                            {asig > 0 ? `${pct}%` : '—'}
                          </span>
                        </>
                      ) : (
                        <span className="pr-detail-valor">{resu}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              {cfg.usaClientes && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Total = Clientes resueltos de asignados + clientes en frío. Meta de resolución: 40% · Meta individual: mín. 11 clientes en frío al mes.
                </span>
              )}
            </div>
          )}
        </div>
        <div className="pr-modal-foot">
          <button className="pr-btn pr-btn--ghost" onClick={onCerrar}>Cerrar</button>
          <button className="pr-btn pr-btn--primary" onClick={onEditar}><Pencil size={13} /> Editar</button>
        </div>
      </div>
    </div>
  )
}
