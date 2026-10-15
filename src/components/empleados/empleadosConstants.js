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
  'Calamidad/Luto', 'Día Familia', 'Hospitalización', 'Embargo', 'Otro',
]

export const EMPTY = {
  nombre_completo: '', correo: '', dependencia: '', activo: true,
  cargo: '', fecha_ingreso: '', fecha_retiro: '', dias_vacaciones_tomados_manual: 0,
}