import { useState } from 'react'
import { X, Calendar, UserCheck, Briefcase, Building2, Info, Award, DollarSign } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'
import {
  DEPENDENCIAS, formatCOP,
  SMMLV_VIGENTE, AUXILIO_TRANSPORTE_VIGENTE, calcularApoyoProductivoSugerido,
  esAprendiz, normalizarTexto,
} from './empleadosConstants'

const OBS_ETAPA_PRODUCTIVA_DEFAULT =
  'Inicio de Etapa Productiva. Incremento de apoyo al 100% SMMLV y asignación de auxilio de transporte según normativa legal'

export default function ModalReintegroEmpleado({ emp, departamentos, onClose, onConfirm, saving }) {
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS

  // Si el colaborador está activo, se asume por defecto Ascenso / Continuidad
  const esActivo = emp?.activo !== false
  const esColaboradorAprendiz = esAprendiz(emp)
  const yaEstaEnProductiva = normalizarTexto(emp?.cargo).includes('productiv')
  const sugerirEtapaProductiva = esActivo && esColaboradorAprendiz && !yaEstaEnProductiva

  const [tipoMovimiento, setTipoMovimiento] = useState(
    !esActivo ? 'reintegro' : (sugerirEtapaProductiva ? 'etapa_productiva' : 'ascenso')
  )
  const [fechaIngreso, setFechaIngreso] = useState(hoyISO())
  const [cargo, setCargo] = useState(() => {
    if (sugerirEtapaProductiva) return 'Aprendiz Etapa Productiva'
    return emp?.cargo || ''
  })
  const [dependencia, setDependencia] = useState(emp?.dependencia || '')
  const [nuevoSalario, setNuevoSalario] = useState(() => {
    if (sugerirEtapaProductiva) return String(calcularApoyoProductivoSugerido(emp?.salario))
    return ''
  })
  const [nuevoAuxilio, setNuevoAuxilio] = useState(() => {
    if (sugerirEtapaProductiva) {
      return String(Number(emp?.auxilio_transporte) > 0 ? emp.auxilio_transporte : AUXILIO_TRANSPORTE_VIGENTE)
    }
    return ''
  })
  const [observaciones, setObservaciones] = useState(() => {
    if (sugerirEtapaProductiva) return OBS_ETAPA_PRODUCTIVA_DEFAULT
    return ''
  })
  const [error, setError] = useState(null)

  const esContinuidad = tipoMovimiento !== 'reintegro'
  // El ajuste salarial y la transición a etapa productiva son novedades puras: NO crean ni cierran períodos laborales
  const esAjusteSalarial = tipoMovimiento === 'ajuste_salarial'
  const esEtapaProductiva = tipoMovimiento === 'etapa_productiva'

  const handleSeleccionarMovimiento = (id) => {
    setError(null)
    if (id === 'etapa_productiva') {
      const apoyoSugerido = calcularApoyoProductivoSugerido(emp?.salario)
      const auxSugerido = Number(emp?.auxilio_transporte) > 0
        ? Number(emp.auxilio_transporte)
        : AUXILIO_TRANSPORTE_VIGENTE
      setTipoMovimiento(id)
      setNuevoSalario(String(apoyoSugerido))
      setNuevoAuxilio(String(auxSugerido))
      setCargo('Aprendiz Etapa Productiva')
      setFechaIngreso(prev => prev || hoyISO())
      setObservaciones(OBS_ETAPA_PRODUCTIVA_DEFAULT)
    } else {
      if (tipoMovimiento === 'etapa_productiva') {
        if (observaciones === OBS_ETAPA_PRODUCTIVA_DEFAULT) setObservaciones('')
        if (cargo === 'Aprendiz Etapa Productiva' && emp?.cargo !== 'Aprendiz Etapa Productiva') {
          setCargo(emp?.cargo || '')
        }
      }
      setTipoMovimiento(id)
    }
  }

  const MOVIMIENTOS = [
    {
      id: 'ascenso',
      titulo: '🌟 Ascenso / Cambio de Cargo',
      desc: 'Cambio formal de cargo superior (genera nuevo período auditable).',
      continuidad: true,
    },
    {
      id: 'cambio_area',
      titulo: '🔄 Ajuste de Rango / Área',
      desc: 'Movimiento lateral formal de cargo o área (genera nuevo período).',
      continuidad: true,
    },
    {
      id: 'ajuste_salarial',
      titulo: '💰 Ajuste Salarial',
      desc: 'Incremento de sueldo. Se registra como novedad, sin tocar el período laboral.',
      continuidad: true,
    },
    {
      id: 'etapa_productiva',
      titulo: '🎓 Transición a Etapa Productiva (Aprendiz)',
      desc: 'Paso de Etapa Lectiva (75%) a Productiva (100% SMMLV + Auxilio + ARL). Mantiene Período #1 Vigente.',
      continuidad: true,
      destacado: esColaboradorAprendiz,
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
    if (esAjusteSalarial && (!nuevoSalario || Number(nuevoSalario) <= 0)) {
      setError('Debes ingresar el nuevo salario para registrar un Ajuste Salarial.')
      return
    }
    if (esEtapaProductiva && (!nuevoSalario || Number(nuevoSalario) <= 0)) {
      setError('Debes ingresar el monto del Apoyo Productivo (100% SMMLV).')
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

    const salarioActualNum = Number(emp?.salario) || 0
    const salarioFinalNum = nuevoSalario && Number(nuevoSalario) > 0 ? Number(nuevoSalario) : (salarioActualNum > 0 ? salarioActualNum : null)

    // ── Transición a Etapa Productiva (Aprendiz): actualiza salario, auxilio y cargo sin crear nuevo período ──
    if (esEtapaProductiva) {
      const auxilioNum = nuevoAuxilio !== '' && Number(nuevoAuxilio) >= 0
        ? Number(nuevoAuxilio)
        : AUXILIO_TRANSPORTE_VIGENTE
      const notasAdicionales = observaciones.trim() || OBS_ETAPA_PRODUCTIVA_DEFAULT
      const obsNovedad = `Transición a Etapa Productiva. Apoyo: ${formatCOP(nuevoSalario)} + Aux. Transporte: ${formatCOP(auxilioNum)}. ${notasAdicionales}`

      onConfirm({
        tipo_movimiento: 'etapa_productiva',
        motivo_transicion: 'etapa_productiva',
        continuidad_laboral: true,
        es_novedad_pura: true,
        nueva_fecha_ingreso: fechaIngreso,
        cargo: cargo.trim() || 'Aprendiz Etapa Productiva',
        dependencia: dependencia || emp?.dependencia || null,
        salario: Number(nuevoSalario),
        salario_anterior: salarioActualNum,
        auxilio_transporte: auxilioNum,
        observaciones: obsNovedad,
      })
      return
    }

    // ── Ajuste salarial: novedad pura sin períodos ──
    if (esAjusteSalarial) {
      const motivo = observaciones.trim() || 'Sin justificación registrada'
      const auxilioNum = nuevoAuxilio !== '' && Number(nuevoAuxilio) >= 0 ? Number(nuevoAuxilio) : null
      onConfirm({
        tipo_movimiento: 'ajuste_salarial',
        motivo_transicion: 'ajuste_salarial',
        continuidad_laboral: true,
        es_novedad_pura: true,
        nueva_fecha_ingreso: fechaIngreso,
        salario: Number(nuevoSalario),
        salario_anterior: salarioActualNum,
        auxilio_transporte: auxilioNum,
        observaciones: `Ajuste de sueldo de ${formatCOP(salarioActualNum)} a ${formatCOP(nuevoSalario)}. Justificación: ${motivo}`,
      })
      return
    }

    let obsGenerada = observaciones.trim()
    if (!obsGenerada) {
      if (tipoMovimiento === 'ascenso') {
        obsGenerada = `Ascenso a cargo "${cargo.trim()}" con continuidad laboral`
      } else if (tipoMovimiento === 'cambio_area') {
        obsGenerada = `Cambio de área / cargo a "${cargo.trim() || emp?.cargo}" (${dependencia || emp?.dependencia}) con continuidad laboral`
      } else {
        obsGenerada = 'Reintegro bajo nuevo contrato laboral tras retiro externo'
      }
    }

    // Trazabilidad del salario en observaciones
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
    <div className="modal-backdrop" tabIndex={-1}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
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

            {/* ── 1. Selector de Tipo de Movimiento ── */}
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
                      onClick={() => handleSeleccionarMovimiento(m.id)}
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: seleccionado ? (m.continuidad ? 'var(--primary)' : 'var(--success-text)') : 'var(--text)' }}>
                            {m.titulo}
                          </span>
                          {m.destacado && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              padding: '1px 7px',
                              borderRadius: 99,
                              border: '1px solid #BFDBFE',
                            }}>
                              🎓 Sugerido
                            </span>
                          )}
                        </div>
                        <input
                          type="radio"
                          name="tipoMovimiento"
                          value={m.id}
                          checked={seleccionado}
                          onChange={() => handleSeleccionarMovimiento(m.id)}
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
            {esEtapaProductiva ? (
              <div style={{
                background: '#EFF6FF', border: '1px solid #BFDBFE',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1E3A8A',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: '#2563EB' }} />
                <div style={{ lineHeight: 1.45 }}>
                  <strong>🎓 Normativa Contrato de Aprendizaje (Paso a Etapa Productiva):</strong>
                  <div style={{ marginTop: 4 }}>
                    • <strong>Apoyo de sostenimiento:</strong> se actualiza del 75% al <strong>100% del SMMLV</strong>.<br />
                    • <strong>Auxilio de transporte:</strong> <strong>OBLIGATORIO / ACTIVO</strong> en etapa productiva presencial.<br />
                    • <strong>Seguridad Social:</strong> se activa cobertura de <strong>ARL</strong> además de EPS.<br />
                    • <strong>Continuidad:</strong> <strong>NO</strong> se cierra el contrato ni se crea un nuevo período; el Período #1 continúa <strong>Vigente</strong>.
                  </div>
                </div>
              </div>
            ) : esAjusteSalarial ? (
              <div style={{
                background: '#FEF9C3', border: '1px solid #FDE68A',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#78350F',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  💰 <strong>Novedad salarial:</strong> se actualizará el salario del colaborador y se registrará en el <strong>Historial de Novedades</strong>. <strong>No</strong> se crea un nuevo período ni se cierra el período laboral vigente (antigüedad y vacaciones intactas).
                </span>
              </div>
            ) : esContinuidad ? (
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
                {esEtapaProductiva
                  ? 'Fecha de inicio etapa productiva'
                  : esContinuidad
                  ? 'Fecha de efectividad del movimiento (Fecha del Otrossí)'
                  : 'Nueva fecha de ingreso'}{' '}
                <span style={{ color: '#EF4444' }}>*</span>
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

            {/* ── 3. Salarios (Anterior de solo lectura y Nuevo Salario / Apoyo Productivo) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {esEtapaProductiva ? 'Apoyo anterior (Etapa Lectiva 75%)' : 'Salario anterior (Actual)'}
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
                  {esEtapaProductiva ? 'Nuevo Salario / Apoyo Productivo' : 'Nuevo Salario'}{' '}
                  {(esAjusteSalarial || esEtapaProductiva)
                    ? <span style={{ color: '#EF4444' }}>*</span>
                    : <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>(Opcional)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="number"
                    className="emp-form-input"
                    style={{ paddingLeft: 34, width: '100%' }}
                    value={nuevoSalario}
                    onChange={e => setNuevoSalario(e.target.value)}
                    placeholder={esEtapaProductiva ? `100% SMMLV (${SMMLV_VIGENTE})` : esAjusteSalarial ? 'Ej. 3500000' : 'Dejar vacío si mantiene actual'}
                    min="0"
                    step="1"
                    required={esAjusteSalarial || esEtapaProductiva}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {Number(nuevoSalario) > 0 && (
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>
                      {formatCOP(nuevoSalario)} {esEtapaProductiva ? '(100% Apoyo Productivo)' : ''}
                    </span>
                  )}
                  {esEtapaProductiva && Number(nuevoSalario) !== SMMLV_VIGENTE && (
                    <button
                      type="button"
                      onClick={() => setNuevoSalario(String(SMMLV_VIGENTE))}
                      style={{
                        fontSize: 10.5, fontWeight: 700, color: '#2563EB', background: '#EFF6FF',
                        border: '1px solid #BFDBFE', borderRadius: 999, padding: '1px 8px', cursor: 'pointer',
                      }}
                    >
                      Usar 100% SMMLV ({formatCOP(SMMLV_VIGENTE)})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── 3b. Auxilio de transporte (Ajuste Salarial y Transición a Etapa Productiva) ── */}
            {(esAjusteSalarial || esEtapaProductiva) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    Auxilio de transporte actual
                  </label>
                  <input
                    type="text"
                    className="emp-form-input"
                    style={{ width: '100%', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    value={Number(emp?.auxilio_transporte) > 0 ? formatCOP(emp.auxilio_transporte) : 'Sin auxilio ($0)'}
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block' }}>
                      Auxilio de Transporte{' '}
                      {esEtapaProductiva
                        ? <span style={{ color: '#EF4444' }}>*</span>
                        : <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>(Opcional)</span>}
                    </label>
                    {esEtapaProductiva && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534',
                        border: '1px solid #86EFAC', borderRadius: 999, padding: '1px 7px',
                      }}>
                        ✓ Activo
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="number"
                      className="emp-form-input"
                      style={{ paddingLeft: 34, width: '100%' }}
                      value={nuevoAuxilio}
                      onChange={e => setNuevoAuxilio(e.target.value)}
                      placeholder={esEtapaProductiva ? `Auxilio legal (${AUXILIO_TRANSPORTE_VIGENTE})` : 'Dejar vacío si no cambia'}
                      min="0"
                      step="1"
                      required={esEtapaProductiva}
                    />
                  </div>
                  {esEtapaProductiva ? (
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                      {Number(nuevoAuxilio) > 0 ? `${formatCOP(nuevoAuxilio)} — ` : ''}Obligatorio por ley en etapa productiva presencial
                    </div>
                  ) : (
                    Number(nuevoAuxilio) > 0 && (
                      <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, marginTop: 3 }}>
                        {formatCOP(nuevoAuxilio)}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* ── 4. Cargo y Dependencia / Área (no aplica a Ajuste Salarial) ── */}
            {!esAjusteSalarial && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                    {esEtapaProductiva ? 'Etapa / Cargo en Etapa Productiva' : esContinuidad ? 'Nuevo Cargo / Posición' : 'Cargo'}
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
                      placeholder={esEtapaProductiva ? 'Aprendiz Etapa Productiva' : esContinuidad ? 'Ej. Coordinador Senior' : 'Cargo actual'}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                    {esContinuidad ? 'Dependencia / Área' : 'Dependencia / Área'}
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
            )}

            {/* ── 5. Observaciones / Justificación ── */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                {esEtapaProductiva
                  ? 'Observaciones de la transición a Etapa Productiva'
                  : esAjusteSalarial
                  ? 'Justificación del ajuste salarial'
                  : 'Observaciones / Justificación del Otrossí'}
              </label>
              <textarea
                className="emp-form-input"
                style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: '10px 12px' }}
                placeholder={
                  esEtapaProductiva
                    ? OBS_ETAPA_PRODUCTIVA_DEFAULT
                    : esAjusteSalarial
                    ? 'Ej. Incremento anual, evaluación de desempeño...'
                    : esContinuidad
                    ? 'Detalles del ascenso o cambio contractual con continuidad...'
                    : 'Notas sobre el nuevo contrato o acuerdo de reingreso...'
                }
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
              {saving
                ? 'Guardando movimiento...'
                : esEtapaProductiva
                ? 'Confirmar Paso a Etapa Productiva'
                : esAjusteSalarial
                ? 'Registrar Ajuste Salarial'
                : esContinuidad
                ? 'Confirmar Movimiento / Otrossí'
                : 'Confirmar Reintegro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
