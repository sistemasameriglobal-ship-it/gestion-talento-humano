// =============================================================
// src/components/colaboradores/ColaboradorDetalleModal.jsx
// -------------------------------------------------------------
// Modal de detalle de un colaborador: KPIs por concepto, línea
// de tiempo y tabla con todas sus novedades (extraído de
// Colaboradores.jsx).
// =============================================================
import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { CONCEPTO_COLORS, normalizarConcepto } from '../../utils/parseExcel'
import { hoyISO } from '../../utils/fecha'
import { evaluarEstadoTemporalAusencia } from '../../utils/diasHabiles'
import { avatarColor, initials, formatProductividad, UMBRAL_ALERTA_PD, CONCEPTOS_CON_FECHA } from '../../utils/colaboradores'
import './colaboradores.css'

export default function ColaboradorDetalleModal({ selected, onClose, onDelete }) {
  const novedadesOrdenadas = [...selected.novedades].sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))
  const conFecha = novedadesOrdenadas.filter(r => r.fecha_inicio)
  const minFecha = conFecha.length ? conFecha[0].fecha_inicio : null
  const maxFechaRow = conFecha.length ? conFecha.reduce((a, b) => (a.fecha_fin || a.fecha_inicio) > (b.fecha_fin || b.fecha_inicio) ? a : b) : null
  const maxFecha = maxFechaRow ? (maxFechaRow.fecha_fin || maxFechaRow.fecha_inicio) : null
  const rangoTotalMs = minFecha && maxFecha ? Math.max(1, new Date(maxFecha) - new Date(minFecha)) : 1
  const [bg, fg] = avatarColor(selected.nombre)
  const hoyISOVal = hoyISO()

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720, animation: 'scaleIn .22s ease' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0, border: `2px solid ${fg}30` }}>
              {initials(selected.nombre)}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>{selected.nombre}</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                📍 {selected.area}
                {selected.episodiosInc >= 2 && (
                  <span style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <AlertTriangle size={9} /> Reincidente
                  </span>
                )}
                {selected.tieneVehiculo && (
                  <span style={{ background: 'var(--info-bg)', color: 'var(--info-text)', fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                    🏍️ Tiene vehículo
                  </span>
                )}
                {selected.procesosDisciplinarios > 0 && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: selected.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? 'var(--danger-bg)' : 'var(--warning-bg)',
                    color: selected.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? 'var(--danger-text)' : 'var(--warning-text)',
                  }}>
                    📋 {selected.procesosDisciplinarios} proceso{selected.procesosDisciplinarios !== 1 ? 's' : ''} disciplinario{selected.procesosDisciplinarios !== 1 ? 's' : ''}
                  </span>
                )}
                {selected.productividad != null && (
                  <span style={{ background: 'var(--success-bg)', color: 'var(--success-text)', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    📈 {formatProductividad(selected.productividad, selected.productividadCfg)} {selected.productividadCfg?.label || 'productividad'} · {selected.productividadPeriodo}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {selected.productividad != null && (
            <div style={{ background: 'var(--success-bg)', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}>📈 Productividad {selected.productividadCfg?.label ? `· ${selected.productividadCfg.label}` : ''}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selected.productividadPeriodo} · {selected.area}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success-text)' }}>
                {formatProductividad(selected.productividad, selected.productividadCfg)}
              </div>
            </div>
          )}
          {selected.procesosDisciplinarios > 0 && (
            <div style={{
              background: selected.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? 'var(--danger-bg)' : 'var(--warning-bg)',
              border: `1px solid ${selected.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? '#FECACA' : '#FDE68A'}`,
              borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
            }}>
              <div>
                <div style={{ fontSize: 12, color: selected.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? 'var(--danger-text)' : 'var(--warning-text)', fontWeight: 700 }}>📋 Procesos disciplinarios</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selected.area}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: selected.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? 'var(--danger-text)' : 'var(--warning-text)' }}>
                {selected.procesosDisciplinarios}
              </div>
            </div>
          )}
          {selected.sinNovedades ? (
            <div className="empty-state"><p>Este colaborador no tiene novedades registradas.</p></div>
          ) : (
            <>
              {/* KPIs del colaborador */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 18 }}>
                <div style={{ background: 'var(--info-bg)', border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>{selected.novedades.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--info-text)', fontWeight: 600 }}>Total novedades</div>
                </div>
                <div style={{ background: 'var(--warning-bg)', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>{selected.diasAusenteTotal.toFixed(0)}</div>
                  <div style={{ fontSize: 12, color: 'var(--warning-text)', fontWeight: 600 }}>Días ausente (total)</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>sin vacaciones</div>
                </div>
                <div title={selected.periodoInicio ? `Período de referencia: ${selected.periodoInicio} a ${selected.periodoFin} (${selected.diasPeriodo} días, igual para todos los colaboradores)` : ''}
                  style={{ background: '#E0F2FE', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 14px', textAlign: 'center', cursor: 'help' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0369A1' }}>{selected.tasaAusentismo.toFixed(1)}%</div>
                  <div style={{ fontSize: 12, color: '#0369A1', fontWeight: 600 }}>Tasa de ausentismo</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>sobre días del período</div>
                </div>
                {CONCEPTOS_CON_FECHA.filter(c => selected.porConcepto[c]).map(concepto => {
                  const data = selected.porConcepto[concepto]
                  const color = CONCEPTO_COLORS[concepto] || '#374151'
                  return (
                    <div key={concepto} style={{ background: color + '10', border: `1px solid ${color}35`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{data.episodios}</div>
                      <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 2 }}>{concepto}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.dias.toFixed(0)} día{data.dias !== 1 ? 's' : ''}</div>
                    </div>
                  )
                })}
              </div>
              {selected.periodoInicio && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -10, marginBottom: 16 }}>
                  📊 Tasa = días ausente / días del período de referencia ({selected.periodoInicio} a {selected.periodoFin === hoyISOVal ? 'hoy' : selected.periodoFin}, {selected.diasPeriodo} días) — el mismo período se usa para todos los colaboradores. Pasa el mouse sobre la tarjeta para ver el detalle.
                </div>
              )}

              {Object.entries(selected.porConcepto).some(([c]) => !CONCEPTOS_CON_FECHA.includes(c)) && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>Otros eventos</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(selected.porConcepto).filter(([c]) => !CONCEPTOS_CON_FECHA.includes(c)).map(([concepto, data]) => {
                      const color = CONCEPTO_COLORS[concepto] || '#374151'
                      return (
                        <div key={concepto} style={{ display: 'flex', alignItems: 'center', gap: 6, background: color + '15', border: `1px solid ${color}40`, borderRadius: 20, padding: '4px 10px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color }}>{concepto}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color, background: color + '25', borderRadius: 10, padding: '0 6px' }}>{data.episodios}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Línea de tiempo */}
              {conFecha.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>Línea de tiempo</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>{minFecha}</span><span>{maxFecha}</span>
                  </div>
                  <div style={{ position: 'relative', height: 28, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {conFecha.map(r => {
                      const ini = new Date(r.fecha_inicio)
                      const fin = new Date(r.fecha_fin || r.fecha_inicio)
                      const left = ((ini - new Date(minFecha)) / rangoTotalMs) * 100
                      const width = Math.max(1.2, ((fin - ini) / rangoTotalMs) * 100)
                      const color = CONCEPTO_COLORS[normalizarConcepto(r.concepto)] || '#374151'
                      return (
                        <div key={r.id} title={`${r.concepto}: ${r.fecha_inicio} → ${r.fecha_fin || r.fecha_inicio}`}
                          style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 4, height: 20, background: color, borderRadius: 4, opacity: .85 }} />
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                    {[...new Set(conFecha.map(r => normalizarConcepto(r.concepto)))].map(c => (
                      <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: CONCEPTO_COLORS[c] || '#374151', display: 'inline-block' }} />{c}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabla detalle: todas las novedades del colaborador */}
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                Todas las novedades ({selected.novedades.length})
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Concepto</th><th>F. Inicio</th><th>F. Fin</th><th>Días</th><th>Estado</th><th>Periodo</th><th>Obs.</th><th></th></tr></thead>
                  <tbody>
                    {[...selected.novedades].sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')).map(r => {
                      const tipo = normalizarConcepto(r.concepto)
                      const color = CONCEPTO_COLORS[tipo] || '#374151'
                      const estadoTemp = evaluarEstadoTemporalAusencia(r, hoyISOVal)
                      const badgeClass =
                        estadoTemp?.badgeTipo === 'activa' ? 'db-badge-activa' :
                        estadoTemp?.badgeTipo === 'reincorporacion' ? 'db-badge-reincorporacion' :
                        estadoTemp?.badgeTipo === 'finalizada' ? 'db-badge-finalizada' :
                        'db-badge-programada'

                      return (
                        <tr key={r.id}>
                          <td><span className="badge tag-c" style={{ '--tag': color }}>{r.concepto}</span></td>
                          <td>{r.fecha_inicio || '—'}</td>
                          <td>{r.fecha_fin || '—'}</td>
                          <td>{r.total_dias ?? '—'}</td>
                          <td>
                            {!r.fecha_inicio || !estadoTemp ? (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            ) : (
                              <span className={badgeClass} style={{ fontSize: 10.5, padding: '2px 8px' }}>
                                {estadoTemp.badgeTexto}
                              </span>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{r.periodo || '—'}</td>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }} title={r.observacion || ''}>{r.observacion || '—'}</td>
                          <td><button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'none' }} onClick={() => onDelete(r.id)}><Trash2 size={12} /></button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}