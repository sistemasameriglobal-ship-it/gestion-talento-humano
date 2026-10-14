// Valores canónicos que usa el select de Novedades — deben coincidir exactamente
export const CONCEPTOS_CANONICOS = [
  'Incapacidad','Vacaciones','LNR','LR','Maternidad','Paternidad',
  'Calamidad/Luto','Renuncia/Retiro','Ingreso','Terminación',
  'Día Familia','Hospitalización','Embargo','Suspensión','Otro'
]

export function normalizarConcepto(concepto) {
  if (!concepto) return 'Otro'
  const raw = concepto.toString().trim()
  if (CONCEPTOS_CANONICOS.includes(raw)) return raw
  const c = raw.toLowerCase()
  if (c.includes('incapacidad') || c === 'inc') return 'Incapacidad'
  if (c.includes('vacacion')) return 'Vacaciones'
  if (c.includes('lnr') || c.includes('licencia no remunerada')) return 'LNR'
  if (c.includes('licencia remunerada') || c === 'lr' || c === 'lrn' || c === '1/2 lr') return 'LR'
  if (c.includes('maternidad')) return 'Maternidad'
  if (c.includes('paternidad')) return 'Paternidad'
  if (c.includes('luto') || c.includes('calamidad')) return 'Calamidad/Luto'
  if (c.includes('renuncia') || c.includes('retiro') || c === 'ret') return 'Renuncia/Retiro'
  if (c.includes('ingreso') || c === 'ing') return 'Ingreso'
  if (c.includes('terminacion') || c.includes('terminación') || c.includes('despido')) return 'Terminación'
  if (c.includes('familia')) return 'Día Familia'
  if (c.includes('hospitaliz')) return 'Hospitalización'
  if (c.includes('embargo')) return 'Embargo'
  if (c.includes('suspension') || c.includes('suspensión')) return 'Suspensión'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/**
 * Convierte el serial numérico de fecha de Excel (días desde 1899-12-30) a { y, m, d }.
 * 25569 = días entre la época de Excel y el epoch de Unix (1970-01-01).
 */
export function serialExcelAFecha(serial) {
  const ms = Math.round((Number(serial) - 25569) * 86400000)
  const d = new Date(ms)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}

/**
 * Parsea cualquier formato de fecha proveniente de Excel (Date, serial numérico, DD/MM/YYYY, YYYY-MM-DD)
 * a una cadena limpia en formato ISO 'YYYY-MM-DD'.
 */
export function parsearFecha(val) {
  if (val === null || val === undefined || val === '') return null
  if (val === 'NaT' || val === 'nan' || val === 'NaN' || val === 'null' || val === '—' || val === '-') return null

  // Si ya es un objeto Date válido
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    // Usar componentes UTC si no tiene hora, o toISOString slice
    return val.toISOString().slice(0, 10)
  }

  // Si es un número serial de Excel (ej: 45200) o un string puramente numérico (ej: "45200")
  const num = typeof val === 'number' ? val : (typeof val === 'string' && /^\d{5}(\.\d+)?$/.test(val.trim()) ? Number(val.trim()) : null)
  if (num !== null && !isNaN(num) && num > 20000 && num < 80000) {
    try {
      const d = serialExcelAFecha(num)
      if (d && !isNaN(d.y)) {
        return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
      }
    } catch { /* continuar */ }
  }

  const s = val.toString().trim()
  if (!s) return null

  // Formato ISO estándar: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // Formato ISO con timestamp: YYYY-MM-DDTHH:mm... o YYYY-MM-DD HH:mm...
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/)
  if (isoMatch) return isoMatch[1]

  // Formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const [, d, mo, y] = dmyMatch
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Formato YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (ymdMatch) {
    const [, y, mo, d] = ymdMatch
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Parseo estándar con Date
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    if (y >= 1950 && y <= 2100) {
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${mo}-${day}`
    }
  }

  return null
}

/**
 * Normaliza texto eliminando acentos, espacios múltiples y pasando a minúsculas.
 */
export function normalizarTexto(str) {
  if (!str) return ''
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normaliza nombres de columnas/encabezados de archivos Excel para comparación flexible.
 */
export function normalizarEncabezado(str) {
  if (!str) return ''
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\-/\\().,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Convierte valores de celdas a booleano (para columnas de Activo/Estado).
 */
export function parsearBooleano(val, def = true) {
  if (val === null || val === undefined || val === '') return def
  const s = normalizarTexto(val)
  if (['no', 'inactivo', 'false', '0', 'retirado', 'desactivado'].includes(s)) return false
  if (['si', 'activo', 'true', '1'].includes(s)) return true
  return def
}

/**
 * Mapea una fila leída de Excel a la estructura canónica de un empleado,
 * tolerando variaciones de encabezados y formatos de fechas.
 */
export function mapearFilaEmpleadoExcel(rawRow) {
  if (!rawRow || typeof rawRow !== 'object') return {}

  const res = {
    nombre_completo: '',
    correo: null,
    dependencia: null,
    cargo: null,
    activo: true,
    fecha_ingreso: null,
    fecha_retiro: null,
    empresa: null,
  }

  for (const [key, value] of Object.entries(rawRow)) {
    if (value === null || value === undefined || value === '') continue
    const norm = normalizarEncabezado(key)

    // Nombre completo
    if (['nombre completo', 'nombre y apellido', 'nombres y apellidos', 'nombre y apellidos', 'nombres', 'nombre', 'colaborador', 'empleado', 'trabajador'].includes(norm)) {
      res.nombre_completo = value.toString().trim()
    }
    // Correo
    else if (['correo', 'correo electronico', 'email', 'e mail', 'mail'].includes(norm)) {
      const email = value.toString().trim()
      if (email && email.toLowerCase() !== 'n/a' && email !== '—' && email !== '-') {
        res.correo = email
      }
    }
    // Dependencia / Área
    else if (['dependencia', 'area', 'departamento', 'dependencia area', 'seccion', 'unidad'].includes(norm)) {
      const dep = value.toString().trim().toUpperCase()
      if (dep && dep !== 'N/A' && dep !== '—') {
        res.dependencia = dep
      }
    }
    // Cargo
    else if (['cargo', 'puesto', 'rol', 'posicion', 'ocupacion', 'oficio'].includes(norm)) {
      const cargo = value.toString().trim()
      if (cargo && cargo.toLowerCase() !== 'n/a' && cargo !== '—') {
        res.cargo = cargo
      }
    }
    // Activo / Estado
    else if (['activo', 'estado', 'estado activo inactivo', 'activo si no', 'condicion'].includes(norm)) {
      res.activo = parsearBooleano(value, true)
    }
    // Fecha de ingreso
    else if (['fecha ingreso', 'fecha de ingreso', 'ingreso', 'f ingreso', 'f de ingreso', 'inicio contrato', 'fecha contratacion', 'fecha vinculacion', 'f contratacion'].includes(norm)) {
      res.fecha_ingreso = parsearFecha(value)
    }
    // Fecha de retiro
    else if (['fecha retiro', 'fecha de retiro', 'retiro', 'f retiro', 'f de retiro', 'fin contrato', 'fecha salida', 'fecha desvinculacion', 'fecha terminacion', 'egreso'].includes(norm)) {
      res.fecha_retiro = parsearFecha(value)
    }
    // Empresa
    else if (['empresa', 'compania', 'razon social'].includes(norm)) {
      const emp = value.toString().trim().toLowerCase()
      if (emp && emp !== 'n/a') {
        res.empresa = emp
      }
    }
  }

  // Si activo es true, la fecha de retiro no debe existir
  if (res.activo) {
    res.fecha_retiro = null
  }

  return res
}

/**
 * Detecta los índices de las columnas en una fila de encabezados para Novedades.
 */
export function detectarIndicesEncabezadoNovedades(headerRow) {
  if (!headerRow || !Array.isArray(headerRow) || headerRow.length === 0) return null
  const map = {}

  headerRow.forEach((cell, idx) => {
    const norm = normalizarEncabezado(cell)
    if (!norm) return

    if (map.nombre === undefined && (norm.includes('nombre') || norm.includes('colaborador') || norm.includes('empleado'))) {
      map.nombre = idx
    } else if (map.concepto === undefined && (norm.includes('concepto') || norm.includes('tipo'))) {
      map.concepto = idx
    } else if (map.fecha_inicio === undefined && (norm.includes('inicio') || norm.includes('desde') || norm === 'fecha')) {
      map.fecha_inicio = idx
    } else if (map.fecha_fin === undefined && (norm.includes('fin') || norm.includes('hasta') || norm.includes('finaliza'))) {
      map.fecha_fin = idx
    } else if (map.total_dias === undefined && (norm === 'total dias' || norm === 'dias' || norm === 'dias totales' || norm === 'total de dias')) {
      map.total_dias = idx
    } else if (map.dias_en_dinero === undefined && (norm.includes('dinero') || norm.includes('compensad'))) {
      map.dias_en_dinero = idx
    } else if (map.validacion_incapacidad === undefined && norm.includes('validacion')) {
      map.validacion_incapacidad = idx
    } else if (map.dependencia === undefined && (norm.includes('dependencia') || norm.includes('area') || norm.includes('departamento'))) {
      map.dependencia = idx
    } else if (map.observacion_contabilidad === undefined && (norm.includes('contab') || norm.includes('observacion contabilidad'))) {
      map.observacion_contabilidad = idx
    } else if (map.observacion === undefined && (norm.includes('observacion') || norm.includes('detalle') || norm.includes('motivo'))) {
      map.observacion = idx
    } else if (map.nomina_electronica === undefined && norm.includes('nomina')) {
      map.nomina_electronica = idx
    } else if (map.seguridad_social === undefined && (norm.includes('seguridad') || norm.includes('seg social'))) {
      map.seguridad_social = idx
    }
  })

  if (map.nombre !== undefined || map.concepto !== undefined) {
    return map
  }
  return null
}

export const CONCEPTO_COLORS = {
  'Incapacidad':     '#DC2626',
  'Vacaciones':      '#2563EB',
  'LNR':             '#D97706',
  'LR':              '#059669',
  'Maternidad':      '#7C3AED',
  'Paternidad':      '#0891B2',
  'Calamidad/Luto':  '#6B7280',
  'Renuncia/Retiro': '#9F1239',
  'Ingreso':         '#15803D',
  'Terminación':     '#92400E',
  'Día Familia':     '#0E7490',
  'Hospitalización': '#BE123C',
  'Embargo':         '#854D0E',
  'Suspensión':      '#B45309',
  'Otro':            '#374151',
}
