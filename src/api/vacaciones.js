// =============================================================
// API: Vacaciones
// Peticiones a Supabase relacionadas con la tabla `vacaciones`.
// Soporta filtrado y asignación por empresa ('ameriglobal' / 'global_link').
// =============================================================
import { supabase } from '../supabaseClient'
import { resolverIdsRelacionales } from './idResolvers'
import { diasHabilesEntre } from '../utils/diasHabiles'

const TABLA = 'vacaciones'

/** Lista completa de vacaciones de una empresa, más recientes primero. */
export async function listarVacaciones(empresa) {
  try {
    let query = supabase.from(TABLA).select('*').order('fecha_inicio', { ascending: false })
    if (empresa) query = query.eq('empresa', empresa)
    return await query
  } catch (err) {
    console.warn('Error al listar vacaciones:', err)
    return { data: [], error: err }
  }
}

/** Busca vacaciones existentes por empleado + fecha de inicio (para evitar duplicados al importar). */
export async function buscarVacacionPorEmpleadoYFecha(nombreEmpleado, fechaInicio, empresa) {
  try {
    let query = supabase.from(TABLA).select('id').eq('nombre_empleado', nombreEmpleado).eq('fecha_inicio', fechaInicio)
    if (empresa) query = query.eq('empresa', empresa)
    return await query
  } catch (err) {
    console.warn('Error al buscar vacación por empleado y fecha:', err)
    return { data: null, error: err }
  }
}

export async function crearVacacion(payload, empresa = 'ameriglobal') {
  try {
    const empresaFinal = payload.empresa || empresa
    // Igual que antes se guarda nombre_empleado/dependencia/empresa en texto;
    // además buscamos sus ids relacionales para dejar la solicitud conectada.
    const { empleado_id, departamento_id, empresa_id } = await resolverIdsRelacionales({
      nombre_empleado: payload.nombre_empleado,
      empresa: empresaFinal,
      dependencia: payload.dependencia,
    })
    return await supabase.from(TABLA).insert([{
      ...payload,
      empresa: empresaFinal,
      empleado_id,
      departamento_id,
      empresa_id,
    }])
  } catch (err) {
    console.warn('Error al crear vacación:', err)
    return { data: null, error: err }
  }
}

export async function actualizarVacacion(id, payload) {
  try {
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

    return await supabase.from(TABLA).update(dataToUpdate).eq('id', id)
  } catch (err) {
    console.warn('Error al actualizar vacación:', err)
    return { data: null, error: err }
  }
}

/** Actualiza solo el estado (aprobar/rechazar/pendiente) de una solicitud. */
export async function actualizarEstadoVacacion(id, estado) {
  try {
    return await supabase.from(TABLA).update({ estado }).eq('id', id)
  } catch (err) {
    console.warn('Aviso al actualizar estado de vacación:', err)
    return { data: null, error: err }
  }
}

export async function eliminarVacacion(id) {
  try {
    return await supabase.from(TABLA).delete().eq('id', id)
  } catch (err) {
    console.warn('Error al eliminar vacación:', err)
    return { data: null, error: err }
  }
}

/**
 * Recalcula los días de vacaciones en base de datos aplicando la regla 2026
 * (sábados alternados: 1er sábado hábil, 2do no hábil).
 * Devuelve la cantidad de registros actualizados.
 */
export async function recalcularDiasVacaciones2026(empresa) {
  try {
    let query = supabase
      .from(TABLA)
      .select('id, fecha_inicio, fecha_fin, total_dias, periodo_vacaciones, tipo_vacacion')
      .neq('tipo_vacacion', 'Vacaciones en dinero')
    if (empresa) query = query.eq('empresa', empresa)
    const { data, error } = await query
    if (error) throw error

    let actualizados = 0
    for (const r of data || []) {
      if (!r.fecha_inicio || !r.fecha_fin) continue
      const es2026 = (r.periodo_vacaciones && String(r.periodo_vacaciones).includes('2026')) ||
                     String(r.fecha_inicio).startsWith('2026') ||
                     String(r.fecha_fin).startsWith('2026')
      if (!es2026) continue

      const nuevoTotal = diasHabilesEntre(r.fecha_inicio, r.fecha_fin, { periodo: r.periodo_vacaciones })
      if (nuevoTotal !== Number(r.total_dias)) {
        const { error: errorUpdate } = await supabase
          .from(TABLA)
          .update({ total_dias: nuevoTotal })
          .eq('id', r.id)
        if (!errorUpdate) actualizados++
      }
    }
    return { actualizados, error: null }
  } catch (err) {
    console.warn('Error al recalcular vacaciones 2026:', err)
    return { actualizados: 0, error: err }
  }
}

