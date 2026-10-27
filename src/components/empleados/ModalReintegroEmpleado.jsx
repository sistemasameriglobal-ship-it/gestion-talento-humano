import { useState, useMemo } from 'react'
import { X, Calendar, UserCheck, Briefcase, Building2, Info, Award, DollarSign } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'
import { useCompany } from '../../context/CompanyContext'
import {
  DEPENDENCIAS, formatCOP,
  SMMLV_VIGENTE, AUXILIO_TRANSPORTE_VIGENTE, calcularApoyoProductivoSugerido,
  esAprendiz, normalizarTexto,
} from './empleadosConstants'

const OBS_ETAPA_PRODUCTIVA_DEFAULT =
  'Inicio de Etapa Productiva. Incremento de apoyo al 100% SMMLV, auxilio de transporte y reconocimiento de prestaciones sociales de ley'

export default function ModalReintegroEmpleado({ emp, departamentos, onClose, onConfirm, saving }) {
  const { cargos, cargosCompletos } = useCompany()
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS

  // Si el colaborador está activo, se asume por defecto Ascenso / Continuidad
  const esActivo = emp?.activo !== false
  const esColaboradorAprendiz = esAprendiz(emp)
  const yaEstaEnProductiva = normalizarTexto(emp?.cargo).includes('productiv')
  const sugerirEtapaProductiva = esActivo && esColaboradorAprendiz && !yaEstaEnProductiva

  const [tipoMovimiento, setTipoMovimiento] = useState(
    !esActivo ? 'reintegro' : (sugerirEtapaProductiva ? 'etapa_productiva' : 'cambio_cargo')
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
  const [modoOtroCargo, setModoOtroCargo] = useState(false)

  const listaCargosReintegro = useMemo(() => {
    let base = cargos && cargos.length > 0 ? cargos : []
    if (base.length === 0) {
      base = [
        'ASESOR COMERCIAL', 'ANALISTA DE CARTERA', 'ANALISTA DE UNDERWRITING',
        'ANALISTA DE VERIFICACIÓN', 'ANALISTA CONTABLE', 'COORDINADOR DE OPERACIONES',
        'SUPERVISOR DE ÁREA', 'ANALISTA DE RRHH', 'SOPORTE TI', 'SERVICIOS GENERALES',
        'APRENDIZ ETAPA LECTIVA', 'APRENDIZ ETAPA PRODUCTIVA'
      ]
    }
    if (cargosCompletos && cargosCompletos.length > 0 && dependencia) {
      const depNorm = normalizarTexto(dependencia)
      const delDep = cargosCompletos
        .filter(c => c.departamento && normalizarTexto(c.departamento) === depNorm)
        .map(c => c.nombre)
      const otros = cargosCompletos
        .filter(c => !c.departamento || normalizarTexto(c.departamento) !== depNorm)
        .map(c => c.nombre)
      return [...new Set([...delDep, ...otros])]
    }
    return [...new Set(base)]
  }, [cargos, cargosCompletos, dependencia])

  const esContinuidad = tipoMovimiento !== 'reintegro' && tipoMovimiento !== 'etapa_productiva'
  // Solo el ajuste salarial es novedad pura sin períodos laborales
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
      id: 'cambio_cargo',
      titulo: '💼 Cambio de Cargo',
      desc: 'Modificación de cargo o rol laboral (genera nuevo período auditable, conserva fecha de ingreso original y antigüedad).',
      continuidad: true,
    },
    {
      id: 'cambio_area',
      titulo: '🏢 Cambio de Área',
      desc: 'Traslado o cambio de dependencia o área (genera nuevo período auditable, conserva fecha de ingreso original y antigüedad).',
      continuidad: true,
    },
    {
      id: 'ajuste_salarial',
      titulo: '💰 Ajuste Salarial',
      desc: 'Incremento de sueldo. Se registra como novedad, sin tocar el período laboral (antigüedad intacta).',
      continuidad: true,
    },
    {
      id: 'etapa_productiva',
      titulo: '🎓 Transición a Etapa Productiva (Aprendiz)',
      desc: 'Paso a Etapa Productiva (100% SMMLV + Auxilio + EPS + ARL). Inicia un NUEVO contrato laboral (nueva fecha de ingreso y antigüedad desde cero).',
      continuidad: false,
      destacado: esColaboradorAprendiz,
    },
    {
      id: 'reintegro',
      titulo: '🔁 Reingreso tras retiro',
      desc: 'Nuevo ciclo tras desvinculación previa (nuevo contrato, antigüedad desde cero).',
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
    if ((tipoMovimiento === 'cambio_cargo' || tipoMovimiento === 'ascenso') && !cargo.trim()) {
      setError('Debes ingresar el nuevo cargo para el Cambio de Cargo.')
      return
    }
    if (tipoMovimiento === 'cambio_area' && !dependencia) {
      setError('Debes seleccionar la nueva área / dependencia para el Cambio de Área.')
      return
    }
    if (emp?.fecha_retiro && !esContinuidad && fechaIngreso < emp.fecha_retiro) {
      setError(`La fecha de reintegro (${fechaIngreso}) no puede ser anterior a la fecha de retiro previa (${emp.fecha_retiro}).`)
      return
    }
    setError(null)

    const salarioActualNum = Number(emp?.salario) || 0
    const salarioFinalNum = nuevoSalario && Number(nuevoSalario) > 0 ? Number(nuevoSalario) : (salarioActualNum > 0 ? salarioActualNum : null)

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
      if (tipoMovimiento === 'cambio_cargo' || tipoMovimiento === 'ascenso') {
        obsGenerada = `Cambio de cargo a "${cargo.trim()}" con continuidad laboral`
      } else if (tipoMovimiento === 'cambio_area') {
        obsGenerada = `Cambio de área a "${dependencia || emp?.dependencia}" (${cargo.trim() || emp?.cargo}) con continuidad laboral`
      } else if (tipoMovimiento === 'etapa_productiva') {
        obsGenerada = `Transición a Etapa Productiva (Nuevo Contrato de Aprendizaje Productivo)`
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

    const auxilioNum = nuevoAuxilio !== '' && Number(nuevoAuxilio) >= 0
      ? Number(nuevoAuxilio)
      : (esEtapaProductiva ? AUXILIO_TRANSPORTE_VIGENTE : (emp?.auxilio_transporte ?? null))

    onConfirm({
      tipo_movimiento: tipoMovimiento,
      nueva_fecha_ingreso: fechaIngreso,
      cargo: cargo.trim() || emp?.cargo || (esEtapaProductiva ? 'Aprendiz Etapa Productiva' : null),
      dependencia: dependencia || emp?.dependencia || null,
      salario: salarioFinalNum,
      salario_anterior: salarioActualNum,
      auxilio_transporte: auxilioNum,
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
                  <strong>🎓 Transición a Etapa Productiva (Nuevo Contrato de Aprendizaje):</strong>
                  <div style={{ marginTop: 4 }}>
                    • <strong>Nuevo contrato:</strong> Inicia formalmente un nuevo contrato para la etapa productiva. La fecha de ingreso y antigüedad comenzarán a contar a partir de la nueva fecha seleccionada.<br />
                    • <strong>Apoyo de sostenimiento:</strong> se actualiza al <strong>100% del SMMLV</strong>.<br />
                    • <strong>Auxilio de transporte:</strong> <strong>ACTIVO</strong> ({formatCOP(AUXILIO_TRANSPORTE_VIGENTE)}).<br />
                    • <strong>Seguridad Social:</strong> cobertura integral de <strong>EPS y ARL</strong>.<br />
                    • El período anterior de etapa lectiva quedará registrado en el historial laboral como cerrado.
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
                  💰 <strong>Ajuste salarial:</strong> se actualizará el salario del colaborador y se registrará en el <strong>Historial de Novedades</strong>. Conserva intacta la fecha de ingreso original, la antigüedad y el saldo de vacaciones.
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
                  ℹ️ <strong>Continuidad laboral respetada:</strong> Este movimiento se registra como un <strong>Otrossí contractual</strong>. <strong>Se conserva la fecha de ingreso original y toda la antigüedad acumulada</strong>, así como el saldo de vacaciones y beneficios del colaborador.
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
                  El reintegro iniciará un <strong>nuevo contrato</strong>. Su fecha de ingreso y antigüedad para este nuevo ciclo comenzarán desde la fecha del reintegro. El historial previo se conservará como antecedente.
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {esEtapaProductiva ? 'Etapa / Cargo en Etapa Productiva' : esContinuidad ? 'Nuevo Cargo / Posición' : 'Cargo'}
                      {(tipoMovimiento === 'cambio_cargo' || tipoMovimiento === 'ascenso') && <span style={{ color: '#EF4444' }}> *</span>}
                    </label>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
                    <select
                      className="emp-form-input"
                      style={{ paddingLeft: 34, width: '100%', appearance: 'auto', cursor: 'pointer' }}
                      value={modoOtroCargo ? '__OTRO__' : (cargo || '')}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '__OTRO__') {
                          setModoOtroCargo(true)
                          setCargo('')
                        } else {
                          setModoOtroCargo(false)
                          setCargo(val)
                        }
                      }}
                      required={!modoOtroCargo && (tipoMovimiento === 'cambio_cargo' || tipoMovimiento === 'ascenso')}
                    >
                      <option value="">-- Selecciona el Cargo --</option>
                      {cargo && !listaCargosReintegro.includes(cargo) && !modoOtroCargo && (
                        <option value={cargo}>{cargo} (Actual)</option>
                      )}
                      {listaCargosReintegro.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__OTRO__">✏️ + Otro cargo personalizado...</option>
                    </select>
                  </div>

                  {modoOtroCargo && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Escribe el nuevo cargo..."
                        value={cargo}
                        onChange={e => setCargo(e.target.value)}
                        autoFocus
                        style={{ textTransform: 'uppercase' }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setModoOtroCargo(false)
                          if (listaCargosReintegro.length > 0) setCargo(listaCargosReintegro[0])
                        }}
                        style={{ fontSize: 11.5, padding: '6px 10px', whiteSpace: 'nowrap' }}
                      >
                        ← Volver a la lista
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                    Dependencia / Área
                    {tipoMovimiento === 'cambio_area' && <span style={{ color: '#EF4444' }}> *</span>}
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
