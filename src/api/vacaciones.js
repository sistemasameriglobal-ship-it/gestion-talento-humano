// =============================================================
// API: Vacaciones
// Peticiones a Supabase relacionadas con la tabla `vacaciones`.
// Soporta filtrado y asignación por empresa ('ameriglobal' / 'global_link').
// =============================================================
import { supabase } from '../supabaseClient'
import { resolverIdsRelacionales } from './idResolvers'

const TABLA = 'vacaciones'

/** Lista completa de vacaciones de una empresa, más recientes primero. */
export async function listarVacaciones(empresa) {
  let query = supabase.from(TABLA).select('*').order('fecha_inicio', { ascending: false })
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Busca vacaciones existentes por empleado + fecha de inicio (para evitar duplicados al importar). */
export function buscarVacacionPorEmpleadoYFecha(nombreEmpleado, fechaInicio, empresa) {
  let query = supabase.from(TABLA).select('id').eq('nombre_empleado', nombreEmpleado).eq('fecha_inicio', fechaInicio)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function crearVacacion(payload, empresa = 'ameriglobal') {
  const empresaFinal = payload.empresa || empresa
  // Igual que antes se guarda nombre_empleado/dependencia/empresa en texto;
  // además buscamos sus ids relacionales para dejar la solicitud conectada.
  const { empleado_id, departamento_id, empresa_id } = await resolverIdsRelacionales({
    nombre_empleado: payload.nombre_empleado,
    empresa: empresaFinal,
    dependencia: payload.dependencia,
  })
  return supabase.from(TABLA).insert([{
    ...payload,
    empresa: empresaFinal,
    empleado_id,
    departamento_id,
    empresa_id,
  }])
}

export async function actualizarVacacion(id, payload) {
  const dataToUpdate = { ...payload }

  // Solo recalculamos los ids si el update toca empleado, dependencia o empresa.
  if (payload.nombre_empleado || payload.dependencia || payload.empresa) {
    let { nombre_empleado, dependencia, empresa } = payload
    if (!nombre_empleado || !dependencia || !empresa) {
      const { data: actual } = await supabase
        .from(TABLA)
        .select('nombre_empleado, dependencia, empresa')
        .eq('id', id)
        .maybeSingle()
      nombre_empleado = nombre_empleado || actual?.nombre_empleado
      dependencia = dependencia || actual?.dependencia
      empresa = empresa || actual?.empresa
    }
    const { empleado_id, departamento_id, empresa_id } = await resolverIdsRelacionales({
      nombre_empleado, empresa, dependencia,
    })
    dataToUpdate.empleado_id = empleado_id
    dataToUpdate.departamento_id = departamento_id
    dataToUpdate.empresa_id = empresa_id
  }

  return supabase.from(TABLA).update(dataToUpdate).eq('id', id)
}

/** Actualiza solo el estado (aprobar/rechazar/pendiente) de una solicitud. */
export function actualizarEstadoVacacion(id, estado) {
  return supabase.from(TABLA).update({ estado }).eq('id', id)
}

export function eliminarVacacion(id) {
  return supabase.from(TABLA).delete().eq('id', id)
}
