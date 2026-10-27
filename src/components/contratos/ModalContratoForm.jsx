// =============================================================
// src/components/contratos/ModalContratoForm.jsx
// =============================================================
import { useState, useEffect } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
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
      estado: 'vigente',
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
      periodo_prueba_dias: 18,
      periodo_prueba_texto: 'dieciocho (18) días, pudiendo extenderse hasta el máximo permitido por la ley, equivalente a dos (2) meses.',
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

  const [searchEmpleado, setSearchEmpleado] = useState('')
  const [empleadoSeleccionadoNombre, setEmpleadoSeleccionadoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (contratoInicial) {
      setFormData(contratoInicial)
      setEmpleadoSeleccionadoNombre(contratoInicial.nombre_trabajador || '')
    } else {
      const hoy = new Date().toISOString().slice(0, 10)
      const { fechaFin, diasPrueba } = calcularFinYPrueba(hoy, 3)
      setFormData(prev => ({
        ...prev,
        fecha_ingreso: hoy,
        fecha_fin: fechaFin,
        fecha_confidencialidad: hoy,
        periodo_prueba_dias: diasPrueba,
      }))
      setEmpleadoSeleccionadoNombre('')
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
    }))
    setEmpleadoSeleccionadoNombre(emp.nombre_completo)
    setSearchEmpleado('')
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
      periodo_prueba_texto: `${diasPrueba} días, pudiendo extenderse hasta el máximo permitido por la ley, equivalente a dos (2) meses.`,
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

      {/* SELECTOR RÁPIDO DE EMPLEADO */}
      <div style={{ background: 'var(--surface)', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} color="#2563EB" />
            <span>TRAER DATOS AUTOMÁTICAMENTE DESDE EMPLEADOS:</span>
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
            <span>Los datos de <strong>{empleadoSeleccionadoNombre}</strong> (documento, dirección, salario, fecha de ingreso y cargo) fueron precargados con éxito. Puedes modificarlos si lo necesitas.</span>
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
              onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
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
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Cargo a Desempeñar
            </label>
            <input
              type="text"
              value={formData.cargo}
              onChange={e => setFormData({ ...formData, cargo: e.target.value })}
              placeholder={esAprendiz ? 'Aprendiz SENA' : 'Ej. Agente de Verificación'}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
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
              Horario / Turno
            </label>
            <input
              type="text"
              value={formData.horario}
              onChange={e => setFormData({ ...formData, horario: e.target.value })}
              placeholder="9:00 AM - 6:00 PM"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
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
