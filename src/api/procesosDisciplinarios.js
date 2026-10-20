// =============================================================
// API: Procesos disciplinarios
// Peticiones a Supabase relacionadas con la tabla
// `procesos_disciplinarios` y con el bucket de adjuntos (PDFs).
// Soporta filtrado y asignación por empresa ('ameriglobal' / 'global_link').
// =============================================================
import { supabase } from '../supabaseClient'
import { resolverIdsRelacionales } from './idResolvers'

const TABLA = 'procesos_disciplinarios'

export function listarProcesosDisciplinarios(empresa) {
  let query = supabase.from(TABLA).select('*').order('created_at', { ascending: false })
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Procesos disciplinarios de una dependencia (usado en Productividad). */
export function listarProcesosDisciplinariosPorDepartamento(departamento, empresa) {
  let query = supabase.from(TABLA).select('*').eq('departamento', departamento)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Solo el nombre del empleado (usado en Colaboradores para contar procesos). */
export function listarNombresProcesosDisciplinarios(empresa) {
  let query = supabase.from(TABLA).select('nombre_empleado, empresa')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function crearProcesoDisciplinario(payload, empresa = 'ameriglobal') {
  const empresaFinal = payload.empresa || empresa
  // Aquí el campo de texto se llama 'departamento' (no 'dependencia' como en
  // otras tablas), pero resuelve contra la misma tabla `departamentos`.
  const rel = await resolverIdsRelacionales({
    nombre_empleado: payload.nombre_empleado,
    empresa: empresaFinal,
    dependencia: payload.departamento,
  })
  const empleadoIdFinal = payload.empleado_id || rel.empleado_id
  const departamentoIdFinal = payload.departamento_id || rel.departamento_id
  const empresaIdFinal = payload.empresa_id || rel.empresa_id

  // 1. Guardar el proceso disciplinario en su tabla principal (procesos_disciplinarios)
  const { data: procData, error: procError } = await supabase.from(TABLA).insert([{
    ...payload,
    empresa: empresaFinal,
    empleado_id: empleadoIdFinal,
    departamento_id: departamentoIdFinal,
    empresa_id: empresaIdFinal,
  }]).select()

  if (procError) {
    return { data: null, error: procError, novedad: null, errorNovedad: null }
  }

  // 2. Inmediatamente después, insertar el registro en public.novedades
  const fInicio = payload.fecha_inicio || payload.fecha || new Date().toISOString().split('T')[0]
  const fFin = payload.fecha_fin || fInicio
  const obsUser = payload.observacion ? String(payload.observacion).trim() : ''
  const obsNovedad = obsUser
    ? `Proceso Disciplinario: ${obsUser}`
    : `Proceso Disciplinario: ${payload.concepto}`

  let novData = null
  let novError = null

  try {
    const { data: nData, error: nError } = await supabase.from('novedades').insert([{
      empleado_id: empleadoIdFinal || null,
      nombre_empleado: payload.nombre_empleado,
      concepto: payload.concepto,
      fecha_inicio: fInicio,
      fecha_fin: fFin,
      total_dias: 0,
      periodo: fInicio.slice(0, 7),
      dependencia: payload.departamento || null,
      observacion: obsNovedad,
      empresa: empresaFinal,
      empresa_id: empresaIdFinal || null,
      departamento_id: departamentoIdFinal || null,
    }]).select()

    if (nError) {
      console.error('Error al sincronizar novedad de proceso disciplinario en public.novedades:', nError)
      novError = nError
    } else {
      novData = nData
    }
  } catch (err) {
    console.error('Excepción al insertar novedad en public.novedades:', err)
    novError = err
  }

  return {
    data: procData,
    error: null,
    novedad: novData,
    errorNovedad: novError,
  }
}

export async function actualizarProcesoDisciplinario(id, payload) {
  const dataToUpdate = { ...payload }

  if (payload.nombre_empleado || payload.departamento || payload.empresa) {
    let { nombre_empleado, departamento, empresa } = payload
    if (!nombre_empleado || !departamento || !empresa) {
      const { data: actual } = await supabase
        .from(TABLA)
        .select('nombre_empleado, departamento, empresa')
        .eq('id', id)
        .maybeSingle()
      nombre_empleado = nombre_empleado || actual?.nombre_empleado
      departamento = departamento || actual?.departamento
      empresa = empresa || actual?.empresa
    }
    const { empleado_id, departamento_id, empresa_id } = await resolverIdsRelacionales({
      nombre_empleado, empresa, dependencia: departamento,
    })
    dataToUpdate.empleado_id = empleado_id
    dataToUpdate.departamento_id = departamento_id
    dataToUpdate.empresa_id = empresa_id
  }

  return supabase.from(TABLA).update(dataToUpdate).eq('id', id)
}

export function eliminarProcesoDisciplinario(id) {
  return supabase.from(TABLA).delete().eq('id', id)
}

// ── Adjuntos (Supabase Storage) ─────────────────────────────────────────────

/** Sube un PDF al bucket de adjuntos. `bucket` viene de procesosDisciplinariosConstants. */
export function subirAdjuntoProceso(bucket, path, file) {
  return supabase.storage.from(bucket).upload(path, file, {
    contentType: 'application/pdf', upsert: false,
  })
}

export function eliminarAdjuntoProceso(bucket, path) {
  return supabase.storage.from(bucket).remove([path])
}

/** Genera una URL firmada temporal (segundos) para ver/descargar un adjunto. */
export function obtenerUrlFirmadaAdjunto(bucket, path, segundos = 300) {
  return supabase.storage.from(bucket).createSignedUrl(path, segundos)
}
