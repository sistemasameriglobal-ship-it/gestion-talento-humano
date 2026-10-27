// =============================================================
// API: Contratos
// Gestión integral de contratos laborales y de aprendizaje con
// sus correspondientes contratos de confidencialidad vinculados.
// Soporta Supabase con fallback transparente a LocalStorage.
// =============================================================
import { supabase } from '../supabaseClient'

const TABLA = 'contratos'
const LS_KEY_PREFIX = 'ameriglobal_contratos_'

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
 * Normaliza y valida el payload de contrato para guardado consistente.
 */
function normalizarPayloadContrato(payload = {}, empresa = 'ameriglobal') {
  const out = { ...payload }
  out.empresa = out.empresa || empresa || 'ameriglobal'
  out.tipo_contrato = out.tipo_contrato || 'termino_fijo_menor_anio'
  out.estado = out.estado || 'vigente'
  out.duracion_meses = Number(out.duracion_meses) || 3
  out.periodo_prueba_dias = Number(out.periodo_prueba_dias) || 18
  out.salario_monto = Number(out.salario_monto) || 0
  out.multa_confidencialidad_smmlv = Number(out.multa_confidencialidad_smmlv) || 500
  out.anios_vigencia_post_terminacion = Number(out.anios_vigencia_post_terminacion) || 10
  out.incluye_confidencialidad = out.incluye_confidencialidad !== false

  if (out.fecha_ingreso) out.fecha_ingreso = String(out.fecha_ingreso).slice(0, 10)
  if (out.fecha_fin) out.fecha_fin = String(out.fecha_fin).slice(0, 10)
  if (out.fecha_nacimiento) out.fecha_nacimiento = String(out.fecha_nacimiento).slice(0, 10)
  if (out.fecha_confidencialidad) out.fecha_confidencialidad = String(out.fecha_confidencialidad).slice(0, 10)
  else out.fecha_confidencialidad = out.fecha_ingreso

  return out
}

/**
 * Lista todos los contratos de la empresa activa.
 */
export async function listarContratos(empresa = 'ameriglobal') {
  try {
    let query = supabase
      .from(TABLA)
      .select('*')
      .order('created_at', { ascending: false })

    if (empresa) query = query.eq('empresa', empresa)

    const { data, error } = await query

    if (error) {
      // Si la tabla aún no existe en Supabase, devolver lo que esté en cache local
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('Tabla contratos no encontrada en Supabase. Usando almacenamiento local temporal.')
        return { data: leerCacheLocal(empresa), error: null, isFallback: true }
      }
      return { data: leerCacheLocal(empresa), error }
    }

    // Actualizar cache local para disponibilidad offline
    if (Array.isArray(data)) {
      guardarCacheLocal(empresa, data)
    }

    return { data: data || [], error: null }
  } catch (err) {
    console.warn('Excepción al listar contratos:', err)
    return { data: leerCacheLocal(empresa), error: err, isFallback: true }
  }
}

/**
 * Obtiene un contrato por su ID.
 */
export async function obtenerContrato(id) {
  try {
    const { data, error } = await supabase
      .from(TABLA)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!error && data) return { data, error: null }

    // Fallback local
    const local = [...leerCacheLocal('ameriglobal'), ...leerCacheLocal('global_link')]
    const found = local.find(c => c.id === id)
    return { data: found || null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Crea un nuevo contrato (con su contrato de confidencialidad incorporado).
 */
export async function crearContrato(payload, empresa = 'ameriglobal') {
  const clean = normalizarPayloadContrato(payload, empresa)
  clean.created_at = new Date().toISOString()
  clean.updated_at = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from(TABLA)
      .insert([clean])
      .select()

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        // Guardado local si aún no se aplicó el script SQL
        const localItem = {
          ...clean,
          id: clean.id || 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        }
        const current = leerCacheLocal(empresa)
        const updated = [localItem, ...current]
        guardarCacheLocal(empresa, updated)
        return { data: [localItem], error: null, isFallback: true }
      }
      throw error
    }

    // Refrescar cache local
    if (data && data[0]) {
      const current = leerCacheLocal(empresa)
      guardarCacheLocal(empresa, [data[0], ...current.filter(c => c.id !== data[0].id)])
    }

    return { data, error: null }
  } catch (err) {
    console.error('Error al crear contrato:', err)
    // Fallback a localStorage
    const localItem = {
      ...clean,
      id: clean.id || 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    }
    const current = leerCacheLocal(empresa)
    const updated = [localItem, ...current]
    guardarCacheLocal(empresa, updated)
    return { data: [localItem], error: null, isFallback: true }
  }
}

/**
 * Actualiza un contrato existente.
 */
export async function actualizarContrato(id, payload, empresa = 'ameriglobal') {
  const clean = normalizarPayloadContrato(payload, empresa)
  clean.updated_at = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from(TABLA)
      .update(clean)
      .eq('id', id)
      .select()

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        const current = leerCacheLocal(empresa)
        const updated = current.map(c => c.id === id ? { ...c, ...clean } : c)
        guardarCacheLocal(empresa, updated)
        return { data: updated.filter(c => c.id === id), error: null, isFallback: true }
      }
      throw error
    }

    // Refrescar cache local
    const current = leerCacheLocal(empresa)
    const updated = current.map(c => c.id === id ? { ...c, ...clean } : c)
    guardarCacheLocal(empresa, updated)

    return { data, error: null }
  } catch (err) {
    console.error('Error al actualizar contrato:', err)
    const current = leerCacheLocal(empresa)
    const updated = current.map(c => c.id === id ? { ...c, ...clean } : c)
    guardarCacheLocal(empresa, updated)
    return { data: updated.filter(c => c.id === id), error: null, isFallback: true }
  }
}

/**
 * Elimina un contrato.
 */
export async function eliminarContrato(id, empresa = 'ameriglobal') {
  try {
    const { error } = await supabase
      .from(TABLA)
      .delete()
      .eq('id', id)

    // Limpiar también de cache local
    const current = leerCacheLocal(empresa)
    guardarCacheLocal(empresa, current.filter(c => c.id !== id))

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return { error: null }
      }
      return { error }
    }
    return { error: null }
  } catch (err) {
    console.error('Error al eliminar contrato:', err)
    const current = leerCacheLocal(empresa)
    guardarCacheLocal(empresa, current.filter(c => c.id !== id))
    return { error: null }
  }
}
