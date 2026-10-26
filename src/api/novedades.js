// =============================================================
// API: Novedades
// Peticiones a Supabase relacionadas con la tabla `novedades`.
// Soporta filtrado y asignación por empresa ('ameriglobal' / 'global_link').
// =============================================================
import { supabase } from '../supabaseClient'
import { diasHabilesEntre } from '../utils/diasHabiles'
import { resolverIdsRelacionales } from './idResolvers'

const TABLA = 'novedades'

/** Lista completa de novedades de una empresa, más recientes primero. */
export function listarNovedades(empresa) {
  let query = supabase.from(TABLA).select('*').order('fecha_inicio', { ascending: false })
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Todas las novedades sin filtros (usado en Dashboard/Informe/Colaboradores). */
export function listarNovedadesCompleto(empresa) {
  let query = supabase.from(TABLA).select('*')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function crearNovedad(payload, empresa = 'ameriglobal') {
  const empresaFinal = payload.empresa || empresa
  // Igual que antes se guarda nombre_empleado/dependencia/empresa en texto;
  // además buscamos sus ids relacionales para dejar la novedad conectada.
  const rel = await resolverIdsRelacionales({
    nombre_empleado: payload.nombre_empleado,
    empresa: empresaFinal,
    dependencia: payload.dependencia,
  })

  // 'periodo' es NOT NULL en public.novedades. Si no viene especificado, se calcula a partir de fecha_inicio o mes actual.
  const fInicio = payload.fecha_inicio || payload.fecha_fin || new Date().toISOString().split('T')[0]
  const periodoCalculado = (payload.periodo != null && String(payload.periodo).trim() !== '')
    ? String(payload.periodo).trim()
    : String(fInicio).slice(0, 7)

  const cleanPayload = { ...payload }
  delete cleanPayload.dias_en_dinero
  delete cleanPayload.dias_disfrutados

  return supabase.from(TABLA).insert([{
    ...cleanPayload,
    periodo: periodoCalculado,
    empresa: empresaFinal,
    empleado_id: payload.empleado_id || rel.empleado_id,
    departamento_id: payload.departamento_id || rel.departamento_id,
    empresa_id: payload.empresa_id || rel.empresa_id,
  }]).select()
}

/** Busca una novedad existente por empleado + concepto + fecha de inicio (evita duplicados al reflejar vacaciones). */
export function buscarNovedadPorEmpleadoConceptoYFecha(nombreEmpleado, concepto, fechaInicio, empresa) {
  let query = supabase
    .from(TABLA)
    .select('id')
    .eq('nombre_empleado', nombreEmpleado)
    .eq('concepto', concepto)
  if (fechaInicio) query = query.eq('fecha_inicio', fechaInicio)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Busca novedades de movimientos contractuales para un colaborador en una fecha determinada. */
export function buscarNovedadesContractualesPorFecha(nombreEmpleado, fechaInicio, empresa) {
  const CONCEPTOS_MOV = ['Ascenso', 'Cambio de Área', 'Cambio de Cargo', 'Ajuste Salarial', 'Paso a Etapa Productiva', 'Ingreso']
  let query = supabase
    .from(TABLA)
    .select('id, concepto, observacion, fecha_inicio, empleado_id, nombre_empleado')
    .eq('nombre_empleado', nombreEmpleado)
    .in('concepto', CONCEPTOS_MOV)
  if (fechaInicio) query = query.eq('fecha_inicio', fechaInicio)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Busca todas las novedades de un concepto específico para un colaborador. */
export function buscarNovedadesPorEmpleadoYConcepto(nombreEmpleado, concepto, empresa) {
  let query = supabase
    .from(TABLA)
    .select('id, fecha_inicio, fecha_fin, periodo')
    .eq('concepto', concepto)
    .eq('nombre_empleado', nombreEmpleado)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function actualizarNovedad(id, payload) {
  const dataToUpdate = { ...payload }
  delete dataToUpdate.dias_en_dinero
  delete dataToUpdate.dias_disfrutados

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

  return supabase.from(TABLA).update(dataToUpdate).eq('id', id).select()
}

/** Actualiza un solo campo de una novedad (edición inline en la tabla). */
export function actualizarCampoNovedad(id, field, value) {
  return supabase.from(TABLA).update({ [field]: value }).eq('id', id)
}

export function eliminarNovedad(id) {
  return supabase.from(TABLA).delete().eq('id', id)
}

/**
 * Recalcula los días de TODAS las novedades con concepto "Vacaciones",
 * usando días hábiles en vez de días de calendario.
 * Devuelve la cantidad de registros actualizados.
 */
export async function recalcularDiasVacaciones(empresa) {
  let query = supabase
    .from(TABLA)
    .select('id, fecha_inicio, fecha_fin, total_dias')
    .eq('concepto', 'Vacaciones')
  if (empresa) query = query.eq('empresa', empresa)
  const { data, error } = await query
  if (error) throw error

  let actualizados = 0
  for (const r of data || []) {
    if (!r.fecha_inicio || !r.fecha_fin) continue
    const nuevoTotal = diasHabilesEntre(r.fecha_inicio, r.fecha_fin)
    if (nuevoTotal !== r.total_dias) {
      const { error: errorUpdate } = await supabase
        .from(TABLA)
        .update({ total_dias: nuevoTotal })
        .eq('id', r.id)
      if (!errorUpdate) actualizados++
    }
  }
  return actualizados
}
