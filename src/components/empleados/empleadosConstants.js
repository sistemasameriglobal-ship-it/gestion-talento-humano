// =============================================================
// src/components/empleados/empleadosConstants.js
// -------------------------------------------------------------
// Constantes específicas del módulo Empleados (iconos, colores
// por área, concepto con fecha y formulario vacío).
// =============================================================

export const PAGE_SIZE = 12

export { DEPENDENCIAS_EXTENDIDAS as DEPENDENCIAS } from '../../constants'

export const DEP_ICONS = {
  'COBRANZA': '💳', 'CIERRE': '🔒', 'VENTAS': '📈', 'UNDERWRITING': '📝',
  'CONTABILIDAD': '🧾', 'RRHH': '👥', 'GERENCIA': '🏢', 'SOPORTE TI': '💻',
}

export const DEP_COLORS = {
  'COBRANZA': ['var(--warning-bg)', 'var(--warning-text)', 'color-mix(in srgb, var(--warning) 40%, transparent)'],
  'CIERRE': ['var(--danger-bg)', 'var(--danger-text)', 'color-mix(in srgb, var(--danger) 35%, transparent)'],
  'VENTAS': ['var(--success-bg)', 'var(--success-text)', 'color-mix(in srgb, var(--success) 35%, transparent)'],
  'UNDERWRITING': ['var(--purple-bg)', 'var(--purple-text)', 'color-mix(in srgb, var(--purple) 35%, transparent)'],
  'CONTABILIDAD': ['var(--info-bg)', 'var(--info-text)', 'color-mix(in srgb, var(--info) 35%, transparent)'],
  'RRHH': ['#FCE7F3', '#9D174D', '#F9A8D4'],
  'GERENCIA': ['var(--success-bg)', 'var(--success-text)', 'color-mix(in srgb, var(--success) 35%, transparent)'],
  'SOPORTE TI': ['var(--info-bg)', 'var(--info-text)', 'color-mix(in srgb, var(--info) 30%, transparent)'],
}

export const CONCEPTOS_CON_FECHA = [
  'Incapacidad', 'Vacaciones', 'LNR', 'LR', 'Maternidad', 'Paternidad',
  'Calamidad/Luto', 'Hospitalización', 'Embargo', 'Otro',
]

export const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'TI', label: 'Tarjeta de Identidad (TI)' },
  { value: 'Contraseña', label: 'Contraseña / En trámite' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'PEP', label: 'Permiso Especial de Permanencia (PEP)' },
  { value: 'PPT', label: 'Permiso por Protección Temporal (PPT)' },
  { value: 'Pasaporte', label: 'Pasaporte' },
]

export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const EPS_LIST = [
  'Sura',
  'Sanitas',
  'Nueva EPS',
  'Salud Total',
  'Compensar',
  'Famisanar',
  'Coosalud',
  'Mutual Ser',
  'Aliansalud',
  'Savia Salud',
]

export const PENSION_LIST = [
  'Protección',
  'Porvenir',
  'Colfondos',
  'Colpensiones',
  'Skandia',
]

export const CESANTIAS_LIST = [
  'Protección',
  'Porvenir',
  'Fondo Nacional del Ahorro',
  'Colfondos',
  'Skandia',
]

export const BANCOS_LIST = [
  'Bancolombia',
  'Davivienda',
  'BBVA',
  'Banco de Bogotá',
  'Banco de Occidente',
  'Banco Popular',
  'Banco Caja Social',
  'Scotiabank Colpatria',
  'Itaú',
  'Nequi',
  'DaviPlata',
  'Lulo Bank',
  'Nu Colombia',
]

export const TIPOS_CUENTA = ['Ahorros', 'Corriente']

export const PARENTESCOS_SUGERIDOS = [
  'Familiar',
  'Madre',
  'Padre',
  'Pareja / Esposo(a)',
  'Hermano(a)',
  'Hijo(a)',
  'Abuelo(a)',
  'Tío(a)',
  'Amigo(a)',
  'Otro',
]

export function calcularEdad(fechaNac) {
  if (!fechaNac) return null
  const d = new Date(fechaNac)
  if (isNaN(d.getTime())) return null
  const edad = Math.floor((new Date() - d) / (365.25 * 24 * 60 * 60 * 1000))
  return Number.isFinite(edad) && edad >= 0 ? edad : null
}

export function formatCOP(val) {
  const num = Number(val)
  if (!Number.isFinite(num) || num <= 0) return '$0'
  return '$' + Math.round(num).toLocaleString('es-CO')
}

// Parámetros legales vigentes Colombia para contrato de aprendizaje (Etapa Lectiva 75% → Etapa Productiva 100% SMMLV + Auxilio de Transporte)
export const SMMLV_VIGENTE = 1750905
export const AUXILIO_TRANSPORTE_VIGENTE = 249095

/**
 * Sugiere el 100% del SMMLV para la Etapa Productiva:
 * Si el aprendiz viene con el 75% del SMMLV en Etapa Lectiva, calcula el 100% exacto (salario / 0.75)
 * cuando equivale a un SMMLV estándar; de lo contrario retorna SMMLV_VIGENTE.
 */
export function calcularApoyoProductivoSugerido(salarioActual) {
  const actual = Number(salarioActual) || 0
  if (actual > 700000 && actual < SMMLV_VIGENTE) {
    const estimado100 = Math.round(actual / 0.75)
    // Si el cálculo desde el 75% coincide con SMMLV vigente o anterior (con margen de redondeo de $10)
    if (Math.abs(estimado100 - SMMLV_VIGENTE) <= 10) return SMMLV_VIGENTE
    if (Math.abs(estimado100 - 1423500) <= 10) return 1423500
    if (Math.abs(estimado100 - 1300000) <= 10) return 1300000
  }
  return SMMLV_VIGENTE
}

export const EMPTY = {
  nombre_completo: '',
  tipo_documento: 'CC',
  numero_documento: '',
  fecha_nacimiento: '',
  tipo_sangre: '',
  correo: '',
  correo_personal: '',
  celular: '',
  direccion: '',
  barrio: '',
  municipio: '',
  dependencia: '',
  cargo: '',
  activo: true,
  fecha_primer_ingreso: '',
  fecha_terminacion_anterior: '',
  fecha_inicio_empresa_actual: '',
  fecha_ingreso: '',
  fecha_retiro: '',
  salario: '',
  auxilio_transporte: '',
  eps: '',
  pension: '',
  cesantias: '',
  banco: '',
  tipo_cuenta: 'Ahorros',
  numero_cuenta: '',
  contactos_emergencia: [],
  dias_vacaciones_tomados_manual: 0,
}