import { useState } from 'react'
import { X, Calendar, LogOut, AlertTriangle, Check } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'
import { CONCEPTOS_LIST } from '../../utils/novedadesConstants'

const CONCEPTOS_RETIRO_COMUNES = [
  { id: 'Terminación de Contrato', label: 'Terminación de Contrato', icon: '📤', color: '#EF4444', desc: 'Finalización de contrato laboral o acuerdo' },
  { id: 'No renovación de contrato', label: 'No renovación de contrato', icon: '📄', color: '#8B5CF6', desc: 'Vencimiento del plazo pactado sin prórroga' },
  { id: 'Renuncia', label: 'Renuncia Voluntaria', icon: '🚪', color: '#F59E0B', desc: 'Decisión voluntaria del colaborador' },
  { id: 'Suspensión', label: 'Suspensión', icon: '⏸', color: '#6366F1', desc: 'Suspensión temporal de actividades' },
  { id: '__otro__', label: 'Otro Concepto...', icon: '📋', color: '#0D9488', desc: 'Elegir otro concepto de novedades' },
]

export default function ModalRetiroEmpleado({ emp, onClose, onConfirm, saving }) {
  const [fechaRetiro, setFechaRetiro] = useState(hoyISO())
  const [tipoConcepto, setTipoConcepto] = useState('Terminación de Contrato')
  const [otroConcepto, setOtroConcepto] = useState('Otros')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const conceptoEfectivo = tipoConcepto === '__otro__' ? (otroConcepto || 'Otros') : tipoConcepto

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
    onConfirm({
      fecha_retiro: fechaRetiro,
      concepto: conceptoEfectivo,
      observaciones: observaciones.trim() || `${conceptoEfectivo} laboral`,
    })
  }

  return (
    <div className="modal-backdrop" tabIndex={-1}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
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
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {emp?.nombre_completo} {emp?.cargo ? `• ${emp.cargo}` : ''}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{
              background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--warning-text)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                Esta acción marcará al colaborador como <strong>Inactivo</strong> y cerrará su periodo laboral actual, registrando la novedad correspondiente en el sistema.
              </span>
            </div>

            {error && (
              <div className="alert alert-error" style={{ fontSize: 12, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            {/* ── 1. Fecha de Retiro ── */}
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

            {/* ── 2. Concepto de Novedad (Motivo del retiro) ── */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Concepto de Novedad (Motivo de Retiro) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CONCEPTOS_RETIRO_COMUNES.map(item => {
                  const sel = tipoConcepto === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => setTipoConcepto(item.id)}
                      style={{
                        border: `2px solid ${sel ? item.color : 'var(--border)'}`,
                        borderRadius: 9,
                        padding: '10px 12px',
                        background: sel ? `color-mix(in srgb, ${item.color} 10%, var(--surface))` : 'var(--surface)',
                        gridColumn: item.id === '__otro__' ? '1 / -1' : undefined,
                        cursor: 'pointer',
                        transition: 'all .15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: sel ? item.color : 'var(--text)' }}>
                          {item.icon} {item.label}
                        </span>
                        {sel && <Check size={14} style={{ color: item.color }} />}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.25 }}>
                        {item.desc}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Selector si eligió "Otro Concepto..." */}
              {tipoConcepto === '__otro__' && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                    Seleccionar concepto de la lista de novedades:
                  </label>
                  <select
                    className="emp-form-input"
                    style={{ width: '100%' }}
                    value={otroConcepto}
                    onChange={e => setOtroConcepto(e.target.value)}
                  >
                    {CONCEPTOS_LIST.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notificación informativa de conexión con Novedades */}
              <div style={{
                marginTop: 8,
                padding: '6px 10px',
                background: 'var(--primary-light)',
                borderRadius: 6,
                fontSize: 11.5,
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 500,
              }}>
                <span>🔗</span>
                <span>
                  Se creará automáticamente un registro de tipo <strong>"{conceptoEfectivo}"</strong> en la sección de Novedades.
                </span>
              </div>
            </div>

            {/* ── 3. Observaciones / Motivo ── */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Observaciones / Motivo de retiro
              </label>
              <textarea
                className="emp-form-input"
                style={{ width: '100%', minHeight: 75, resize: 'vertical', padding: '10px 12px' }}
                placeholder="Describe detalles adicionales sobre el retiro o motivo de desvinculación..."
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
