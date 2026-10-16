// =============================================================
// API: Perfiles
// Peticiones a Supabase relacionadas con la tabla `perfiles`
// (usuarios de la aplicación, distinto de la tabla `empleados`).
// =============================================================
import { supabase } from '../supabaseClient'

const TABLA = 'perfiles'

export function listarPerfiles() {
  return supabase.from(TABLA).select('*').order('created_at', { ascending: false })
}

export function obtenerPerfilPorId(userId) {
  return supabase.from(TABLA).select('*').eq('id', userId).maybeSingle()
}

/** Cuenta cuántos perfiles siguen inactivos (pendientes de aprobación), sin traer las filas. */
export function contarPerfilesPendientes() {
  return supabase.from(TABLA).select('*', { count: 'exact', head: true }).eq('activo', false)
}

export function actualizarPerfil(id, payload) {
  return supabase.from(TABLA).update(payload).eq('id', id)
}

export function activarPerfil(id, activo, esAdmin, empresas = ['ameriglobal'], permisos = { ameriglobal: ['all'] }, rol = 'operativo') {
  return supabase.from(TABLA).update({
    activo,
    es_admin: esAdmin,
    empresas,
    permisos,
    rol,
  }).eq('id', id)
}

export function alternarActivoPerfil(id, activo) {
  return supabase.from(TABLA).update({ activo }).eq('id', id)
}

export function alternarAdminPerfil(id, esAdmin) {
  return supabase.from(TABLA).update({ es_admin: esAdmin }).eq('id', id)
}

export function actualizarNombrePerfil(id, nombreCompleto) {
  return supabase.from(TABLA).update({ nombre_completo: nombreCompleto }).eq('id', id)
}

export function actualizarPermisosYEmpresasPerfil(id, { empresas, permisos, rol, es_admin, activo }) {
  const payload = {}
  if (empresas !== undefined) payload.empresas = empresas
  if (permisos !== undefined) payload.permisos = permisos
  if (rol !== undefined) payload.rol = rol
  if (es_admin !== undefined) payload.es_admin = es_admin
  if (activo !== undefined) payload.activo = activo
  return supabase.from(TABLA).update(payload).eq('id', id)
}

/**
 * Actualiza el perfil de un usuario/operador por parte del administrador.
 * Intenta primero mediante la función RPC 'admin_actualizar_usuario' para actualizar
 * tanto perfiles como auth.users (correo, contraseña y confirmación), y tiene
 * fallback automático a la tabla `perfiles`.
 */
export async function adminActualizarUsuario(id, payload) {
  const {
    nombre_completo,
    correo,
    password,
    rol,
    es_admin,
    activo,
    empresas,
    permisos,
  } = payload

  // 1. Intentar por RPC de administración
  try {
    const { error: rpcErr } = await supabase.rpc('admin_actualizar_usuario', {
      target_user_id: id,
      p_nombre_completo: nombre_completo,
      p_correo: correo,
      p_password: password || null,
      p_rol: rol,
      p_es_admin: es_admin,
      p_activo: activo,
      p_empresas: empresas,
      p_permisos: permisos,
    })
    if (!rpcErr) return { error: null }
  } catch {
    // Si la función RPC aún no está creada en Supabase, pasamos al fallback directo
  }

  // 2. Fallback: actualización directa de la tabla perfiles
  const updateData = {}
  if (nombre_completo !== undefined) updateData.nombre_completo = nombre_completo
  if (correo !== undefined) updateData.correo = correo
  if (rol !== undefined) updateData.rol = rol
  if (es_admin !== undefined) updateData.es_admin = es_admin
  if (activo !== undefined) updateData.activo = activo
  if (empresas !== undefined) updateData.empresas = empresas
  if (permisos !== undefined) updateData.permisos = permisos

  return supabase.from(TABLA).update(updateData).eq('id', id)
}

/**
 * Confirma el correo en auth.users y activa el perfil en public.perfiles
 */
export async function confirmarYActivarUsuario(id) {
  try {
    const { error } = await supabase.rpc('admin_confirmar_usuario', { target_user_id: id })
    if (!error) return { error: null }
  } catch {
    // Si no existe el RPC, se maneja con la actualización normal
  }
  return supabase.from(TABLA).update({ activo: true }).eq('id', id)
}

