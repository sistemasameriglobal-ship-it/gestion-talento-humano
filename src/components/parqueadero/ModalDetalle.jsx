import { X, Edit2 } from 'lucide-react'
import { TipoBadge, ObsBadge } from './Badges'

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{value || <span style={{ color: '#D1D5DB' }}>—</span>}</div>
    </div>
  )
}

export default function ModalDetalle({ row, onClose, onEdit }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: row.tipo === 'CARRO' ? 'var(--info-bg)' : row.tipo === 'BICICLETA' ? '#D1FAE5' : 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
              {row.tipo === 'CARRO' ? '🚗' : row.tipo === 'BICICLETA' ? '🚲' : '🏍'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>{row.nombre_empleado}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: row.tipo === 'BICICLETA' ? 'inherit' : 'monospace', fontWeight: 700, letterSpacing: row.tipo === 'BICICLETA' ? 'normal' : '0.05em' }}>{row.placa}</span>
                · {row.mes} {row.anio}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', marginBottom: 16 }}>
            <Field label="Nombre completo" value={row.nombre_empleado} />
            <Field label={row.tipo === 'BICICLETA' ? 'Marca' : 'Placa'} value={<span style={{ fontFamily: row.tipo === 'BICICLETA' ? 'inherit' : 'monospace', fontWeight: 700, fontSize: 15 }}>{row.placa}</span>} />
            <Field label="Tipo de vehículo" value={<TipoBadge tipo={row.tipo} />} />
            <Field label="Mes / Año" value={[row.mes, row.anio].filter(Boolean).join(' ') || '—'} />
            <Field label="Cédula" value={row.cedula} />
            <Field label="Teléfono" value={row.telefono} />
            <Field label="Fecha de ingreso" value={row.fecha_ingreso} />
            <Field label="Fecha de retiro" value={row.fecha_retiro} />
            <Field label="Estado" value={row.retirado
              ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', lineHeight: 1 }}><span style={{ fontSize: 8 }}>●</span>Retirado</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)' }}>✓ Activo</span>} />
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Observación" value={<ObsBadge obs={row.observacion} />} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Observación del vehículo" value={row.nota_vehiculo} />
            </div>
          </div>
          {row.fecha_envio_reporte && (
            <div style={{ background: 'var(--info-bg)', border: '1px solid color-mix(in srgb, var(--info) 35%, transparent)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#3730A3', display: 'flex', alignItems: 'center', gap: 8 }}>
              📤 Reporte enviado el {row.fecha_envio_reporte.split('T')[0]}
            </div>
          )}
          {row.observacion === 'EXENTOS DE PAGO' && (
            <div style={{ background: 'var(--success-bg)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              ✓ Este colaborador está exento de pago de parqueadero.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(row) }}><Edit2 size={14} /> Editar</button>
        </div>
      </div>
    </div>
  )
}
