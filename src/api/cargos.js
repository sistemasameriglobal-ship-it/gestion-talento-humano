// =============================================================
// API: Cargos
// Peticiones a Supabase relacionadas con la tabla `cargos`
// para soporte dinámico de cargos/posiciones por empresa.
// Incluye fallback automático a almacenamiento local seguro si
// la tabla aún no ha sido creada en Supabase.
// =============================================================
import { supabase } from '../supabaseClient'

const TABLA = 'cargos'
const LS_CARGOS_KEY = 'app_cargos_dinamicos_v1'

const CARGOS_DEFAULT = [
  { id: 'def-1', empresa: 'ameriglobal', nombre: 'ASESOR COMERCIAL', departamento: 'VENTAS', activo: true },
  { id: 'def-2', empresa: 'ameriglobal', nombre: 'ANALISTA DE CARTERA', departamento: 'CIERRE', activo: true },
  { id: 'def-3', empresa: 'ameriglobal', nombre: 'ANALISTA DE UNDERWRITING', departamento: 'UNDERWRITING', activo: true },
  { id: 'def-4', empresa: 'ameriglobal', nombre: 'ANALISTA DE VERIFICACIÓN', departamento: 'VERIFICACION', activo: true },
  { id: 'def-5', empresa: 'ameriglobal', nombre: 'ANALISTA CONTABLE', departamento: 'CONTABILIDAD', activo: true },
  { id: 'def-6', empresa: 'ameriglobal', nombre: 'COORDINADOR DE OPERACIONES', departamento: 'GERENCIA', activo: true },
  { id: 'def-7', empresa: 'ameriglobal', nombre: 'SUPERVISOR DE ÁREA', departamento: 'GERENCIA', activo: true },
  { id: 'def-8', empresa: 'ameriglobal', nombre: 'ANALISTA DE RRHH', departamento: 'RRHH', activo: true },
  { id: 'def-9', empresa: 'ameriglobal', nombre: 'SOPORTE TI', departamento: 'SOPORTE TI', activo: true },
  { id: 'def-10', empresa: 'ameriglobal', nombre: 'SERVICIOS GENERALES', departamento: 'SERVICIOS GENERALES', activo: true },
  { id: 'def-11', empresa: 'ameriglobal', nombre: 'APRENDIZ ETAPA LECTIVA', departamento: 'APRENDIZ', activo: true },
  { id: 'def-12', empresa: 'ameriglobal', nombre: 'APRENDIZ ETAPA PRODUCTIVA', departamento: 'APRENDIZ', activo: true },
  { id: 'def-13', empresa: 'global_link', nombre: 'ASESOR DE COBRANZA', departamento: 'COBRANZA', activo: true },
  { id: 'def-14', empresa: 'global_link', nombre: 'ANALISTA DE COBRANZA', departamento: 'COBRANZA', activo: true },
  { id: 'def-15', empresa: 'global_link', nombre: 'SUPERVISOR DE COBRANZA', departamento: 'COBRANZA', activo: true },
  { id: 'def-16', empresa: 'global_link', nombre: 'COORDINADOR OPERATIVO', departamento: 'COBRANZA', activo: true },
]

function getLocalCargos() {
  try {
    const raw = localStorage.getItem(LS_CARGOS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignorar
  }
  return [...CARGOS_DEFAULT]
}

function saveLocalCargos(list) {
  try {
    localStorage.setItem(LS_CARGOS_KEY, JSON.stringify(list))
  } catch {
    // ignorar
  }
}

/** Lista de cargos activos de una empresa ('ameriglobal' o 'global_link'). */
export async function listarCargos(empresa = 'ameriglobal') {
  try {
    const { data, error } = await supabase
      .from(TABLA)
      .select('*')
      .eq('empresa', empresa)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (!error && data) {
      return { data, error: null }
    }
  } catch (err) {
    console.warn('Nota: Supabase cargos fallback local:', err)
  }

  // Fallback local
  const all = getLocalCargos()
  const filtrados = all
    .filter(c => (c.empresa === empresa || (!c.empresa && empresa === 'ameriglobal')) && c.activo !== false)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
  return { data: filtrados, error: null }
}

/** Lista todos los cargos (activos e inactivos) para la administración. */
export async function listarTodosLosCargos(empresa) {
  try {
    let query = supabase.from(TABLA).select('*').order('nombre', { ascending: true })
    if (empresa) query = query.eq('empresa', empresa)
    const { data, error } = await query
    if (!error && data) {
      return { data, error: null }
    }
  } catch (err) {
    console.warn('Nota: Supabase todos los cargos fallback local:', err)
  }

  // Fallback local
  const all = getLocalCargos()
  const filtrados = empresa
    ? all.filter(c => c.empresa === empresa)
    : all
  return { data: filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre)), error: null }
}

export async function crearCargo(payload) {
  const nombreNormalizado = payload.nombre?.trim().toUpperCase()
  const itemToInsert = {
    empresa: payload.empresa || 'ameriglobal',
    nombre: nombreNormalizado,
    departamento: payload.departamento?.trim().toUpperCase() || null,
    descripcion: payload.descripcion?.trim() || null,
    activo: payload.activo ?? true,
  }

  try {
    const res = await supabase.from(TABLA).insert([itemToInsert]).select().single()
    if (!res.error && res.data) {
      // También guardar en local para redundancia
      const all = getLocalCargos()
      if (!all.some(c => c.nombre === nombreNormalizado && c.empresa === itemToInsert.empresa)) {
        all.push(res.data)
        saveLocalCargos(all)
      }
      return res
    }
  } catch (err) {
    console.warn('Fallback al crear cargo local:', err)
  }

  // Fallback local
  const all = getLocalCargos()
  const exists = all.some(c => c.empresa === itemToInsert.empresa && c.nombre.toUpperCase() === nombreNormalizado)
  if (exists) {
    return { data: null, error: new Error(`El cargo "${nombreNormalizado}" ya existe para esta empresa.`) }
  }
  const nuevo = {
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    ...itemToInsert,
    created_at: new Date().toISOString(),
  }
  all.push(nuevo)
  saveLocalCargos(all)
  return { data: nuevo, error: null }
}

export async function actualizarCargo(id, payload) {
  const dataToUpdate = { ...payload }
  if (dataToUpdate.nombre) {
    dataToUpdate.nombre = dataToUpdate.nombre.trim().toUpperCase()
  }
  if (dataToUpdate.departamento) {
    dataToUpdate.departamento = dataToUpdate.departamento.trim().toUpperCase()
  }

  try {
    const res = await supabase.from(TABLA).update(dataToUpdate).eq('id', id).select().single()
    if (!res.error && res.data) {
      const all = getLocalCargos()
      const idx = all.findIndex(c => c.id === id)
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...res.data }
        saveLocalCargos(all)
      }
      return res
    }
  } catch (err) {
    console.warn('Fallback actualizar cargo local:', err)
  }

  // Fallback local
  const all = getLocalCargos()
  const idx = all.findIndex(c => c.id === id)
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...dataToUpdate, updated_at: new Date().toISOString() }
    saveLocalCargos(all)
    return { data: all[idx], error: null }
  }
  return { data: null, error: new Error('Cargo no encontrado.') }
}

export async function alternarEstadoCargo(id, activo) {
  try {
    const res = await supabase.from(TABLA).update({ activo }).eq('id', id)
    if (!res.error) {
      const all = getLocalCargos()
      const idx = all.findIndex(c => c.id === id)
      if (idx !== -1) {
        all[idx].activo = activo
        saveLocalCargos(all)
      }
      return res
    }
  } catch (err) {
    console.warn('Fallback alternar estado cargo local:', err)
  }

  const all = getLocalCargos()
  const idx = all.findIndex(c => c.id === id)
  if (idx !== -1) {
    all[idx].activo = activo
    saveLocalCargos(all)
    return { error: null }
  }
  return { error: new Error('Cargo no encontrado.') }
}

export async function eliminarCargo(id) {
  try {
    const res = await supabase.from(TABLA).delete().eq('id', id)
    if (!res.error) {
      const all = getLocalCargos().filter(c => c.id !== id)
      saveLocalCargos(all)
      return res
    }
  } catch (err) {
    console.warn('Fallback eliminar cargo local:', err)
  }

  const all = getLocalCargos().filter(c => c.id !== id)
  saveLocalCargos(all)
  return { error: null }
}
