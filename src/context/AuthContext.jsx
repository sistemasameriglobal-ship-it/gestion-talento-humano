import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import * as authApi from '../api/auth'
import * as perfilesApi from '../api/perfiles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]           = useState(null)
  const [perfil, setPerfil]             = useState(null)
  const [loading, setLoading]           = useState(true)       // carga inicial de sesión
  const [perfilLoading, setPerfilLoading] = useState(false)     // carga del perfil tras login
  const [recoveryMode, setRecoveryMode] = useState(false)       // viene de un link de "olvidé mi contraseña"
  const mounted = useRef(true)

  const loadPerfil = useCallback(async (userId) => {
    if (!userId) { setPerfil(null); return }
    setPerfilLoading(true)
    const { data, error } = await perfilesApi.obtenerPerfilPorId(userId)
    if (mounted.current) {
      setPerfil(error ? null : data)
      setPerfilLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    authApi.obtenerSesion().then(({ data }) => {
      if (!mounted.current) return
      const s = data?.session ?? null
      setSession(s)
      if (s?.user) loadPerfil(s.user.id)
      setLoading(false)
    }).catch(err => {
      console.warn('No se pudo verificar la sesión inicial:', err?.message || err)
      if (mounted.current) setLoading(false)
    })

    const { data: listener } = authApi.suscribirseACambiosDeSesion((event, newSession) => {
      if (!mounted.current) return
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (newSession?.user) loadPerfil(newSession.user.id)
      else setPerfil(null)
      setLoading(false)
    })

    return () => {
      mounted.current = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [loadPerfil])

  // ── Acciones ────────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    const { error } = await authApi.iniciarSesion(email.trim().toLowerCase(), password)
    return { error }
  }

  const signUp = async (email, password, nombreCompleto) => {
    const { data, error } = await authApi.registrarUsuario(email.trim().toLowerCase(), password, nombreCompleto.trim())
    return { data, error }
  }

  const signOut = async () => {
    await authApi.cerrarSesion()
    setPerfil(null)
  }

  const resetPassword = async (email) => {
    const { error } = await authApi.enviarCorreoRecuperacion(email.trim().toLowerCase(), window.location.origin)
    return { error }
  }

  const updatePassword = async (newPassword) => {
    const { error } = await authApi.actualizarPassword(newPassword)
    return { error }
  }

  const updateNombre = async (nombreCompleto) => {
    if (!session?.user) return { error: new Error('No hay sesión activa') }
    const { error } = await perfilesApi.actualizarNombrePerfil(session.user.id, nombreCompleto.trim())
    if (!error) await loadPerfil(session.user.id)
    return { error }
  }

  const refreshPerfil = useCallback(() => {
    if (session?.user) return loadPerfil(session.user.id)
  }, [session, loadPerfil])

  const clearRecoveryMode = () => setRecoveryMode(false)

  const value = {
    session,
    user: session?.user || null,
    perfil,
    isAdmin: !!perfil?.es_admin,
    isActivo: !!perfil?.activo,
    loading,
    perfilLoading,
    recoveryMode,
    clearRecoveryMode,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateNombre,
    refreshPerfil,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
