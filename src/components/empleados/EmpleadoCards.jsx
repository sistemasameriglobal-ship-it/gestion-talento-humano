// =============================================================
// src/components/empleados/EmpleadoCards.jsx
// -------------------------------------------------------------
// Vista de tarjetas de empleados con acciones rápidas.
// =============================================================
import { Edit2, Trash2, RotateCcw, Archive, Briefcase, Mail, Calendar } from 'lucide-react'
import { calcAntiguedadEmpleado, calcularSaldoVacacionesPeriodo, getEstadoVacacionActual } from '../../utils/vacacionesHelpers'

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

export default function EmpleadoCards({
  paged, novedadesPorEmpleado, periodosPorEmpleado = {}, vacacionesPorEmpleado = {}, onSelect, openEdit, onRetirar, onReintegrar, setDeleteId,
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12, marginBottom: 16 }}>
        {paged.map(emp => {
          const nov = novedadesPorEmpleado[emp.nombre_completo]
          const periodosEmp = periodosPorEmpleado[emp.id] || []
          const esReintegrado = periodosEmp.length > 1
          const antig = calcAntiguedadEmpleado(emp, periodosEmp)
          const normNombre = (emp.nombre_completo || '').trim().toLowerCase()
          const vacsEmp = vacacionesPorEmpleado[emp.id] || vacacionesPorEmpleado[normNombre] || []
          const vacacionActiva = getEstadoVacacionActual(emp, vacsEmp, nov?.novedades)
          const periodoActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[0] || (emp.fecha_ingreso ? { fecha_ingreso: emp.fecha_ingreso, es_periodo_actual: true } : null)
          const saldoVac = calcularSaldoVacacionesPeriodo(periodoActivo, vacsEmp, periodosEmp)
          return (
            <div
              key={emp.id}
              className="card"
              style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, opacity: emp.activo === false ? 0.6 : 1, cursor: 'pointer' }}
              onClick={() => onSelect(emp)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Avatar con iniciales */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: emp.activo === false ? 'var(--bg)' : 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  color: emp.activo === false ? '#6B7280' : 'var(--primary)',
                  userSelect: 'none',
                }}>
                  {iniciales(emp.nombre_completo)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.nombre_completo}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                    <span style={{
                      fontSize: 10, borderRadius: 4, padding: '1px 6px', fontWeight: 600,
                      background: emp.activo === false ? 'var(--danger-bg)' : 'var(--success-bg)',
                      color: emp.activo === false ? 'var(--danger-text)' : 'var(--success-text)',
                    }}>{emp.activo === false ? 'Inactivo' : 'Activo'}</span>
                    {esReintegrado && (
                      periodoActivo?.continuidad_laboral ? (
                        <span
                          title={`Periodo vigente #${periodoActivo.numero_periodo} con continuidad laboral (${periodoActivo.motivo_transicion === 'ascenso' ? 'Ascenso' : 'Cambio de cargo'}). Conserva antigüedad.`}
                          style={{
                            fontSize: 10, borderRadius: 4, padding: '1px 6px', fontWeight: 700,
                            background: '#FDF2F8', color: '#BE185D', border: '1px solid #FBCFE8',
                          }}
                        >
                          ⭐ {periodoActivo.motivo_transicion === 'ascenso' ? 'Ascenso' : 'Continuidad'}
                        </span>
                      ) : (
                        <span
                          title={`Empleado con ${periodosEmp.length} periodos registrados`}
                          style={{
                            fontSize: 10, borderRadius: 4, padding: '1px 6px', fontWeight: 700,
                            background: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF',
                          }}
                        >
                          Reintegrado
                        </span>
                      )
                    )}
                    {vacacionActiva && (
                      <span
                        title={vacacionActiva.estaDeVacaciones ? `De vacaciones: ${vacacionActiva.badgeTexto}` : `Vacaciones programadas: ${vacacionActiva.badgeTexto}`}
                        style={{
                          fontSize: 10, borderRadius: 4, padding: '1px 6px', fontWeight: 700,
                          background: vacacionActiva.estaDeVacaciones
                            ? (vacacionActiva.esUltimoDia ? '#FEF3C7' : '#DBEAFE')
                            : '#EEF2FF',
                          color: vacacionActiva.estaDeVacaciones
                            ? (vacacionActiva.esUltimoDia ? '#92400E' : '#1D4ED8')
                            : '#4338CA',
                          border: `1px solid ${
                            vacacionActiva.estaDeVacaciones
                              ? (vacacionActiva.esUltimoDia ? '#F59E0B' : '#93C5FD')
                              : '#C7D2FE'
                          }`,
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        🌴 {vacacionActiva.estaDeVacaciones ? vacacionActiva.badgeTexto : `Programadas (${vacacionActiva.countdownTexto})`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="icon-btn" title="Editar" onClick={() => openEdit(emp)}><Edit2 size={13} /></button>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: emp.activo === false ? 'var(--success-bg)' : 'var(--warning-bg)',
                      color: emp.activo === false ? 'var(--success-text)' : 'var(--warning-text)',
                      border: 'none'
                    }}
                    title={emp.activo === false ? 'Reintegrar empleado' : 'Retirar empleado'}
                    onClick={() => emp.activo === false ? onReintegrar(emp) : onRetirar(emp)}
                  >
                    {emp.activo === false ? <RotateCcw size={13} /> : <Archive size={13} />}
                  </button>
                  <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDeleteId(emp.id)}><Trash2 size={13} /></button>
                </div>
              </div>
              {vacacionActiva && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: vacacionActiva.esUltimoDia ? '#FFFBEB' : '#EFF6FF',
                  color: vacacionActiva.esUltimoDia ? '#92400E' : '#1D4ED8',
                  border: `1px solid ${vacacionActiva.esUltimoDia ? '#F59E0B' : '#BFDBFE'}`,
                }}>
                  <span>🌴</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vacacionActiva.textoLargo}
                  </span>
                </div>
              )}
              {(emp.cargo || emp.dependencia) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <Briefcase size={12} style={{ flexShrink: 0 }} />
                  <span>{[emp.cargo, emp.dependencia].filter(Boolean).join(' · ')}</span>
                </div>
              )}
              {emp.correo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden' }}>
                  <Mail size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.correo}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--warning-text)' }}>
                  <Mail size={12} style={{ flexShrink: 0 }} />
                  <span>Sin correo registrado</span>
                </div>
              )}
              {emp.fecha_ingreso && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <Calendar size={12} style={{ flexShrink: 0 }} />
                  <span>Ingreso: {emp.fecha_ingreso}</span>
                  {antig?.texto && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      • Antigüedad: <strong style={{ fontWeight: 600, color: 'var(--text)' }}>{antig.texto}</strong>
                    </span>
                  )}
                </div>
              )}
              {emp.activo === false && emp.fecha_retiro && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--danger-text)' }}>
                  <Calendar size={12} style={{ flexShrink: 0 }} />
                  <span>Retiro: {emp.fecha_retiro}</span>
                </div>
              )}
              {/* Chips de novedades y vacaciones */}
              <div style={{ display: 'flex', gap: 6, marginTop: 2, paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span
                  title={`Saldo de vacaciones del periodo vigente: ${saldoVac.saldoPendiente} días (Causados: ${saldoVac.diasCausados}d, Disfrutados: ${saldoVac.diasDisfrutados}d, En dinero: ${saldoVac.diasEnDinero}d)`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    background: saldoVac.saldoPendiente > 0 ? '#ECFDF5' : 'var(--bg)',
                    color: saldoVac.saldoPendiente > 0 ? '#047857' : 'var(--text-muted)',
                    border: `0.5px solid ${saldoVac.saldoPendiente > 0 ? '#A7F3D0' : 'var(--border)'}`,
                  }}
                >
                  🌴 Saldo vac.: {saldoVac.saldoPendiente}d
                </span>
                {nov && nov.novedades.length > 0 ? (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #B5D4F4' }}>
                      <Calendar size={10} /> {nov.novedades.length} novedad{nov.novedades.length !== 1 ? 'es' : ''}
                    </span>
                    {nov.episodiosInc > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '0.5px solid color-mix(in srgb, var(--danger) 35%, transparent)' }}>
                        {nov.episodiosInc} inc. · {nov.diasInc.toFixed(0)}d
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin novedades</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}