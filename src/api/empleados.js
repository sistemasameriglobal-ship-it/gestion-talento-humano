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

/** Empleados con los campos usados en Novedades (incluye numero_documento). */
export async function listarEmpleadosParaNovedades(empresa) {
  try {
    let query = supabase
      .from(TABLA)
      .select('id, nombre_completo, numero_documento, cargo, activo, fecha_ingreso, fecha_inicio_empresa_actual, fecha_primer_ingreso, fecha_retiro, dependencia, empresa, created_at')
      .order('nombre_completo')
    if (empresa) query = query.eq('empresa', empresa)
    return await query
  } catch (err) {
    console.warn('Error al listar empleados para novedades:', err)
    return { data: [], error: err }
  }
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

/** Empleados con los campos usados en Parqueadero / Procesos disciplinarios. */
export async function listarEmpleadosBasico(empresa) {
  try {
    let query = supabase
      .from(TABLA)
      .select('id, nombre_completo, activo, empresa, dependencia, numero_documento, celular')
      .order('nombre_completo')
    if (empresa) query = query.eq('empresa', empresa)
    return await query
  } catch (err) {
    console.warn('Error al listar empleados básico:', err)
    return { data: [], error: err }
  }
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
  'fecha_terminacion_anterior',
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

  const dateFields = ['fecha_ingreso', 'fecha_retiro', 'fecha_nacimiento', 'fecha_primer_ingreso', 'fecha_terminacion_anterior', 'fecha_inicio_empresa_actual']
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
    const fechaIngresoFinal = cleanPayload.fecha_ingreso || cleanPayload.fecha_inicio_empresa_actual || nuevoEmp.fecha_ingreso || nuevoEmp.fecha_inicio_empresa_actual || cleanPayload.fecha_primer_ingreso || null
    if (fechaIngresoFinal) {
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

export async function eliminarEmpleado(id, nombreCompleto = null) {
  try {
    if (id) {
      await supabase.from('empleado_periodos').delete().eq('empleado_id', id)
      await supabase.from('novedades').delete().eq('empleado_id', id)
      await supabase.from('vacaciones').delete().eq('empleado_id', id)
      await supabase.from('procesos_disciplinarios').delete().eq('empleado_id', id)
      await supabase.from('productividad').delete().eq('empleado_id', id)
      await supabase.from('productividad_resumen').delete().eq('empleado_id', id)
      await supabase.from('cierre_meses').delete().eq('empleado_id', id)
    }
    if (nombreCompleto) {
      await supabase.from('novedades').delete().ilike('nombre_empleado', nombreCompleto)
      await supabase.from('vacaciones').delete().ilike('nombre_empleado', nombreCompleto)
      await supabase.from('procesos_disciplinarios').delete().ilike('nombre_empleado', nombreCompleto)
      await supabase.from('productividad').delete().ilike('nombre_empleado', nombreCompleto)
      await supabase.from('productividad_resumen').delete().ilike('nombre_empleado', nombreCompleto)
      await supabase.from('cierre_meses').delete().ilike('nombre_empleado', nombreCompleto)
      await supabase.from('registros_parqueadero').delete().ilike('nombre_empleado', nombreCompleto)
    }
  } catch (errRel) {
    console.warn('Nota al eliminar dependencias de empleado:', errRel)
  }
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

/**
 * Actualiza datos del periodo vigente (ej. cargo en transición a Etapa Productiva)
 * SIN cerrarlo ni registrar fecha de retiro.
 */
export async function actualizarPeriodoActivo(empleadoId, campos) {
  try {
    const { data, error } = await supabase
      .from(TABLA_PERIODOS)
      .update(campos)
      .eq('empleado_id', empleadoId)
      .eq('es_periodo_actual', true)
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
 * Revierte el último periodo laboral creado (ej. un ascenso, ajuste salarial o movimiento registrado por error):
 * 1. Elimina el registro del periodo en empleado_periodos
 * 2. En el periodo anterior: actualiza fecha_retiro = null, restaura observaciones y lo marca como vigente (es_periodo_actual = true)
 * 3. En el empleado principal: restaura cargo, dependencia y salario previo
 * 4. Elimina la novedad generada en public.novedades asociada a ese movimiento
 */
export async function revertirUltimoPeriodo({
  empleado,
  periodoAEliminar,
  periodoAnterior,
}) {
  try {
    if (!periodoAEliminar?.id || !periodoAnterior?.id || !empleado?.id) {
      throw new Error('Parámetros insuficientes para revertir el periodo.')
    }

    // 1. Eliminar el periodo vigente de empleado_periodos
    const { error: errDel } = await supabase
      .from(TABLA_PERIODOS)
      .delete()
      .eq('id', periodoAEliminar.id)

    if (errDel) throw errDel

    // 2. Restaurar el periodo anterior como vigente y COMPLETAMENTE limpio:
    //    sin fecha de retiro, sin motivo de retiro y sin notas residuales de transición
    //    (ej. "Ajuste salarial contractual (Otrossí)") en la columna Detalles.
    const limpiezaBase = {
      es_periodo_actual: true,
      fecha_retiro: null,
      observaciones: null,
    }

    let { error: errUpdatePrev } = await supabase
      .from(TABLA_PERIODOS)
      .update({ ...limpiezaBase, motivo_retiro: null })
      .eq('id', periodoAnterior.id)

    // Compatibilidad: si la columna motivo_retiro no existe en empleado_periodos, reintentar sin ella
    if (errUpdatePrev && /motivo_retiro/i.test(errUpdatePrev.message || '')) {
      ({ error: errUpdatePrev } = await supabase
        .from(TABLA_PERIODOS)
        .update(limpiezaBase)
        .eq('id', periodoAnterior.id))
    }

    if (errUpdatePrev) throw errUpdatePrev

    // 3. Restaurar cargo, dependencia y salario del empleado principal
    const updateEmpPayload = {
      cargo: periodoAnterior.cargo || null,
      dependencia: periodoAnterior.dependencia || null,
      fecha_retiro: null,
      activo: true,
    }

    // Si en observaciones del periodo eliminado se guardó el salario anterior:
    // Formato: "[Salario anterior: $2.500.000]" o "Salario anterior: 2500000"
    if (periodoAEliminar.observaciones) {
      const matchSal = periodoAEliminar.observaciones.match(/Salario anterior:\s*\$?([\d.,]+)/i)
      if (matchSal && matchSal[1]) {
        const salNum = Number(matchSal[1].replace(/[.,]/g, ''))
        if (!isNaN(salNum) && salNum >= 0) {
          updateEmpPayload.salario = salNum
        }
      }
    }

    const { error: errEmp } = await supabase
      .from('empleados')
      .update(updateEmpPayload)
      .eq('id', empleado.id)

    if (errEmp) console.warn('Advertencia al restaurar cargo/salario del empleado:', errEmp)

    // 4. Eliminar la novedad generada en public.novedades (asociada a ese ascenso/aumento/movimiento)
    if (periodoAEliminar.fecha_ingreso) {
      const conceptosMovimiento = ['Ascenso', 'Cambio de Cargo', 'Cambio de Área', 'Ajuste Salarial', 'Ingreso', 'Otros', 'Otro']
      
      let query = supabase
        .from('novedades')
        .delete()
        .eq('fecha_inicio', periodoAEliminar.fecha_ingreso)
        .in('concepto', conceptosMovimiento)

      if (empleado.id) {
        query = query.eq('empleado_id', empleado.id)
      } else {
        query = query.eq('nombre_empleado', empleado.nombre_completo)
      }
      
      const { error: errNov } = await query
      if (errNov) {
        console.warn('Advertencia al eliminar novedad asociada al movimiento:', errNov)
      }
    }

    return { error: null }
  } catch (err) {
    console.error('Error al revertir periodo laboral:', err)
    return { error: err }
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

/**
 * Ejecuta la Sustitución Patronal (cambio de razón social) de un empleado:
 * 1. Conserva la fecha de ingreso original y toda la antigüedad laboral.
 * 2. Actualiza la empresa en `empleados`.
 * 3. Cierra el periodo actual y abre el nuevo periodo en la empresa destino (continuidad_laboral = true).
 * 4. Migra todas las `novedades` del empleado a la empresa destino e inserta la novedad 'Sustitución Patronal'.
 * 5. Migra el historial de `procesos_disciplinarios` a la empresa destino.
 * 6. Migra los registros de `productividad` a la empresa destino.
 * 7. Migra las solicitudes y saldos de `vacaciones` a la empresa destino.
 * 8. Migra los registros de `parqueadero` si existen.
 */
export async function ejecutarSustitucionPatronal(empleado, {
  empresa_destino,
  fecha_sustitucion,
  dependencia,
  cargo,
  observaciones,
}) {
  const empresaOrigen = empleado.empresa || 'ameriglobal'
  const empresaDestino = empresa_destino
  const fechaEfectiva = fecha_sustitucion || new Date().toISOString().split('T')[0]
  const depFinal = dependencia || empleado.dependencia || null
  const cargoFinal = cargo || empleado.cargo || null
  const obsFinal = observaciones?.trim() || `Sustitución patronal de ${empresaOrigen} hacia ${empresaDestino}. Conserva antigüedad, fecha de ingreso original e historial integral.`

  // 1. Intentar primero ejecutar vía RPC si existe en PostgreSQL
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('ejecutar_sustitucion_patronal', {
      p_empleado_id: empleado.id,
      p_empresa_destino: empresaDestino,
      p_fecha_sustitucion: fechaEfectiva,
      p_dependencia: depFinal,
      p_cargo: cargoFinal,
      p_observaciones: obsFinal,
    })
    if (!rpcErr && rpcData?.success) {
      return { data: rpcData, error: null }
    }
  } catch {
    // Si no está la función RPC, proceder con fallback directo
  }

  // 2. Fallback: Ejecución directa en tablas Supabase
  try {
    // 2.1 Actualizar registro principal en public.empleados
    const { data: empActualizado, error: errEmp } = await supabase
      .from(TABLA)
      .update({
        empresa: empresaDestino,
        dependencia: depFinal,
        cargo: cargoFinal,
        activo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', empleado.id)
      .select()
      .single()

    if (errEmp) throw errEmp

    // 2.2 Cerrar periodo anterior y crear nuevo periodo con continuidad laboral
    const { data: periodosActivos } = await supabase
      .from(TABLA_PERIODOS)
      .select('id')
      .eq('empleado_id', empleado.id)
      .eq('es_periodo_actual', true)

    if (periodosActivos && periodosActivos.length > 0) {
      await supabase
        .from(TABLA_PERIODOS)
        .update({
          fecha_retiro: fechaEfectiva,
          motivo_retiro: 'Sustitución Patronal',
          observaciones: `Sustitución patronal hacia ${empresaDestino}`,
          es_periodo_actual: false,
        })
        .eq('id', periodosActivos[0].id)
    }

    await supabase
      .from(TABLA_PERIODOS)
      .insert([{
        empleado_id: empleado.id,
        empresa: empresaDestino,
        dependencia: depFinal,
        cargo: cargoFinal,
        fecha_ingreso: fechaEfectiva,
        fecha_primer_ingreso: empleado.fecha_primer_ingreso || empleado.fecha_ingreso,
        es_periodo_actual: true,
        continuidad_laboral: true,
        motivo_transicion: 'sustitucion_patronal',
        observaciones: obsFinal,
      }])

    // 2.3 Migrar novedades existentes y registrar novedad de 'Sustitución Patronal'
    await supabase
      .from('novedades')
      .update({ empresa: empresaDestino })
      .or(`empleado_id.eq.${empleado.id},nombre_empleado.ilike.${empleado.nombre_completo}`)

    const periodoStr = fechaEfectiva.slice(0, 7)
    await supabase
      .from('novedades')
      .insert([{
        concepto: 'Sustitución Patronal',
        fecha_inicio: fechaEfectiva,
        fecha_fin: fechaEfectiva,
        total_dias: 0,
        periodo: periodoStr,
        observacion: obsFinal,
        empleado_id: empleado.id,
        nombre_empleado: empleado.nombre_completo,
        dependencia: depFinal,
        empresa: empresaDestino,
      }])

    // 2.4 Migrar Procesos Disciplinarios
    try {
      await supabase
        .from('procesos_disciplinarios')
        .update({ empresa: empresaDestino })
        .or(`empleado_id.eq.${empleado.id},nombre_empleado.ilike.${empleado.nombre_completo}`)
    } catch (e) {
      console.warn('Migración procesos_disciplinarios:', e)
    }

    // 2.5 Migrar Productividad
    try {
      await supabase
        .from('productividad')
        .update({ empresa: empresaDestino })
        .ilike('nombre', empleado.nombre_completo)
    } catch (e) {
      console.warn('Migración productividad:', e)
    }

    // 2.6 Migrar Vacaciones
    try {
      await supabase
        .from('vacaciones')
        .update({ empresa: empresaDestino })
        .or(`empleado_id.eq.${empleado.id},nombre_empleado.ilike.${empleado.nombre_completo}`)
    } catch (e) {
      console.warn('Migración vacaciones:', e)
    }

    // 2.7 Migrar Parqueadero
    try {
      await supabase
        .from('registros_parqueadero')
        .update({ empresa: empresaDestino })
        .or(`empleado_id.eq.${empleado.id},nombre_empleado.ilike.${empleado.nombre_completo}`)
    } catch (e) {
      console.warn('Migración parqueadero:', e)
    }

    return { data: empActualizado, error: null }
  } catch (err) {
    console.error('Error al ejecutar sustitución patronal:', err)
    return { data: null, error: err }
  }
}

