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
 * Lista todos los contratos de la empresa activa.
 * Combina datos de Supabase con el almacenamiento local para que NUNCA desaparezcan los contratos.
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
      return { data: localCached, error: null, isFallback: true }
    }

    const itemsSupabase = (data || []).map(enriquecerContrato)

    // Fusionar: conservar contratos locales creados que aún no estén en Supabase
    const idsSupabase = new Set(itemsSupabase.map(c => c.id))
    const localesPendientes = localCached.filter(c => c.id && !idsSupabase.has(c.id))

    // Intentar sincronizar en segundo plano los contratos locales pendientes
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
              guardarCacheLocal(empresa, updatedCache)
            }
          } catch {
            // Ignorar errores de sync en background
          }
        }
      }, 500)
    }

    const listaFinal = [...itemsSupabase, ...localesPendientes]
    guardarCacheLocal(empresa, listaFinal)

    return { data: listaFinal, error: null }
  } catch (err) {
    console.warn('Excepción al listar contratos:', err)
    return { data: leerCacheLocal(empresa).map(enriquecerContrato), error: null, isFallback: true }
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

  // 1. Guardar de inmediato en almacenamiento local para respuesta instantánea y máxima resiliencia
  const localId = clean.id || 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  const itemLocal = { ...clean, id: localId }
  const current = leerCacheLocal(empresa)
  guardarCacheLocal(empresa, [itemLocal, ...current.filter(c => c.id !== localId)])

  // 2. Intentar guardar en Supabase
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
      guardarCacheLocal(empresa, actualizados)
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
