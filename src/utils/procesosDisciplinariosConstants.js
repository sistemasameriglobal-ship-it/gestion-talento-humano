export const PAGE_SIZE = 15
export const UMBRAL_ALERTA = 3 // 3 o más procesos → alerta

// Conceptos disponibles, color de acento y si usan rango de fechas (inicio/fin) o una sola fecha
export const CONCEPTOS = [
  { id: 'Falta Reglamento Interno', icon: '📕', color: '#DC2626', rango: false },
  { id: 'Productividad', icon: '📉', color: '#7C3AED', rango: true },
]
export const CONCEPTO_MAP = {
  ...Object.fromEntries(CONCEPTOS.map(c => [c.id, c])),
  // Compatibilidad con registros históricos en base de datos
  'Disciplina (Llegadas tarde)': { id: 'Falta Reglamento Interno', label: 'Falta Reglamento Interno', icon: '📕', color: '#DC2626', rango: false, legacyId: 'Disciplina (Llegadas tarde)' },
  'Citación a Descargos': { id: 'Citación a Descargos', label: 'Citación a Descargos', icon: '📨', color: '#2563EB', rango: false, legacyId: 'Citación a Descargos' },
}

export { DEPENDENCIAS as DEPARTAMENTOS } from '../constants'

// Bucket privado de Supabase Storage para los PDF adjuntos
export const BUCKET_ADJUNTOS = 'procesos-disciplinarios'
export const MAX_ADJUNTO_MB = 10

export const EMPTY = {
  nombre_empleado: '', concepto: CONCEPTOS[0].id, departamento: '',
  fecha: '', fecha_inicio: '', fecha_fin: '', hora: '', observacion: '', archivos: [],
}

// Normaliza nombres para que el conteo de reincidencia no se rompa por
// mayúsculas/espacios extra (p.ej. "Juan Pérez" vs "juan perez ")
export const normalizeNombre = (s) => (s || '').trim().toLowerCase()

// Paleta de alerta centralizada (evita repetir los mismos hex por todo el archivo)
export const ALERT = {
  bg: 'var(--danger-bg)', bgStrong: 'var(--danger-bg)', border: 'color-mix(in srgb, var(--danger) 35%, transparent)', text: 'var(--danger-text)', solid: '#DC2626',
}

// Formatea un tamaño en bytes a una etiqueta legible (KB / MB)
export const formatTamano = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
