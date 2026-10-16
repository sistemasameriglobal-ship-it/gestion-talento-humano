import PageTitle from '../components/ui/PageTitle'
import { ShieldCheck as TitleIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import * as authApi from '../api/auth'
import * as perfilesApi from '../api/perfiles'
import { useAuth } from '../context/AuthContext'
import {
  Search, Mail, UserCheck, UserX, ShieldCheck, ShieldAlert, Shield,
  Users as UsersIcon, AlertCircle, CheckCircle2, UserPlus, X, Loader2,
  Eye, EyeOff, Layers, UserCog,
} from 'lucide-react'
import ModalEditarPermisos from '../components/usuarios/ModalEditarPermisos'
import ModalGestionDepartamentos from '../components/usuarios/ModalGestionDepartamentos'
import ModalAuditLogs from '../components/usuarios/ModalAuditLogs'
import PersonCell from '../components/ui/PersonCell'

const FILTROS = [
  { id: '',           label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'activos',    label: 'Activos' },
]

// ─── Modal: crear usuario nuevo ──────────────────────────────────────────────
function PasswordField({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="password-field">
      <input
        className="form-control"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button type="button" className="password-toggle" onClick={() => setShow(s => !s)} tabIndex={-1}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function ModalCrearUsuario({ onClose, onCreated }) {
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)
  const [empresas, setEmpresas] = useState(['ameriglobal', 'global_link'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const toggleEmpresa = (id) => {
    setEmpresas(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter(e => e !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombreCompleto.trim()) return setError('Ingresa el nombre completo.')
    if (!correo.trim()) return setError('Ingresa el correo electrónico.')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    if (empresas.length === 0) return setError('Selecciona al menos una empresa con acceso.')

    setLoading(true)
    try {
      // 1) Guardamos la sesión actual del admin para poder restaurarla
      const { data: { session: adminSession } } = await authApi.obtenerSesion()
      if (!adminSession) { setError('Tu sesión expiró, vuelve a iniciar sesión.'); setLoading(false); return }

      // 2) Crear el usuario nuevo (con flag de creación por admin)
      const { data, error: signUpError } = await authApi.registrarUsuario(
        correo.trim().toLowerCase(), password, nombreCompleto.trim(), { creado_por_admin: true }
      )

      if (signUpError) {
        setLoading(false)
        return setError(
          signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')
            ? 'Ya existe una cuenta con ese correo.'
            : signUpError.message
        )
      }

      const newUserId = data?.user?.id

      // 3) Restaurar la sesión del admin
      const { error: restoreError } = await authApi.restaurarSesion(adminSession.access_token, adminSession.refresh_token)
      if (restoreError) {
        setLoading(false)
        setError('El usuario se creó, pero no se pudo restaurar tu sesión automáticamente. Vuelve a iniciar sesión.')
        return
      }

      // 4) Confirmar y activar inmediatamente el perfil del nuevo usuario
      if (newUserId) {
        const permisosIniciales = {
          ameriglobal: ['all'],
          global_link: ['all'],
        }

        // Auto-confirmar el correo para que no quede pendiente de verificación
        await perfilesApi.confirmarYActivarUsuario(newUserId)

        const { error: updateError } = await perfilesApi.activarPerfil(
          newUserId, true, esAdmin, empresas, permisosIniciales, esAdmin ? 'administrador' : 'operativo'
        )
        if (updateError) {
          setLoading(false)
          setError(`Usuario creado pero no se pudo activar el perfil: ${updateError.message}.`)
          return
        }
      }

      setLoading(false)
      setDone(true)
      setTimeout(() => { onCreated() }, 1100)
    } catch (e) {
      setLoading(false)
      setError('Error inesperado: ' + e.message)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} /> Crear usuario
          </h2>
          <button className="modal-close" onClick={onClose} disabled={loading}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div className="auth-pending-icon" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', margin: '0 auto 14px' }}>
                <CheckCircle2 size={26} />
              </div>
              <p style={{ fontWeight: 600 }}>Usuario creado y activado correctamente.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && <div className="alert alert-error" style={{ marginBottom: 14 }}><AlertCircle size={15} /> {error}</div>}

              <div className="form-group">
                <label>Nombre completo</label>
                <div className="password-field">
                  <input className="form-control" style={{ paddingRight: 12 }} value={nombreCompleto}
                    onChange={e => setNombreCompleto(e.target.value)} placeholder="Ej: María Pérez" autoComplete="name" />
                </div>
              </div>

              <div className="form-group">
                <label>Correo electrónico</label>
                <input className="form-control" type="email" value={correo}
                  onChange={e => setCorreo(e.target.value)} placeholder="usuario@empresa.com" autoComplete="email" />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
              </div>

              <div className="form-group">
                <label>Confirmar contraseña</label>
                <PasswordField value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite la contraseña" autoComplete="new-password" />
              </div>

              {/* Selección de empresas */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Empresas con acceso:
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={empresas.includes('ameriglobal')} onChange={() => toggleEmpresa('ameriglobal')} style={{ accentColor: '#2563EB' }} />
                    <span>🏢 AmeriGlobal</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={empresas.includes('global_link')} onChange={() => toggleEmpresa('global_link')} style={{ accentColor: '#0D9488' }} />
                    <span>🌐 Global Link</span>
                  </label>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '4px 0 18px', cursor: 'pointer' }}>
                <input type="checkbox" checked={esAdmin} onChange={e => setEsAdmin(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                Darle rol de administrador (Acceso Total)
              </label>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <Loader2 size={15} className="spin" /> : <UserPlus size={15} />}
                {loading ? 'Creando...' : 'Crear usuario'}
              </button>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                El usuario queda activo y con cuenta confirmada de inmediato con acceso a las empresas elegidas.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('')
  const [msg, setMsg] = useState(null)
  const [busyId, setBusyId] = useState(null)

  // Modales
  const [modalCrear, setModalCrear] = useState(false)
  const [modalPermisosUser, setModalPermisosUser] = useState(null)
  const [modalDepartamentos, setModalDepartamentos] = useState(false)
  const [modalAuditoria, setModalAuditoria] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await perfilesApi.listarPerfiles()
    if (!error) setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { Promise.resolve().then(() => load()) }, [load])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const s = search.toLowerCase()
      const matchSearch = !s ||
        r.nombre_completo?.toLowerCase().includes(s) ||
        r.correo?.toLowerCase().includes(s)
      const matchFiltro = !filtro || (filtro === 'pendientes' ? !r.activo : !!r.activo)
      return matchSearch && matchFiltro
    })
  }, [rows, search, filtro])

  const stats = useMemo(() => ({
    total:      rows.length,
    pendientes: rows.filter(r => !r.activo).length,
    activos:    rows.filter(r => r.activo).length,
    admins:     rows.filter(r => r.es_admin).length,
  }), [rows])

  const toggleActivo = async (row) => {
    if (row.id === currentUser?.id) return flash('error', 'No puedes desactivar tu propia cuenta.')
    setBusyId(row.id)
    const { error } = await perfilesApi.alternarActivoPerfil(row.id, !row.activo)
    setBusyId(null)
    if (error) return flash('error', 'No se pudo actualizar: ' + error.message)
    flash('success', !row.activo
      ? `${row.nombre_completo || row.correo} fue aprobado y ya puede ingresar.`
      : `${row.nombre_completo || row.correo} fue desactivado.`)
    load()
  }

  const toggleAdmin = async (row) => {
    if (row.id === currentUser?.id) return flash('error', 'No puedes quitarte el rol de administrador a ti mismo.')
    setBusyId(row.id)
    const { error } = await perfilesApi.alternarAdminPerfil(row.id, !row.es_admin)
    setBusyId(null)
    if (error) return flash('error', 'No se pudo actualizar: ' + error.message)
    flash('success', !row.es_admin
      ? `${row.nombre_completo || row.correo} ahora es administrador.`
      : `${row.nombre_completo || row.correo} ya no es administrador.`)
    load()
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <PageTitle icon={TitleIcon}>Gestión de Usuarios y Roles</PageTitle>
          <p>Administra accesos, asigna permisos por empresa (AmeriGlobal / Global Link) y crea departamentos.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setModalAuditoria(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={15} /> Historial de Auditoría
          </button>
          <button className="btn btn-ghost" onClick={() => setModalDepartamentos(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={15} /> Gestionar Departamentos
          </button>
          <button className="btn btn-primary" onClick={() => setModalCrear(true)}>
            <UserPlus size={15} /> Crear usuario
          </button>
        </div>
      </div>

      {modalAuditoria && (
        <ModalAuditLogs
          onClose={() => setModalAuditoria(false)}
        />
      )}

      {modalCrear && (
        <ModalCrearUsuario
          onClose={() => setModalCrear(false)}
          onCreated={() => { setModalCrear(false); flash('success', 'Usuario creado correctamente.'); load() }}
        />
      )}

      {modalPermisosUser && (
        <ModalEditarPermisos
          user={modalPermisosUser}
          onClose={() => setModalPermisosUser(null)}
          onUpdated={() => { setModalPermisosUser(null); flash('success', 'Perfil y permisos actualizados correctamente.'); load() }}
        />
      )}

      {modalDepartamentos && (
        <ModalGestionDepartamentos
          onClose={() => setModalDepartamentos(false)}
        />
      )}

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>
          {msg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />} {msg.text}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value" style={{ color: '#D97706' }}>{stats.pendientes}</div>
          <div className="stat-sub">Esperando aprobación</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Activos</div>
          <div className="stat-value" style={{ color: 'var(--success-text)' }}>{stats.activos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Administradores</div>
          <div className="stat-value" style={{ color: '#7C3AED' }}>{stats.admins}</div>
        </div>
      </div>

      <div className="card">
        <div className="filters-row">
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 160 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control search-input"
              style={{ paddingLeft: 32 }}
              placeholder="Buscar nombre o correo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs" style={{ border: 'none', marginBottom: 0 }}>
            {FILTROS.map(f => (
              <button
                key={f.id}
                className={`tab-btn ${filtro === f.id ? 'tab-btn--active' : ''}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
            {filtered.length} usuario(s)
          </span>
        </div>

        {loading ? (
          <div className="empty-state"><p>Cargando...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <UsersIcon size={32} style={{ color: '#D1D5DB', marginBottom: 8 }} />
            <p>No hay usuarios que coincidan.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Empresas Asignadas</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Rol</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const esYo = row.id === currentUser?.id
                  const ocupado = busyId === row.id
                  const userEmpresas = Array.isArray(row.empresas) && row.empresas.length > 0 ? row.empresas : ['ameriglobal']

                  return (
                    <tr key={row.id}>
                      <td style={{ maxWidth: 240 }}>
                        <PersonCell nombre={row.nombre_completo || '—'}>
                          {esYo && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(tú)</span>}
                        </PersonCell>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Mail size={12} /> {row.correo}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {userEmpresas.includes('ameriglobal') && (
                            <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)', fontSize: 11 }}>
                              🏢 AmeriGlobal
                            </span>
                          )}
                          {userEmpresas.includes('global_link') && (
                            <span className="badge" style={{ background: '#F0FDFA', color: '#0F766E', border: '1px solid #99F6E4', fontSize: 11 }}>
                              🌐 Global Link
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${row.activo ? 'pill-ok' : 'pill-pending'}`}>
                          {row.activo ? 'Activo' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {row.es_admin ? (
                          <span className="badge" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)' }}>
                            <ShieldCheck size={11} style={{ marginRight: 3 }} /> Admin
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                            {row.rol || 'Operativo'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Editar perfil, credenciales, empresas y permisos"
                            onClick={() => setModalPermisosUser(row)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <UserCog size={13} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontSize: 11.5 }}>Editar Perfil</span>
                          </button>

                          <button
                            className="btn btn-sm"
                            style={row.activo
                              ? { background: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'none' }
                              : { background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none' }}
                            disabled={ocupado || (esYo && row.activo)}
                            onClick={() => toggleActivo(row)}
                            title={esYo && row.activo ? 'No puedes desactivar tu propia cuenta' : (row.activo ? 'Desactivar acceso' : 'Aprobar acceso')}
                          >
                            {row.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                            {row.activo ? 'Desactivar' : 'Aprobar'}
                          </button>

                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={ocupado || esYo}
                            onClick={() => toggleAdmin(row)}
                            title={esYo ? 'No puedes cambiar tu propio rol' : (row.es_admin ? 'Quitar admin' : 'Hacer admin')}
                          >
                            <ShieldAlert size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
