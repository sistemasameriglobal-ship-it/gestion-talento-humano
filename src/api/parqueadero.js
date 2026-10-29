// =============================================================
// API: Parqueadero
// Peticiones a Supabase relacionadas con la tabla
// `registros_parqueadero`.
// Soporta filtrado y asignación por empresa ('ameriglobal' / 'global_link').
// =============================================================
import { supabase } from '../supabaseClient'
import { resolverIdsRelacionales, resolverIdsEnLote } from './idResolvers'

const TABLA = 'registros_parqueadero'

export function listarRegistrosParqueadero(empresa) {
  let query = supabase.from(TABLA).select('*').order('id', { ascending: false })
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function crearRegistroParqueadero(payload, empresa = 'ameriglobal') {
  const empresaFinal = payload.empresa || empresa
  const tipoFinal = payload.tipo ? String(payload.tipo).trim().toUpperCase() : payload.tipo
  // registros_parqueadero no tiene columna de departamento, por eso solo
  // se resuelven empleado_id y empresa_id.
  const { empleado_id, empresa_id } = await resolverIdsRelacionales({
    nombre_empleado: payload.nombre_empleado,
    empresa: empresaFinal,
  })
  return supabase.from(TABLA).insert([{
    ...payload,
    tipo: tipoFinal,
    empresa: empresaFinal,
    empleado_id,
    empresa_id,
  }])
}

/** Inserta varios registros a la vez (usado al duplicar/copiar registros). */
export async function crearRegistrosParqueadero(payloads, empresa = 'ameriglobal') {
  const formateados = await resolverIdsEnLote(payloads, empresa)
  return supabase.from(TABLA).insert(formateados)
}

export async function actualizarRegistroParqueadero(id, payload) {
  const dataToUpdate = { ...payload }
  if (dataToUpdate.tipo) {
    dataToUpdate.tipo = String(dataToUpdate.tipo).trim().toUpperCase()
  }

  if (payload.nombre_empleado || payload.empresa) {
    let { nombre_empleado, empresa } = payload
    if (!nombre_empleado || !empresa) {
      const { data: actual } = await supabase
        .from(TABLA)
        .select('nombre_empleado, empresa')
        .eq('id', id)
        .maybeSingle()
      nombre_empleado = nombre_empleado || actual?.nombre_empleado
      empresa = empresa || actual?.empresa
    }
    const { empleado_id, empresa_id } = await resolverIdsRelacionales({ nombre_empleado, empresa })
    dataToUpdate.empleado_id = empleado_id
    dataToUpdate.empresa_id = empresa_id
  }

  return supabase.from(TABLA).update(dataToUpdate).eq('id', id)
}

export function eliminarRegistroParqueadero(id) {
  return supabase.from(TABLA).delete().eq('id', id)
}
