// =============================================================
// API: Empleados
// Todas las peticiones a Supabase relacionadas con la tabla
// `empleados` viven aquí. Las páginas/hooks solo importan estas
// funciones y nunca llaman a `supabase` directamente.
// Soporta filtrado y asignación por empresa ('ameriglobal' / 'global_link').
// =============================================================
import { supabase } from '../supabaseClient'
import { resolverIdsRelacionales } from './idResolvers'

const TABLA = 'empleados'

/** Lista completa de empleados de una empresa, ordenados por nombre. */
export function listarEmpleados(empresa) {
  let query = supabase.from(TABLA).select('*').order('nombre_completo', { ascending: true })
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Empleados con solo los campos usados en Novedades (más liviano). */
export function listarEmpleadosParaNovedades(empresa) {
  let query = supabase
    .from(TABLA)
    .select('nombre_completo, activo, fecha_ingreso, fecha_retiro, dependencia, empresa')
    .order('nombre_completo')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Empleados con solo los campos usados en Vacaciones. */
export function listarEmpleadosParaVacaciones(empresa) {
  let query = supabase
    .from(TABLA)
    .select('id,nombre_completo,dependencia,cargo,activo,empresa,fecha_ingreso')
    .order('nombre_completo')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Empleados con solo los campos usados en Parqueadero / Procesos disciplinarios. */
export function listarEmpleadosBasico(empresa) {
  let query = supabase.from(TABLA).select('nombre_completo, activo, empresa').order('nombre_completo')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Empleados con el campo tiene_vehiculo, usado en Colaboradores. */
export function listarEmpleadosParaColaboradores(empresa) {
  let query = supabase
    .from(TABLA)
    .select('nombre_completo, activo, tiene_vehiculo, empresa')
    .order('nombre_completo')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Empleados activos de una dependencia específica (usado en Productividad). */
export function listarEmpleadosActivosPorDependencia(dependencia, empresa) {
  let query = supabase.from(TABLA).select('*').eq('dependencia', dependencia).neq('activo', false)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function crearEmpleado(payload, empresa = 'ameriglobal') {
  const empresaFinal = payload.empresa || empresa
  // Además de guardar 'empresa' y 'dependencia' como texto (igual que antes),
  // buscamos sus ids relacionales para dejar el registro ya conectado.
  const { empresa_id, departamento_id } = await resolverIdsRelacionales({
    empresa: empresaFinal,
    dependencia: payload.dependencia,
  })
  const res = await supabase.from(TABLA).insert([{
    ...payload,
    empresa: empresaFinal,
    empresa_id,
    departamento_id,
  }]).select()

  // Si se crea el empleado con éxito, se crea automáticamente su Periodo 1 en empleado_periodos
  if (!res.error && res.data?.[0]?.id) {
    const nuevoEmp = res.data[0]
    await crearPeriodo({
      empleado_id: nuevoEmp.id,
      empresa: empresaFinal,
      empresa_id,
      departamento_id,
      numero_periodo: 1,
      fecha_ingreso: nuevoEmp.fecha_ingreso || new Date().toISOString().split('T')[0],
      fecha_retiro: nuevoEmp.fecha_retiro || null,
      cargo: nuevoEmp.cargo || null,
      dependencia: nuevoEmp.dependencia || null,
      es_periodo_actual: nuevoEmp.activo !== false,
      observaciones: 'Inicio de contrato inicial',
    }).catch(err => {
      console.warn('Nota: no se pudo crear periodo inicial (puede requerir migración SQL):', err)
    })
  }

  return res
}

export async function actualizarEmpleado(id, payload) {
  const dataToUpdate = { ...payload }

  // Solo recalculamos los ids si el update toca 'empresa' o 'dependencia'.
  // Si solo cambia una de las dos, igual hay que re-resolver el departamento
  // completo: la misma dependencia puede existir en más de una empresa.
  if (payload.empresa || payload.dependencia) {
    let { empresa: empresaParaResolver, dependencia: dependenciaParaResolver } = payload
    if (!empresaParaResolver || !dependenciaParaResolver) {
      const { data: actual } = await supabase
        .from(TABLA)
        .select('empresa, dependencia')
        .eq('id', id)
        .maybeSingle()
      empresaParaResolver = empresaParaResolver || actual?.empresa
      dependenciaParaResolver = dependenciaParaResolver || actual?.dependencia
    }
    const { empresa_id, departamento_id } = await resolverIdsRelacionales({
      empresa: empresaParaResolver,
      dependencia: dependenciaParaResolver,
    })
    dataToUpdate.empresa_id = empresa_id
    dataToUpdate.departamento_id = departamento_id
  }

  return supabase.from(TABLA).update(dataToUpdate).eq('id', id)
}

export function eliminarEmpleado(id) {
  return supabase.from(TABLA).delete().eq('id', id)
}

// =============================================================
// GESTIÓN DE PERIODOS LABORALES (empleado_periodos)
// =============================================================
const TABLA_PERIODOS = 'empleado_periodos'

/** Lista todos los periodos laborales de un empleado ordenados cronológicamente. */
export async function listarPeriodosEmpleado(empleadoId) {
  try {
    const { data, error } = await supabase
      .from(TABLA_PERIODOS)
      .select('*')
      .eq('empleado_id', empleadoId)
      .order('numero_periodo', { ascending: true })
    if (error) {
      console.warn('Error al listar periodos del empleado:', error.message)
      return { data: [], error }
    }
    return { data: data || [], error: null }
  } catch (err) {
    return { data: [], error: err }
  }
}

/** Obtiene el periodo laboral vigente (activo) de un empleado. */
export async function obtenerPeriodoActivo(empleadoId) {
  try {
    const { data, error } = await supabase
      .from(TABLA_PERIODOS)
      .select('*')
      .eq('empleado_id', empleadoId)
      .eq('es_periodo_actual', true)
      .maybeSingle()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

/** Cierra un periodo laboral registrando fecha de retiro y observaciones. */
export async function cerrarPeriodo(periodoId, { fecha_retiro, observaciones }) {
  try {
    const { data, error } = await supabase
      .from(TABLA_PERIODOS)
      .update({
        fecha_retiro,
        observaciones,
        es_periodo_actual: false,
      })
      .eq('id', periodoId)
      .select()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

/** Crea un nuevo periodo laboral para un empleado (reintegro o alta). */
export async function crearPeriodo(payload) {
  try {
    const empresaFinal = payload.empresa || 'ameriglobal'
    let { empresa_id, departamento_id } = payload
    if (!empresa_id || !departamento_id) {
      const res = await resolverIdsRelacionales({
        empresa: empresaFinal,
        dependencia: payload.dependencia,
      })
      empresa_id = empresa_id || res.empresa_id
      departamento_id = departamento_id || res.departamento_id
    }

    const { data, error } = await supabase
      .from(TABLA_PERIODOS)
      .insert([{
        ...payload,
        empresa: empresaFinal,
        empresa_id,
        departamento_id,
      }])
      .select()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

/** Lista todos los periodos de los empleados de una empresa (usado en Dashboard/Empleados). */
export async function listarTodosLosPeriodos(empresa) {
  try {
    let query = supabase
      .from(TABLA_PERIODOS)
      .select('*')
      .order('fecha_ingreso', { ascending: true })
    if (empresa) query = query.eq('empresa', empresa)
    const { data, error } = await query
    if (error) {
      console.warn('empleado_periodos aún no disponible o error:', error.message)
      return { data: [], error }
    }
    return { data: data || [], error: null }
  } catch (err) {
    console.warn('Error al listar todos los periodos:', err)
    return { data: [], error: err }
  }
}
