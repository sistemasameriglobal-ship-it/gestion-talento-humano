// =============================================================
// src/components/contratos/ModalContratoForm.jsx
// =============================================================
import { useState, useEffect, useMemo } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import { useCompany } from '../../context/CompanyContext'
import { DEPENDENCIAS_EXTENDIDAS } from '../../constants'
import {
  extraerDatosContratoDesdeEmpleado,
  calcularFinYPrueba,
} from '../../utils/contratosTemplates'
import {
  UserCheck,
  Search,
  Sparkles,
  Building2,
  Calendar,
  DollarSign,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  X,
  FileCheck2,
} from 'lucide-react'

export default function ModalContratoForm({
  open,
  onClose,
  onSave,
  contratoInicial = null,
  empleados = [],
  companyConfig = {},
}) {
  const [formData, setFormData] = useState(() => {
    return contratoInicial || {
      tipo_contrato: 'termino_fijo_menor_anio',
      estado: 'pendiente_empleado',
      empleado_id: null,
      dependencia: '',
      telefono_trabajador: '',
      email_trabajador: '',
      razon_social: companyConfig.razon_social || companyConfig.nombre || 'AMERIGLOBAL S.A.S',
      nit: companyConfig.nit || '901272369-7',
      domicilio_empleador: 'Cra. 43A #1 Sur – 150 Edificio La Strada, piso 4.',
      representante_legal: 'CARLOS ALBERTO HERRERA',
      cedula_representante: '79778677 de Bogotá',
      domicilio_representante: 'Medellín-Antioquia',
      nombre_trabajador: '',
      tipo_documento: 'CC',
      numero_documento: '',
      direccion_trabajador: 'Medellín-Antioquia',
      fecha_nacimiento: '',
      cargo: '',
      salario_texto: 'Salario Mínimo más Auxilio De Transporte',
      salario_monto: 0,
      periodo_pago: 'Quincenal',
      fecha_ingreso: new Date().toISOString().slice(0, 10),
      duracion_meses: 3,
      fecha_fin: '',
      lugar_labores: 'Oficina Medellín',
      ciudad_contrato: 'Medellín',
      horario: '9:00 AM - 6:00 PM',
      jornada_laboral: 'Diurno',
      periodo_prueba_dias: 60,
      periodo_prueba_texto: 'dos (2) meses (60 días calendario)',
      institucion_educativa: 'SENA',
      programa_formacion: '',
      etapa_aprendizaje: 'Productiva',
      apoyo_sostenimiento: '100% SMMLV + EPS + ARL',
      incluye_confidencialidad: true,
      fecha_confidencialidad: new Date().toISOString().slice(0, 10),
      multa_confidencialidad_smmlv: 500,
      anios_vigencia_post_terminacion: 10,
      observaciones: '',
    }
  })

  const [modoIngreso, setModoIngreso] = useState(() => {
    if (contratoInicial?.empleado_id) return 'existente'
    return 'candidato'
  })

  const {
    departamentos = [],
    cargos = [],
    cargosCompletos = [],
  } = useCompany()

  const [modoOtroCargo, setModoOtroCargo] = useState(false)
  const [modoOtraDep, setModoOtraDep] = useState(false)

  const [searchEmpleado, setSearchEmpleado] = useState('')
  const [empleadoSeleccionadoNombre, setEmpleadoSeleccionadoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Lista de Áreas / Dependencias dinámicas desde Usuarios
  const baseDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS_EXTENDIDAS
  const listaDepartamentos = useMemo(() => {
    const list = [...baseDepartamentos]
    if (!list.includes('APRENDIZ')) list.push('APRENDIZ')
    return [...new Set(list)]
  }, [baseDepartamentos])

  // Lista de Cargos dinámicos desde Usuarios (ordenados según el área seleccionada)
  const listaCargosFiltrados = useMemo(() => {
    let base = cargos && cargos.length > 0 ? cargos : []
    if (base.length === 0) {
      base = [
        'ASESOR COMERCIAL', 'ANALISTA DE CARTERA', 'ANALISTA DE UNDERWRITING',
        'ANALISTA DE VERIFICACIÓN', 'ANALISTA CONTABLE', 'COORDINADOR DE OPERACIONES',
        'SUPERVISOR DE ÁREA', 'ANALISTA DE RRHH', 'SOPORTE TI', 'SERVICIOS GENERALES',
        'APRENDIZ ETAPA LECTIVA', 'APRENDIZ ETAPA PRODUCTIVA'
      ]
    }
    let resultado = [...base]

    if (cargosCompletos && cargosCompletos.length > 0 && formData.dependencia) {
      const depNorm = formData.dependencia.trim().toUpperCase()
      const delDep = cargosCompletos
        .filter(c => c.departamento && c.departamento.trim().toUpperCase() === depNorm)
        .map(c => c.nombre)
      const otros = cargosCompletos
        .filter(c => !c.departamento || c.departamento.trim().toUpperCase() !== depNorm)
        .map(c => c.nombre)
      if (delDep.length > 0) {
        resultado = [...new Set([...delDep, ...otros])]
      }
    }

    if (formData.tipo_contrato === 'aprendizaje') {
      const aprendices = resultado.filter(c => c.toLowerCase().includes('aprendiz'))
      const otros = resultado.filter(c => !c.toLowerCase().includes('aprendiz'))
      resultado = [...aprendices, ...otros]
    }

    return [...new Set(resultado)]
  }, [cargos, cargosCompletos, formData.dependencia, formData.tipo_contrato])

  useEffect(() => {
    setModoOtroCargo(false)
    setModoOtraDep(false)
    if (contratoInicial) {
      setFormData(contratoInicial)
      setEmpleadoSeleccionadoNombre(contratoInicial.nombre_trabajador || '')
      setModoIngreso(contratoInicial.empleado_id ? 'existente' : 'candidato')
    } else {
      const hoy = new Date().toISOString().slice(0, 10)
      const { fechaFin, diasPrueba } = calcularFinYPrueba(hoy, 3)
      setFormData(prev => ({
        ...prev,
        estado: 'pendiente_empleado',
        empleado_id: null,
        fecha_ingreso: hoy,
        fecha_fin: fechaFin,
        fecha_confidencialidad: hoy,
        periodo_prueba_dias: diasPrueba,
      }))
      setEmpleadoSeleccionadoNombre('')
      setModoIngreso('candidato')
    }
    setErrorMsg('')
  }, [contratoInicial, open])

  // Filtrado de empleados para selector
  const empleadosFiltrados = empleados.filter(e => {
    const q = searchEmpleado.toLowerCase().trim()
    if (!q) return true
    return (
      (e.nombre_completo && e.nombre_completo.toLowerCase().includes(q)) ||
      (e.numero_documento && e.numero_documento.includes(q)) ||
      (e.cargo && e.cargo.toLowerCase().includes(q))
    )
  })

  // Manejo de autocompletado al seleccionar un empleado de la lista
  const handleSeleccionarEmpleado = (emp) => {
    const datosAuto = extraerDatosContratoDesdeEmpleado(emp, companyConfig)
    setFormData(prev => ({
      ...prev,
      ...datosAuto,
      empleado_id: emp.id,
      estado: prev.estado === 'pendiente_empleado' ? 'vigente' : prev.estado,
    }))
    setEmpleadoSeleccionadoNombre(emp.nombre_completo)
    setSearchEmpleado('')
    setModoIngreso('existente')
  }

  const handleCambiarACandidato = () => {
    setModoIngreso('candidato')
    setFormData(prev => ({
      ...prev,
      empleado_id: null,
      estado: 'pendiente_empleado',
    }))
    setEmpleadoSeleccionadoNombre('')
  }

  // Cambio de duración en meses
  const handleDuracionChange = (meses) => {
    const n = Number(meses) || 1
    const { fechaFin, diasPrueba } = calcularFinYPrueba(formData.fecha_ingreso, n)
    setFormData(prev => ({
      ...prev,
      duracion_meses: n,
      fecha_fin: fechaFin,
      periodo_prueba_dias: diasPrueba,
      periodo_prueba_texto: diasPrueba === 60 ? 'dos (2) meses (60 días calendario)' : `${diasPrueba} días`,
    }))
  }

  // Cambio de fecha de inicio
  const handleFechaIngresoChange = (fecha) => {
    const { fechaFin, diasPrueba } = calcularFinYPrueba(fecha, formData.duracion_meses)
    setFormData(prev => ({
      ...prev,
      fecha_ingreso: fecha,
      fecha_fin: fechaFin,
      fecha_confidencialidad: fecha,
      periodo_prueba_dias: diasPrueba,
    }))
  }

  const handleSubmit = async (e, verInmediato = false) => {
    if (e) e.preventDefault()
    if (guardando) return
    if (!formData.nombre_trabajador.trim()) {
      setErrorMsg('Debes ingresar el nombre del colaborador o seleccionarlo de la lista de empleados.')
      return
    }
    if (!formData.numero_documento.trim()) {
      setErrorMsg('Debes ingresar el número de documento de identidad.')
      return
    }
    if (!formData.fecha_ingreso) {
      setErrorMsg('Debes indicar la fecha de ingreso.')
      return
    }

    try {
      setGuardando(true)
      setErrorMsg('')
      await onSave(formData, verInmediato)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Error al guardar el contrato.')
    } finally {
      setGuardando(false)
    }
  }

  const esAprendiz = formData.tipo_contrato === 'aprendizaje'

  return (
    <AnimatedModal
      open={open}
      onRequestClose={onClose}
      maxWidth="940px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '20px', paddingBottom: '30px' }}
      modalStyle={{ padding: '24px 28px', maxHeight: '92vh', overflowY: 'auto' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            {contratoInicial ? '✏️ Editar Contrato' : '📄 Generar Nuevo Contrato'}
          </h3>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted);" style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Completa la información. El <strong>Contrato de Confidencialidad</strong> para ambas partes se genera y vincula automáticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
        >
          <X size={20} />
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MODO DE INGRESO: CANDIDATO VS EMPLEADO EXISTENTE */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            onClick={handleCambiarACandidato}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 8,
              border: `2px solid ${modoIngreso === 'candidato' ? '#F59E0B' : 'var(--border)'}`,
              background: modoIngreso === 'candidato' ? '#FFFBEB' : 'var(--bg)',
              color: modoIngreso === 'candidato' ? '#B45309' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>🟡 Candidato / Nuevo Ingreso</span>
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>(Pendiente de ingresar a empleados)</span>
          </button>

          <button
            type="button"
            onClick={() => setModoIngreso('existente')}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 8,
              border: `2px solid ${modoIngreso === 'existente' ? '#2563EB' : 'var(--border)'}`,
              background: modoIngreso === 'existente' ? '#EFF6FF' : 'var(--bg)',
              color: modoIngreso === 'existente' ? '#1D4ED8' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} color={modoIngreso === 'existente' ? '#2563EB' : 'currentColor'} />
            <span>🟢 Empleado Existente</span>
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>(Precargar desde nómina)</span>
          </button>
        </div>

        {modoIngreso === 'candidato' ? (
          <div style={{ background: '#FFFDF5', border: '1px dashed #F59E0B', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#92400E', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <strong>Modo Candidato:</strong> Puedes redactar y firmar el contrato antes de registrar a la persona en la lista de empleados. El contrato quedará en estado <strong>Pendiente por registrar empleado</strong>. Si la persona no se presenta o desiste, puedes marcarla como desistida sin crear registros innecesarios en empleados; y cuando inicie labores, podrás pasarla a empleados con <strong>1 solo clic</strong>.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Selecciona el colaborador existente para precargar sus datos:</span>
              </label>
              {empleadoSeleccionadoNombre && (
                <span style={{ fontSize: 11.5, background: '#DCFCE7', color: '#15803D', fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                  ✓ Vinculado: {empleadoSeleccionadoNombre}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar colaborador por nombre, documento o cargo..."
                  value={searchEmpleado}
                  onChange={e => setSearchEmpleado(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
                  }}
                />
              </div>

              <select
                onChange={e => {
                  const emp = empleados.find(x => x.id === e.target.value)
                  if (emp) handleSeleccionarEmpleado(emp)
                }}
                value=""
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #BFDBFE',
                  background: '#EFF6FF', color: '#1D4ED8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <option value="">— Elegir de la lista ({empleadosFiltrados.length}) —</option>
                {empleadosFiltrados.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre_completo} ({emp.numero_documento || 'Sin doc'}) — {emp.cargo || 'Sin cargo'}
                  </option>
                ))}
              </select>
            </div>

            {empleadoSeleccionadoNombre && (
              <div className="banner-autocompletado" style={{ marginTop: 10, padding: '8px 12px', fontSize: 12 }}>
                <UserCheck size={16} />
                <span>Datos de <strong>{empleadoSeleccionadoNombre}</strong> precargados. Puedes editarlos libremente.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={e => handleSubmit(e, false)}>
        {/* TIPO DE CONTRATO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                tipo_contrato: 'termino_fijo_menor_anio',
                duracion_meses: 3,
                ...calcularFinYPrueba(prev.fecha_ingreso, 3),
              }))
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
              border: `2px solid ${!esAprendiz ? '#2563EB' : 'var(--border)'}`,
              background: !esAprendiz ? '#EFF6FF' : 'var(--surface)',
              color: !esAprendiz ? '#1D4ED8' : 'var(--text)',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <Briefcase size={22} color={!esAprendiz ? '#2563EB' : '#64748B'} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>Contrato a Término Fijo Inferior a 1 Año</div>
              <div style={{ fontSize: 11.5, opacity: 0.8 }}>Laboral ordinario (prórrogas, preaviso de 30 días)</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                tipo_contrato: 'aprendizaje',
                duracion_meses: 6,
                ...calcularFinYPrueba(prev.fecha_ingreso, 6),
              }))
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
              border: `2px solid ${esAprendiz ? '#059669' : 'var(--border)'}`,
              background: esAprendiz ? '#ECFDF5' : 'var(--surface)',
              color: esAprendiz ? '#047857' : 'var(--text)',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <GraduationCap size={22} color={esAprendiz ? '#059669' : '#64748B'} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>Contrato de Aprendizaje (Ley 789)</div>
              <div style={{ fontSize: 11.5, opacity: 0.8 }}>Aprendiz SENA / Institución Formativa</div>
            </div>
          </button>
        </div>

        {/* DATOS DEL COLABORADOR / APRENDIZ */}
        <div className="seccion-form-header">
          <UserCheck size={16} />
          <span>Datos del {esAprendiz ? 'Aprendiz' : 'Trabajador'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formData.nombre_trabajador}
              onChange={e => setFormData({ ...formData, nombre_trabajador: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Tipo Doc.
            </label>
            <select
              value={formData.tipo_documento}
              onChange={e => {
                const val = e.target.value
                setFormData(prev => ({
                  ...prev,
                  tipo_documento: val,
                  ...(val === 'TI' ? { tipo_contrato: 'aprendizaje', duracion_meses: 6, ...calcularFinYPrueba(prev.fecha_ingreso, 6) } : {})
                }))
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            >
              <option value="CC">Cédula de Ciudadanía (CC)</option>
              <option value="TI">Tarjeta de Identidad (TI)</option>
              <option value="CE">Cédula de Extranjería (CE)</option>
              <option value="Pasaporte">Pasaporte</option>
              <option value="PEP">PEP / PPT</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Número Documento *
            </label>
            <input
              type="text"
              required
              value={formData.numero_documento}
              onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Dirección de Residencia
            </label>
            <input
              type="text"
              value={formData.direccion_trabajador}
              onChange={e => setFormData({ ...formData, direccion_trabajador: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Fecha Nacimiento
            </label>
            <input
              type="date"
              value={formData.fecha_nacimiento || ''}
              onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Briefcase size={13} style={{ color: 'var(--primary)' }} />
                Cargo a Desempeñar *
              </label>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {listaCargosFiltrados.length} en Usuarios
              </span>
            </div>

            <select
              value={modoOtroCargo ? '__OTRO__' : (formData.cargo || '')}
              onChange={e => {
                const val = e.target.value
                if (val === '__OTRO__') {
                  setModoOtroCargo(true)
                  setFormData(prev => ({ ...prev, cargo: '' }))
                } else {
                  setModoOtroCargo(false)
                  const cargoObj = cargosCompletos?.find(c => c.nombre === val)
                  const esAprendizCargo = /aprendiz/i.test(val)
                  setFormData(prev => ({
                    ...prev,
                    cargo: val,
                    dependencia: (!prev.dependencia && cargoObj?.departamento) ? cargoObj.departamento : prev.dependencia,
                    ...(esAprendizCargo ? {
                      tipo_contrato: 'aprendizaje',
                      duracion_meses: 6,
                      ...calcularFinYPrueba(prev.fecha_ingreso, 6),
                    } : {})
                  }))
                }
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontWeight: formData.cargo ? 600 : 400,
                cursor: 'pointer',
              }}
              required={!modoOtroCargo}
            >
              <option value="">-- Selecciona el Cargo --</option>
              {formData.cargo && !listaCargosFiltrados.includes(formData.cargo) && !modoOtroCargo && (
                <option value={formData.cargo}>{formData.cargo} (Actual)</option>
              )}
              {listaCargosFiltrados.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__OTRO__">✏️ + Otro cargo personalizado...</option>
            </select>

            {modoOtroCargo && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Escribe el cargo a desempeñar..."
                  value={formData.cargo || ''}
                  onChange={e => setFormData({ ...formData, cargo: e.target.value.toUpperCase() })}
                  autoFocus
                  required
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1.5px solid var(--primary)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setModoOtroCargo(false)
                    if (listaCargosFiltrados.length > 0) {
                      setFormData(prev => ({ ...prev, cargo: listaCargosFiltrados[0] }))
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ← Ver lista
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr 1.6fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Teléfono / Celular
            </label>
            <input
              type="text"
              value={formData.telefono_trabajador || ''}
              onChange={e => setFormData({ ...formData, telefono_trabajador: e.target.value })}
              placeholder="Ej. 300 123 4567"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              value={formData.email_trabajador || ''}
              onChange={e => setFormData({ ...formData, email_trabajador: e.target.value })}
              placeholder="colaborador@correo.com"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Building2 size={13} style={{ color: 'var(--primary)' }} />
                Área / Dependencia
              </label>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {listaDepartamentos.length} en Usuarios
              </span>
            </div>

            <select
              value={modoOtraDep ? '__OTRO__' : (formData.dependencia || '')}
              onChange={e => {
                const val = e.target.value
                if (val === '__OTRO__') {
                  setModoOtraDep(true)
                  setFormData(prev => ({ ...prev, dependencia: '' }))
                } else {
                  setModoOtraDep(false)
                  setFormData(prev => ({ ...prev, dependencia: val }))
                }
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontWeight: formData.dependencia ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              <option value="">-- Selecciona el Área --</option>
              {formData.dependencia && !listaDepartamentos.includes(formData.dependencia) && !modoOtraDep && (
                <option value={formData.dependencia}>{formData.dependencia} (Actual)</option>
              )}
              {listaDepartamentos.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
              <option value="__OTRO__">✏️ + Otra área personalizada...</option>
            </select>

            {modoOtraDep && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Escribe el área..."
                  value={formData.dependencia || ''}
                  onChange={e => setFormData({ ...formData, dependencia: e.target.value.toUpperCase() })}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1.5px solid var(--primary)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setModoOtraDep(false)
                    if (listaDepartamentos.length > 0) {
                      setFormData(prev => ({ ...prev, dependencia: listaDepartamentos[0] }))
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ← Ver lista
                </button>
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Estado del Contrato
            </label>
            <select
              value={formData.estado || 'pendiente_empleado'}
              onChange={e => setFormData({ ...formData, estado: e.target.value })}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: formData.estado === 'pendiente_empleado' ? '#FEF3C7' : (formData.estado === 'vigente' ? '#DCFCE7' : (formData.estado === 'desistido' ? '#F3F4F6' : 'var(--bg)')),
                color: formData.estado === 'pendiente_empleado' ? '#92400E' : (formData.estado === 'vigente' ? '#15803D' : (formData.estado === 'desistido' ? '#4B5563' : 'var(--text)')),
                fontWeight: 700
              }}
            >
              <option value="pendiente_empleado">🟡 Pendiente por registrar empleado</option>
              <option value="vigente">🟢 Vigente (Empleado en nómina)</option>
              <option value="desistido">⚪ Desistió del proceso / No ingresó</option>
              <option value="finalizado">🔴 Finalizado / Terminado</option>
            </select>
          </div>
        </div>

        {/* CAMPOS ESPECÍFICOS DE APRENDIZAJE */}
        {esAprendiz && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 14px', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#065F46', marginBottom: 8 }}>
              🎓 DATOS DEL PROGRAMA DE APRENDIZAJE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#047857', display: 'block', marginBottom: 3 }}>
                  Institución Educativa
                </label>
                <input
                  type="text"
                  value={formData.institucion_educativa}
                  onChange={e => setFormData({ ...formData, institucion_educativa: e.target.value })}
                  placeholder="SENA / Cesde / etc."
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #A7F3D0', background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#047857', display: 'block', marginBottom: 3 }}>
                  Especialidad / Programa
                </label>
                <input
                  type="text"
                  value={formData.programa_formacion}
                  onChange={e => setFormData({ ...formData, programa_formacion: e.target.value })}
                  placeholder="Técnico en Gestión Administrativa"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #A7F3D0', background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#047857', display: 'block', marginBottom: 3 }}>
                  Etapa
                </label>
                <select
                  value={formData.etapa_aprendizaje}
                  onChange={e => setFormData({ ...formData, etapa_aprendizaje: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #A7F3D0', background: '#fff' }}
                >
                  <option value="Productiva">Etapa Productiva (Práctica)</option>
                  <option value="Lectiva">Etapa Lectiva (Académica)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TÉRMINOS Y CONDICIONES */}
        <div className="seccion-form-header">
          <Calendar size={16} />
          <span>Vigencia, Duración y Salario</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Fecha de Ingreso *
            </label>
            <input
              type="date"
              required
              value={formData.fecha_ingreso}
              onChange={e => handleFechaIngresoChange(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Duración (Meses)
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.duracion_meses}
                onChange={e => handleDuracionChange(e.target.value)}
                style={{ width: '60px', padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center' }}
              />
              <div style={{ display: 'flex', gap: 3 }}>
                {[3, 6, 11].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleDuracionChange(m)}
                    style={{
                      padding: '4px 7px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)',
                      background: formData.duracion_meses === m ? '#2563EB' : 'var(--surface)',
                      color: formData.duracion_meses === m ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Fecha de Finalización
            </label>
            <input
              type="date"
              value={formData.fecha_fin}
              onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Período de Prueba
            </label>
            <input
              type="number"
              value={formData.periodo_prueba_dias}
              onChange={e => setFormData({ ...formData, periodo_prueba_dias: Number(e.target.value) || 0 })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>días legales (máx 60)</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              {esAprendiz ? 'Apoyo de Sostenimiento' : 'Salario Mensual (Texto en Contrato)'}
            </label>
            <input
              type="text"
              value={formData.salario_texto}
              onChange={e => setFormData({ ...formData, salario_texto: e.target.value })}
              placeholder="Salario Mínimo más Auxilio De Transporte"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Periodo de Pago
            </label>
            <select
              value={formData.periodo_pago}
              onChange={e => setFormData({ ...formData, periodo_pago: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            >
              <option value="Quincenal">Quincenal (15 y 30)</option>
              <option value="Mensual">Mensual</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Jornada Laboral *
            </label>
            <select
              value={formData.jornada_laboral || 'Diurno'}
              onChange={e => {
                const val = e.target.value
                const esFinSem = /fin.*semana/i.test(val)
                setFormData(prev => ({
                  ...prev,
                  jornada_laboral: val,
                  ...(esFinSem && (!prev.horario || prev.horario === '9:00 AM - 6:00 PM')
                    ? { horario: 'Sábados, Domingos y Festivos: 8:00 AM - 5:00 PM' }
                    : {})
                }))
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: /fin.*semana/i.test(formData.jornada_laboral) ? '#FEF3C7' : 'var(--bg)',
                color: /fin.*semana/i.test(formData.jornada_laboral) ? '#92400E' : 'var(--text)',
                fontWeight: /fin.*semana/i.test(formData.jornada_laboral) ? 800 : 500,
              }}
            >
              <option value="Diurno">☀️ Diurno (Semana Ordinaria)</option>
              <option value="Fin de Semana">🗓️ Fin de Semana (Sábados, Domingos y Festivos)</option>
            </select>
          </div>
        </div>

        {/* HORARIO Y PRESETS DE JORNADA */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              Horario / Turno de Trabajo
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sugerencias:</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, jornada_laboral: 'Fin de Semana', horario: 'Sábados, Domingos y Festivos: 8:00 AM - 5:00 PM' })}
                style={{
                  fontSize: 10.5,
                  padding: '2px 7px',
                  borderRadius: 5,
                  border: '1px solid #FDE68A',
                  background: '#FEF3C7',
                  color: '#92400E',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                🗓️ Fin de Semana (8am - 5pm)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, jornada_laboral: 'Fin de Semana', horario: 'Sábados y Domingos: 8:00 AM - 6:00 PM' })}
                style={{
                  fontSize: 10.5,
                  padding: '2px 7px',
                  borderRadius: 5,
                  border: '1px solid #FDE68A',
                  background: '#FEF3C7',
                  color: '#92400E',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                🗓️ Sáb y Dom (8am - 6pm)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, jornada_laboral: 'Diurno', horario: '9:00 AM - 6:00 PM' })}
                style={{
                  fontSize: 10.5,
                  padding: '2px 7px',
                  borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                ☀️ Lunes a Viernes (9am - 6pm)
              </button>
            </div>
          </div>
          <input
            type="text"
            value={formData.horario}
            onChange={e => setFormData({ ...formData, horario: e.target.value })}
            placeholder="Ej. Sábados, Domingos y Festivos: 8:00 AM - 5:00 PM"
            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />

          {/fin.*semana/i.test(formData.jornada_laboral || formData.horario) && (
            <div style={{
              marginTop: 6,
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11.5,
              color: '#92400E',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>💡</span>
              <span>
                <strong>Contrato Fines de Semana activo:</strong> La <strong>Cláusula Novena</strong> del contrato se adaptará automáticamente a la modalidad de fines de semana y festivos bajo término fijo inferior a un año.
              </span>
            </div>
          )}
        </div>

        {/* VINCULACIÓN CONTRATO DE CONFIDENCIALIDAD */}
        <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: '14px 16px', margin: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileCheck2 size={20} color="#2563EB" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A' }}>
                🔒 Contrato de Confidencialidad Incorporado (Ambas Partes)
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Se incluye automáticamente con pena de <strong>500 SMMLV</strong> por incumplimiento, vigencia de <strong>10 años</strong> post-terminación y comparecencia de <strong>{formData.representante_legal}</strong> y <strong>{formData.nombre_trabajador || 'el colaborador'}</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* DATOS DEL EMPLEADOR */}
        <details style={{ margin: '12px 0', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: 'var(--text-muted)' }}>
            ⚙️ Personalizar datos del Empleador ({formData.razon_social})
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Razón Social</label>
              <input
                type="text"
                value={formData.razon_social}
                onChange={e => setFormData({ ...formData, razon_social: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>NIT</label>
              <input
                type="text"
                value={formData.nit}
                onChange={e => setFormData({ ...formData, nit: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Representante Legal</label>
              <input
                type="text"
                value={formData.representante_legal}
                onChange={e => setFormData({ ...formData, representante_legal: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Cédula Representante</label>
              <input
                type="text"
                value={formData.cedula_representante}
                onChange={e => setFormData({ ...formData, cedula_representante: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </div>
          </div>
        </details>

        {/* BOTONES ACCIÓN */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid #BFDBFE',
              background: '#EFF6FF', color: '#1D4ED8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>

          <button
            type="button"
            onClick={e => handleSubmit(e, true)}
            disabled={guardando}
            className="btn-nuevo-contrato"
            style={{ padding: '9px 20px', fontSize: 13 }}
          >
            <Sparkles size={16} />
            <span>{guardando ? 'Generando...' : 'Guardar y Ver Documento'}</span>
          </button>
        </div>
      </form>
    </AnimatedModal>
  )
}
