// =============================================================
// src/components/empleados/EmpleadoHistorialModal.jsx
// -------------------------------------------------------------
// Modal con el historial de novedades de un empleado (KPIs por
// concepto + tabla de registros).
// =============================================================
import { X, Edit2, Award } from 'lucide-react'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { CONCEPTOS_CON_FECHA } from './empleadosConstants'
import { formatFecha, calcAntiguedadEmpleado, calcularSaldoVacacionesPeriodo, getEstadoVacacionActual } from '../../utils/vacacionesHelpers'
import { diasHabilesEntre } from '../../utils/diasHabiles'

export default function EmpleadoHistorialModal({ selectedEmp, novedadesPorEmpleado, periodos = [], vacaciones = [], onClose, onEdit, onReintegrar }) {
  const nov = novedadesPorEmpleado[selectedEmp.nombre_completo]

  // Si no hay lista de periodos de la BD, armar periodo base con los datos del empleado
  const listaPeriodos = (periodos && periodos.length > 0)
    ? periodos
    : (selectedEmp.fecha_ingreso ? [{
        id: 'base',
        numero_periodo: 1,
        fecha_ingreso: selectedEmp.fecha_ingreso,
        fecha_retiro: selectedEmp.fecha_retiro,
        cargo: selectedEmp.cargo,
        dependencia: selectedEmp.dependencia,
        es_periodo_actual: selectedEmp.activo !== false,
        observaciones: 'Periodo inicial registrado'
      }] : [])

  const periodoActivo = listaPeriodos.find(p => p.es_periodo_actual) || listaPeriodos[0] || (selectedEmp.fecha_ingreso ? { id: 'base', fecha_ingreso: selectedEmp.fecha_ingreso, es_periodo_actual: true } : null)
  const saldoVac = calcularSaldoVacacionesPeriodo(periodoActivo, vacaciones, listaPeriodos)
  const vacacionActiva = getEstadoVacacionActual(selectedEmp, vacaciones, nov?.novedades)
  const antig = calcAntiguedadEmpleado(selectedEmp, listaPeriodos)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>{selectedEmp.nombre_completo}</h2>
              {vacacionActiva && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: 999,
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  🌴 {vacacionActiva.esProgramada ? `Programadas • ${vacacionActiva.badgeTexto}` : vacacionActiva.badgeTexto}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {selectedEmp.dependencia || '—'}{selectedEmp.cargo ? ` · ${selectedEmp.cargo}` : ''}
              {antig?.texto ? ` · Antigüedad: ${antig.texto}` : ''}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto' }}>
          {/* Banner dinámico de vacaciones (Activas o Programadas) */}
          {vacacionActiva && (
            <div style={{
              marginBottom: 18,
              padding: '12px 16px',
              borderRadius: 10,
              background: vacacionActiva.estaDeVacaciones
                ? (vacacionActiva.esUltimoDia
                    ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)'
                    : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)')
                : 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
              border: `1.5px solid ${
                vacacionActiva.estaDeVacaciones
                  ? (vacacionActiva.esUltimoDia ? '#F59E0B' : '#60A5FA')
                  : '#A78BFA'
              }`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: vacacionActiva.estaDeVacaciones
                ? '0 2px 8px rgba(37, 99, 235, 0.08)'
                : '0 2px 8px rgba(124, 58, 237, 0.08)'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: vacacionActiva.estaDeVacaciones
                  ? (vacacionActiva.esUltimoDia ? '#D97706' : '#2563EB')
                  : '#7C3AED',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 19,
                flexShrink: 0
              }}>
                🌴
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: vacacionActiva.estaDeVacaciones
                      ? (vacacionActiva.esUltimoDia ? '#92400E' : '#1E40AF')
                      : '#5B21B6'
                  }}>
                    {vacacionActiva.estaDeVacaciones
                      ? (vacacionActiva.esUltimoDia ? 'Último día de vacaciones' : '🌴 Actualmente en Vacaciones')
                      : '🌴 Vacaciones programadas'}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: vacacionActiva.estaDeVacaciones
                      ? (vacacionActiva.esUltimoDia ? '#B45309' : '#1D4ED8')
                      : '#6D28D9',
                    color: '#FFFFFF',
                  }}>
                    {vacacionActiva.countdownTexto}
                  </span>
                </div>
                <div style={{
                  fontSize: 12,
                  color: vacacionActiva.estaDeVacaciones
                    ? (vacacionActiva.esUltimoDia ? '#78350F' : '#1E3A8A')
                    : '#4C1D95',
                  marginTop: 2
                }}>
                  Periodo del <strong>{formatFecha(vacacionActiva.fechaInicio)}</strong> hasta el <strong>{formatFecha(vacacionActiva.fechaFin)}</strong>
                  {vacacionActiva.estaDeVacaciones ? (
                    vacacionActiva.esUltimoDia
                      ? ' • Regresa a labores el próximo día hábil.'
                      : ` • Faltan ${vacacionActiva.diffDays} día${vacacionActiva.diffDays > 1 ? 's' : ''} calendario para finalizar su periodo de descanso.`
                  ) : (
                    ` • Faltan ${vacacionActiva.diasParaInicio} día${vacacionActiva.diasParaInicio > 1 ? 's' : ''} calendario para el inicio de su periodo de descanso.`
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resumen Detallado de Vacaciones del Periodo Vigente */}
          <div style={{ marginBottom: 18, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🌴</span>
                <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text)' }}>
                  Vacaciones — Periodo Vigente
                </span>
                {periodoActivo && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    (Periodo #{periodoActivo.numero_periodo || 1}{periodoActivo.fecha_ingreso ? ` desde ${periodoActivo.fecha_ingreso}` : ''})
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {antig?.anios ? `${antig.anios} año${antig.anios !== 1 ? 's' : ''} cumplido${antig.anios !== 1 ? 's' : ''}` : 'Menos de 1 año'}
              </div>
            </div>

            {/* 4 KPIs de Vacaciones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
              {/* Días causados acumulados */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#334155' }}>{saldoVac.diasCausados}d</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginTop: 2 }}>Días causados</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>15d por año cumplido</div>
              </div>

              {/* Días disfrutados tomados en tiempo */}
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A' }}>{saldoVac.diasDisfrutados}d</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D', marginTop: 2 }}>Disfrutados (tiempo)</div>
                <div style={{ fontSize: 10, color: '#166534' }}>Físicos tomados</div>
              </div>

              {/* Días compensados en dinero */}
              <div style={{ background: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#CA8A04' }}>{saldoVac.diasEnDinero}d</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#A16207', marginTop: 2 }}>En dinero</div>
                <div style={{ fontSize: 10, color: '#854D0E' }}>Compensados</div>
              </div>

              {/* Saldo de días restantes disponibles */}
              <div style={{
                background: saldoVac.saldoPendiente > 0 ? '#EFF6FF' : '#F3F4F6',
                border: `1px solid ${saldoVac.saldoPendiente > 0 ? '#BFDBFE' : '#E5E7EB'}`,
                borderRadius: 8,
                padding: '10px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: saldoVac.saldoPendiente > 0 ? '#2563EB' : '#6B7280' }}>
                  {saldoVac.saldoPendiente}d
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: saldoVac.saldoPendiente > 0 ? '#1D4ED8' : '#4B5563', marginTop: 2 }}>
                  Saldo disponible
                </div>
                <div style={{ fontSize: 10, color: saldoVac.saldoPendiente > 0 ? '#1E40AF' : '#6B7280' }}>
                  {saldoVac.saldoPendiente > 0 ? 'Días restantes' : 'Sin saldo disponible'}
                </div>
              </div>
            </div>

            {/* Desglose de cada solicitud registrada */}
            {vacaciones && vacaciones.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Desglose de solicitudes ({vacaciones.length})
                </div>
                <div className="table-container" style={{ border: 'none', margin: 0 }}>
                  <table style={{ fontSize: 11.5 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 8px' }}>Rango de fechas</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Días tiempo</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Días dinero</th>
                        <th style={{ padding: '6px 8px' }}>Tipo</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Estado</th>
                        <th style={{ padding: '6px 8px' }}>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vacaciones.map(v => {
                        const dTiempo = v.dias_disfrutados != null && v.dias_disfrutados !== ''
                          ? v.dias_disfrutados
                          : (v.fecha_inicio && v.fecha_fin ? diasHabilesEntre(v.fecha_inicio, v.fecha_fin) : (v.tipo_vacacion !== 'Vacaciones en dinero' ? v.total_dias : '—'))
                        const dDinero = v.dias_en_dinero != null && v.dias_en_dinero !== ''
                          ? v.dias_en_dinero
                          : (v.tipo_vacacion === 'Vacaciones en dinero' ? v.total_dias : '—')
                        return (
                          <tr key={v.id}>
                            <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                              {v.fecha_inicio ? `${formatFecha(v.fecha_inicio)} → ${v.fecha_fin ? formatFecha(v.fecha_fin) : '—'}` : 'Sin fecha (compensación)'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>
                              {dTiempo !== '—' && dTiempo != null ? `${dTiempo}d` : '—'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>
                              {dDinero !== '—' && dDinero != null && Number(dDinero) > 0 ? (
                                <span style={{ color: '#B45309', background: '#FEF3C7', padding: '1px 6px', borderRadius: 999, fontSize: 10.5 }}>
                                  💰 {dDinero}d
                                </span>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{v.tipo_vacacion || 'Vacaciones'}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontSize: 10,
                                fontWeight: 700,
                                background: v.estado === 'Aprobada' ? 'var(--success-bg)' : v.estado === 'En curso' ? '#DBEAFE' : v.estado === 'Rechazada' ? 'var(--danger-bg)' : '#FEF3C7',
                                color: v.estado === 'Aprobada' ? 'var(--success-text)' : v.estado === 'En curso' ? '#1D4ED8' : v.estado === 'Rechazada' ? 'var(--danger-text)' : '#92400E',
                              }}>
                                {v.estado || 'Pendiente'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.observacion_contable || v.observacion || ''}>
                              {v.observacion_contable || v.observacion || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                No registra solicitudes de vacaciones en este periodo.
              </div>
            )}
          </div>
          {/* Historial de Contratos / Periodos */}
          {listaPeriodos.length > 0 && (
            <div style={{ marginBottom: 18, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>📜 Periodos Laborales ({listaPeriodos.length})</span>
                  {periodoActivo?.continuidad_laboral && (
                    <span style={{ background: '#FDF2F8', color: '#BE185D', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: '1px solid #FBCFE8' }}>
                      ⭐ Continuidad ({periodoActivo.motivo_transicion === 'ascenso' ? 'Ascenso' : 'Cambio cargo'})
                    </span>
                  )}
                  {listaPeriodos.length > 1 && !periodoActivo?.continuidad_laboral && (
                    <span style={{ background: '#F3E8FF', color: '#7E22CE', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      Reintegrado
                    </span>
                  )}
                </div>
                {onReintegrar && (
                  <button
                    type="button"
                    className="btn btn-xs"
                    onClick={() => {
                      onClose()
                      onReintegrar(selectedEmp)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                      cursor: 'pointer',
                    }}
                  >
                    <Award size={12} /> Registrar Ascenso / Movimiento
                  </button>
                )}
              </div>
              <div className="table-container" style={{ border: 'none', margin: 0 }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px' }}>Periodo</th>
                      <th style={{ padding: '6px 8px' }}>Ingreso</th>
                      <th style={{ padding: '6px 8px' }}>Retiro</th>
                      <th style={{ padding: '6px 8px' }}>Área / Cargo</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px' }}>Tipo</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px' }}>Estado</th>
                      <th style={{ padding: '6px 8px' }}>Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaPeriodos.map(p => (
                      <tr key={p.id || p.numero_periodo}>
                        <td style={{ fontWeight: 700, padding: '6px 8px' }}>#{p.numero_periodo}</td>
                        <td style={{ padding: '6px 8px' }}>{p.fecha_ingreso || '—'}</td>
                        <td style={{ padding: '6px 8px', color: p.fecha_retiro ? 'var(--danger-text)' : 'inherit' }}>{p.fecha_retiro || '—'}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{[p.dependencia, p.cargo].filter(Boolean).join(' · ') || '—'}</td>
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {p.continuidad_laboral ? (
                            <span style={{ background: '#FDF2F8', color: '#BE185D', borderRadius: 12, padding: '1px 6px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              ⭐ Continuidad
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
                              {p.numero_periodo === 1 ? 'Inicial' : 'Reingreso'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {p.es_periodo_actual
                            ? <span style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 12, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>Vigente</span>
                            : <span style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>Cerrado</span>}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.observaciones || ''}>
                          {p.observaciones || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!nov || nov.novedades.length === 0 ? (
            <div className="empty-state"><p>Este empleado no tiene novedades registradas.</p></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>{nov.novedades.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total novedades</div>
                </div>
                {CONCEPTOS_CON_FECHA.filter(c => nov.porConcepto[c]).map(concepto => {
                  const data = nov.porConcepto[concepto]
                  const color = CONCEPTO_COLORS[concepto] || '#374151'
                  return (
                    <div key={concepto} style={{ background: color + '10', border: `1px solid ${color}35`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{data.episodios}</div>
                      <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 2 }}>{concepto}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.dias.toFixed(0)} día{data.dias !== 1 ? 's' : ''}</div>
                    </div>
                  )
                })}
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Concepto</th><th>F. Inicio</th><th>F. Fin</th><th>Días</th><th>Periodo</th></tr></thead>
                  <tbody>
                    {[...nov.novedades].sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')).map(r => {
                      const tipo = normalizarConcepto(r.concepto)
                      const color = CONCEPTO_COLORS[tipo] || '#374151'
                      return (
                        <tr key={r.id}>
                          <td><span className="badge tag-c" style={{ '--tag': color }}>{r.concepto}</span></td>
                          <td>{r.fecha_inicio || '—'}</td>
                          <td>{r.fecha_fin || '—'}</td>
                          <td>{r.total_dias ?? '—'}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{r.periodo || '—'}</td>
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
          <button className="btn btn-primary" onClick={onEdit}><Edit2 size={14} /> Editar empleado</button>
        </div>
      </div>
    </div>
  )
}