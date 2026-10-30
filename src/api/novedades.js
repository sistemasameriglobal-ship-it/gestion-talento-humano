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

// Columnas válidas en la tabla public.novedades de Supabase
const COLUMNAS_PERMITIDAS = new Set([
  'nombre_empleado', 'concepto', 'fecha_inicio', 'fecha_fin', 'total_dias',
  'dependencia', 'observacion', 'observacion_contabilidad', 'validacion_incapacidad',
  'radicacion_incapacidad', 'prorroga', 'nomina_electronica', 'seguridad_social',
  'periodo', 'jornada', 'diagnostico', 'empresa', 'cargo',
  'empleado_id', 'departamento_id', 'empresa_id'
])

function sanitizarPayloadNovedad(obj) {
  const limpio = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (COLUMNAS_PERMITIDAS.has(k)) {
      limpio[k] = v
    }
  }
  return limpio
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

  const rawObj = {
    ...payload,
    periodo: periodoCalculado,
    empresa: empresaFinal,
    empleado_id: payload.empleado_id || rel.empleado_id || null,
    departamento_id: payload.departamento_id || rel.departamento_id || null,
    empresa_id: payload.empresa_id || rel.empresa_id || null,
  }
  delete rawObj.id
  delete rawObj.created_at
  delete rawObj.updated_at
  delete rawObj.dias_en_dinero
  delete rawObj.dias_disfrutados
  delete rawObj.dias_en_periodo

  const cleanPayload = sanitizarPayloadNovedad(rawObj)

  let res = await supabase.from(TABLA).insert([cleanPayload]).select()

  // Fallback seguro si la columna cargo o columnas relacionales aún no existen en la BD
  if (res.error && res.error.message && (
    res.error.message.includes('cargo') ||
    res.error.message.includes('departamento_id') ||
    res.error.message.includes('empresa_id') ||
    res.error.message.includes('empleado_id')
  )) {
    const fallbackPayload = { ...cleanPayload }
    const omitCargo = res.error.message.includes('cargo')
    const omitDep = res.error.message.includes('departamento_id')
    const omitEmp = res.error.message.includes('empresa_id')
    const omitEmpId = res.error.message.includes('empleado_id')

    if (omitCargo) delete fallbackPayload.cargo
    if (omitDep) delete fallbackPayload.departamento_id
    if (omitEmp) delete fallbackPayload.empresa_id
    if (omitEmpId) delete fallbackPayload.empleado_id

    res = await supabase.from(TABLA).insert([fallbackPayload]).select()
  }

  return res
}

/** Busca una novedad existente por empleado + concepto + fecha de inicio (evita duplicados al reflejar vacaciones y movimientos). */
export function buscarNovedadPorEmpleadoConceptoYFecha(nombreEmpleado, concepto, fechaInicio, empresa) {
  let query = supabase
    .from(TABLA)
    .select('id, concepto, observacion, fecha_inicio, empleado_id, nombre_empleado')
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

export async function actualizarNovedad(id, payload, empresa = 'ameriglobal') {
  const rawData = { ...payload }
  delete rawData.id
  delete rawData.created_at
  delete rawData.updated_at
  delete rawData.dias_en_dinero
  delete rawData.dias_disfrutados
  delete rawData.dias_en_periodo

  const empresaFinal = rawData.empresa || empresa

  // Solo recalculamos los ids relacionales si faltan o si se modificó el empleado, dependencia o empresa.
  if (rawData.nombre_empleado || rawData.dependencia || rawData.empresa) {
    let { nombre_empleado, dependencia, empresa: empVal } = rawData
    empVal = empVal || empresaFinal
    if (!nombre_empleado || !dependencia || !empVal) {
      const { data: actual } = await supabase
        .from(TABLA)
        .select('nombre_empleado, dependencia, empresa, empleado_id, departamento_id, empresa_id')
        .eq('id', id)
        .maybeSingle()
      nombre_empleado = nombre_empleado || actual?.nombre_empleado
      dependencia = dependencia || actual?.dependencia
      empVal = empVal || actual?.empresa || empresaFinal
      if (rawData.empleado_id === undefined && actual?.empleado_id) rawData.empleado_id = actual.empleado_id
      if (rawData.departamento_id === undefined && actual?.departamento_id) rawData.departamento_id = actual.departamento_id
      if (rawData.empresa_id === undefined && actual?.empresa_id) rawData.empresa_id = actual.empresa_id
    }
    const rel = await resolverIdsRelacionales({
      nombre_empleado, empresa: empVal, dependencia,
    })
    if (rel.empleado_id) rawData.empleado_id = rel.empleado_id
    else if (rawData.empleado_id === undefined) rawData.empleado_id = payload.empleado_id || null

    if (rel.departamento_id) rawData.departamento_id = rel.departamento_id
    else if (rawData.departamento_id === undefined) rawData.departamento_id = payload.departamento_id || null

    if (rel.empresa_id) rawData.empresa_id = rel.empresa_id
    else if (rawData.empresa_id === undefined) rawData.empresa_id = payload.empresa_id || null
  }

  const dataToUpdate = sanitizarPayloadNovedad(rawData)

  let res = await supabase.from(TABLA).update(dataToUpdate).eq('id', id).select()
  // Fallbacks si la BD aún no tiene cargo o alguna columna relacional
  if (res.error && res.error.message && (
    res.error.message.includes('cargo') ||
    res.error.message.includes('departamento_id') ||
    res.error.message.includes('empresa_id') ||
    res.error.message.includes('empleado_id')
  )) {
    if (res.error.message.includes('cargo')) delete dataToUpdate.cargo
    if (res.error.message.includes('departamento_id')) delete dataToUpdate.departamento_id
    if (res.error.message.includes('empresa_id')) delete dataToUpdate.empresa_id
    if (res.error.message.includes('empleado_id')) delete dataToUpdate.empleado_id
    res = await supabase.from(TABLA).update(dataToUpdate).eq('id', id).select()
  }
  return res
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
