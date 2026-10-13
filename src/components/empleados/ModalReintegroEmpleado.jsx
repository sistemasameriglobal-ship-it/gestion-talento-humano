import { useState } from 'react'
import { X, Calendar, UserCheck, Briefcase, Building2, Info } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'
import { DEPENDENCIAS } from './empleadosConstants'

export default function ModalReintegroEmpleado({ emp, departamentos, onClose, onConfirm, saving }) {
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS

  const [fechaIngreso, setFechaIngreso] = useState(hoyISO())
  const [cargo, setCargo] = useState(emp?.cargo || '')
  const [dependencia, setDependencia] = useState(emp?.dependencia || '')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fechaIngreso) {
      setError('La nueva fecha de ingreso es obligatoria.')
      return
    }
    if (emp?.fecha_retiro && fechaIngreso < emp.fecha_retiro) {
      setError(`La fecha de reintegro (${fechaIngreso}) no puede ser anterior a la fecha de retiro previa (${emp.fecha_retiro}).`)
      return
    }
    setError(null)
    onConfirm({
      nueva_fecha_ingreso: fechaIngreso,
      cargo: cargo.trim() || null,
      dependencia: dependencia || null,
      observaciones: observaciones.trim() || 'Reintegro bajo nuevo contrato laboral',
    })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--success-bg)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--success-text)',
            }}>
              <UserCheck size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Reintegrar Colaborador</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp?.nombre_completo}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--info-bg)', border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--info-text)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>
                El reintegro iniciará un <strong>nuevo contrato</strong>. Su historial anterior se conservará intacto como registro histórico, mientras que sus vacaciones y antigüedad para este nuevo ciclo iniciarán desde cero.
              </span>
            </div>

            {error && (
              <div className="alert alert-error" style={{ fontSize: 12, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Nueva fecha de ingreso <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  className="emp-form-input"
                  style={{ paddingLeft: 36, width: '100%' }}
                  value={fechaIngreso}
                  min={emp?.fecha_retiro || undefined}
                  onChange={e => setFechaIngreso(e.target.value)}
                  required
                />
              </div>
              {emp?.fecha_retiro && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Retiro del periodo anterior: {emp.fecha_retiro}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                  Cargo
                </label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="emp-form-input"
                    style={{ paddingLeft: 34, width: '100%' }}
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    placeholder="Cargo actual"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                  Dependencia / Área
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <select
                    className="emp-form-input"
                    style={{ paddingLeft: 34, width: '100%' }}
                    value={dependencia}
                    onChange={e => setDependencia(e.target.value)}
                  >
                    <option value="">— Seleccionar —</option>
                    {listaDepartamentos.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Observaciones del reintegro
              </label>
              <textarea
                className="emp-form-input"
                style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: '10px 12px' }}
                placeholder="Notas sobre el nuevo contrato o acuerdo de reingreso..."
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
              className="btn btn-primary"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700,
                background: 'var(--success)', borderColor: 'var(--success)'
              }}
              disabled={saving}
            >
              <UserCheck size={14} />
              {saving ? 'Registrando reintegro...' : 'Confirmar Reintegro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
