// =============================================================
// src/api/empresas.js
// -------------------------------------------------------------
// API para la administración dinámica de empresas en el sistema
// multi-empresa. Permite agregar, listar, actualizar y alternar
// empresas (AmeriGlobal, Global Link, y cualquier nueva empresa).
// =============================================================
import { supabase } from '../supabaseClient'
import { EMPRESAS_DISPONIBLES as EMPRESAS_BASE } from '../constants'

const TABLA = 'empresas'
const STORAGE_KEY = 'cache_empresas_sistema'

/**
 * Obtiene las empresas guardadas en caché local para arranque instantáneo
 */
export function obtenerEmpresasCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPRESAS_BASE
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizarListaEmpresas(parsed)
    }
  } catch {
    // Si falla JSON.parse, ignorar
  }
  return EMPRESAS_BASE
}

/**
 * Guarda la lista de empresas en caché local
 */
export function guardarEmpresasCache(empresas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empresas))
  } catch {
    // localStorage quota o error
  }
}

/**
 * Normaliza un objeto empresa para garantizar todas las propiedades
 * que la interfaz necesita (colores, íconos, logoLetra, etc.)
 */
export function normalizarEmpresa(emp) {
  const codigo = (emp.codigo || emp.id || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const nombre = emp.nombre || 'Empresa'
  const logoLetra = emp.logo_letra || emp.logoLetra || (nombre.slice(0, 2).toUpperCase())
  const colorPrincipal = emp.color_principal || emp.colorPrincipal || '#2563EB'
  const colorSecundario = emp.color_secundario || emp.colorSecundario || '#1D4ED8'
  const colorFondoTag = emp.color_fondo_tag || emp.colorFondoTag || '#EFF6FF'
  const icono = emp.icono || '🏢'

  return {
    id: codigo,
    codigo,
    nombre,
    razonSocial: emp.razon_social || emp.razonSocial || `${nombre} S.A.S.`,
    nit: emp.nit || '',
    tagline: emp.tagline || 'Operaciones & Gestión',
    logoLetra,
    colorPrincipal,
    colorSecundario,
    colorFondoTag,
    icono,
    activo: emp.activo !== false,
    created_at: emp.created_at || null,
    dbId: emp.id && emp.id.length > 10 ? emp.id : null,
  }
}

function normalizarListaEmpresas(lista) {
  const mapa = new Map()

  // 1. Agregar base fija asegurando que siempre existan ameriglobal y global_link
  EMPRESAS_BASE.forEach(b => {
    mapa.set(b.id, normalizarEmpresa(b))
  })

  // 2. Mezclar empresas dinámicas recibidas
  lista.forEach(item => {
    const norm = normalizarEmpresa(item)
    if (norm.codigo) {
      mapa.set(norm.codigo, {
        ...(mapa.get(norm.codigo) || {}),
        ...norm,
      })
    }
  })

  return Array.from(mapa.values())
}

/**
 * Lista todas las empresas registradas (Supabase + base + caché)
 */
export async function listarEmpresas() {
  try {
    const { data, error } = await supabase
      .from(TABLA)
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && Array.isArray(data)) {
      const combinadas = normalizarListaEmpresas(data)
      guardarEmpresasCache(combinadas)
      return { data: combinadas, error: null }
    }
  } catch (err) {
    console.warn('Nota: tabla empresas en supabase no accesible, usando fallback:', err)
  }

  // Fallback a caché o constantes
  const fallback = obtenerEmpresasCache()
  return { data: fallback, error: null }
}

/**
 * Crea una nueva empresa en el sistema:
 * 1. Inserta en public.empresas
 * 2. Crea departamentos iniciales en public.departamentos
 * 3. Actualiza el perfil del admin actual para otorgarle acceso inmediato
 * 4. Actualiza caché local
 */
export async function crearEmpresa(payload, adminUserId = null) {
  const codigo = (payload.codigo || payload.nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!codigo) {
    return { error: new Error('El código o nombre de la empresa es inválido.') }
  }

  const nombre = payload.nombre?.trim() || 'Nueva Empresa'
  const razonSocial = payload.razonSocial?.trim() || payload.razon_social?.trim() || `${nombre} S.A.S.`
  const nit = payload.nit?.trim() || null
  const tagline = payload.tagline?.trim() || 'Operaciones & Gestión'
  const logoLetra = (payload.logoLetra || payload.logo_letra || nombre.slice(0, 2)).toUpperCase()
  const icono = payload.icono || '🏢'
  const colorPrincipal = payload.colorPrincipal || payload.color_principal || '#2563EB'
  const colorSecundario = payload.colorSecundario || payload.color_secundario || '#1D4ED8'
  const colorFondoTag = payload.colorFondoTag || payload.color_fondo_tag || '#EFF6FF'

  const dbPayload = {
    codigo,
    nombre,
    razon_social: razonSocial,
    nit,
    tagline,
    logo_letra: logoLetra,
    icono,
    color_principal: colorPrincipal,
    color_secundario: colorSecundario,
    color_fondo_tag: colorFondoTag,
    activo: true,
  }

  let dbRecord = null

  // 1. Intentar insertar en Supabase
  try {
    const res = await supabase.from(TABLA).insert([dbPayload]).select().single()
    if (!res.error) {
      dbRecord = res.data
    } else {
      // Si la tabla no tiene todas las columnas nuevas, intentar con columnas mínimas
      if (res.error.message?.includes('column')) {
        const minPayload = { codigo, nombre, activo: true }
        const resMin = await supabase.from(TABLA).insert([minPayload]).select().single()
        if (!resMin.error) dbRecord = resMin.data
      }
    }
  } catch (e) {
    console.warn('Error al guardar empresa en Supabase:', e)
  }

  // 2. Crear departamentos iniciales para esta nueva empresa
  const departamentosIniciales = Array.isArray(payload.departamentos) && payload.departamentos.length > 0
    ? payload.departamentos
    : ['OPERACIONES', 'ADMINISTRACION', 'RRHH', 'GERENCIA']

  try {
    for (const depNombre of departamentosIniciales) {
      await supabase.from('departamentos').insert([{
        empresa: codigo,
        nombre: depNombre.trim().toUpperCase(),
        activo: true,
      }]).catch(() => {})
    }
  } catch (errDep) {
    console.warn('Nota: no se pudieron crear departamentos automáticos:', errDep)
  }

  // 3. Asignar acceso a la nueva empresa en el perfil del admin actual
  if (adminUserId) {
    try {
      const { data: adminPerfil } = await supabase
        .from('perfiles')
        .select('empresas, permisos')
        .eq('id', adminUserId)
        .maybeSingle()

      if (adminPerfil) {
        const empActuales = Array.isArray(adminPerfil.empresas) ? adminPerfil.empresas : []
        if (!empActuales.includes(codigo)) {
          const nuevasEmpresas = [...empActuales, codigo]
          const nuevosPermisos = { ...(adminPerfil.permisos || {}), [codigo]: ['all'] }
          await supabase
            .from('perfiles')
            .update({ empresas: nuevasEmpresas, permisos: nuevosPermisos })
            .eq('id', adminUserId)
        }
      }
    } catch (adminErr) {
      console.warn('Nota: no se pudo actualizar perfil del admin:', adminErr)
    }
  }

  // 4. Actualizar caché local
  const nuevaEmpresaObj = normalizarEmpresa({
    ...dbPayload,
    id: dbRecord?.id || codigo,
  })

  const empresasActuales = obtenerEmpresasCache()
  const actualizadas = normalizarListaEmpresas([...empresasActuales, nuevaEmpresaObj])
  guardarEmpresasCache(actualizadas)

  return { data: nuevaEmpresaObj, error: null }
}

/**
 * Actualiza la información de una empresa
 */
export async function actualizarEmpresa(codigo, payload) {
  const dataToUpdate = {}
  if (payload.nombre !== undefined) dataToUpdate.nombre = payload.nombre.trim()
  if (payload.razonSocial !== undefined) dataToUpdate.razon_social = payload.razonSocial.trim()
  if (payload.nit !== undefined) dataToUpdate.nit = payload.nit.trim()
  if (payload.tagline !== undefined) dataToUpdate.tagline = payload.tagline.trim()
  if (payload.logoLetra !== undefined) dataToUpdate.logo_letra = payload.logoLetra.toUpperCase()
  if (payload.icono !== undefined) dataToUpdate.icono = payload.icono
  if (payload.colorPrincipal !== undefined) dataToUpdate.color_principal = payload.colorPrincipal
  if (payload.colorSecundario !== undefined) dataToUpdate.color_secundario = payload.colorSecundario
  if (payload.colorFondoTag !== undefined) dataToUpdate.color_fondo_tag = payload.colorFondoTag
  if (payload.activo !== undefined) dataToUpdate.activo = Boolean(payload.activo)

  try {
    await supabase.from(TABLA).update(dataToUpdate).eq('codigo', codigo)
  } catch (err) {
    console.warn('Error al actualizar empresa en Supabase:', err)
  }

  // Actualizar caché local
  const cached = obtenerEmpresasCache()
  const actualizadas = cached.map(emp => {
    if (emp.codigo === codigo || emp.id === codigo) {
      return normalizarEmpresa({ ...emp, ...dataToUpdate })
    }
    return emp
  })
  guardarEmpresasCache(actualizadas)

  return { data: actualizadas.find(e => e.codigo === codigo), error: null }
}

/**
 * Alterna el estado activo / inactivo de una empresa
 */
export async function alternarEstadoEmpresa(codigo, activo) {
  return actualizarEmpresa(codigo, { activo })
}
