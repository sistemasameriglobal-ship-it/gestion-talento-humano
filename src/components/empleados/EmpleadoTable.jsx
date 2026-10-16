// =============================================================
// src/components/empleados/EmpleadoTable.jsx
// -------------------------------------------------------------
// Vista de tabla de empleados con acciones rápidas.
// =============================================================
import { Edit2, Trash2, RotateCcw, Archive, CheckCircle2, Scale, Building2 } from 'lucide-react'
import PersonCell from '../ui/PersonCell'
import { calcAntiguedadEmpleado, calcularSaldoVacacionesPeriodo, getEstadoVacacionActual } from '../../utils/vacacionesHelpers'

export default function EmpleadoTable({
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
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Área</th><th>Cargo</th><th>Correo</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Vacaciones / Liquidación</th>
              <th style={{ textAlign: 'center' }}>Novedades / Proc.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map(emp => {
              const nov = novedadesPorEmpleado[emp.nombre_completo]
              const periodosEmp = periodosPorEmpleado[emp.id] || []
              const esReintegrado = periodosEmp.length > 1
              const antig = calcAntiguedadEmpleado(emp, periodosEmp)
              const normNombre = (emp.nombre_completo || '').trim().toLowerCase()
              const vacsEmp = vacacionesPorEmpleado[emp.id] || vacacionesPorEmpleado[normNombre] || []
              const procesosEmp = procesosPorEmpleado[emp.id] || procesosPorEmpleado[normNombre] || []
              const ultimoProc = procesosEmp.length > 0 ? procesosEmp[0] : null
              const vacacionActiva = getEstadoVacacionActual(emp, vacsEmp, nov?.novedades)
              const periodoActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[0] || (emp.fecha_ingreso ? { fecha_ingreso: emp.fecha_ingreso, es_periodo_actual: true } : null)
              const saldoVac = calcularSaldoVacacionesPeriodo(periodoActivo, vacsEmp, periodosEmp, emp)

              const ultimoPeriodoCerrado = [...periodosEmp].reverse().find(p => !p.es_periodo_actual) || periodosEmp[periodosEmp.length - 1]
              const estaLiquidado = Boolean(emp.liquidado || ultimoPeriodoCerrado?.liquidado)
              const fechaLiq = emp.fecha_liquidacion || ultimoPeriodoCerrado?.fecha_liquidacion || null
              const obsLiq = emp.observacion_liquidacion || ultimoPeriodoCerrado?.observacion_liquidacion || ''

              return (
                <tr key={emp.id} style={{ cursor: 'pointer', opacity: emp.activo === false ? 0.78 : 1 }} onClick={() => onSelect(emp)}>
                  <td style={{ maxWidth: 260 }}>
                    <PersonCell
                      nombre={emp.nombre_completo}
                      sub={[
                        emp.numero_documento ? `${emp.tipo_documento || 'CC'}: ${emp.numero_documento}` : null,
                        emp.fecha_ingreso ? `Ingreso: ${emp.fecha_ingreso}` : null,
                        antig?.texto ? `Antigüedad: ${antig.texto}` : null,
                      ].filter(Boolean).join(' • ') || null}
                    />
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emp.dependencia || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emp.cargo || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emp.correo || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {emp.activo === false
                        ? <span title={emp.fecha_retiro ? `Retiro: ${emp.fecha_retiro}` : 'Sin fecha de retiro registrada'} style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Inactivo</span>
                        : <span style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Activo</span>}
                      {esReintegrado && (
                        periodoActivo?.continuidad_laboral ? (
                          <span
                            title={`Periodo vigente #${periodoActivo.numero_periodo} con continuidad laboral (${periodoActivo.motivo_transicion === 'ascenso' ? 'Ascenso' : 'Cambio de cargo'}). Conserva antigüedad.`}
                            style={{
                              background: '#FDF2F8',
                              color: '#BE185D',
                              border: '1px solid #FBCFE8',
                              borderRadius: 20,
                              padding: '1px 6px',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            ⭐ {periodoActivo.motivo_transicion === 'ascenso' ? 'Ascenso' : 'Continuidad'}
                          </span>
                        ) : (
                          <span
                            title={`Empleado con ${periodosEmp.length} periodos contractuales registrados`}
                            style={{
                              background: '#F3E8FF',
                              color: '#7E22CE',
                              border: '1px solid #E9D5FF',
                              borderRadius: 20,
                              padding: '1px 6px',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            Reintegrado
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={emp.activo === false ? e => e.stopPropagation() : undefined}>
                    {emp.activo === false ? (
                      estaLiquidado ? (
                        <span
                          onClick={() => onLiquidar && onLiquidar(emp)}
                          title={obsLiq ? `Liquidado el ${fechaLiq || '—'}\nObservaciones: ${obsLiq}` : `Liquidado el ${fechaLiq || '—'}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: '#ECFDF5',
                            color: '#047857',
                            border: '1px solid #6EE7B7',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ✓ Liquidado: {fechaLiq ? String(fechaLiq).slice(0, 10) : 'Sí'}
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '2px 7px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              background: '#FEF3C7',
                              color: '#B45309',
                              border: '1px solid #F59E0B',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ⚠️ Pendiente por liquidar
                          </span>
                          {onLiquidar && (
                            <button
                              type="button"
                              onClick={() => onLiquidar(emp)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '2px 7px',
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 700,
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <CheckCircle2 size={10} /> Liquidar
                            </button>
                          )}
                        </div>
                      )
                    ) : vacacionActiva ? (
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span
                          title={vacacionActiva.estaDeVacaciones
                            ? `De vacaciones: ${vacacionActiva.fechaInicio} al ${vacacionActiva.fechaFin}. ${vacacionActiva.countdownTexto}`
                            : `Vacaciones programadas: ${vacacionActiva.fechaInicio} al ${vacacionActiva.fechaFin}. ${vacacionActiva.countdownTexto}`
                          }
                          style={{
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
                            borderRadius: 20,
                            padding: '2px 8px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          🌴 {vacacionActiva.estaDeVacaciones ? vacacionActiva.badgeTexto : `Programadas (${vacacionActiva.countdownTexto})`}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Saldo: {saldoVac.saldoPendiente}d
                        </span>
                      </div>
                    ) : (
                      <span
                        title={`Saldo vigente: ${saldoVac.saldoPendiente} días (Causados: ${saldoVac.diasCausados}d${saldoVac.diasManuales ? `, Tomados histórico: ${saldoVac.diasManuales}d` : ''}, Disfrutados: ${saldoVac.diasDisfrutados}d, Dinero: ${saldoVac.diasEnDinero}d)`}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: saldoVac.saldoPendiente > 0 ? '#047857' : 'var(--text-muted)',
                          background: saldoVac.saldoPendiente > 0 ? '#ECFDF5' : 'transparent',
                          padding: saldoVac.saldoPendiente > 0 ? '2px 7px' : '0',
                          borderRadius: 999,
                          border: saldoVac.saldoPendiente > 0 ? '1px solid #A7F3D0' : 'none',
                          display: 'inline-block'
                        }}
                      >
                        {saldoVac.saldoPendiente > 0 ? `🌴 ${saldoVac.saldoPendiente}d disp.` : '—'}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: '#2563EB', fontWeight: 600, fontSize: 12 }}>{nov ? nov.novedades.length : 0}</span>
                      {procesosEmp.length > 0 && (
                        <span
                          onClick={e => {
                            e.stopPropagation()
                            onSelect(emp, 'procesos')
                          }}
                          title={`Último proceso: ${ultimoProc?.concepto || ''} (${ultimoProc?.fecha || ultimoProc?.fecha_inicio || ''})${ultimoProc?.observacion ? `\nMotivo: ${ultimoProc.observacion}` : ''}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 6px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            background: '#FFEDD5',
                            color: '#C2410C',
                            border: '1px solid #FDBA74',
                            cursor: 'pointer',
                          }}
                        >
                          <Scale size={10} /> {procesosEmp.length}
                        </span>
                      )}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" title="Editar" onClick={() => openEdit(emp)}><Edit2 size={12} /></button>
                      {onSustitucion && emp.activo !== false && (
                        <button
                          className="icon-btn"
                          style={{ color: '#4338CA' }}
                          title="Sustitución Patronal (Cambio de razón social)"
                          onClick={() => onSustitucion(emp)}
                        >
                          <Building2 size={12} />
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        style={{
                          background: emp.activo === false ? 'var(--success-bg)' : 'var(--warning-bg)',
                          color: emp.activo === false ? 'var(--success-text)' : 'var(--warning-text)',
                          borderColor: 'transparent'
                        }}
                        title={emp.activo === false ? 'Reintegrar empleado' : 'Retirar empleado'}
                        onClick={() => emp.activo === false ? onReintegrar(emp) : onRetirar(emp)}
                      >
                        {emp.activo === false ? <RotateCcw size={12} /> : <Archive size={12} />}
                      </button>
                      <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDeleteId(emp.id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}