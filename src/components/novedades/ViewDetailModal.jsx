import { X, Edit2 } from 'lucide-react'
import AnimatedModal from '../ui/AnimatedModal'
import { statusPill } from './pillsConstants'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { diasHabilesEntre } from '../../utils/diasHabiles'

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>{children}</div>
    </div>
  )
}

function Field({ label, value, full = false }) {
  return (
    <div style={full ? { gridColumn: '1/-1' } : {}}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{value || <span style={{ color: '#D1D5DB' }}>—</span>}</div>
    </div>
  )
}

export default function ViewDetailModal({ viewRow, fichasEmpleados, onClose, onEdit }) {
  return (
    <AnimatedModal open={!!viewRow} onRequestClose={onClose} maxWidth={600}>
      {viewRow && (() => {
        const tipo = normalizarConcepto(viewRow.concepto)
        const color = CONCEPTO_COLORS[tipo] || '#374151'
        const cargoEmpleado = viewRow.cargo || fichasEmpleados?.[viewRow.nombre_empleado]?.cargo || ''
        const cargoYArea = cargoEmpleado && viewRow.dependencia
          ? `${cargoEmpleado} - ${viewRow.dependencia}`
          : (cargoEmpleado || viewRow.dependencia || '')
        return (
          <>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge tag-c" style={{ '--tag': color, fontSize: 13, padding: '4px 12px' }}>{viewRow.concepto}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>{viewRow.nombre_empleado}</h2>
                  {cargoYArea && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {cargoYArea}
                    </div>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Section title="Información general">
                <Field label="Empleado" value={viewRow.nombre_empleado} full />
                <Field label="Concepto" value={viewRow.concepto} />
                <Field label="Periodo" value={viewRow.periodo} />
                <Field label="Fecha inicio" value={viewRow.fecha_inicio} />
                <Field label="Fecha fin" value={viewRow.fecha_fin} />
                <Field label="Total días" value={Number(viewRow.total_dias) === 0.5 || viewRow.jornada === 'Medio día' ? '0.5 (½ día)' : (viewRow.total_dias != null ? String(viewRow.total_dias) : null)} />
                {viewRow.dias_en_dinero != null && Number(viewRow.dias_en_dinero) > 0 && (() => {
                  const dDisfrute = viewRow.dias_disfrutados != null && viewRow.dias_disfrutados !== ''
                    ? Number(viewRow.dias_disfrutados)
                    : (viewRow.fecha_inicio && viewRow.fecha_fin
                        ? diasHabilesEntre(viewRow.fecha_inicio, viewRow.fecha_fin)
                        : Math.max(0, Number(viewRow.total_dias || 0) - Number(viewRow.dias_en_dinero)))
                  return (
                    <>
                      <Field label="Días en dinero" value={`💰 ${viewRow.dias_en_dinero} días`} />
                      <Field label="Días disfrute (tiempo)" value={dDisfrute > 0 ? `${dDisfrute} días` : '0 días'} />
                      <Field label="Desglose vacaciones" value={dDisfrute > 0 ? `${dDisfrute} días disfrute + ${viewRow.dias_en_dinero} en dinero` : `${viewRow.dias_en_dinero} días en dinero`} full />
                    </>
                  )
                })()}
                <Field label="Jornada" value={viewRow.jornada === 'Medio día' ? '🕐 Medio día' : (viewRow.concepto === 'LNR' || viewRow.concepto === 'LR') ? 'Día completo' : null} />
                <Field label="Diagnóstico" value={viewRow.diagnostico} />
                <Field label="Cargo" value={cargoEmpleado} />
                <Field label="Dependencia / Área" value={viewRow.dependencia} />
                <Field label="Cargo / Área" value={cargoYArea} full />
              </Section>
              <Section title="Estados y validaciones">
                {[
                  ['Válid. Incapacidad', viewRow.validacion_incapacidad],
                  ['Prórroga', viewRow.prorroga],
                  ['Rad. Incapacidades', viewRow.radicacion_incapacidad],
                  ['Obs. Contabilidad', viewRow.observacion_contabilidad],
                  ['Nómina Electrónica', viewRow.nomina_electronica],
                  ['Seguridad Social', viewRow.seguridad_social],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    {statusPill(val)}
                  </div>
                ))}
              </Section>
              {viewRow.observacion && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>Observación</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{viewRow.observacion}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => onEdit(viewRow)}><Edit2 size={14} /> Editar</button>
            </div>
          </>
        )
      })()}
    </AnimatedModal>
  )
}
