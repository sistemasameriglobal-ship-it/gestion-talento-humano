// =============================================================
// src/components/usuarios/ModalGestionEmpresas.jsx
// -------------------------------------------------------------
// Modal de administración de empresas del sistema multi-empresa.
// Permite a los administradores registrar nuevas razones sociales,
// configurar su identidad corporativa y utilizarlas en todos los módulos.
// =============================================================
import { useState, useMemo } from 'react'
import {
  Building2, Plus, X, Edit2, AlertCircle, CheckCircle2,
  Loader2, ArrowRight, Palette, Sparkles
} from 'lucide-react'
import * as empresasApi from '../../api/empresas'
import { useCompany } from '../../context/CompanyContext'
import { useAuth } from '../../context/AuthContext'

const ICONOS_PREDEFINIDOS = [
  { val: '🏢', label: 'Edificio' },
  { val: '🌐', label: 'Global' },
  { val: '💼', label: 'Corporativo' },
  { val: '🏭', label: 'Industrial' },
  { val: '🏥', label: 'Salud' },
  { val: '⚖️', label: 'Legal' },
  { val: '🚀', label: 'Innovación' },
  { val: '💻', label: 'Tecnología' },
  { val: '🎯', label: 'Comercial' },
  { val: '⚡', label: 'Servicios' },
]

const TEMAS_COLORES = [
  { id: 'azul', label: 'Azul', pri: '#2563EB', sec: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'esmeralda', label: 'Esmeralda', pri: '#0D9488', sec: '#0F766E', bg: '#F0FDFA' },
  { id: 'indigo', label: 'Índigo', pri: '#4F46E5', sec: '#4338CA', bg: '#EEF2FF' },
  { id: 'violeta', label: 'Violeta', pri: '#7C3AED', sec: '#6D28D9', bg: '#F5F3FF' },
  { id: 'naranja', label: 'Naranja', pri: '#EA580C', sec: '#C2410C', bg: '#FFF7ED' },
  { id: 'rosa', label: 'Fucsia', pri: '#DB2777', sec: '#BE185D', bg: '#FDF2F8' },
  { id: 'ambar', label: 'Ámbar', pri: '#D97706', sec: '#B45309', bg: '#FFFBEB' },
  { id: 'slate', label: 'Carbón', pri: '#475569', sec: '#334155', bg: '#F8FAFC' },
]

export default function ModalGestionEmpresas({ onClose }) {
  const { user } = useAuth()
  const {
    empresasDisponibles,
    reloadEmpresas,
    currentCompany,
    setCompany,
  } = useCompany()

  const [modo, setModo] = useState('list') // 'list' | 'add' | 'edit'

  // Form states
  const [nombre, setNombre] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [nit, setNit] = useState('')
  const [codigo, setCodigo] = useState('')
  const [tagline, setTagline] = useState('')
  const [logoLetra, setLogoLetra] = useState('')
  const [icono, setIcono] = useState('🏢')
  const [colorPrincipal, setColorPrincipal] = useState('#2563EB')
  const [colorSecundario, setColorSecundario] = useState('#1D4ED8')
  const [colorFondoTag, setColorFondoTag] = useState('#EFF6FF')
  const [departamentosTexto, setDepartamentosTexto] = useState('OPERACIONES, ADMINISTRACION, RRHH, GERENCIA')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleOpenAdd = () => {
    setNombre('')
    setRazonSocial('')
    setNit('')
    setCodigo('')
    setTagline('Operaciones & Gestión')
    setLogoLetra('')
    setIcono('🏢')
    setColorPrincipal('#4F46E5')
    setColorSecundario('#4338CA')
    setColorFondoTag('#EEF2FF')
    setDepartamentosTexto('OPERACIONES, ADMINISTRACION, RRHH, GERENCIA')
    setModo('add')
  }

  const handleOpenEdit = (emp) => {
    setNombre(emp.nombre || '')
    setRazonSocial(emp.razonSocial || '')
    setNit(emp.nit || '')
    setCodigo(emp.codigo || emp.id)
    setTagline(emp.tagline || '')
    setLogoLetra(emp.logoLetra || '')
    setIcono(emp.icono || '🏢')
    setColorPrincipal(emp.colorPrincipal || '#2563EB')
    setColorSecundario(emp.colorSecundario || '#1D4ED8')
    setColorFondoTag(emp.colorFondoTag || '#EFF6FF')
    setModo('edit')
  }

  const handleNombreChange = (val) => {
    setNombre(val)
    if (modo === 'add') {
      const slugAuto = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
      setCodigo(slugAuto)
      setRazonSocial(`${val} S.A.S.`)
      setLogoLetra(val.slice(0, 2).toUpperCase())
    }
  }

  const handleAplicarTema = (tema) => {
    setColorPrincipal(tema.pri)
    setColorSecundario(tema.sec)
    setColorFondoTag(tema.bg)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return flash('error', 'El nombre comercial es obligatorio.')
    if (!codigo.trim()) return flash('error', 'El código de identificación es obligatorio.')

    setSaving(true)
    try {
      if (modo === 'add') {
        const existe = empresasDisponibles.some(e => e.id === codigo || e.codigo === codigo)
        if (existe) {
          setSaving(false)
          return flash('error', `Ya existe una empresa con el código "${codigo}". Elige otro identificador.`)
        }

        const depsArray = departamentosTexto
          .split(',')
          .map(d => d.trim().toUpperCase())
          .filter(Boolean)

        const payload = {
          nombre: nombre.trim(),
          razonSocial: razonSocial.trim() || `${nombre.trim()} S.A.S.`,
          nit: nit.trim(),
          codigo: codigo.trim().toLowerCase(),
          tagline: tagline.trim(),
          logoLetra: (logoLetra.trim() || nombre.slice(0, 2)).toUpperCase(),
          icono,
          colorPrincipal,
          colorSecundario,
          colorFondoTag,
          departamentos: depsArray,
        }

        const { error } = await empresasApi.crearEmpresa(payload, user?.id)
        if (error) throw error

        flash('success', `¡Empresa "${payload.nombre}" creada exitosamente! Ahora está lista para operar.`)
        await reloadEmpresas()
        setModo('list')
      } else {
        const payload = {
          nombre: nombre.trim(),
          razonSocial: razonSocial.trim(),
          nit: nit.trim(),
          tagline: tagline.trim(),
          logoLetra: (logoLetra.trim() || nombre.slice(0, 2)).toUpperCase(),
          icono,
          colorPrincipal,
          colorSecundario,
          colorFondoTag,
        }

        const { error } = await empresasApi.actualizarEmpresa(codigo, payload)
        if (error) throw error

        flash('success', `Empresa "${payload.nombre}" actualizada correctamente.`)
        await reloadEmpresas()
        setModo('list')
      }
    } catch (err) {
      flash('error', 'Error al guardar la empresa: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (emp) => {
    if (emp.codigo === 'ameriglobal' && emp.activo) {
      return flash('error', 'AmeriGlobal es la empresa principal del sistema y no puede ser desactivada.')
    }
    const nuevoEstado = !emp.activo
    setSaving(true)
    try {
      await empresasApi.alternarEstadoEmpresa(emp.codigo, nuevoEstado)
      flash('success', `Empresa "${emp.nombre}" ${nuevoEstado ? 'activada' : 'desactivada'}.`)
      await reloadEmpresas()
    } catch (err) {
      flash('error', 'Error al cambiar estado: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const empresasOrdenadas = useMemo(() => {
    return [...empresasDisponibles].sort((a, b) => {
      if (a.codigo === 'ameriglobal') return -1
      if (b.codigo === 'ameriglobal') return 1
      if (a.codigo === 'global_link') return -1
      if (b.codigo === 'global_link') return 1
      return (a.nombre || '').localeCompare(b.nombre || '')
    })
  }, [empresasDisponibles])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal" style={{ maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER ── */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#EEF2FF', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#4338CA',
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {modo === 'list' ? 'Gestión de Empresas del Sistema' : modo === 'add' ? 'Registrar Nueva Empresa' : `Editar ${nombre}`}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {modo === 'list'
                  ? 'Configura las razones sociales activas y agrega nuevas entidades empresariales.'
                  : 'Define la razón social, colores, ícono y departamentos base de la nueva empresa.'}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>

        {/* ── BODY CON SCROLL ── */}
        <div className="modal-body" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 24px' }}>
          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>
              {msg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />} {msg.text}
            </div>
          )}

          {modo === 'list' ? (
            <>
              {/* Barra de control superior */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Empresas Configuradas ({empresasOrdenadas.length})
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Puedes cambiar libremente entre empresas usando el menú superior.
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                  <Plus size={14} /> Registrar Nueva Empresa
                </button>
              </div>

              {/* Grid de tarjetas de empresas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {empresasOrdenadas.map(emp => {
                  const esActiva = emp.codigo === currentCompany || emp.id === currentCompany
                  return (
                    <div
                      key={emp.codigo || emp.id}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 12,
                        background: 'var(--bg)',
                        border: esActiva ? `2px solid ${emp.colorPrincipal || '#2563EB'}` : '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        opacity: emp.activo ? 1 : 0.6,
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Logo Avatar */}
                        <div
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: `linear-gradient(135deg, ${emp.colorPrincipal || '#2563EB'} 0%, ${emp.colorSecundario || '#1D4ED8'} 100%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, color: '#fff', fontWeight: 800, flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                          }}
                        >
                          {emp.icono || emp.logoLetra || '🏢'}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 14 }}>{emp.nombre}</span>
                            {esActiva && (
                              <span style={{
                                fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0',
                              }}>
                                ACTIVA
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {emp.razonSocial}
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: 10, fontFamily: 'monospace', padding: '1px 5px', borderRadius: 4, background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                              código: {emp.codigo}
                            </span>
                            {emp.nit && (
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                NIT: {emp.nit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {emp.tagline && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{emp.tagline}"
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 'auto' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px' }}
                            onClick={() => handleOpenEdit(emp)}
                          >
                            <Edit2 size={12} style={{ marginRight: 4 }} /> Editar
                          </button>
                          {emp.codigo !== 'ameriglobal' && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px', color: emp.activo ? 'var(--danger)' : 'var(--success)' }}
                              onClick={() => handleToggleActivo(emp)}
                              disabled={saving}
                            >
                              {emp.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>

                        {!esActiva && emp.activo && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '3px 9px' }}
                            onClick={() => {
                              setCompany(emp.codigo)
                              flash('success', `Sesión cambiada a ${emp.nombre}.`)
                            }}
                          >
                            Usar ahora <ArrowRight size={11} style={{ marginLeft: 3 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Vista previa viva de la empresa */}
              <div style={{
                padding: '14px 18px',
                borderRadius: 12,
                background: colorFondoTag || '#EFF6FF',
                border: `1.5px solid ${colorPrincipal}`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: `linear-gradient(135deg, ${colorPrincipal} 0%, ${colorSecundario} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff', fontWeight: 800,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                }}>
                  {icono}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: colorSecundario }}>
                    VISTA PREVIA
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                    {nombre || 'Nombre de la Empresa'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {razonSocial || 'Razón Social S.A.S.'} • <span style={{ fontFamily: 'monospace' }}>{codigo || 'slug'}</span>
                  </div>
                </div>
              </div>

              {/* Datos Generales */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Nombre comercial *</label>
                  <input
                    className="form-control"
                    type="text"
                    value={nombre}
                    onChange={e => handleNombreChange(e.target.value)}
                    placeholder="Ej: NovaTech"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Razón Social Legal *</label>
                  <input
                    className="form-control"
                    type="text"
                    value={razonSocial}
                    onChange={e => setRazonSocial(e.target.value)}
                    placeholder="Ej: NovaTech Soluciones S.A.S."
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Código Identificador (Slug) *</label>
                  <input
                    className="form-control"
                    type="text"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="Ej: novatech"
                    disabled={modo === 'edit'}
                    required
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {modo === 'add' ? 'Identificador interno en base de datos (minúsculas sin espacios).' : 'El código interno no se puede modificar una vez creado.'}
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>NIT / Identificación tributaria (opcional)</label>
                  <input
                    className="form-control"
                    type="text"
                    value={nit}
                    onChange={e => setNit(e.target.value)}
                    placeholder="Ej: 901.554.231-8"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Tagline / Descripción corta</label>
                  <input
                    className="form-control"
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="Ej: BPO, Cobranza & Operaciones"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Letras del Logo</label>
                  <input
                    className="form-control"
                    type="text"
                    maxLength={3}
                    value={logoLetra}
                    onChange={e => setLogoLetra(e.target.value.toUpperCase())}
                    placeholder="Ej: NT"
                    style={{ textAlign: 'center', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Selector de Ícono y Temas de Color */}
              <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={13} /> Ícono Representativo
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {ICONOS_PREDEFINIDOS.map(ico => (
                    <button
                      key={ico.val}
                      type="button"
                      onClick={() => setIcono(ico.val)}
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: icono === ico.val ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: icono === ico.val ? 'var(--card-bg)' : 'transparent',
                        fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title={ico.label}
                    >
                      {ico.val}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Palette size={13} /> Paleta de Colores
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {TEMAS_COLORES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleAplicarTema(t)}
                      style={{
                        padding: '4px 10px', borderRadius: 999,
                        border: colorPrincipal === t.pri ? '2px solid var(--text)' : '1px solid var(--border)',
                        background: t.bg, color: t.sec,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.pri }} />
                      {t.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Color Principal</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="color"
                        value={colorPrincipal}
                        onChange={e => setColorPrincipal(e.target.value)}
                        style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      />
                      <input
                        className="form-control form-control-sm"
                        type="text"
                        value={colorPrincipal}
                        onChange={e => setColorPrincipal(e.target.value)}
                        style={{ fontSize: 11, fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Color Secundario</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="color"
                        value={colorSecundario}
                        onChange={e => setColorSecundario(e.target.value)}
                        style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      />
                      <input
                        className="form-control form-control-sm"
                        type="text"
                        value={colorSecundario}
                        onChange={e => setColorSecundario(e.target.value)}
                        style={{ fontSize: 11, fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Fondo Suave</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="color"
                        value={colorFondoTag}
                        onChange={e => setColorFondoTag(e.target.value)}
                        style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      />
                      <input
                        className="form-control form-control-sm"
                        type="text"
                        value={colorFondoTag}
                        onChange={e => setColorFondoTag(e.target.value)}
                        style={{ fontSize: 11, fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Departamentos Iniciales (Solo en creación) */}
              {modo === 'add' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Departamentos / Áreas iniciales (separados por coma)
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={departamentosTexto}
                    onChange={e => setDepartamentosTexto(e.target.value)}
                    placeholder="OPERACIONES, ADMINISTRACION, RRHH, GERENCIA"
                    style={{ fontSize: 12 }}
                  />
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    Estos departamentos se crearán automáticamente en el sistema para esta empresa. Luego podrás agregar más desde "Gestionar Departamentos".
                  </span>
                </div>
              )}

              {/* Botones del formulario */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModo('list')}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {saving && <Loader2 size={14} className="spin" />}
                  {modo === 'add' ? 'Registrar Empresa' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── FOOTER (solo en modo list) ── */}
        {modo === 'list' && (
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', flexShrink: 0, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Total: {empresasOrdenadas.length} empresas registradas
            </span>
            <button className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
