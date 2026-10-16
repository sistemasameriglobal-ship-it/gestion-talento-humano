// =============================================================
// API: Autenticación
// Peticiones a Supabase Auth (sesión, login, registro, contraseña).
// =============================================================
import { supabase } from '../supabaseClient'

export function obtenerSesion() {
  return supabase.auth.getSession()
}

export function suscribirseACambiosDeSesion(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

export function iniciarSesion(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function registrarUsuario(email, password, nombreCompleto, extraMetadata = {}) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre_completo: nombreCompleto,
        ...extraMetadata,
      },
    },
  })
}

export function cerrarSesion() {
  return supabase.auth.signOut()
}

/** Restaura una sesión previamente guardada (usado al crear un usuario nuevo desde el panel de admin). */
export function restaurarSesion(accessToken, refreshToken) {
  return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
}

export function enviarCorreoRecuperacion(email, redirectTo) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

export function actualizarPassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword })
}
