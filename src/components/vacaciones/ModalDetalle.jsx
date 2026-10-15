import { X, Edit2, Sun, CheckCircle2, AlertCircle, Printer } from 'lucide-react'
import { diasHabilesEntre } from '../../utils/diasHabiles'
import { calcAntiguedad, diasAcumuladosAnio, formatFecha, calcularSaldoVacacionesPeriodo } from '../../utils/vacacionesHelpers'
import { generarPdfSolicitudVacaciones } from '../../utils/pdfGenerator'
import { useCompany } from '../../context/CompanyContext'
import { EstadoBadge, TipoBadge } from './Badges'

// ─── Campo de solo lectura ────────────────────────────────────────────────────
function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{value || <span style={{ color: '#D1D5DB' }}>—</span>}</div>
    </div>
  )
}

// ─── Modal Ver Detalle ────────────────────────────────────────────────────────
export default function ModalDetalle({ row, onClose, onEdit, allRows = [] }) {
  const { companyConfig } = useCompany()
  const antiguedad = calcAntiguedad(row.fecha_ingreso)
  const anioRow = (row.fecha_inicio || row.fecha_solicitud || '').substring(0, 4) || String(new Date().getFullYear())
  const diasAcumulados = diasAcumuladosAnio(allRows, row.nombre_empleado, anioRow)

  // Balance de vacaciones del periodo de este empleado
  const vacsEmpleado = allRows.filter(r => r.nombre_empleado?.trim().toLowerCase() === row.nombre_empleado?.trim().toLowerCase())
  const saldoResumen = calcularSaldoVacacionesPeriodo({
    fecha_ingreso: row.fecha_ingreso,
    periodo_id: row.periodo_id,
  }, vacsEmpleado, row.periodos || [], row.empleado)

  // Comparación: días en dinero calculados (15 - días hábiles) vs guardados
  const habiles = row.fecha_inicio && row.fecha_fin ? diasHabilesEntre(row.fecha_inicio, row.fecha_fin) : null
  const dineroCalculado = habiles != null
    ? Math.max(0, 15 - habiles)
    : (row.tipo_vacacion === 'Vacaciones en dinero' ? 15 : null)
  const dineroGuardado = (row.dias_en_dinero != null && row.dias_en_dinero !== '') ? Number(row.dias_en_dinero) : null
  const dineroCoincide = dineroCalculado != null && dineroGuardado != null && dineroCalculado === dineroGuardado

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sun size={18} style={{ color: '#D97706' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>{row.nombre_empleado}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.tipo_vacacion} · {row.total_dias} día(s)</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', marginBottom: 16 }}>
            <Field label="Nombre completo" value={row.nombre_empleado} />
            <Field label="Dependencia" value={row.dependencia} />
            <Field label="Periodo de vacaciones" value={row.periodo_vacaciones} />
            <Field label="Tipo de vacación" value={<TipoBadge tipo={row.tipo_vacacion} />} />
            <Field label="Inicio vacaciones" value={formatFecha(row.fecha_inicio)} />
            <Field label="Finaliza vacaciones" value={formatFecha(row.fecha_fin)} />
            <Field label="Total días" value={row.total_dias ? `${row.total_dias} días` : undefined} />
            <Field label="Estado" value={<EstadoBadge estado={row.estado} />} />
            <Field label="Días disfrutados" value={row.dias_disfrutados != null && row.dias_disfrutados !== '' ? `${row.dias_disfrutados} días` : undefined} />
            <Field label="Aprobado por" value={row.aprobado_por} />
            <Field label="Fecha de ingreso" value={formatFecha(row.fecha_ingreso)} />
            <Field
              label="Antigüedad"
              value={antiguedad ? (
                <span>
                  {antiguedad.texto}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>(acum {anioRow}: {diasAcumulados} días)</span>
                </span>
              ) : undefined}
            />
          </div>

          {/* Resumen de Saldo del Periodo Vigente */}
          {row.fecha_ingreso && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Balance de Vacaciones (Contrato Actual)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
                <div style={{ background: 'var(--info-bg)', padding: '6px 8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--info-text)', fontWeight: 600 }}>Causados</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--info-text)' }}>{saldoResumen.diasCausados} días</div>
                </div>
                <div style={{ background: 'var(--warning-bg)', padding: '6px 8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--warning-text)', fontWeight: 600 }}>Tomados / Dinero</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning-text)' }}>{saldoResumen.diasDisfrutados + saldoResumen.diasEnDinero} días</div>
                </div>
                <div style={{ background: saldoResumen.saldoPendiente >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', padding: '6px 8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: saldoResumen.saldoPendiente >= 0 ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>Saldo Pendiente</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: saldoResumen.saldoPendiente >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>{saldoResumen.saldoPendiente} días</div>
                </div>
              </div>
            </div>
          )}

          {/* Comparación Días en Dinero */}
          <div style={{ background: 'var(--bg,#F8FAFC)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Verificación Días en Dinero
            </div>
            <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Guardado: <strong>{dineroGuardado != null ? `${dineroGuardado} días` : '—'}</strong> | Calculado: <strong>{dineroCalculado != null ? `${dineroCalculado} días` : '—'}</strong></span>
              {dineroCalculado != null && (
                dineroCoincide ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--success-text)' }}>
                    <CheckCircle2 size={14} /> Coincide
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#B45309' }}>
                    <AlertCircle size={14} /> Difiere ({dineroGuardado > dineroCalculado ? '+' : ''}{dineroGuardado - dineroCalculado})
                  </span>
                )
              )}
            </div>
          </div>

          {row.observacion && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Observación" value={row.observacion} />
            </div>
          )}
          {row.observacion_contable && (
            <div>
              <Field label="Observación área contable" value={row.observacion_contable} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => generarPdfSolicitudVacaciones(row, companyConfig?.nombre)}>
            <Printer size={14} /> Imprimir / PDF
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(row) }}>
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>
    </div>
  )
}
