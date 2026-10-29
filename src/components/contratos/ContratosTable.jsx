// =============================================================
// src/components/contratos/ContratosTable.jsx
// =============================================================
import { useMemo } from 'react'
import {
  formatearFechaLarga,
  imprimirContrato,
  descargarComoWord,
  calcularCiclosYProrroga,
} from '../../utils/contratosTemplates'
import {
  Eye,
  Download,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  UserX,
  Sparkles,
  UserPlus,
  Link2,
  FileCheck2,
} from 'lucide-react'

export default function ContratosTable({
  contratos = [],
  empleados = [],
  loading = false,
  onVerContrato,
  onEditarContrato,
  onFinalizarContrato,
  onEliminarContrato,
  onRegistrarEmpleado,
  onDesistirContrato,
  onCompartirFirma,
  puedeEditar = true,
}) {
  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando contratos...</p>
      </div>
    )
  }

  if (contratos.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
        <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
          No se encontraron contratos registrados
        </h4>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          Crea el primer contrato haciendo clic en <strong>+ Nuevo Contrato</strong>. Puedes seleccionar cualquier empleado para rellenar los datos automáticamente.
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 16px' }}>Colaborador / Aprendiz</th>
              <th style={{ padding: '12px 14px' }}>Régimen & Ciclo Actual</th>
              <th style={{ padding: '12px 14px' }}>Cargo / Formación</th>
              <th style={{ padding: '12px 14px' }}>Vigencia & Renovación</th>
              <th style={{ padding: '12px 14px' }}>Remuneración</th>
              <th style={{ padding: '12px 14px' }}>Confidencialidad</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map(c => {
              const esAprendiz = c.tipo_contrato === 'aprendizaje' || (c.cargo && /aprendiz/i.test(c.cargo)) || c.tipo_documento === 'TI'
              const esFinDeSemana = /fin.*semana|s[aá]bado.*domingo/i.test(c.jornada_laboral || '') || /fin.*semana|s[aá]bado.*domingo/i.test(c.horario || '')
              const esPendienteEmpleado = c.estado === 'pendiente_empleado'
              const esDesistido = c.estado === 'desistido'
              const esFinalizado = c.estado === 'finalizado'
              const esFirmado = Boolean(c.firmado_por_trabajador || c.firma_trabajador)
              const tieneEmpleadoAsociado = Boolean(
                c.empleado_registrado ||
                c.novedad_ingreso_registrada ||
                (c.empleado_id && !String(c.empleado_id).startsWith('loc_')) ||
                (empleados || []).some(emp => {
                  if (c.empleado_id && emp.id && String(emp.id) === String(c.empleado_id)) return true
                  const docEmp = String(emp.numero_documento || '').trim().replace(/\D/g, '')
                  const docCont = String(c.numero_documento || '').trim().replace(/\D/g, '')
                  return docEmp && docCont && docEmp === docCont
                })
              )
              const infoProrroga = calcularCiclosYProrroga(c)
              const cicloActual = infoProrroga?.cicloActual || {}
              const diasParaVencer = infoProrroga?.diasParaVencer ?? 0
              const diasParaPreaviso = infoProrroga?.diasParaPreaviso ?? 0

              let badgeCiclo = null
              let badgeVigencia = null

              if (esPendienteEmpleado) {
                badgeCiclo = (
                  <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                    🟡 Pendiente Registrar Empleado
                  </span>
                )
                badgeVigencia = (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                      Candidato por ingresar
                    </div>
                    <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                      Ingreso: {formatearFechaLarga(c.fecha_ingreso)}
                    </div>
                  </div>
                )
              } else if (esDesistido) {
                badgeCiclo = (
                  <span style={{ background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    ⚪ Desistió del Proceso
                  </span>
                )
                badgeVigencia = (
                  <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
                    {c.motivo_finalizacion || 'No se presentó / Desistió'}
                  </span>
                )
              } else if (esFinalizado) {
                badgeCiclo = (
                  <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    🔴 Finalizado
                  </span>
                )
                badgeVigencia = (
                  <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>
                    Terminó el {formatearFechaLarga(c.fecha_fin_efectiva || c.fecha_fin)} ({c.motivo_finalizacion ? c.motivo_finalizacion.replace(/_/g, ' ') : 'Retiro'})
                  </span>
                )
              } else if (esAprendiz) {
                badgeCiclo = (
                  <span className="contrato-badge-tipo badge-aprendizaje">
                    🎓 Aprendiz SENA
                  </span>
                )
                badgeVigencia = (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {formatearFechaLarga(c.fecha_ingreso)} al {formatearFechaLarga(c.fecha_fin)}
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: diasParaVencer >= 0 ? '#DCFCE7' : '#FEE2E2', color: diasParaVencer >= 0 ? '#15803D' : '#B91C1C' }}>
                      {diasParaVencer >= 0 ? `${diasParaVencer}d restantes` : 'Etapa culminada'}
                    </span>
                  </div>
                )
              } else {
                // Contrato a término fijo con prórrogas automáticas
                if (cicloActual.numero === 1) {
                  if (infoProrroga?.esPeriodoPrueba) {
                    badgeCiclo = (
                      <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                        🛡️ Periodo de Prueba (2 meses)
                      </span>
                    )
                  } else {
                    badgeCiclo = (
                      <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                        ✅ Prueba Superada (Mes 3)
                      </span>
                    )
                  }
                } else if (cicloActual.esAnual) {
                  badgeCiclo = (
                    <span style={{ background: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                      ⭐ Contrato Anual (1 Año)
                    </span>
                  )
                } else {
                  badgeCiclo = (
                    <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      🔄 {cicloActual.nombre || 'Prórroga Trimestral'}
                    </span>
                  )
                }

                badgeVigencia = (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {formatearFechaLarga(cicloActual.inicio)} al {formatearFechaLarga(cicloActual.fin)}
                    </div>
                    <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {diasParaVencer > 0 ? (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: diasParaVencer <= 30 ? '#FEF3C7' : '#DCFCE7', color: diasParaVencer <= 30 ? '#B45309' : '#15803D' }}>
                          {diasParaVencer}d para fin de período
                        </span>
                      ) : (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#DCFCE7', color: '#15803D' }}>
                          ✓ Renovado automáticamente
                        </span>
                      )}

                      {diasParaPreaviso >= 0 && diasParaPreaviso <= 15 && (
                        <span style={{ fontSize: 10, color: '#B91C1C', fontWeight: 700 }} title="Plazo legal de 30 días antes del vencimiento para comunicar no renovación">
                          ⚠️ Preaviso: {diasParaPreaviso}d límite
                        </span>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Colaborador */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{c.nombre_trabajador}</span>
                      {esPendienteEmpleado && (
                        <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                          🟡 CANDIDATO
                        </span>
                      )}
                      {esDesistido && (
                        <span style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                          ⚪ DESISTIÓ
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      {c.tipo_documento} {c.numero_documento}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Ingreso: {formatearFechaLarga(c.fecha_ingreso)}
                    </div>
                  </td>

                  {/* Régimen & Ciclo */}
                  <td style={{ padding: '12px 14px' }}>
                    {badgeCiclo}
                    {!esAprendiz && !esFinalizado && !esPendienteEmpleado && !esDesistido && (
                      <div style={{ fontSize: 10.5, color: '#475569', marginTop: 4 }}>
                        {cicloActual.esAnual ? 'Renovable anualmente' : 'Renovación automática cada 3 meses'}
                      </div>
                    )}
                  </td>

                  {/* Cargo */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {c.cargo || c.programa_formacion || '—'}
                    </div>
                    {esAprendiz && c.institucion_educativa && (
                      <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>
                        {c.institucion_educativa} ({c.etapa_aprendizaje || 'Productiva'})
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                      {esFinDeSemana && (
                        <div style={{ fontSize: 10.5, color: '#B45309', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          <span>🗓️ Fin de Semana</span>
                        </div>
                      )}
                      {c.horario && (
                        <div style={{ fontSize: 11, color: '#4338CA', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                          <span>🕒 {c.horario}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Vigencia & Renovación */}
                  <td style={{ padding: '12px 14px' }}>
                    {badgeVigencia}
                  </td>

                  {/* Remuneración */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {c.salario_monto && c.salario_monto > 0
                        ? `$ ${Number(c.salario_monto).toLocaleString('es-CO')}`
                        : c.salario_texto || 'SMMLV'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {c.periodo_pago || 'Quincenal'}
                    </div>
                  </td>

                  {/* Confidencialidad & Firma */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="badge-confidencialidad-si" title="Contrato de confidencialidad vinculado para ambas partes">
                        🔒 Vinculado
                      </span>
                      {c.firmado_por_trabajador || c.firma_trabajador ? (
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC',
                            padding: '2px 6px', borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                            width: 'fit-content'
                          }}
                          title={c.fecha_firma_trabajador ? `Firmado digitalmente el ${c.fecha_firma_trabajador}` : 'Firmado digitalmente por el colaborador'}
                        >
                          <FileCheck2 size={12} />
                          <span>Firmado</span>
                        </span>
                      ) : !esFinalizado && !esDesistido ? (
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A',
                            padding: '2px 6px', borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                            width: 'fit-content'
                          }}
                          title="Pendiente de firma digital del colaborador"
                        >
                          <span>🟡 Sin firmar</span>
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* BADGE O BOTÓN REGISTRAR EN EMPLEADOS */}
                      {tieneEmpleadoAsociado ? (
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0',
                            padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700
                          }}
                          title="Este colaborador ya se encuentra registrado en la lista de Empleados"
                        >
                          <CheckCircle2 size={13} />
                          <span>En Empleados</span>
                        </span>
                      ) : puedeEditar && !esFinalizado && !esDesistido && onRegistrarEmpleado ? (
                        <button
                          type="button"
                          onClick={() => onRegistrarEmpleado(c)}
                          title={esFirmado ? 'Contrato firmado: Crear colaborador en Empleados y registrar novedad de ingreso' : 'Crear ficha en Empleados y marcar contrato como vigente'}
                          style={{
                            padding: '6px 12px', borderRadius: 7,
                            border: esFirmado ? '1px solid #16A34A' : '1px solid #86EFAC',
                            background: esFirmado ? '#16A34A' : '#DCFCE7',
                            color: esFirmado ? '#FFFFFF' : '#15803D',
                            cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800,
                            boxShadow: esFirmado ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(22, 101, 52, 0.15)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <UserPlus size={14} />
                          <span>{esFirmado ? '✍️ Registrar Empleado' : 'Registrar Empleado'}</span>
                        </button>
                      ) : null}


                      {/* BOTÓN COMPARTIR ENLACE DE FIRMA */}
                      {onCompartirFirma && !esFinalizado && !esDesistido && (
                        <button
                          type="button"
                          onClick={() => onCompartirFirma(c)}
                          title="Copiar o compartir enlace para que el empleado firme ambos contratos"
                          style={{
                            padding: '6px 9px', borderRadius: 7, border: '1px solid #C7D2FE',
                            background: '#EEF2FF', color: '#4338CA', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                          }}
                        >
                          <Link2 size={13} />
                          <span>Link Firma</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onVerContrato(c)}
                        title="Ver ambos contratos para firma, cronograma de prórrogas e imprimir"
                        style={{
                          padding: '6px 10px', borderRadius: 7, border: '1px solid #BFDBFE',
                          background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                        }}
                      >
                        <Eye size={14} />
                        <span>Ver / Imprimir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => descargarComoWord(c, 'completo')}
                        title="Descargar en Word (.doc)"
                        style={{
                          padding: '6px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
                        }}
                      >
                        <Download size={14} />
                      </button>

                      {puedeEditar && !esFinalizado && !esPendienteEmpleado && !esDesistido && (
                        <button
                          type="button"
                          onClick={() => onFinalizarContrato(c)}
                          title="Finalizar contrato (No superó periodo de prueba o No renovación trimestral/anual)"
                          style={{
                            padding: '6px 9px', borderRadius: 7, border: '1px solid #FCA5A5',
                            background: '#FFF1F2', color: '#BE123C', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600,
                          }}
                        >
                          <UserX size={13} />
                          <span>Finalizar</span>
                        </button>
                      )}

                      {puedeEditar && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditarContrato(c)}
                            title="Editar contrato"
                            style={{
                              padding: '6px', borderRadius: 7, border: '1px solid var(--border)',
                              background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
                            }}
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEliminarContrato(c)}
                            title="Eliminar contrato"
                            style={{
                              padding: '6px', borderRadius: 7, border: '1px solid #FCA5A5',
                              background: '#FEE2E2', color: '#B91C1C', cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
