// =============================================================
// API: Productividad
// Peticiones a Supabase relacionadas con las tablas `productividad`,
// `productividad_resumen` y `cierre_meses` (vista de Cierre).
// Soporta filtrado y asignación por empresa ('ameriglobal' / 'global_link').
// =============================================================
import { supabase } from '../supabaseClient'
import { resolverIdsEnLote } from './idResolvers'
import { MESES_FULL } from '../constants'

// ── productividad (Ventas / UW-BS) ──────────────────────────────────────────

/** Filas de productividad de un departamento + métrica (usado en la vista principal). */
export function listarProductividadPorDepartamento(departamento, metrica, empresa) {
  let query = supabase.from('productividad').select('*').eq('departamento', departamento).eq('metrica', metrica)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/**
 * Solo los campos usados en Colaboradores. Acepta una métrica o una lista:
 * "Producción" (departamentos de un solo valor) y "Clientes Resueltos" (Ventas / UW-BS).
 */
export function listarProductividadParaColaboradores(metricas = ['Producción', 'Clientes Resueltos', 'Clientes en Frío'], empresa) {
  let query = supabase
    .from('productividad')
    .select('nombre_empleado, departamento, periodo, anio, valor, metrica, empresa')
    .in('metrica', [].concat(metricas))
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function upsertProductividad(filas, empresa = 'ameriglobal') {
  // Se guarda igual que antes (nombre_empleado/departamento/empresa en
  // texto); además se resuelven en lote empleado_id/departamento_id/empresa_id.
  const formateados = await resolverIdsEnLote(filas, empresa, 'departamento')
  return supabase
    .from('productividad')
    .upsert(formateados, { onConflict: 'nombre_empleado,departamento,periodo,metrica,anio' })
}

export function eliminarProductividadDePersona(nombre, departamento, empresa) {
  let query = supabase.from('productividad').delete().eq('nombre_empleado', nombre).eq('departamento', departamento)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

// ── productividad_resumen ───────────────────────────────────────────────────

export function listarResumenPorDepartamento(departamento, empresa) {
  let query = supabase.from('productividad_resumen').select('*').eq('departamento', departamento)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function upsertResumen(payload, empresa = 'ameriglobal') {
  const eraArray = Array.isArray(payload)
  const filas = eraArray ? payload : [payload]
  const formateados = await resolverIdsEnLote(filas, empresa, 'departamento')
  return supabase
    .from('productividad_resumen')
    .upsert(eraArray ? formateados : formateados[0], { onConflict: 'nombre_empleado,departamento' })
}

export function eliminarResumenDePersona(nombre, departamento, empresa) {
  let query = supabase.from('productividad_resumen').delete().eq('nombre_empleado', nombre).eq('departamento', departamento)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

// ── cierre_meses ─────────────────────────────────────────────────────────────

export function listarCierreMesesPorAnio(anio, empresa) {
  let query = supabase.from('cierre_meses').select('*').eq('anio', anio)
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

/** Solo los campos usados en Colaboradores. */
export function listarCierreMesesParaColaboradores(empresa) {
  let query = supabase.from('cierre_meses').select('nombre_empleado, anio, mes, total_dollars, empresa')
  if (empresa) query = query.eq('empresa', empresa)
  return query
}

export async function upsertCierreMeses(filas, empresa = 'ameriglobal') {
  // cierre_meses no tiene columna de departamento, por eso no se pasa
  // campoDependencia (queda en null y no se agrega departamento_id).
  const formateados = await resolverIdsEnLote(filas, empresa)
  return supabase.from('cierre_meses').upsert(formateados, { onConflict: 'nombre_empleado,anio,mes' })
}

// ── Metas del equipo (Mensuales por mes y Anuales por año) ───────────────────

export async function obtenerMetasEquipo(departamento, anio, empresa = 'ameriglobal') {
  const anioNum = Number(anio) || new Date().getFullYear()
  const localKey = `metas_equipo_${departamento}_${empresa}_${anioNum}`
  const baseLocalKey = `meta_equipo_${departamento}_${empresa}`
  const cachedBase = localStorage.getItem(baseLocalKey)
  const defaultBase = cachedBase ? Number(cachedBase) : 100

  // Fallback inicial
  let resultado = {
    anual: defaultBase * 12,
    anualFijada: null,
    mensuales: Array(12).fill(defaultBase),
    metaBase: defaultBase,
  }

  try {
    const cached = localStorage.getItem(localKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && Array.isArray(parsed.mensuales) && parsed.mensuales.length === 12) {
        resultado = parsed
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from('productividad')
      .select('periodo, metrica, anio, valor')
      .eq('nombre_empleado', '__CONFIG__')
      .eq('departamento', departamento)
      .eq('empresa', empresa)
      .in('metrica', ['Meta Mensual Equipo', 'Meta Anual Equipo'])
      .in('anio', [anioNum, 0])

    if (!error && data && data.length > 0) {
      let baseVal = defaultBase
      const baseRow = data.find(r => r.anio === 0 && r.metrica === 'Meta Mensual Equipo')
      if (baseRow?.valor != null) baseVal = Number(baseRow.valor)

      const meses = Array(12).fill(baseVal)
      let metaAnualFijada = null

      data.forEach(r => {
        if (r.metrica === 'Meta Anual Equipo' && r.anio === anioNum) {
          metaAnualFijada = Number(r.valor)
        } else if (r.metrica === 'Meta Mensual Equipo' && r.anio === anioNum) {
          const p = (r.periodo || '').trim().toLowerCase()
          const idx = MESES_FULL.findIndex(m => m.toLowerCase() === p)
          if (idx >= 0 && r.valor != null) {
            meses[idx] = Number(r.valor)
          }
        }
      })

      const sumaMeses = meses.reduce((s, v) => s + v, 0)
      const anualFinal = metaAnualFijada != null ? metaAnualFijada : (sumaMeses > 0 ? sumaMeses : baseVal * 12)

      resultado = {
        anual: anualFinal,
        anualFijada: metaAnualFijada,
        mensuales: meses,
        metaBase: baseVal,
      }

      localStorage.setItem(localKey, JSON.stringify(resultado))
      localStorage.setItem(baseLocalKey, String(baseVal))
    }
  } catch (err) {
    console.error('Error al obtener metas de equipo:', err)
  }

  return resultado
}

export async function guardarMetasEquipo({ departamento, anio, empresa = 'ameriglobal', mensuales, anual }) {
  const anioNum = Number(anio) || new Date().getFullYear()
  const localKey = `metas_equipo_${departamento}_${empresa}_${anioNum}`
  const baseLocalKey = `meta_equipo_${departamento}_${empresa}`

  const arrMeses = (mensuales || []).map(v => Math.max(0, Math.round(Number(v) || 0)))
  while (arrMeses.length < 12) arrMeses.push(0)

  const suma = arrMeses.reduce((s, v) => s + v, 0)
  const metaAnualNum = anual != null ? Math.max(0, Math.round(Number(anual) || 0)) : suma
  const promedioMes = Math.round(suma / 12) || arrMeses[0] || 100

  const objGuardar = {
    anual: metaAnualNum,
    anualFijada: anual != null ? metaAnualNum : null,
    mensuales: arrMeses,
    metaBase: promedioMes,
  }

  localStorage.setItem(localKey, JSON.stringify(objGuardar))
  localStorage.setItem(baseLocalKey, String(promedioMes))

  try {
    const nowIso = new Date().toISOString()
    const filasUpsert = []

    // 12 filas mensuales
    arrMeses.forEach((val, idx) => {
      filasUpsert.push({
        nombre_empleado: '__CONFIG__',
        departamento,
        periodo: MESES_FULL[idx],
        metrica: 'Meta Mensual Equipo',
        anio: anioNum,
        valor: val,
        empresa,
        updated_at: nowIso,
      })
    })

    // Meta Anual del año
    filasUpsert.push({
      nombre_empleado: '__CONFIG__',
      departamento,
      periodo: 'ANUAL',
      metrica: 'Meta Anual Equipo',
      anio: anioNum,
      valor: metaAnualNum,
      empresa,
      updated_at: nowIso,
    })

    // Fallback base global (anio 0)
    filasUpsert.push({
      nombre_empleado: '__CONFIG__',
      departamento,
      periodo: 'ANUAL',
      metrica: 'Meta Mensual Equipo',
      anio: 0,
      valor: promedioMes,
      empresa,
      updated_at: nowIso,
    })

    await supabase.from('productividad').upsert(filasUpsert, {
      onConflict: 'nombre_empleado,departamento,periodo,metrica,anio',
    })
  } catch (err) {
    console.error('Error al guardar metas de equipo en Supabase:', err)
  }

  return objGuardar
}

export async function guardarMetaMesRapida(departamento, anio, mesIdx, valor, empresa = 'ameriglobal') {
  const anioNum = Number(anio) || new Date().getFullYear()
  const valNum = Math.max(0, Math.round(Number(valor) || 0))
  const configActual = await obtenerMetasEquipo(departamento, anioNum, empresa)
  const nuevosMeses = [...configActual.mensuales]
  if (mesIdx >= 0 && mesIdx < 12) {
    nuevosMeses[mesIdx] = valNum
  }
  return guardarMetasEquipo({
    departamento,
    anio: anioNum,
    empresa,
    mensuales: nuevosMeses,
    anual: configActual.anualFijada,
  })
}

// Compatibilidad retroactiva con llamadas heredadas
export async function obtenerMetaEquipo(departamento, empresa = 'ameriglobal') {
  const anio = new Date().getFullYear()
  const cfg = await obtenerMetasEquipo(departamento, anio, empresa)
  return cfg.metaBase || cfg.mensuales?.[0] || 100
}

export async function guardarMetaEquipo(departamento, empresa = 'ameriglobal', valor) {
  const anio = new Date().getFullYear()
  const valNum = Math.max(0, Math.round(Number(valor) || 0))
  const cfg = await obtenerMetasEquipo(departamento, anio, empresa)
  const mesesNuevos = (cfg.mensuales || []).map(() => valNum)
  await guardarMetasEquipo({
    departamento,
    anio,
    empresa,
    mensuales: mesesNuevos,
    anual: valNum * 12,
  })
  return valNum
}

