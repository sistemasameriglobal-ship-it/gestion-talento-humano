import { useState } from 'react'
import * as perfilesApi from '../../api/perfiles'
import { useAuth } from '../../context/AuthContext'
import {
  X, Check, Shield, CheckCircle2,
  AlertCircle, Loader2, LayoutDashboard, FileText,
  ShieldAlert, Sun, UserCog, Users, ParkingCircle, TrendingUp,
  Eye, EyeOff, UserCheck, UserX, Mail, KeyRound, CheckSquare,
} from 'lucide-react'

const SECCIONES_APP = [
  { id: 'dashboard',      label: 'Dashboard',           icon: LayoutDashboard, emoji: '🏠' },
  { id: 'novedades',      label: 'Novedades',           icon: FileText,        emoji: '📋' },
  { id: 'disciplinarios', label: 'Proc. disciplinarios', icon: ShieldAlert,    emoji: '⚖️' },
  { id: 'vacaciones',     label: 'Vacaciones',          icon: Sun,             emoji: '🌴' },
  { id: 'empleados',     label: 'Empleados',           icon: UserCog,         emoji: '👥' },
  { id: 'colaboradores', label: 'Colaboradores',       icon: Users,           emoji: '🤝' },
  { id: 'parqueadero',   label: 'Parqueadero',         icon: ParkingCircle,   emoji: '🅿️' },
  { id: 'productividad', label: 'Productividad',       icon: TrendingUp,      emoji: '📈' },
]

export default function ModalEditarPermisos({ user, onClose, onUpdated }) {
  const { user: currentUser } = useAuth()
  const esYo = user.id === currentUser?.id

  // Campos de perfil y credenciales
  const [nombreCompleto, setNombreCompleto] = useState(user.nombre_completo || '')
  const [correo, setCorreo] = useState(user.correo || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [activo, setActivo] = useState(user.activo ?? true)

  const [rol, setRol] = useState(() => {
    if (user.es_admin) return 'administrador'
    return user.rol || 'operativo'
  })

  const [empresas, setEmpresas] = useState(() => {
    if (Array.isArray(user.empresas) && user.empresas.length > 0) return user.empresas
    return ['ameriglobal']
  })

  // Normalización de permisos granulares por sección: 'total' | 'lectura' | 'none'
  const [permisos, setPermisos] = useState(() => {
    const p = user.permisos || {}
    const normalizar = (val) => {
      const res = {}
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        SECCIONES_APP.forEach(s => {
          res[s.id] = val[s.id] || (val.all ? val.all : 'total')
        })
        return res
      }
      if (Array.isArray(val)) {
        const hasAll = val.includes('all')
        SECCIONES_APP.forEach(s => {
          if (hasAll || val.includes(`${s.id}:total`) || val.includes(`${s.id}:write`) || val.includes(s.id)) {
            res[s.id] = 'total'
          } else if (val.includes(`${s.id}:lectura`) || val.includes(`${s.id}:read`)) {
            res[s.id] = 'lectura'
          } else {
            res[s.id] = 'none'
          }
        })
        return res
      }
      SECCIONES_APP.forEach(s => { res[s.id] = 'total' })
      return res
    }

    return {
      ameriglobal: normalizar(p.ameriglobal),
      global_link: normalizar(p.global_link),
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const toggleEmpresa = (empId) => {
    setEmpresas(prev => {
      if (prev.includes(empId)) {
        if (prev.length === 1) return prev // Debe tener al menos una empresa
        return prev.filter(e => e !== empId)
      } else {
        return [...prev, empId]
      }
    })
  }

  const handleNivelChange = (empresa, seccionId, nivel) => {
    setPermisos(prev => ({
      ...prev,
      [empresa]: {
        ...(prev[empresa] || {}),
        [seccionId]: nivel,
      },
    }))
  }

  const handleSetAll = (empresa, nivel) => {
    setPermisos(prev => {
      const actual = {}
      SECCIONES_APP.forEach(s => {
        actual[s.id] = nivel
      })
      return {
        ...prev,
        [empresa]: actual,
      }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!nombreCompleto.trim()) {
      return setError('Ingresa el nombre completo del usuario.')
    }
    if (!correo.trim()) {
      return setError('Ingresa el correo electrónico del usuario.')
    }
    if (password && password.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres.')
    }
    if (empresas.length === 0) {
      return setError('Debes asignar al menos una empresa al usuario.')
    }
    if (esYo && !activo) {
      return setError('No puedes desactivar tu propia cuenta de usuario.')
    }
    if (esYo && rol !== 'administrador') {
      return setError('No puedes quitarte el rol de administrador a ti mismo.')
    }

    setLoading(true)
    try {
      const esAdmin = rol === 'administrador'

      const { error: updateError } = await perfilesApi.adminActualizarUsuario(user.id, {
        nombre_completo: nombreCompleto.trim(),
        correo: correo.trim().toLowerCase(),
        password: password ? password.trim() : null,
        rol,
        es_admin: esAdmin,
        activo,
        empresas,
        permisos,
      })

      if (updateError) {
        setLoading(false)
        return setError(updateError.message || 'No se pudieron guardar los cambios.')
      }

      setLoading(false)
      setDone(true)
      setTimeout(() => {
        onUpdated()
      }, 900)
    } catch (err) {
      setLoading(false)
      setError('Error inesperado: ' + err.message)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal" style={{ maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <UserCog size={18} style={{ color: 'var(--primary)' }} />
            Editar Perfil y Permisos — {user.nombre_completo || user.correo}
          </h2>
          <button className="modal-close" onClick={onClose} disabled={loading}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div className="auth-pending-icon" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', margin: '0 auto 14px' }}>
                <CheckCircle2 size={30} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>Perfil y permisos actualizados exitosamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={15} /> {error}</div>}

              {/* ── 1. Datos básicos: Nombre y Correo ── */}
              <div style={{ background: 'var(--bg)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserCog size={14} /> Datos Básicos del Usuario
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Nombre completo</label>
                    <input
                      className="form-control"
                      type="text"
                      value={nombreCompleto}
                      onChange={e => setNombreCompleto(e.target.value)}
                      placeholder="Ej: Laura Gómez"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Correo electrónico</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        type="email"
                        value={correo}
                        onChange={e => setCorreo(e.target.value)}
                        placeholder="usuario@empresa.com"
                        required
                        style={{ paddingLeft: 30 }}
                      />
                      <Mail size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>

                {/* Restablecer Contraseña opcional */}
                <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <KeyRound size={13} style={{ color: 'var(--primary)' }} />
                    Restablecer contraseña (opcional)
                  </label>
                  <div className="password-field">
                    <input
                      className="form-control"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Dejar en blanco para mantener la clave actual"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(s => !s)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Solo ingresa una contraseña si deseas cambiarle el acceso al usuario (mínimo 6 caracteres).
                  </span>
                </div>
              </div>

              {/* ── 2. Rol y Estado ── */}
              <div style={{ background: 'var(--bg)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} /> Rol y Estado de Cuenta
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { id: 'operativo', label: 'Operativo', desc: 'Acceso según los permisos asignados abajo', color: '#2563EB' },
                    { id: 'supervisor', label: 'Supervisor', desc: 'Visualización, auditoría y seguimiento', color: '#0D9488' },
                    { id: 'administrador', label: 'Administrador', desc: 'Acceso total y gestión de usuarios', color: '#7C3AED' },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRol(r.id)}
                      disabled={esYo && r.id !== 'administrador'}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 10,
                        border: rol === r.id ? `2px solid ${r.color}` : '1px solid var(--border)',
                        background: rol === r.id ? 'var(--card-bg)' : 'var(--bg)',
                        boxShadow: rol === r.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        cursor: esYo && r.id !== 'administrador' ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        opacity: esYo && r.id !== 'administrador' ? 0.5 : 1,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: rol === r.id ? r.color : 'var(--text)' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.25 }}>
                        {r.desc}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Estado Activo / Inactivo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: activo ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {activo ? <UserCheck size={16} style={{ color: 'var(--success-text)' }} /> : <UserX size={16} style={{ color: 'var(--danger-text)' }} />}
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: activo ? 'var(--success-text)' : 'var(--danger-text)' }}>
                        {activo ? 'Cuenta Activa (Acceso Permitido)' : 'Cuenta Inactiva (Acceso Bloqueado)'}
                      </span>
                      <div style={{ fontSize: 11, color: activo ? 'var(--success-text)' : 'var(--danger-text)', opacity: 0.85 }}>
                        {activo ? 'El usuario puede iniciar sesión en la plataforma.' : 'El usuario no podrá acceder al sistema.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={esYo && activo}
                    onClick={() => setActivo(a => !a)}
                    style={{
                      background: activo ? 'var(--card-bg)' : 'var(--danger)',
                      color: activo ? 'var(--danger-text)' : '#FFF',
                      border: '1px solid var(--border)',
                      fontWeight: 600,
                      fontSize: 11,
                      padding: '4px 10px',
                    }}
                  >
                    {activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>

              {/* ── 3. Empresas con Acceso ── */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Empresas con Acceso
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* AmeriGlobal */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: empresas.includes('ameriglobal') ? '2px solid #2563EB' : '1px solid var(--border)',
                      background: empresas.includes('ameriglobal') ? 'var(--info-bg)' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={empresas.includes('ameriglobal')}
                      onChange={() => toggleEmpresa('ameriglobal')}
                      style={{ accentColor: '#2563EB', width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--info-text)' }}>🏢 AmeriGlobal</div>
                      <div style={{ fontSize: 10.5, color: '#6B7280' }}>Novedades e Incapacidades</div>
                    </div>
                  </label>

                  {/* Global Link */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: empresas.includes('global_link') ? '2px solid #0D9488' : '1px solid var(--border)',
                      background: empresas.includes('global_link') ? '#F0FDFA' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={empresas.includes('global_link')}
                      onChange={() => toggleEmpresa('global_link')}
                      style={{ accentColor: '#0D9488', width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0F766E' }}>🌐 Global Link</div>
                      <div style={{ fontSize: 10.5, color: '#6B7280' }}>Cobranza & Departamentos</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── 4. Permisos por Secciones (AmeriGlobal) ── */}
              {empresas.includes('ameriglobal') && (
                <div style={{ marginBottom: 16, padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--info-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🏢 Secciones en AmeriGlobal
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Configura si el usuario puede modificar o solo ver la información de cada módulo.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSetAll('ameriglobal', 'total')}
                        style={{ fontSize: 11, padding: '3px 8px', color: '#15803D' }}
                      >
                        <CheckSquare size={12} style={{ marginRight: 3 }} /> Todo Acceso Total
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSetAll('ameriglobal', 'lectura')}
                        style={{ fontSize: 11, padding: '3px 8px', color: '#B45309' }}
                      >
                        <Eye size={12} style={{ marginRight: 3 }} /> Todo Solo Ver
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSetAll('ameriglobal', 'none')}
                        style={{ fontSize: 11, padding: '3px 8px', color: '#6B7280' }}
                      >
                        <X size={12} style={{ marginRight: 3 }} /> Bloquear Todo
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SECCIONES_APP.map(sec => {
                      const nivel = permisos.ameriglobal?.[sec.id] || 'none'
                      return (
                        <div
                          key={`ag-${sec.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            borderRadius: 8,
                            background: '#FFFFFF',
                            border: nivel === 'total'
                              ? '1px solid #86EFAC'
                              : nivel === 'lectura'
                                ? '1px solid #FCD34D'
                                : '1px solid #E5E7EB',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: nivel !== 'none' ? 600 : 400, color: nivel !== 'none' ? 'var(--text)' : 'var(--text-muted)' }}>
                            <span>{sec.emoji}</span>
                            <span>{sec.label}</span>
                          </div>

                          <div style={{ display: 'inline-flex', background: 'var(--bg)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
                            <button
                              type="button"
                              onClick={() => handleNivelChange('ameriglobal', sec.id, 'total')}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: nivel === 'total' ? 700 : 500,
                                borderRadius: 5,
                                border: 'none',
                                cursor: 'pointer',
                                background: nivel === 'total' ? '#DCFCE7' : 'transparent',
                                color: nivel === 'total' ? '#15803D' : 'var(--text-muted)',
                                transition: 'all 0.12s',
                              }}
                              title="Acceso total: puede ver, crear, editar y eliminar"
                            >
                              🟢 Acceso Total
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNivelChange('ameriglobal', sec.id, 'lectura')}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: nivel === 'lectura' ? 700 : 500,
                                borderRadius: 5,
                                border: 'none',
                                cursor: 'pointer',
                                background: nivel === 'lectura' ? '#FEF3C7' : 'transparent',
                                color: nivel === 'lectura' ? '#B45309' : 'var(--text-muted)',
                                transition: 'all 0.12s',
                              }}
                              title="Solo lectura: únicamente consultar información"
                            >
                              👁️ Solo Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNivelChange('ameriglobal', sec.id, 'none')}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: nivel === 'none' ? 700 : 500,
                                borderRadius: 5,
                                border: 'none',
                                cursor: 'pointer',
                                background: nivel === 'none' ? '#F3F4F6' : 'transparent',
                                color: nivel === 'none' ? '#4B5563' : 'var(--text-muted)',
                                transition: 'all 0.12s',
                              }}
                              title="Sin acceso: oculta el módulo del menú"
                            >
                              🚫 Sin Acceso
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── 5. Permisos por Secciones (Global Link) ── */}
              {empresas.includes('global_link') && (
                <div style={{ marginBottom: 16, padding: '14px 16px', background: '#F0FDFA', borderRadius: 12, border: '1px solid #CCFBF1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🌐 Secciones en Global Link
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Configura los privilegios de visualización o modificación para Global Link.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSetAll('global_link', 'total')}
                        style={{ fontSize: 11, padding: '3px 8px', color: '#0F766E' }}
                      >
                        <CheckSquare size={12} style={{ marginRight: 3 }} /> Todo Acceso Total
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSetAll('global_link', 'lectura')}
                        style={{ fontSize: 11, padding: '3px 8px', color: '#B45309' }}
                      >
                        <Eye size={12} style={{ marginRight: 3 }} /> Todo Solo Ver
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSetAll('global_link', 'none')}
                        style={{ fontSize: 11, padding: '3px 8px', color: '#6B7280' }}
                      >
                        <X size={12} style={{ marginRight: 3 }} /> Bloquear Todo
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SECCIONES_APP.map(sec => {
                      const nivel = permisos.global_link?.[sec.id] || 'none'
                      return (
                        <div
                          key={`gl-${sec.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            borderRadius: 8,
                            background: '#FFFFFF',
                            border: nivel === 'total'
                              ? '1px solid #99F6E4'
                              : nivel === 'lectura'
                                ? '1px solid #FCD34D'
                                : '1px solid #E5E7EB',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: nivel !== 'none' ? 600 : 400, color: nivel !== 'none' ? 'var(--text)' : 'var(--text-muted)' }}>
                            <span>{sec.emoji}</span>
                            <span>{sec.label}</span>
                          </div>

                          <div style={{ display: 'inline-flex', background: 'var(--bg)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
                            <button
                              type="button"
                              onClick={() => handleNivelChange('global_link', sec.id, 'total')}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: nivel === 'total' ? 700 : 500,
                                borderRadius: 5,
                                border: 'none',
                                cursor: 'pointer',
                                background: nivel === 'total' ? '#CCFBF1' : 'transparent',
                                color: nivel === 'total' ? '#0F766E' : 'var(--text-muted)',
                                transition: 'all 0.12s',
                              }}
                              title="Acceso total: puede ver, crear, editar y eliminar"
                            >
                              🟢 Acceso Total
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNivelChange('global_link', sec.id, 'lectura')}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: nivel === 'lectura' ? 700 : 500,
                                borderRadius: 5,
                                border: 'none',
                                cursor: 'pointer',
                                background: nivel === 'lectura' ? '#FEF3C7' : 'transparent',
                                color: nivel === 'lectura' ? '#B45309' : 'var(--text-muted)',
                                transition: 'all 0.12s',
                              }}
                              title="Solo lectura: únicamente consultar información"
                            >
                              👁️ Solo Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNivelChange('global_link', sec.id, 'none')}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: nivel === 'none' ? 700 : 500,
                                borderRadius: 5,
                                border: 'none',
                                cursor: 'pointer',
                                background: nivel === 'none' ? '#F3F4F6' : 'transparent',
                                color: nivel === 'none' ? '#4B5563' : 'var(--text-muted)',
                                transition: 'all 0.12s',
                              }}
                              title="Sin acceso: oculta el módulo del menú"
                            >
                              🚫 Sin Acceso
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                  {loading ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
