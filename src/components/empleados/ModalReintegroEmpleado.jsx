import { useState } from 'react'
import { X, Calendar, UserCheck, Briefcase, Building2, Info, Award, RefreshCw } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'
import { DEPENDENCIAS } from './empleadosConstants'

export default function ModalReintegroEmpleado({ emp, departamentos, onClose, onConfirm, saving }) {
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS

  // Si el colaborador está activo, se asume por defecto Ascenso / Continuidad
  const [tipoMovimiento, setTipoMovimiento] = useState(emp?.activo !== false ? 'continuidad' : 'reintegro')
  const [subTipo, setSubTipo] = useState('ascenso') // 'ascenso' | 'cambio_cargo'
  const [fechaIngreso, setFechaIngreso] = useState(hoyISO())
  const [cargo, setCargo] = useState(emp?.cargo || '')
  const [dependencia, setDependencia] = useState(emp?.dependencia || '')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const esContinuidad = tipoMovimiento === 'continuidad'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fechaIngreso) {
      setError('La fecha de inicio del nuevo periodo es obligatoria.')
      return
    }
    if (emp?.fecha_retiro && !esContinuidad && fechaIngreso < emp.fecha_retiro) {
      setError(`La fecha de reintegro (${fechaIngreso}) no puede ser anterior a la fecha de retiro previa (${emp.fecha_retiro}).`)
      return
    }
    setError(null)

    const obsDefecto = esContinuidad
      ? (subTipo === 'ascenso' ? 'Ascenso de cargo con continuidad laboral' : 'Cambio de cargo / área con continuidad laboral')
      : 'Reintegro bajo nuevo contrato laboral tras retiro externo'

    onConfirm({
      nueva_fecha_ingreso: fechaIngreso,
      cargo: cargo.trim() || null,
      dependencia: dependencia || null,
      observaciones: observaciones.trim() || obsDefecto,
      continuidad_laboral: esContinuidad,
      motivo_transicion: esContinuidad ? subTipo : 'reintegro',
    })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: esContinuidad ? '#FDF2F8' : 'var(--success-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: esContinuidad ? '#BE185D' : 'var(--success-text)',
            }}>
              {esContinuidad ? <Award size={19} /> : <UserCheck size={18} />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>
                {esContinuidad ? 'Ascenso / Cambio de Cargo' : 'Reintegrar Colaborador'}
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

            {/* ── 1. Selector de Tipo de Movimiento ── */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text)', marginBottom: 8, display: 'block' }}>
                Tipo de Movimiento Contractual
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Opción A: Continuidad (Ascenso / Cambio de Cargo) */}
                <div
                  onClick={() => setTipoMovimiento('continuidad')}
                  style={{
                    border: `2px solid ${esContinuidad ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    background: esContinuidad ? 'var(--primary-light)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all .15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: esContinuidad ? 'var(--primary)' : 'var(--text)' }}>
                      ⭐ Ascenso / Continuidad
                    </span>
                    <input
                      type="radio"
                      name="tipoMovimiento"
                      checked={esContinuidad}
                      onChange={() => setTipoMovimiento('continuidad')}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    Mantiene antigüedad y saldo de vacaciones acumulado intacto.
                  </span>
                </div>

                {/* Opción B: Reingreso tras retiro externo */}
                <div
                  onClick={() => setTipoMovimiento('reintegro')}
                  style={{
                    border: `2px solid ${!esContinuidad ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    background: !esContinuidad ? 'var(--success-bg)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all .15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: !esContinuidad ? 'var(--success-text)' : 'var(--text)' }}>
                      🔄 Reingreso tras retiro
                    </span>
                    <input
                      type="radio"
                      name="tipoMovimiento"
                      checked={!esContinuidad}
                      onChange={() => setTipoMovimiento('reintegro')}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    Inicia nuevo ciclo contractual. Vacaciones y antigüedad desde cero.
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-selector si es Continuidad */}
            {esContinuidad && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>Motivo:</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="subTipoContinuidad"
                    value="ascenso"
                    checked={subTipo === 'ascenso'}
                    onChange={() => setSubTipo('ascenso')}
                  />
                  <span>Ascenso / Promoción</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="subTipoContinuidad"
                    value="cambio_cargo"
                    checked={subTipo === 'cambio_cargo'}
                    onChange={() => setSubTipo('cambio_cargo')}
                  />
                  <span>Cambio de Cargo / Área</span>
                </label>
              </div>
            )}

            {/* Aviso Informativo Claro */}
            {esContinuidad ? (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
                <span>
                  ℹ️ <strong>Continuidad laboral respetada:</strong> Se creará un nuevo periodo con el nuevo cargo y dependencia, <strong>conservando la antigüedad y el saldo de vacaciones acumulado</strong>.
                </span>
              </div>
            ) : (
              <div style={{
                background: 'var(--info-bg)', border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--info-text)',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  El reintegro iniciará un <strong>nuevo contrato</strong>. Su historial anterior se conservará intacto como registro histórico, mientras que sus vacaciones y antigüedad para este nuevo ciclo iniciarán desde cero.
                </span>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ fontSize: 12, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            {/* Fecha de Efectividad / Nuevo Ingreso */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                {esContinuidad ? 'Fecha de efectividad del nuevo cargo' : 'Nueva fecha de ingreso'} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  className="emp-form-input"
                  style={{ paddingLeft: 36, width: '100%' }}
                  value={fechaIngreso}
                  min={(!esContinuidad && emp?.fecha_retiro) ? emp.fecha_retiro : undefined}
                  onChange={e => setFechaIngreso(e.target.value)}
                  required
                />
              </div>
              {emp?.fecha_retiro && !esContinuidad && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Retiro del periodo anterior: {emp.fecha_retiro}
                </div>
              )}
            </div>

            {/* Cargo y Dependencia */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                  {esContinuidad ? 'Nuevo Cargo' : 'Cargo'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="emp-form-input"
                    style={{ paddingLeft: 34, width: '100%' }}
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    placeholder={esContinuidad ? 'Ej. Coordinador Senior' : 'Cargo actual'}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                  {esContinuidad ? 'Nueva Dependencia / Área' : 'Dependencia / Área'}
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

            {/* Observaciones */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Observaciones del movimiento
              </label>
              <textarea
                className="emp-form-input"
                style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: '10px 12px' }}
                placeholder={esContinuidad ? 'Detalles del ascenso, aumento o cambio contractual con continuidad...' : 'Notas sobre el nuevo contrato o acuerdo de reingreso...'}
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
                background: esContinuidad ? 'var(--primary)' : 'var(--success)',
                borderColor: esContinuidad ? 'var(--primary)' : 'var(--success)'
              }}
              disabled={saving}
            >
              {esContinuidad ? <Award size={15} /> : <UserCheck size={14} />}
              {saving ? 'Guardando movimiento...' : (esContinuidad ? 'Confirmar Ascenso / Continuidad' : 'Confirmar Reintegro')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
