import { useState } from 'react'
import { X, Calendar, UserCheck, Briefcase, Building2, Info, Award, DollarSign } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'
import { DEPENDENCIAS, formatCOP } from './empleadosConstants'

export default function ModalReintegroEmpleado({ emp, departamentos, onClose, onConfirm, saving }) {
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS

  // Si el colaborador está activo, se asume por defecto Ascenso / Continuidad
  const esActivo = emp?.activo !== false
  const [tipoMovimiento, setTipoMovimiento] = useState(esActivo ? 'ascenso' : 'reintegro')
  const [fechaIngreso, setFechaIngreso] = useState(hoyISO())
  const [cargo, setCargo] = useState(emp?.cargo || '')
  const [dependencia, setDependencia] = useState(emp?.dependencia || '')
  const [nuevoSalario, setNuevoSalario] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const esContinuidad = tipoMovimiento !== 'reintegro'

  const MOVIMIENTOS = [
    {
      id: 'ascenso',
      titulo: '🌟 Ascenso / Promoción',
      desc: 'Cambio a un cargo superior, con o sin ajuste de sueldo.',
      continuidad: true,
    },
    {
      id: 'cambio_area',
      titulo: '🔄 Ajuste de Rango / Área',
      desc: 'Movimiento lateral o ajuste de funciones sin cerrar contrato.',
      continuidad: true,
    },
    {
      id: 'ajuste_salarial',
      titulo: '💰 Ajuste Salarial',
      desc: 'Aumento o modificación salarial mediante Otrossí.',
      continuidad: true,
    },
    {
      id: 'reintegro',
      titulo: '🔁 Reingreso tras retiro',
      desc: 'Nuevo ciclo tras desvinculación previa (antigüedad desde cero).',
      continuidad: false,
    },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fechaIngreso) {
      setError('La fecha de efectividad / ingreso es obligatoria.')
      return
    }
    if (tipoMovimiento === 'ajuste_salarial' && (!nuevoSalario || Number(nuevoSalario) <= 0)) {
      setError('Debes ingresar el nuevo salario para registrar un Ajuste Salarial.')
      return
    }
    if (tipoMovimiento === 'ascenso' && !cargo.trim()) {
      setError('Debes ingresar el nuevo cargo para el ascenso.')
      return
    }
    if (tipoMovimiento === 'cambio_area' && !cargo.trim() && !dependencia) {
      setError('Debes ingresar el nuevo cargo o área para este movimiento.')
      return
    }
    if (emp?.fecha_retiro && !esContinuidad && fechaIngreso < emp.fecha_retiro) {
      setError(`La fecha de reintegro (${fechaIngreso}) no puede ser anterior a la fecha de retiro previa (${emp.fecha_retiro}).`)
      return
    }
    setError(null)

    let obsGenerada = observaciones.trim()
    if (!obsGenerada) {
      if (tipoMovimiento === 'ascenso') {
        obsGenerada = `Ascenso a cargo "${cargo.trim()}" con continuidad laboral`
      } else if (tipoMovimiento === 'ajuste_salarial') {
        obsGenerada = `Ajuste salarial a ${formatCOP(nuevoSalario)} (Otrossí)`
      } else if (tipoMovimiento === 'cambio_area') {
        obsGenerada = `Cambio de área / cargo a "${cargo.trim() || emp?.cargo}" (${dependencia || emp?.dependencia}) con continuidad laboral`
      } else {
        obsGenerada = 'Reintegro bajo nuevo contrato laboral tras retiro externo'
      }
    }

    // Trazabilidad del salario en observaciones
    const salarioActualNum = Number(emp?.salario) || 0
    const salarioFinalNum = nuevoSalario && Number(nuevoSalario) > 0 ? Number(nuevoSalario) : (salarioActualNum > 0 ? salarioActualNum : null)
    let textoSalarioAudit = ''
    if (salarioActualNum > 0) {
      textoSalarioAudit = ` [Salario anterior: ${formatCOP(salarioActualNum)}${salarioFinalNum && salarioFinalNum !== salarioActualNum ? ` | Nuevo salario: ${formatCOP(salarioFinalNum)}` : ''}]`
    }
    const observacionesFinal = obsGenerada + textoSalarioAudit

    onConfirm({
      tipo_movimiento: tipoMovimiento,
      nueva_fecha_ingreso: fechaIngreso,
      cargo: cargo.trim() || emp?.cargo || null,
      dependencia: dependencia || emp?.dependencia || null,
      salario: salarioFinalNum,
      salario_anterior: salarioActualNum,
      observaciones: observacionesFinal,
      continuidad_laboral: esContinuidad,
      motivo_transicion: tipoMovimiento,
    })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        {/* ── Modal Header ── */}
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
                {esContinuidad ? 'Movimiento Contractual / Otrossí' : 'Reintegrar Colaborador'}
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

            {/* ── 1. Selector de Tipo de Movimiento (4 opciones claras) ── */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text)', marginBottom: 8, display: 'block' }}>
                Tipo de Movimiento Contractual
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                {MOVIMIENTOS.map(m => {
                  const seleccionado = tipoMovimiento === m.id
                  return (
                    <div
                      key={m.id}
                      onClick={() => setTipoMovimiento(m.id)}
                      style={{
                        border: `2px solid ${seleccionado ? (m.continuidad ? 'var(--primary)' : 'var(--success)') : 'var(--border)'}`,
                        borderRadius: 10,
                        padding: '11px 13px',
                        background: seleccionado
                          ? (m.continuidad ? 'var(--primary-light)' : 'var(--success-bg)')
                          : 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'all .15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: seleccionado ? (m.continuidad ? 'var(--primary)' : 'var(--success-text)') : 'var(--text)' }}>
                          {m.titulo}
                        </span>
                        <input
                          type="radio"
                          name="tipoMovimiento"
                          value={m.id}
                          checked={seleccionado}
                          onChange={() => setTipoMovimiento(m.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        {m.desc}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Aviso Informativo Claro */}
            {esContinuidad ? (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
                <span>
                  ℹ️ <strong>Continuidad jurídica respetada:</strong> Este movimiento se registra como un <strong>Otrossí contractual</strong>. Se conserva intacta la antigüedad, el saldo acumulado de vacaciones y los beneficios laborales del colaborador.
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

            {/* ── 2. Fechas ── */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                {esContinuidad ? 'Fecha de efectividad del movimiento (Fecha del Otrossí)' : 'Nueva fecha de ingreso'} <span style={{ color: '#EF4444' }}>*</span>
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

            {/* ── 3. Salarios (Anterior de solo lectura y Nuevo Salario) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Salario anterior (Actual)
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="emp-form-input"
                    style={{ paddingLeft: 34, width: '100%', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    value={Number(emp?.salario) > 0 ? formatCOP(emp.salario) : 'Sin salario registrado'}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                  Nuevo Salario {tipoMovimiento === 'ajuste_salarial' ? <span style={{ color: '#EF4444' }}>*</span> : <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>(Opcional)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="number"
                    className="emp-form-input"
                    style={{ paddingLeft: 34, width: '100%' }}
                    value={nuevoSalario}
                    onChange={e => setNuevoSalario(e.target.value)}
                    placeholder={tipoMovimiento === 'ajuste_salarial' ? 'Ej. 3500000' : 'Dejar vacío si mantiene actual'}
                    min="0"
                    step="1000"
                    required={tipoMovimiento === 'ajuste_salarial'}
                  />
                </div>
                {Number(nuevoSalario) > 0 && (
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, marginTop: 3 }}>
                    {formatCOP(nuevoSalario)}
                  </div>
                )}
              </div>
            </div>

            {/* ── 4. Cargo y Dependencia / Área ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                  {esContinuidad ? 'Nuevo Cargo / Posición' : 'Cargo'}
                  {tipoMovimiento === 'ascenso' && <span style={{ color: '#EF4444' }}> *</span>}
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

            {/* ── 5. Observaciones / Justificación ── */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                Observaciones / Justificación del Otrossí
              </label>
              <textarea
                className="emp-form-input"
                style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: '10px 12px' }}
                placeholder={esContinuidad ? 'Detalles del ascenso, aumento salarial o cambio contractual con continuidad...' : 'Notas sobre el nuevo contrato o acuerdo de reingreso...'}
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
              {saving ? 'Guardando movimiento...' : (esContinuidad ? 'Confirmar Movimiento / Otrossí' : 'Confirmar Reintegro')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
