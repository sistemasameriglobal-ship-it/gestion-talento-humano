// =============================================================
// src/components/empleados/EmpleadoTable.jsx
// -------------------------------------------------------------
// Vista de tabla de empleados con acciones rápidas.
// =============================================================
import { Edit2, Trash2, RotateCcw, Archive } from 'lucide-react'
import PersonCell from '../ui/PersonCell'
import { calcAntiguedadEmpleado, calcularSaldoVacacionesPeriodo, getEstadoVacacionActual } from '../../utils/vacacionesHelpers'

export default function EmpleadoTable({
  paged, novedadesPorEmpleado, periodosPorEmpleado = {}, vacacionesPorEmpleado = {}, onSelect, openEdit, onRetirar, onReintegrar, setDeleteId,
}) {
  return (
    <>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Área</th><th>Cargo</th><th>Correo</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Vacaciones</th>
              <th style={{ textAlign: 'center' }}>Novedades</th>
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
              const vacacionActiva = getEstadoVacacionActual(emp, vacsEmp, nov?.novedades)
              const periodoActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[0] || (emp.fecha_ingreso ? { fecha_ingreso: emp.fecha_ingreso, es_periodo_actual: true } : null)
              const saldoVac = calcularSaldoVacacionesPeriodo(periodoActivo, vacsEmp, periodosEmp, emp)
              return (
                <tr key={emp.id} style={{ cursor: 'pointer', opacity: emp.activo === false ? 0.55 : 1 }} onClick={() => onSelect(emp)}>
                  <td style={{ maxWidth: 260 }}>
                    <PersonCell
                      nombre={emp.nombre_completo}
                      sub={antig?.texto ? `Ingreso: ${emp.fecha_ingreso} • Antigüedad: ${antig.texto}` : (emp.fecha_ingreso ? `Ingreso: ${emp.fecha_ingreso}` : null)}
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
                  <td style={{ textAlign: 'center' }}>
                    {vacacionActiva ? (
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
                  <td style={{ textAlign: 'center', color: '#2563EB', fontWeight: 600 }}>{nov ? nov.novedades.length : 0}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" title="Editar" onClick={() => openEdit(emp)}><Edit2 size={12} /></button>
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