// =============================================================
// src/components/empleados/EmpleadoCards.jsx
// -------------------------------------------------------------
// Vista de tarjetas de empleados con acciones rápidas.
// =============================================================
import { Edit2, Trash2, RotateCcw, Archive, Briefcase, Mail, Calendar, Scale, AlertTriangle, CheckCircle2, ArrowRight, FileText, Building2 } from 'lucide-react'
import { calcAntiguedadEmpleado, calcularSaldoVacacionesPeriodo, getEstadoVacacionActual } from '../../utils/vacacionesHelpers'
import { normalizarConcepto } from '../../utils/parseExcel'
import { estaActivaHoy } from '../../utils/diasHabiles'
import './empleados.css'

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function obtenerFechaProceso(p) {
  if (!p) return ''
  if (p.fecha) return String(p.fecha).slice(0, 10)
  if (p.fecha_inicio) {
    const ini = String(p.fecha_inicio).slice(0, 10)
    const fin = p.fecha_fin ? String(p.fecha_fin).slice(0, 10) : ''
    return fin && fin !== ini ? `${ini} → ${fin}` : ini
  }
  return p.created_at ? String(p.created_at).slice(0, 10) : ''
}

export default function EmpleadoCards({
  paged,
  novedadesPorEmpleado,
  periodosPorEmpleado = {},
  vacacionesPorEmpleado = {},
  procesosPorEmpleado = {},
  onSelect,
  openEdit,
  onRetirar,
  onReintegrar,
  onLiquidar,
  onSustitucion,
  setDeleteId,
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
          const procesosEmp = procesosPorEmpleado[emp.id] || procesosPorEmpleado[normNombre] || []
          const ultimoProceso = procesosEmp.length > 0 ? procesosEmp[0] : null
          const vacacionActiva = getEstadoVacacionActual(emp, vacsEmp, nov?.novedades)
          const periodoActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[0] || (emp.fecha_ingreso ? { fecha_ingreso: emp.fecha_ingreso, es_periodo_actual: true } : null)
          const saldoVac = calcularSaldoVacacionesPeriodo(periodoActivo, vacsEmp, periodosEmp, emp)

          // Incapacidades activas hoy (solo hoy >= fecha_inicio && hoy < fechaRegresoLaboral)
          const incsActivas = (nov?.novedades || []).filter(
            n => normalizarConcepto(n.concepto) === 'Incapacidad' && estaActivaHoy(n)
          )
          const diasIncActivas = incsActivas.reduce((sum, n) => sum + (parseFloat(n.total_dias) || 0), 0)

          // Estado de liquidación para empleados inactivos
          const ultimoPeriodoCerrado = [...periodosEmp].reverse().find(p => !p.es_periodo_actual) || periodosEmp[periodosEmp.length - 1]
          const estaLiquidado = Boolean(emp.liquidado || ultimoPeriodoCerrado?.liquidado)
          const fechaLiq = emp.fecha_liquidacion || ultimoPeriodoCerrado?.fecha_liquidacion || null
          const obsLiq = emp.observacion_liquidacion || ultimoPeriodoCerrado?.observacion_liquidacion || ''

          return (
            <div
              key={emp.id}
              className="card"
              style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, opacity: emp.activo === false ? (estaLiquidado ? 0.84 : 1) : 1, cursor: 'pointer' }}
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
                  {emp.numero_documento && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>
                      {emp.tipo_documento || 'CC'}: {emp.numero_documento}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                    <span className={`emp-badge emp-badge--sm ${emp.activo === false ? 'emp-badge--inactivo' : 'emp-badge--activo'}`}>
                      {emp.activo === false ? 'Inactivo' : 'Activo'}
                    </span>
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
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="icon-btn" title="Editar" onClick={() => openEdit(emp)}><Edit2 size={13} /></button>
                  {onSustitucion && emp.activo !== false && (
                    <button
                      className="icon-btn"
                      title="Sustitución Patronal (Cambio de razón social)"
                      style={{ color: '#4338CA' }}
                      onClick={() => onSustitucion(emp)}
                    >
                      <Building2 size={13} />
                    </button>
                  )}
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
                <div
                  className={`emp-vac-banner ${vacacionActiva.esUltimoDia ? 'emp-vac-banner--ultimo' : !vacacionActiva.estaDeVacaciones ? 'emp-vac-banner--prog' : ''}`}
                  title={
                    vacacionActiva.estaDeVacaciones
                      ? `Periodo de descanso: ${vacacionActiva.fechaInicio} al ${vacacionActiva.fechaFin} • Primer día hábil de retorno: ${vacacionActiva.fechaRegresoCorta} (${vacacionActiva.fechaRegresoFormateada})`
                      : `Vacaciones programadas: ${vacacionActiva.fechaInicio} al ${vacacionActiva.fechaFin}`
                  }
                >
                  <span style={{ flexShrink: 0 }}>🌴</span>
                  <span>{vacacionActiva.textoLargo}</span>
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

              {/* ── Bloque destacado de liquidación para colaboradores inactivos ── */}
              {emp.activo === false && (
                estaLiquidado ? (
                  <div
                    onClick={e => {
                      e.stopPropagation()
                      if (onLiquidar) onLiquidar(emp)
                    }}
                    title={obsLiq ? `Liquidado el ${fechaLiq || '—'}\nObservaciones: ${obsLiq}\n(Clic para ver o editar detalle)` : `Liquidado el ${fechaLiq || '—'} (Clic para ver o editar)`}
                    className="emp-liq-banner emp-liq-banner--done"
                  >
                    <div className="emp-liq-banner-left">
                      <span className="emp-liq-icon-done">
                        <CheckCircle2 size={13} strokeWidth={2.5} />
                      </span>
                      <span className="emp-liq-text-done">
                        {fechaLiq ? `Liquidado el ${String(fechaLiq).slice(0, 10)}` : 'Liquidado'}
                      </span>
                      {obsLiq && (
                        <span title={`Observaciones: ${obsLiq}`} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                          <FileText size={12} />
                        </span>
                      )}
                    </div>
                    {onLiquidar && (
                      <span className="emp-liq-detail-link">
                        Detalle
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={e => {
                      e.stopPropagation()
                      if (onLiquidar) onLiquidar(emp)
                    }}
                    title="Este excolaborador figura como pendiente por liquidar. Clic para registrar liquidación."
                    className="emp-liq-banner emp-liq-banner--pending"
                  >
                    <div className="emp-liq-banner-left">
                      <span className="emp-liq-icon-pending">
                        <AlertTriangle size={13} strokeWidth={2.5} />
                      </span>
                      <span className="emp-liq-text-pending">
                        Pendiente liquidar
                      </span>
                    </div>

                    {onLiquidar && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onLiquidar(emp)
                        }}
                        className="emp-liq-btn"
                      >
                        <span>Liquidar</span>
                        <ArrowRight size={12} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )
              )}

              {/* Resumen compacto del último proceso disciplinario (solo si tiene procesos) */}
              {ultimoProceso && (
                <div
                  onClick={e => {
                    e.stopPropagation()
                    onSelect(emp, 'procesos')
                  }}
                  title={
                    `Último proceso disciplinario (${obtenerFechaProceso(ultimoProceso)}): ${ultimoProceso.concepto}` +
                    (ultimoProceso.observacion ? `\nMotivo: ${ultimoProceso.observacion}` : '') +
                    '\nClic para ver todos los procesos en el historial.'
                  }
                  style={{
                    marginTop: 2,
                    padding: '6px 9px',
                    borderRadius: 7,
                    background: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    cursor: 'pointer',
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9A3412', display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Scale size={11} style={{ flexShrink: 0, color: '#EA580C' }} />
                      {ultimoProceso.concepto}
                    </span>
                    <span style={{ fontSize: 10, color: '#C2410C', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {obtenerFechaProceso(ultimoProceso)}
                    </span>
                  </div>
                  {ultimoProceso.observacion && (
                    <div style={{
                      fontSize: 10.5,
                      color: '#7C2D12',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {ultimoProceso.observacion}
                    </div>
                  )}
                </div>
              )}

              {/* Chips de novedades, vacaciones y procesos disciplinarios */}
              <div style={{ display: 'flex', gap: 6, marginTop: 2, paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
                {emp.activo !== false && (
                  <span
                    title={`Saldo de vacaciones del periodo vigente: ${saldoVac.saldoPendiente} días (Causados: ${saldoVac.diasCausados}d${saldoVac.diasManuales ? `, Tomados histórico: ${saldoVac.diasManuales}d` : ''}, Disfrutados: ${saldoVac.diasDisfrutados}d, En dinero: ${saldoVac.diasEnDinero}d)`}
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
                )}

                {procesosEmp.length > 0 && (
                  <span
                    onClick={e => {
                      e.stopPropagation()
                      onSelect(emp, 'procesos')
                    }}
                    title="Clic para abrir directamente la sección de procesos disciplinarios en el historial"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      background: '#FFEDD5',
                      color: '#C2410C',
                      border: '1px solid #FDBA74',
                      cursor: 'pointer',
                    }}
                  >
                    <Scale size={10} /> {procesosEmp.length} proc. disc.
                  </span>
                )}

                {nov && nov.novedades.length > 0 ? (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #B5D4F4' }}>
                      <Calendar size={10} /> {nov.novedades.length} novedad{nov.novedades.length !== 1 ? 'es' : ''}
                    </span>
                    {incsActivas.length > 0 && (
                      <span
                        title={`Incapacidad activa hoy (${incsActivas.map(i => `${i.fecha_inicio} al ${i.fecha_fin || i.fecha_inicio}`).join(', ')})`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '0.5px solid color-mix(in srgb, var(--danger) 35%, transparent)' }}
                      >
                        {incsActivas.length} inc. activa{incsActivas.length !== 1 ? 's' : ''}{diasIncActivas > 0 ? ` · ${diasIncActivas.toFixed(0)}d` : ''}
                      </span>
                    )}
                  </>
                ) : (
                  procesosEmp.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin novedades</span>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}