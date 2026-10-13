import { useState } from 'react'
import { X, Calendar, LogOut, AlertTriangle } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'

export default function ModalRetiroEmpleado({ emp, onClose, onConfirm, saving }) {
  const [fechaRetiro, setFechaRetiro] = useState(hoyISO())
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fechaRetiro) {
      setError('La fecha de retiro es obligatoria.')
      return
    }
    if (emp?.fecha_ingreso && fechaRetiro < emp.fecha_ingreso) {
      setError(`La fecha de retiro no puede ser anterior a la fecha de ingreso (${emp.fecha_ingreso}).`)
      return
    }
    setError(null)
    onConfirm({ fecha_retiro: fechaRetiro, observaciones: observaciones.trim() || 'Retiro de colaborador' })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--danger-bg)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--danger-text)',
            }}>
              <LogOut size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Retirar Colaborador</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp?.nombre_completo}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--warning-text)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                Esta acción marcará al colaborador como <strong>Inactivo</strong> y cerrará su periodo laboral actual, conservando su historial de novedades y vacaciones intacto.
              </span>
            </div>

            {error && (
              <div className="alert alert-error" style={{ fontSize: 12, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Fecha de retiro <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  className="emp-form-input"
                  style={{ paddingLeft: 36, width: '100%' }}
                  value={fechaRetiro}
                  min={emp?.fecha_ingreso || undefined}
                  onChange={e => setFechaRetiro(e.target.value)}
                  required
                />
              </div>
              {emp?.fecha_ingreso && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Fecha de ingreso de este periodo: {emp.fecha_ingreso}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Observaciones / Motivo de retiro
              </label>
              <textarea
                className="emp-form-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical', padding: '10px 12px' }}
                placeholder="Describe el motivo o razón del retiro (ej. fin de contrato, renuncia voluntaria, etc.)..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              disabled={saving}
            >
              <LogOut size={14} />
              {saving ? 'Procesando retiro...' : 'Confirmar Retiro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
