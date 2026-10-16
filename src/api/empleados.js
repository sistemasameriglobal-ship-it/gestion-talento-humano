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
    .select('id, nombre_completo, activo, fecha_ingreso, fecha_retiro, dependencia, empresa, created_at')
    .order('nombre_completo')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Empleados con solo los campos usados en Vacaciones. */
export function listarEmpleadosParaVacaciones(empresa) {
  let query = supabase
    .from(TABLA)
    .select('id,nombre_completo,dependencia,cargo,activo,empresa,fecha_ingreso,dias_vacaciones_tomados_manual')
    .order('nombre_completo')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Empleados con solo los campos usados en Parqueadero / Procesos disciplinarios. */
export function listarEmpleadosBasico(empresa) {
  let query = supabase.from(TABLA).select('nombre_completo, activo, empresa, dependencia').order('nombre_completo')
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

const CAMPOS_EXPEDIENTE_DETALLADO = [
  'tipo_documento',
  'numero_documento',
  'fecha_nacimiento',
  'tipo_sangre',
  'direccion',
  'barrio',
  'municipio',
  'celular',
  'correo_personal',
  'salario',
  'auxilio_transporte',
  'eps',
  'pension',
  'cesantias',
  'banco',
  'tipo_cuenta',
  'numero_cuenta',
  'contactos_emergencia',
  'fecha_primer_ingreso',
  'fecha_inicio_empresa_actual',
]

function normalizarPayloadEmpleado(payload = {}) {
  const out = { ...payload }
  const strFields = [
    'numero_documento', 'tipo_sangre', 'direccion', 'barrio', 'municipio',
    'celular', 'correo_personal', 'eps', 'pension', 'cesantias', 'banco', 'numero_cuenta',
  ]
  for (const k of strFields) {
    if (k in out) {
      out[k] = typeof out[k] === 'string' ? (out[k].trim() || null) : (out[k] ?? null)
    }
  }
  if ('tipo_documento' in out) out.tipo_documento = out.tipo_documento || 'CC'
  if ('tipo_cuenta' in out) out.tipo_cuenta = out.tipo_cuenta || 'Ahorros'

  const dateFields = ['fecha_ingreso', 'fecha_retiro', 'fecha_nacimiento', 'fecha_primer_ingreso', 'fecha_inicio_empresa_actual']
  for (const k of dateFields) {
    if (k in out) {
      out[k] = out[k] ? String(out[k]).slice(0, 10) : null
    }
  }

  const numFields = ['salario', 'auxilio_transporte', 'dias_vacaciones_tomados_manual']
  for (const k of numFields) {
    if (k in out) {
      out[k] = (out[k] !== '' && out[k] != null) ? (Number(out[k]) || 0) : 0
    }
  }

  if ('contactos_emergencia' in out) {
    out.contactos_emergencia = Array.isArray(out.contactos_emergencia)
      ? out.contactos_emergencia
          .filter(c => c && (c.nombre?.trim() || c.telefono?.trim()))
          .map(c => ({
            nombre: (c.nombre || '').trim(),
            telefono: (c.telefono || '').trim(),
            parentesco: (c.parentesco || '').trim(),
          }))
      : []
  }

  // Asegurar que no viaje ningún campo descartado como dias_familia
  delete out.dias_familia

  return out
}

export async function crearEmpleado(payload, empresa = 'ameriglobal') {
  const cleanPayload = normalizarPayloadEmpleado(payload)
  const empresaFinal = cleanPayload.empresa || empresa
  // Además de guardar 'empresa' y 'dependencia' como texto (igual que antes),
  // buscamos sus ids relacionales para dejar el registro ya conectado.
  const { empresa_id, departamento_id } = await resolverIdsRelacionales({
    empresa: empresaFinal,
    dependencia: cleanPayload.dependencia,
  })
  let res = await supabase.from(TABLA).insert([{
    ...cleanPayload,
    empresa: empresaFinal,
    empresa_id,
    departamento_id,
  }]).select()

  // Fallback seguro si aún no se ha corrido la migración SQL 08 en Supabase
  if (res.error && res.error.message && CAMPOS_EXPEDIENTE_DETALLADO.some(c => res.error.message.includes(c))) {
    const fallbackPayload = { ...cleanPayload }
    CAMPOS_EXPEDIENTE_DETALLADO.forEach(c => delete fallbackPayload[c])
    res = await supabase.from(TABLA).insert([{
      ...fallbackPayload,
      empresa: empresaFinal,
      empresa_id,
      departamento_id,
    }]).select()
  }

  // Si se crea el empleado con éxito, se crea automáticamente su Periodo 1 en empleado_periodos
  // y su novedad contractual de Ingreso
  if (!res.error && res.data?.[0]?.id) {
    const nuevoEmp = res.data[0]
    const fechaIngresoFinal = nuevoEmp.fecha_ingreso || nuevoEmp.fecha_inicio_empresa_actual || new Date().toISOString().split('T')[0]
    await crearPeriodo({
      empleado_id: nuevoEmp.id,
      empresa: empresaFinal,
      empresa_id,
      departamento_id,
      numero_periodo: 1,
      fecha_ingreso: fechaIngresoFinal,
      fecha_retiro: nuevoEmp.fecha_retiro || null,
      cargo: nuevoEmp.cargo || null,
      dependencia: nuevoEmp.dependencia || null,
      es_periodo_actual: nuevoEmp.activo !== false,
      continuidad_laboral: false,
      observaciones: 'Inicio de contrato inicial',
    }).catch(err => {
      console.warn('Nota: no se pudo crear periodo inicial (puede requerir migración SQL):', err)
    })

    // Sincronización automática de evento contractual: Ingreso
    try {
      const periodoMes = fechaIngresoFinal.slice(0, 7)
      const { data: novExistente } = await supabase
        .from('novedades')
        .select('id')
        .eq('concepto', 'Ingreso')
        .eq('empresa', empresaFinal)
        .or(`empleado_id.eq.${nuevoEmp.id},nombre_empleado.eq.${nuevoEmp.nombre_completo}`)
        .limit(1)

      if (!novExistente || novExistente.length === 0) {
        await supabase.from('novedades').insert([{
          concepto: 'Ingreso',
          fecha_inicio: fechaIngresoFinal,
          fecha_fin: fechaIngresoFinal,
          total_dias: 0,
          periodo: periodoMes,
          observacion: 'Registro inicial de ingreso del colaborador',
          empleado_id: nuevoEmp.id,
          nombre_empleado: nuevoEmp.nombre_completo,
          dependencia: nuevoEmp.dependencia || null,
          empresa: empresaFinal,
          empresa_id,
          departamento_id,
        }])
      }
    } catch (novErr) {
      console.warn('Nota: no se pudo registrar novedad de ingreso inicial:', novErr)
    }
  }

  return res
}

export async function actualizarEmpleado(id, payload) {
  const dataToUpdate = normalizarPayloadEmpleado(payload)

  // Solo recalculamos los ids si el update toca 'empresa' o 'dependencia'.
  // Si solo cambia una de las dos, igual hay que re-resolver el departamento
  // completo: la misma dependencia puede existir en más de una empresa.
  if (dataToUpdate.empresa || dataToUpdate.dependencia) {
    let { empresa: empresaParaResolver, dependencia: dependenciaParaResolver } = dataToUpdate
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

  let res = await supabase.from(TABLA).update(dataToUpdate).eq('id', id)
  if (res.error && res.error.message && CAMPOS_EXPEDIENTE_DETALLADO.some(c => res.error.message.includes(c))) {
    const fallbackPayload = { ...dataToUpdate }
    CAMPOS_EXPEDIENTE_DETALLADO.forEach(c => delete fallbackPayload[c])
    res = await supabase.from(TABLA).update(fallbackPayload).eq('id', id)
  }
  return res
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

/**
 * Marca a un empleado inactivo (y su periodo cerrado correspondiente) como liquidado
 * o actualiza el estado de su liquidación contable.
 */
export async function marcarLiquidado(
  empleadoId,
  { periodoId = null, fecha_liquidacion = null, observacion_liquidacion = null, liquidado = true } = {}
) {
  const payload = {
    liquidado: Boolean(liquidado),
    fecha_liquidacion: liquidado ? (fecha_liquidacion || null) : null,
    observacion_liquidacion: observacion_liquidacion?.trim() || null,
  }

  // 1. Actualizar tabla principal public.empleados
  const resEmp = await supabase
    .from(TABLA)
    .update(payload)
    .eq('id', empleadoId)
    .select()

  // 2. Sincronizar también en public.empleado_periodos (si existe periodo cerrado o se indicó periodoId)
  try {
    if (periodoId) {
      await supabase
        .from(TABLA_PERIODOS)
        .update(payload)
        .eq('id', periodoId)
    } else {
      const { data: periodos } = await supabase
        .from(TABLA_PERIODOS)
        .select('id, numero_periodo')
        .eq('empleado_id', empleadoId)
        .order('numero_periodo', { ascending: false })
        .limit(1)
      if (periodos && periodos.length > 0) {
        await supabase
          .from(TABLA_PERIODOS)
          .update(payload)
          .eq('id', periodos[0].id)
      }
    }
  } catch (err) {
    console.warn('Nota: no se pudo actualizar liquidación en empleado_periodos:', err)
  }

  return resEmp
}

