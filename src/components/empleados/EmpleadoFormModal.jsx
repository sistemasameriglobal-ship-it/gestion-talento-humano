// =============================================================
// src/components/empleados/EmpleadoFormModal.jsx
// -------------------------------------------------------------
// Modal de alta/edición de expediente integral de colaborador.
// Incluye 5 secciones estructuradas:
// 1. Identificación y Personales
// 2. Ubicación y Contacto
// 3. Información Laboral y Contrato
// 4. Seguridad Social y Datos Bancarios
// 5. Contactos de Emergencia
// =============================================================
import { useState } from 'react'
import {
  User, Mail, X, Briefcase, CheckCircle2,
  AlertTriangle, AlertCircle, Phone, MapPin, ShieldCheck, Landmark,
  HeartPulse, Plus, Trash2, DollarSign, CreditCard, Droplet, IdCard,
} from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import {
  DEPENDENCIAS, DEP_ICONS,
  TIPOS_DOCUMENTO, TIPOS_SANGRE, EPS_LIST, PENSION_LIST,
  CESANTIAS_LIST, BANCOS_LIST, TIPOS_CUENTA, PARENTESCOS_SUGERIDOS,
  calcularEdad, formatCOP,
} from './empleadosConstants'
import { hoyISO } from '../../utils/fecha'
import './empleados.css'

const TABS = [
  { id: 'todos', label: 'Todo el expediente' },
  { id: 'identidad', label: '1. Identificación' },
  { id: 'contacto', label: '2. Contacto' },
  { id: 'laboral', label: '3. Laboral y Contrato' },
  { id: 'segsocial', label: '4. Seg. Social y Banco' },
  { id: 'emergencia', label: '5. Emergencia' },
]

export default function EmpleadoFormModal({
  modal, form, setForm, f, onNombreChange, duplicadoWarning, saving, save, msg, onClose,
}) {
  const { currentCompany, departamentos } = useCompany()
  const [activeTab, setActiveTab] = useState('todos')
  const [prevEmpId, setPrevEmpId] = useState(form.id)
  const [tieneVinculoPrevio, setTieneVinculoPrevio] = useState(() =>
    Boolean(form.fecha_primer_ingreso || form.fecha_terminacion_anterior)
  )

  if (form.id !== prevEmpId) {
    setPrevEmpId(form.id)
    setTieneVinculoPrevio(Boolean(form.fecha_primer_ingreso || form.fecha_terminacion_anterior))
  }

  const handleToggleVinculoPrevio = (checked) => {
    setTieneVinculoPrevio(checked)
    if (!checked) {
      setForm(prev => ({
        ...prev,
        fecha_primer_ingreso: '',
        fecha_terminacion_anterior: '',
      }))
    }
  }

  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS
  const nombreEmpresaActiva = currentCompany === 'global_link' ? 'Global Link' : 'AmeriGlobal'

  const dep = form.dependencia || ''
  const depIcon = DEP_ICONS[dep] || '🏢'
  const iniciales = form.nombre_completo
    ? form.nombre_completo.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
    : '?'

  const edadCalculada = calcularEdad(form.fecha_nacimiento)

  // Contactos de emergencia como array seguro
  const contactos = Array.isArray(form.contactos_emergencia) ? form.contactos_emergencia : []

  const agregarContacto = () => {
    setForm(prev => ({
      ...prev,
      contactos_emergencia: [
        ...(Array.isArray(prev.contactos_emergencia) ? prev.contactos_emergencia : []),
        { nombre: '', telefono: '', parentesco: 'Familiar' },
      ],
    }))
  }

  const actualizarContacto = (idx, campo, valor) => {
    setForm(prev => {
      const lista = [...(Array.isArray(prev.contactos_emergencia) ? prev.contactos_emergencia : [])]
      lista[idx] = { ...lista[idx], [campo]: valor }
      return { ...prev, contactos_emergencia: lista }
    })
  }

  const eliminarContacto = (idx) => {
    setForm(prev => {
      const lista = [...(Array.isArray(prev.contactos_emergencia) ? prev.contactos_emergencia : [])]
      lista.splice(idx, 1)
      return { ...prev, contactos_emergencia: lista }
    })
  }

  // Sincronizar fecha de inicio en empresa actual con fecha_ingreso principal
  const handleFechaInicioEmpresaChange = (e) => {
    const val = e.target.value
    setForm(prev => ({
      ...prev,
      fecha_inicio_empresa_actual: val,
      fecha_ingreso: val || prev.fecha_ingreso,
    }))
  }

  // Progreso basado en campos claves del expediente
  const camposClave = [
    form.nombre_completo,
    form.numero_documento,
    form.celular || form.correo,
    form.dependencia,
    form.cargo,
    form.fecha_inicio_empresa_actual || form.fecha_ingreso,
  ]
  const pct = Math.round((camposClave.filter(Boolean).length / camposClave.length) * 100)

  const showSection = (sec) => activeTab === 'todos' || activeTab === sec

  return (
    <div className="modal-backdrop emp-modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="modal emp-modal-box"
        style={{
          maxWidth: 780,
          width: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* ── Header adaptativo ── */}
        <div className="emp-modal-hdr" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar con iniciales y acento dinámico */}
            <div className="emp-avatar-accent" style={{ fontSize: iniciales === '?' ? 22 : 19 }}>
              {iniciales === '?' ? <User size={24} strokeWidth={2} /> : iniciales}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                {modal === 'add' ? 'Nuevo Expediente de Colaborador' : 'Editando Expediente Integral'}
              </div>
              <h2 style={{ color: 'var(--text)', margin: '0 0 6px', fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.nombre_completo || 'Nombre del colaborador'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {form.numero_documento && (
                  <span style={{ background: 'rgba(var(--secondary-rgb), 0.12)', color: 'var(--secondary)', border: '1px solid rgba(var(--secondary-rgb), 0.3)', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {form.tipo_documento || 'CC'} {form.numero_documento}
                  </span>
                )}
                {dep && (
                  <span style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {depIcon} {dep}
                  </span>
                )}
                {form.cargo && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    · {form.cargo}
                  </span>
                )}
                {edadCalculada !== null && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    · 🎂 {edadCalculada} años
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="emp-close-btn"
            >
              <X size={16} />
            </button>
          </div>

          {/* Barra de progreso */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>PROGRESO DEL EXPEDIENTE</span>
              <span style={{ fontSize: 10, color: 'var(--secondary)', fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--secondary)', width: `${pct}%`, transition: 'width .3s ease' }} />
            </div>
          </div>
        </div>

        {/* ── Pestañas de navegación rápida adaptativas ── */}
        <div className="emp-tabs-bar" style={{ flexShrink: 0 }}>
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`emp-tab-pill ${active ? 'active' : ''}`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── Body ── */}
        <div
          className="modal-body"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px 24px',
          }}
        >
          {/* Alerta duplicado */}
          {duplicadoWarning && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 14px', borderRadius: 10, marginBottom: 18,
              background: duplicadoWarning.tipo === 'exacto' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1.5px solid ${duplicadoWarning.tipo === 'exacto' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.4)'}`,
            }}>
              {duplicadoWarning.tipo === 'exacto'
                ? <AlertCircle size={15} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
                : <AlertTriangle size={15} style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }} />
              }
              <div style={{ fontSize: 13, color: duplicadoWarning.tipo === 'exacto' ? '#FCA5A5' : '#FDE68A' }}>
                {duplicadoWarning.tipo === 'exacto'
                  ? (duplicadoWarning.empleado?.activo === false
                    ? <><strong>Colaborador inactivo encontrado:</strong> Ya existe "{duplicadoWarning.nombre}" como inactivo. Puedes usar la opción <strong>Reintegrar</strong> en la lista para iniciar su nuevo contrato manteniendo su historial protegido.</>
                    : <><strong>Empleado duplicado:</strong> Ya existe "{duplicadoWarning.nombre}" con este nombre exacto.</>)
                  : <><strong>Nombre similar:</strong> "{duplicadoWarning.nombre}" ya existe. Verifica que no sea un error de tipeo.</>
                }
              </div>
            </div>
          )}

          {/* ================================================================
              1. IDENTIFICACIÓN Y PERSONALES
             ================================================================ */}
          {showSection('identidad') && (
            <div className="emp-section">
              <div className="emp-section-hdr">
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IdCard size={13} style={{ color: '#38BDF8' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#F1F5F9' }}>
                  1. Identificación y Datos Personales
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="emp-form-label">Nombre completo <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      className="emp-form-input"
                      style={{ paddingLeft: 36 }}
                      value={form.nombre_completo || ''}
                      onChange={onNombreChange}
                      placeholder="Ej: María Fernanda Pérez González"
                      autoFocus
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
                  <div>
                    <label className="emp-form-label">Tipo Doc.</label>
                    <select
                      className="emp-form-input"
                      value={form.tipo_documento || 'CC'}
                      onChange={f('tipo_documento')}
                    >
                      {TIPOS_DOCUMENTO.map(td => (
                        <option key={td} value={td}>{td}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="emp-form-label">Cédula / Número de documento</label>
                    <input
                      className="emp-form-input"
                      value={form.numero_documento || ''}
                      onChange={f('numero_documento')}
                      placeholder="Ej: 1037612345"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="emp-form-label">Fecha de nacimiento</label>
                      {edadCalculada !== null && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--secondary)',
                          background: 'rgba(var(--secondary-rgb), 0.12)', padding: '1px 8px',
                          borderRadius: 999, marginBottom: 4, border: '1px solid rgba(var(--secondary-rgb), 0.3)',
                        }}>
                          Edad: {edadCalculada} años
                        </span>
                      )}
                    </div>
                    <input
                      className="emp-form-input"
                      type="date"
                      value={form.fecha_nacimiento || ''}
                      onChange={f('fecha_nacimiento')}
                    />
                  </div>
                  <div>
                    <label className="emp-form-label">Tipo de sangre (RH)</label>
                    <div style={{ position: 'relative' }}>
                      <Droplet size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#EF4444', pointerEvents: 'none' }} />
                      <select
                        className="emp-form-input"
                        style={{ paddingLeft: 30 }}
                        value={form.tipo_sangre || ''}
                        onChange={f('tipo_sangre')}
                      >
                        <option value="">Seleccionar...</option>
                        {TIPOS_SANGRE.map(ts => (
                          <option key={ts} value={ts}>{ts}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              2. UBICACIÓN Y CONTACTO
             ================================================================ */}
          {showSection('contacto') && (
            <div className="emp-section">
              <div className="emp-section-hdr">
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={13} style={{ color: '#34D399' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                  2. Ubicación y Contacto
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="emp-form-label">Correo Empresarial</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="emp-form-input"
                        style={{ paddingLeft: 36 }}
                        type="email"
                        value={form.correo || ''}
                        onChange={f('correo')}
                        placeholder="usuario@ameriglobal.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="emp-form-label">Correo Personal</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="emp-form-input"
                        style={{ paddingLeft: 36 }}
                        type="email"
                        value={form.correo_personal || ''}
                        onChange={f('correo_personal')}
                        placeholder="personal@gmail.com"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10 }}>
                  <div>
                    <label className="emp-form-label">Celular</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="emp-form-input"
                        style={{ paddingLeft: 36 }}
                        type="tel"
                        value={form.celular || ''}
                        onChange={f('celular')}
                        placeholder="Ej: 300 123 4567"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="emp-form-label">Dirección de residencia</label>
                    <input
                      className="emp-form-input"
                      value={form.direccion || ''}
                      onChange={f('direccion')}
                      placeholder="Ej: Calle 52 #81-48 Apto 301"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="emp-form-label">Barrio</label>
                    <input
                      className="emp-form-input"
                      value={form.barrio || ''}
                      onChange={f('barrio')}
                      placeholder="Ej: Calasanz / Laureles"
                    />
                  </div>
                  <div>
                    <label className="emp-form-label">Municipio / Ciudad</label>
                    <input
                      className="emp-form-input"
                      value={form.municipio || ''}
                      onChange={f('municipio')}
                      placeholder="Ej: Medellín, Bello, Envigado..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              3. INFORMACIÓN LABORAL Y CONTRATO
             ================================================================ */}
          {showSection('laboral') && (
            <div className="emp-section">
              <div className="emp-section-hdr">
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={13} style={{ color: '#A78BFA' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                  3. Información Laboral y Contrato
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="emp-form-label">Cargo <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      className="emp-form-input"
                      style={{ paddingLeft: 36 }}
                      value={form.cargo || ''}
                      onChange={f('cargo')}
                      placeholder="Ej: Agente / Analista de cartera"
                    />
                  </div>
                </div>

                <div>
                  <label className="emp-form-label">Dependencia / Área <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 7 }}>
                    {listaDepartamentos.map(d => {
                      const sel = form.dependencia === d
                      return (
                        <button
                          key={d} type="button"
                          className={`emp-dep-btn ${sel ? 'active' : ''}`}
                          onClick={() => { setForm(p => ({ ...p, dependencia: d })) }}
                        >
                          <span style={{ fontSize: 15 }}>{DEP_ICONS[d] || '🏢'}</span>
                          <span style={{ fontSize: 11, fontWeight: sel ? 800 : 600 }}>{d}</span>
                          {sel && <CheckCircle2 size={13} style={{ color: 'var(--secondary)', marginLeft: 'auto', flexShrink: 0 }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Fecha principal de ingreso y opción condicional de vínculo previo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label className="emp-form-label">
                      Inicio en {nombreEmpresaActiva} <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      className="emp-form-input"
                      type="date"
                      value={form.fecha_inicio_empresa_actual || form.fecha_ingreso || ''}
                      onChange={handleFechaInicioEmpresaChange}
                    />
                  </div>

                  {/* Checkbox condicional: ¿Viene de empresa anterior o registra vínculo previo? */}
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: tieneVinculoPrevio ? '1px solid rgba(var(--secondary-rgb), 0.45)' : '1px solid var(--border)',
                      background: tieneVinculoPrevio ? 'rgba(var(--secondary-rgb), 0.08)' : 'var(--bg)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all .18s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tieneVinculoPrevio}
                      onChange={e => handleToggleVinculoPrevio(e.target.checked)}
                      style={{
                        width: 16,
                        height: 16,
                        accentColor: 'var(--secondary)',
                        cursor: 'pointer',
                        margin: 0,
                      }}
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                      ¿Viene de empresa anterior o registra vínculo previo?
                    </span>
                  </label>

                  {tieneVinculoPrevio && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        animation: 'empFadeInUp .2s ease forwards',
                      }}
                    >
                      <div>
                        <label className="emp-form-label">Primer ingreso (empresa anterior)</label>
                        <input
                          className="emp-form-input"
                          type="date"
                          value={form.fecha_primer_ingreso || ''}
                          onChange={f('fecha_primer_ingreso')}
                        />
                      </div>
                      <div>
                        <label className="emp-form-label">Fecha de terminación anterior</label>
                        <input
                          className="emp-form-input"
                          type="date"
                          value={form.fecha_terminacion_anterior || ''}
                          onChange={f('fecha_terminacion_anterior')}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="emp-form-label">Salario mensual</label>
                      {Number(form.salario) > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>
                          {formatCOP(form.salario)}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="emp-form-input"
                        style={{ paddingLeft: 32 }}
                        type="number"
                        min="0"
                        step="1"
                        value={form.salario ?? ''}
                        onChange={f('salario')}
                        placeholder="Ej: 1950905"
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="emp-form-label">Auxilio de transporte</label>
                      {Number(form.auxilio_transporte) > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>
                          {formatCOP(form.auxilio_transporte)}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="emp-form-input"
                        style={{ paddingLeft: 32 }}
                        type="number"
                        min="0"
                        step="1"
                        value={form.auxilio_transporte ?? ''}
                        onChange={f('auxilio_transporte')}
                        placeholder="Ej: 249095"
                      />
                    </div>
                  </div>
                </div>

                {/* Días de vacaciones ya tomados (Histórico) */}
                <div>
                  <label className="emp-form-label">🌴 Días de vacaciones ya tomados (Histórico)</label>
                  <input
                    className="emp-form-input"
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.dias_vacaciones_tomados_manual ?? ''}
                    onChange={f('dias_vacaciones_tomados_manual')}
                    placeholder="0"
                  />
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
                    Ingresa los días que el colaborador ya disfrutó o cobró en el pasado para restarlos de su saldo actual.
                  </p>
                </div>

                {/* Estado Activo / Inactivo */}
                <div>
                  <label className="emp-form-label">Estado del colaborador</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="emp-status-btn"
                      style={form.activo ? { border: '1.5px solid #10B981', background: 'rgba(16, 185, 129, 0.16)', color: 'var(--text)', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)' } : {}}
                      onClick={() => setForm(p => ({ ...p, activo: true }))}
                    >
                      <span style={{ fontSize: 22 }}>✅</span>
                      <span>Activo</span>
                    </button>
                    <button
                      type="button"
                      className="emp-status-btn"
                      style={!form.activo ? { border: '1.5px solid #EF4444', background: 'rgba(239, 68, 68, 0.16)', color: 'var(--text)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)' } : {}}
                      onClick={() => setForm(p => ({ ...p, activo: false, fecha_retiro: p.fecha_retiro || hoyISO() }))}
                    >
                      <span style={{ fontSize: 22 }}>🔴</span>
                      <span>Inactivo</span>
                    </button>
                  </div>
                  {!form.activo && (
                    <div style={{ marginTop: 10 }}>
                      <label className="emp-form-label">Fecha de retiro</label>
                      <input
                        className="emp-form-input"
                        type="date"
                        value={form.fecha_retiro || ''}
                        onChange={f('fecha_retiro')}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              4. SEGURIDAD SOCIAL Y DATOS BANCARIOS
             ================================================================ */}
          {showSection('segsocial') && (
            <div className="emp-section">
              <div className="emp-section-hdr">
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(96, 165, 250, 0.15)', border: '1px solid rgba(96, 165, 250, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={13} style={{ color: '#60A5FA' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                  4. Seguridad Social y Datos Bancarios
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <label className="emp-form-label">EPS</label>
                    <input
                      list="eps-options"
                      className="emp-form-input"
                      value={form.eps || ''}
                      onChange={f('eps')}
                      placeholder="Ej: Sura"
                    />
                    <datalist id="eps-options">
                      {EPS_LIST.map(item => <option key={item} value={item} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="emp-form-label">Pensión</label>
                    <input
                      list="pension-options"
                      className="emp-form-input"
                      value={form.pension || ''}
                      onChange={f('pension')}
                      placeholder="Ej: Protección"
                    />
                    <datalist id="pension-options">
                      {PENSION_LIST.map(item => <option key={item} value={item} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="emp-form-label">Cesantías</label>
                    <input
                      list="cesantias-options"
                      className="emp-form-input"
                      value={form.cesantias || ''}
                      onChange={f('cesantias')}
                      placeholder="Ej: Protección"
                    />
                    <datalist id="cesantias-options">
                      {CESANTIAS_LIST.map(item => <option key={item} value={item} />)}
                    </datalist>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1.2fr', gap: 10 }}>
                  <div>
                    <label className="emp-form-label">Banco</label>
                    <div style={{ position: 'relative' }}>
                      <Landmark size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        list="bancos-options"
                        className="emp-form-input"
                        style={{ paddingLeft: 32 }}
                        value={form.banco || ''}
                        onChange={f('banco')}
                        placeholder="Ej: Bancolombia"
                      />
                    </div>
                    <datalist id="bancos-options">
                      {BANCOS_LIST.map(item => <option key={item} value={item} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="emp-form-label">Tipo de cuenta</label>
                    <select
                      className="emp-form-input"
                      value={form.tipo_cuenta || 'Ahorros'}
                      onChange={f('tipo_cuenta')}
                    >
                      {TIPOS_CUENTA.map(tc => (
                        <option key={tc} value={tc}>{tc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="emp-form-label">Número de cuenta</label>
                    <div style={{ position: 'relative' }}>
                      <CreditCard size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="emp-form-input"
                        style={{ paddingLeft: 32 }}
                        value={form.numero_cuenta || ''}
                        onChange={f('numero_cuenta')}
                        placeholder="Ej: 019-000018-42"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              5. CONTACTOS DE EMERGENCIA (DINÁMICO)
             ================================================================ */}
          {showSection('emergencia') && (
            <div className="emp-section" style={{ marginBottom: 4 }}>
              <div className="emp-section-hdr" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(248, 113, 113, 0.15)', border: '1px solid rgba(248, 113, 113, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HeartPulse size={13} style={{ color: '#F87171' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                    5. Contactos de Emergencia ({contactos.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={agregarContacto}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11.5, fontWeight: 700, padding: '5px 12px',
                    borderRadius: 8, background: 'rgba(var(--secondary-rgb), 0.12)', color: 'var(--secondary)',
                    border: '1px solid rgba(var(--secondary-rgb), 0.35)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} /> Agregar contacto
                </button>
              </div>

              {contactos.length === 0 ? (
                <div style={{
                  padding: '16px', borderRadius: 10, border: '1.5px dashed var(--border)',
                  background: 'var(--bg)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12,
                }}>
                  No hay contactos de emergencia registrados. Haz clic en <strong>"+ Agregar contacto"</strong> para añadir uno o más contactos.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {contactos.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.3fr 1fr 1fr auto',
                        gap: 8,
                        alignItems: 'end',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <label className="emp-form-label" style={{ fontSize: 10 }}>Nombre del contacto</label>
                        <input
                          className="emp-form-input"
                          style={{ padding: '8px 11px', fontSize: 13 }}
                          value={c.nombre || ''}
                          onChange={e => actualizarContacto(idx, 'nombre', e.target.value)}
                          placeholder="Ej: Dora María Hernández"
                        />
                      </div>
                      <div>
                        <label className="emp-form-label" style={{ fontSize: 10 }}>Teléfono / Celular</label>
                        <input
                          className="emp-form-input"
                          style={{ padding: '8px 11px', fontSize: 13 }}
                          value={c.telefono || ''}
                          onChange={e => actualizarContacto(idx, 'telefono', e.target.value)}
                          placeholder="Ej: 311 723 8941"
                        />
                      </div>
                      <div>
                        <label className="emp-form-label" style={{ fontSize: 10 }}>Parentesco / Relación</label>
                        <input
                          list="parentesco-options"
                          className="emp-form-input"
                          style={{ padding: '8px 11px', fontSize: 13 }}
                          value={c.parentesco || ''}
                          onChange={e => actualizarContacto(idx, 'parentesco', e.target.value)}
                          placeholder="Ej: Madre / Pareja"
                        />
                      </div>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => eliminarContacto(idx)}
                        title="Eliminar contacto"
                        style={{ height: 36, width: 36 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <datalist id="parentesco-options">
                    {PARENTESCOS_SUGERIDOS.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
              )}
            </div>
          )}

          {msg && modal && <div className={`alert alert-${msg.type}`} style={{ marginTop: 8 }}>{msg.text}</div>}
        </div>

        {/* ── Footer adaptativo ── */}
        <div className="emp-modal-footer">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {[
              form.nombre_completo && '👤 ' + form.nombre_completo.split(' ')[0],
              form.numero_documento && `${form.tipo_documento || 'CC'} ${form.numero_documento}`,
              form.dependencia && (DEP_ICONS[form.dependencia] || '🏢') + ' ' + form.dependencia,
              form.cargo && form.cargo,
              form.activo ? '✅ Activo' : '🔴 Inactivo',
            ].filter(Boolean).join(' · ') || 'Completa los campos obligatorios *'}
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancelar
            </button>

            {duplicadoWarning?.tipo === 'exacto' ? (
              <button
                style={{
                  padding: '10px 18px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer', background: '#D97706', color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
                }}
                onClick={() => save(true)} disabled={saving}>
                {saving
                  ? <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'empSpin .7s linear infinite' }} /> Guardando...</>
                  : <><AlertTriangle size={14} /> Guardar de todos modos</>}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={saving || !form.nombre_completo}
                onClick={() => save(false)}
                style={{
                  padding: '10px 22px', borderRadius: 10, fontSize: 13,
                  boxShadow: (saving || !form.nombre_completo) ? 'none' : '0 4px 14px rgba(var(--primary-rgb),.35)',
                }}>
                {saving
                  ? <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'empSpin .7s linear infinite' }} /> Guardando...</>
                  : <><CheckCircle2 size={14} /> {modal === 'add' ? 'Crear empleado' : 'Guardar cambios'}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}