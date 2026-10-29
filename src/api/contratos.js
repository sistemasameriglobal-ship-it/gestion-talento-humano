// =============================================================
// API: Contratos
// Gestión integral de contratos laborales y de aprendizaje con
// sus correspondientes contratos de confidencialidad vinculados.
// Soporta Supabase con persistencia local ultra-resiliente y
// empaquetado seguro de metadatos (evita errores PGRST204 de schema).
// =============================================================
import { supabase } from '../supabaseClient'

const TABLA = 'contratos'
const LS_KEY_PREFIX = 'ameriglobal_contratos_'

// Columnas nativas de la tabla en Supabase según SQL/24_GESTION_CONTRATOS.sql
const COLUMNAS_TABLA_CONTRATOS = new Set([
  'id',
  'empresa',
  'empleado_id',
  'tipo_contrato',
  'estado',
  'razon_social',
  'nit',
  'domicilio_empleador',
  'representante_legal',
  'cedula_representante',
  'domicilio_representante',
  'nombre_trabajador',
  'tipo_documento',
  'numero_documento',
  'direccion_trabajador',
  'fecha_nacimiento',
  'cargo',
  'salario_texto',
  'salario_monto',
  'periodo_pago',
  'fecha_ingreso',
  'fecha_fin',
  'duracion_meses',
  'lugar_labores',
  'ciudad_contrato',
  'horario',
  'jornada_laboral',
  'periodo_prueba_dias',
  'periodo_prueba_texto',
  'institucion_educativa',
  'programa_formacion',
  'etapa_aprendizaje',
  'apoyo_sostenimiento',
  'incluye_confidencialidad',
  'fecha_confidencialidad',
  'multa_confidencialidad_smmlv',
  'anios_vigencia_post_terminacion',
  'observaciones',
  'created_at',
  'updated_at',
  'dependencia',
  'telefono_trabajador',
  'email_trabajador',
])

function getLocalStorageKey(empresa = 'ameriglobal') {
  return `${LS_KEY_PREFIX}${empresa}`
}

function leerCacheLocal(empresa = 'ameriglobal') {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(empresa))
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.warn('Error leyendo contratos de localStorage:', e)
    return []
  }
}

function guardarCacheLocal(empresa = 'ameriglobal', items = []) {
  try {
    localStorage.setItem(getLocalStorageKey(empresa), JSON.stringify(items))
  } catch (e) {
    console.warn('Error guardando contratos en localStorage:', e)
  }
}

/**
 * Desempaqueta campos extendidos (dependencia, teléfono, email) almacenados en observaciones
 * para que siempre estén disponibles independientemente del esquema de base de datos.
 */
function enriquecerContrato(item) {
  if (!item) return item
  const res = { ...item }
  if (res.observaciones && typeof res.observaciones === 'string') {
    const match = res.observaciones.match(/<!--METADATA_CONTRATO:(.*?)-->/)
    if (match && match[1]) {
      try {
        const meta = JSON.parse(match[1])
        if (!res.dependencia && meta.dependencia) res.dependencia = meta.dependencia
        if (!res.telefono_trabajador && meta.telefono_trabajador) res.telefono_trabajador = meta.telefono_trabajador
        if (!res.email_trabajador && meta.email_trabajador) res.email_trabajador = meta.email_trabajador
        if (!res.firma_trabajador && meta.firma_trabajador) res.firma_trabajador = meta.firma_trabajador
        if (!res.fecha_firma_trabajador && meta.fecha_firma_trabajador) res.fecha_firma_trabajador = meta.fecha_firma_trabajador
        if (!res.token_firma && meta.token_firma) res.token_firma = meta.token_firma
        if (!res.ip_firma && meta.ip_firma) res.ip_firma = meta.ip_firma
        if (meta.firmado_por_trabajador !== undefined) res.firmado_por_trabajador = Boolean(meta.firmado_por_trabajador)
        if (meta.empleado_registrado !== undefined) res.empleado_registrado = Boolean(meta.empleado_registrado)
        if (meta.novedad_ingreso_registrada !== undefined) res.novedad_ingreso_registrada = Boolean(meta.novedad_ingreso_registrada)
      } catch {
        // Ignorar error de parseo de metadatos
      }
    }
  }
  return res
}

/**
 * Normaliza y valida el payload de contrato para guardado consistente.
 */
function normalizarPayloadContrato(payload = {}, empresa = 'ameriglobal') {
  const out = { ...payload }
  out.empresa = out.empresa || empresa || 'ameriglobal'
  out.tipo_contrato = out.tipo_contrato || 'termino_fijo_menor_anio'
  out.estado = out.estado || 'pendiente_empleado'
  out.duracion_meses = Number(out.duracion_meses) || 3
  out.periodo_prueba_dias = Number(out.periodo_prueba_dias) || 60
  out.salario_monto = Number(out.salario_monto) || 0
  out.multa_confidencialidad_smmlv = Number(out.multa_confidencialidad_smmlv) || 500
  out.anios_vigencia_post_terminacion = Number(out.anios_vigencia_post_terminacion) || 10
  out.incluye_confidencialidad = out.incluye_confidencialidad !== false

  // Fechas y UUIDs seguros para PostgreSQL (cadenas vacías deben ser null)
  out.fecha_ingreso = out.fecha_ingreso ? String(out.fecha_ingreso).slice(0, 10) : new Date().toISOString().slice(0, 10)
  out.fecha_fin = out.fecha_fin ? String(out.fecha_fin).slice(0, 10) : null
  out.fecha_nacimiento = out.fecha_nacimiento ? String(out.fecha_nacimiento).slice(0, 10) : null
  out.fecha_confidencialidad = out.fecha_confidencialidad ? String(out.fecha_confidencialidad).slice(0, 10) : out.fecha_ingreso
  out.empleado_id = out.empleado_id ? out.empleado_id : null

  // Empaquetar metadatos en observaciones para que nunca se pierdan si las columnas aún no existen en Supabase
  const metaExtra = {
    dependencia: out.dependencia || '',
    telefono_trabajador: out.telefono_trabajador || '',
    email_trabajador: out.email_trabajador || '',
    firma_trabajador: out.firma_trabajador || '',
    fecha_firma_trabajador: out.fecha_firma_trabajador || '',
    token_firma: out.token_firma || '',
    ip_firma: out.ip_firma || '',
    firmado_por_trabajador: Boolean(out.firma_trabajador || out.firmado_por_trabajador),
    empleado_registrado: Boolean(out.empleado_registrado),
    novedad_ingreso_registrada: Boolean(out.novedad_ingreso_registrada),
  }
  const metaRegex = /<!--METADATA_CONTRATO:(.*?)-->/
  const obsLimpia = (out.observaciones || '').replace(metaRegex, '').trim()
  out.observaciones = `${obsLimpia ? obsLimpia + '\n' : ''}<!--METADATA_CONTRATO:${JSON.stringify(metaExtra)}-->`

  return out
}

/**
 * Prepara el objeto para Supabase asegurando únicamente columnas que existen en la base de datos.
 * Todos los metadatos extendidos (firmas, fechas de firma, tokens) se empaquetan en 'observaciones'.
 */
function prepararObjetoSupabase(clean) {
  const dbPayload = {}
  Object.keys(clean).forEach(k => {
    if (COLUMNAS_TABLA_CONTRATOS.has(k) && clean[k] !== undefined) {
      dbPayload[k] = clean[k]
    }
  })
  return dbPayload
}

/**
 * Genera una clave lógica única para identificar un contrato por empresa, colaborador y vigencia.
 */
export function obtenerClaveContrato(c) {
  if (!c) return ''
  const emp = String(c.empresa || '').trim().toLowerCase()
  const doc = String(c.numero_documento || '').replace(/\D/g, '') || String(c.nombre_trabajador || '').trim().toLowerCase()
  const fi = String(c.fecha_ingreso || '').slice(0, 10)
  const tipo = String(c.tipo_contrato || '').trim().toLowerCase()
  return `${emp}__${doc}__${fi}__${tipo}`
}

/**
 * Deduplica una lista de contratos conservando el registro con mejor estado/firma y eliminando los duplicados redundantes de Supabase.
 */
export function deduplicarListaContratos(lista = [], eliminarRemotos = false) {
  const grupos = new Map()
  const idsToDelete = []

  for (const c of lista) {
    if (!c) continue
    const clave = obtenerClaveContrato(c)
    if (!grupos.has(clave)) {
      grupos.set(clave, [])
    }
    grupos.get(clave).push(c)
  }

  const deduped = []

  for (const [, items] of grupos.entries()) {
    if (items.length === 1) {
      deduped.push(items[0])
      continue
    }

    // Calcular puntaje para priorizar el contrato más completo y firmado
    const evaluados = items.map(it => {
      let score = 0
      // Prioridad máxima: firmado por el trabajador
      if (it.firmado_por_trabajador || it.firma_trabajador) score += 1000
      // Prioridad: registrado en empleados
      if (it.empleado_registrado || it.novedad_ingreso_registrada || it.empleado_id) score += 500
      // Prioridad: id real de Supabase (no temporal loc_)
      if (it.id && !String(it.id).startsWith('loc_')) score += 200
      // Prioridad: vigente
      if (it.estado === 'vigente') score += 50
      // Desempate por fecha
      const ts = new Date(it.updated_at || it.created_at || 0).getTime()
      if (!isNaN(ts)) score += ts / 1e12
      return { item: it, score }
    })

    evaluados.sort((a, b) => b.score - a.score)
    const ganador = evaluados[0].item
    deduped.push(ganador)

    // Marcar duplicados sobrantes para depuración en base de datos
    for (let i = 1; i < evaluados.length; i++) {
      const perdedor = evaluados[i].item
      if (perdedor.id && !String(perdedor.id).startsWith('loc_') && perdedor.id !== ganador.id) {
        idsToDelete.push(perdedor.id)
      }
    }
  }

  // Si se solicita, borrar en segundo plano de Supabase para limpiar permanentemente la base de datos
  if (eliminarRemotos && idsToDelete.length > 0) {
    setTimeout(async () => {
      try {
        await supabase.from(TABLA).delete().in('id', idsToDelete)
        console.log(`[Contratos] Limpieza permanente en Supabase: se eliminaron ${idsToDelete.length} duplicados.`)
      } catch (e) {
        console.warn('[Contratos] Error al depurar contratos duplicados en Supabase:', e)
      }
    }, 500)
  }

  return { deduped, idsToDelete }
}

/**
 * Lista todos los contratos de la empresa activa.
 * Combina datos de Supabase con el almacenamiento local deduplicando automáticamente cualquier repetición.
 */
export async function listarContratos(empresa = 'ameriglobal') {
  try {
    let query = supabase
      .from(TABLA)
      .select('*')
      .order('created_at', { ascending: false })

    if (empresa) query = query.eq('empresa', empresa)

    const { data, error } = await query

    // Leer cache local existente
    const localCached = leerCacheLocal(empresa).map(enriquecerContrato)

    if (error) {
      console.warn('Advertencia al consultar contratos en Supabase (usando datos locales):', error.message)
      const { deduped } = deduplicarListaContratos(localCached, false)
      return { data: deduped, error: null, isFallback: true }
    }

    const itemsSupabase = (data || []).map(enriquecerContrato)
    // Deduplicar lo que viene de Supabase y purgar copias duplicadas de la BD
    const { deduped: supabaseDeduped } = deduplicarListaContratos(itemsSupabase, true)

    // Fusionar: conservar contratos locales creados que realmente no existan en Supabase
    const clavesSupabase = new Set(supabaseDeduped.map(obtenerClaveContrato))
    const idsSupabase = new Set(supabaseDeduped.map(c => c.id))

    const localesPendientes = localCached.filter(c => {
      if (!c.id) return false
      if (idsSupabase.has(c.id)) return false
      const clave = obtenerClaveContrato(c)
      if (clavesSupabase.has(clave)) return false
      return true
    })

    // Intentar sincronizar en segundo plano los contratos locales pendientes legítimos
    if (localesPendientes.length > 0) {
      setTimeout(async () => {
        for (const loc of localesPendientes) {
          try {
            const dbPayload = prepararObjetoSupabase(loc)
            delete dbPayload.id
            const { data: synced } = await supabase.from(TABLA).insert([dbPayload]).select()
            if (synced && synced[0]) {
              const updatedCache = leerCacheLocal(empresa)
                .filter(c => c.id !== loc.id)
                .concat(enriquecerContrato(synced[0]))
              const { deduped: finalCache } = deduplicarListaContratos(updatedCache, false)
              guardarCacheLocal(empresa, finalCache)
            }
          } catch {
            // Ignorar errores de sync en background
          }
        }
      }, 500)
    }

    const { deduped: listaFinal } = deduplicarListaContratos([...supabaseDeduped, ...localesPendientes], false)
    guardarCacheLocal(empresa, listaFinal)

    return { data: listaFinal, error: null }
  } catch (err) {
    console.warn('Excepción al listar contratos:', err)
    const { deduped } = deduplicarListaContratos(leerCacheLocal(empresa).map(enriquecerContrato), false)
    return { data: deduped, error: null, isFallback: true }
  }
}

/**
 * Obtiene un contrato por su ID (busca en Supabase o en local de cualquier empresa).
 */
export async function obtenerContrato(id, empresa = null) {
  try {
    if (!id) return { data: null, error: new Error('ID no proporcionado') }

    // 1. Si no es un id temporal local, buscar en Supabase
    if (!String(id).startsWith('loc_')) {
      const { data, error } = await supabase
        .from(TABLA)
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return { data: enriquecerContrato(data), error: null }
      }
    }

    // 2. Fallback local en ameriglobal o global_link
    const empresasABuscar = empresa ? [empresa] : ['ameriglobal', 'global_link']
    for (const emp of empresasABuscar) {
      const local = leerCacheLocal(emp).map(enriquecerContrato)
      const found = local.find(c => c.id === id)
      if (found) {
        // Si tiene id temporal loc_, intentar subirlo a Supabase de una vez
        if (String(found.id).startsWith('loc_')) {
          try {
            const dbPayload = prepararObjetoSupabase(found)
            delete dbPayload.id
            const { data: synced } = await supabase.from(TABLA).insert([dbPayload]).select()
            if (synced && synced[0]) {
              const syncedContract = enriquecerContrato(synced[0])
              const updatedLocal = local.filter(c => c.id !== found.id).concat(syncedContract)
              guardarCacheLocal(emp, updatedLocal)
              return { data: syncedContract, error: null }
            }
          } catch (syncErr) {
            console.warn('No se pudo subir contrato temporal a Supabase:', syncErr)
          }
        }
        return { data: found, error: null }
      }
    }
    return { data: null, error: null }
  } catch (err) {
    console.error('Error en obtenerContrato:', err)
    return { data: null, error: err }
  }
}

/**
 * Registra la firma digital del empleado en ambos contratos (laboral y confidencialidad).
 */
export async function firmarContratoEmpleado(id, datosFirma = {}, empresa = null) {
  const { data: contratoExistente } = await obtenerContrato(id, empresa)
  if (!contratoExistente) {
    throw new Error('Contrato no encontrado en el sistema.')
  }

  const empresaDestino = contratoExistente.empresa || empresa || 'ameriglobal'
  const fechaFirma = datosFirma.fecha_firma_trabajador || new Date().toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const payloadActualizado = {
    ...contratoExistente,
    firma_trabajador: datosFirma.firma_trabajador || '',
    fecha_firma_trabajador: fechaFirma,
    ip_firma: datosFirma.ip_firma || '',
    firmado_por_trabajador: true,
  }

  const { data, error } = await actualizarContrato(id, payloadActualizado, empresaDestino)
  if (error) throw error
  return data?.[0] || payloadActualizado
}

/**
 * Crea un nuevo contrato (con su contrato de confidencialidad incorporado).
 * Garantiza guardado inmediato en cache local y replicación en Supabase.
 */
export async function crearContrato(payload, empresa = 'ameriglobal') {
  const clean = normalizarPayloadContrato(payload, empresa)
  clean.created_at = new Date().toISOString()
  clean.updated_at = new Date().toISOString()

  // 1. Evitar crear duplicados si ya existe un contrato activo para el mismo documento y fecha en Supabase
  if (clean.numero_documento) {
    try {
      const { data: existentes } = await supabase
        .from(TABLA)
        .select('*')
        .eq('empresa', clean.empresa)
        .eq('numero_documento', clean.numero_documento)
        .eq('fecha_ingreso', clean.fecha_ingreso)

      if (existentes && existentes.length > 0) {
        const activos = existentes.filter(c => c.estado !== 'finalizado' && c.estado !== 'desistido')
        if (activos.length > 0) {
          console.warn('[Contratos] Contrato idéntico ya existente en base de datos. Evitando duplicado.')
          const primero = enriquecerContrato(activos[0])
          return { data: [primero], error: null }
        }
      }
    } catch (checkErr) {
      console.warn('Advertencia al verificar contratos existentes:', checkErr)
    }
  }

  // 2. Guardar de inmediato en almacenamiento local para respuesta instantánea
  const localId = clean.id || 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  const itemLocal = { ...clean, id: localId }
  const current = leerCacheLocal(empresa)
  const { deduped: cacheActualizada } = deduplicarListaContratos([itemLocal, ...current.filter(c => c.id !== localId)], false)
  guardarCacheLocal(empresa, cacheActualizada)

  // 3. Intentar guardar en Supabase
  try {
    const dbPayload = prepararObjetoSupabase(clean)
    delete dbPayload.id

    const { data, error } = await supabase
      .from(TABLA)
      .insert([dbPayload])
      .select()

    if (error) {
      console.warn('Supabase insert advertencia (guardado preservado en local):', error.message)
      return { data: [itemLocal], error: null, isFallback: true }
    }

    if (data && data[0]) {
      const savedItem = enriquecerContrato(data[0])
      // Reemplazar el id temporal con el id real de Supabase
      const actualizados = [savedItem, ...leerCacheLocal(empresa).filter(c => c.id !== localId && c.id !== savedItem.id)]
      const { deduped: finalCache } = deduplicarListaContratos(actualizados, false)
      guardarCacheLocal(empresa, finalCache)
      return { data: [savedItem], error: null }
    }

    return { data: [itemLocal], error: null }
  } catch (err) {
    console.warn('Excepción al crear en Supabase (guardado preservado en local):', err)
    return { data: [itemLocal], error: null, isFallback: true }
  }
}

/**
 * Actualiza un contrato existente.
 */
export async function actualizarContrato(id, payload, empresa = 'ameriglobal') {
  const clean = normalizarPayloadContrato(payload, empresa)
  clean.updated_at = new Date().toISOString()

  // Actualizar en cache local de inmediato
  const current = leerCacheLocal(empresa)
  const previo = current.find(c => c.id === id) || {}
  const itemActualizado = { ...previo, ...clean, id }
  const listaLocalActualizada = current.map(c => c.id === id ? itemActualizado : c)
  if (!current.some(c => c.id === id)) listaLocalActualizada.unshift(itemActualizado)
  guardarCacheLocal(empresa, listaLocalActualizada)

  try {
    if (String(id).startsWith('loc_')) {
      const dbPayload = prepararObjetoSupabase(clean)
      delete dbPayload.id
      const { data, error } = await supabase.from(TABLA).insert([dbPayload]).select()
      if (!error && data?.[0]) {
        const saved = enriquecerContrato(data[0])
        const final = listaLocalActualizada.map(c => c.id === id ? saved : c)
        guardarCacheLocal(empresa, final)
        return { data: [saved], error: null }
      }
      return { data: [itemActualizado], error: null, isFallback: true }
    }

    const dbPayload = prepararObjetoSupabase(clean)
    delete dbPayload.id
    delete dbPayload.created_at

    const { data, error } = await supabase
      .from(TABLA)
      .update(dbPayload)
      .eq('id', id)
      .select()

    if (error) {
      console.warn('Advertencia al actualizar en Supabase:', error.message)
      return { data: [itemActualizado], error: null, isFallback: true }
    }

    if (data && data[0]) {
      const saved = enriquecerContrato(data[0])
      const final = listaLocalActualizada.map(c => c.id === id ? saved : c)
      guardarCacheLocal(empresa, final)
      return { data: [saved], error: null }
    }

    return { data: [itemActualizado], error: null }
  } catch (err) {
    console.warn('Excepción al actualizar en Supabase:', err)
    return { data: [itemActualizado], error: null, isFallback: true }
  }
}

/**
 * Elimina un contrato.
 */
export async function eliminarContrato(id, empresa = 'ameriglobal') {
  const current = leerCacheLocal(empresa)
  guardarCacheLocal(empresa, current.filter(c => c.id !== id))

  try {
    if (!String(id).startsWith('loc_')) {
      await supabase.from(TABLA).delete().eq('id', id)
    }
    return { error: null }
  } catch (err) {
    console.warn('Excepción al eliminar en Supabase:', err)
    return { error: null }
  }
}
