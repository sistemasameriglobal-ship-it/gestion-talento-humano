// ── Constantes de la página Novedades ───────────────────────────────────────
// Listas de valores fijos, formulario vacío y utilidades de persistencia
// local que usa Novedades.jsx. Se separaron aquí para que el componente
// principal no cargue con datos estáticos que no cambian entre renders.

import { MESES_OPCIONES as MESES, DEPENDENCIAS_EXTENDIDAS as DEPENDENCIAS } from '../constants'

export { MESES }

export const CONCEPTOS_LIST = [
  'Incapacidad', 'Vacaciones', 'LNR', 'LR', '1/2 LR y 1/2 LNR', 'Maternidad', 'Paternidad',
  'Calamidad/Luto', 'Renuncia', 'Ingreso', 'Terminación de Contrato', 'No renovación de contrato', 'Despido con justa causa', 'Despido sin justa causa', 'Terminación periodo de prueba', 'Ascenso', 'Cambio de Cargo', 'Cambio de Área', 'Ajuste Salarial', 'Paso a Etapa Productiva', 'Sustitución Patronal', 'Suspensión', 'Horas extras con recargos', 'Ausente', 'Falta Reglamento Interno', 'Productividad', 'Otros'
]
export const CONCEPTOS_SIN_FECHAS = []
export const PAGE_SIZE = 15

export const DEPENDENCIAS_INICIALES = [...DEPENDENCIAS]

export const ICONOS = {
  'Incapacidad': '🏥', 'Vacaciones': '🌴', 'LNR': '📋', 'LR': '📁', '1/2 LR y 1/2 LNR': '🕐',
  'Maternidad': '👶', 'Paternidad': '👨‍👦', 'Calamidad/Luto': '🖤',
  'Renuncia/Retiro': '🚪', 'Renuncia': '🚪', 'Ingreso': '🎉', 'Terminación de Contrato': '📤',
  'No renovación de contrato': '📄', 'Despido con justa causa': '📤', 'Despido sin justa causa': '📤', 'Terminación periodo de prueba': '⏱️',
  'Ascenso': '⭐', 'Cambio de Cargo': '🔄', 'Cambio de Área': '🔄', 'Ajuste Salarial': '💰',
  'Paso a Etapa Productiva': '🎓', 'Sustitución Patronal': '🏛️',
  'Suspensión': '⏸', 'Día Familia': '👨‍👩‍👧', 'Hospitalización': '🏨',
  'Embargo': '⚖️', 'Horas extras con recargos': '💰', 'Recargo Dominical o Festivos': '💰', 'Ausente': '🚫',
  'Falta Reglamento Interno': '📕', 'Productividad': '📉'
}

export const EMPTY = {
  nombre_empleado: '', concepto: 'Incapacidad', fecha_inicio: '', fecha_fin: '',
  total_dias: '', dependencia: '', observacion: '', observacion_contabilidad: '',
  validacion_incapacidad: '', radicacion_incapacidad: '', prorroga: '',
  nomina_electronica: '', seguridad_social: '', periodo: '', diagnostico: '', jornada: '',
  dias_en_dinero: '', dias_disfrutados: ''
}

// ── localStorage para dependencias extra ──────────────────────────────────
const LS_DEPS = 'ameriglobal_deps_extra'
export function loadExtraDeps(base) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_DEPS) || '[]')
    const combined = [...base]
    saved.forEach(s => { if (!combined.includes(s)) combined.push(s) })
    return combined
  } catch { return base }
}
export function saveExtraDeps(base, current) {
  const extra = current.filter(x => !base.includes(x))
  localStorage.setItem(LS_DEPS, JSON.stringify(extra))
}
