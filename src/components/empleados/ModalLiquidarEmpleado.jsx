import { useState } from 'react'
import { X, Calendar, CheckCircle2, FileText, RotateCcw } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'

export default function ModalLiquidarEmpleado({ emp, onClose, onConfirm, saving }) {
  const yaLiquidado = Boolean(emp?.liquidado)
  const [fechaLiquidacion, setFechaLiquidacion] = useState(
    emp?.fecha_liquidacion ? String(emp.fecha_liquidacion).slice(0, 10) : hoyISO()
  )
  const [observacion, setObservacion] = useState(emp?.observacion_liquidacion || '')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fechaLiquidacion) {
      setError('La fecha de liquidación es obligatoria.')
      return
    }
    setError(null)
    onConfirm({
      liquidado: true,
      fecha_liquidacion: fechaLiquidacion,
      observacion_liquidacion: observacion.trim() || null,
    })
  }

  const handleRevertir = () => {
    onConfirm({
      liquidado: false,
      fecha_liquidacion: null,
      observacion_liquidacion: null,
    })
  }

  return (
    <div className="modal-backdrop" tabIndex={-1}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#ECFDF5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#059669', border: '1px solid #A7F3D0',
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>
                {yaLiquidado ? 'Detalle de Liquidación' : 'Registrar Liquidación'}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {emp?.nombre_completo} {emp?.cargo ? `• ${emp.cargo}` : ''}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--surface, var(--bg))',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Ingreso: </span>
                <strong>{emp?.fecha_ingreso ? String(emp.fecha_ingreso).slice(0, 10) : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Retiro: </span>
                <strong style={{ color: 'var(--danger-text)' }}>
                  {emp?.fecha_retiro ? String(emp.fecha_retiro).slice(0, 10) : '—'}
                </strong>
              </div>
              <div>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: yaLiquidado ? '#ECFDF5' : '#FEF3C7',
                  color: yaLiquidado ? '#047857' : '#B45309',
                  border: `1px solid ${yaLiquidado ? '#A7F3D0' : '#FCD34D'}`,
                }}>
                  {yaLiquidado ? '✓ Liquidado' : '⚠️ Pendiente por liquidar'}
                </span>
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ fontSize: 12, padding: '8px 12px', margin: 0 }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Fecha de liquidación <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  className="emp-form-input"
                  style={{ paddingLeft: 36, width: '100%' }}
                  value={fechaLiquidacion}
                  onChange={e => setFechaLiquidacion(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={13} style={{ color: 'var(--text-muted)' }} />
                Observaciones contables / Comprobante de pago
              </label>
              <textarea
                className="emp-form-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical', padding: '10px 12px' }}
                placeholder="Ej. Pago realizado por transferencia #48291, paz y salvo firmado..."
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              {yaLiquidado && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--warning-text)', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  onClick={handleRevertir}
                  disabled={saving}
                  title="Marcar nuevamente como pendiente por liquidar"
                >
                  <RotateCcw size={12} /> Marcar pendiente
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700,
                  background: '#059669', borderColor: '#059669', color: '#fff',
                }}
                disabled={saving}
              >
                <CheckCircle2 size={14} />
                {saving ? 'Guardando...' : (yaLiquidado ? 'Actualizar Liquidación' : 'Confirmar Liquidación')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
