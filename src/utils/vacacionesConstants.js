import { hoyISO } from './fecha'
import { MESES_MAYUSCULA as MESES, ANIOS, DEPENDENCIAS } from '../constants'

export { MESES, ANIOS, DEPENDENCIAS }

export const PAGE_SIZE = 15

export const ESTADOS = ['Pendiente', 'Aprobada', 'En curso', 'Finalizada', 'Cancelada']

export const ESTADO_STYLES = {
  'Pendiente': { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'color-mix(in srgb, var(--warning) 40%, transparent)' },
  'Aprobada': { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'color-mix(in srgb, var(--success) 35%, transparent)' },
  'En curso': { bg: 'var(--info-bg)', color: 'var(--info-text)', border: 'color-mix(in srgb, var(--info) 35%, transparent)' },
  'Finalizada': { bg: 'var(--bg)', color: '#374151', border: '#D1D5DB' },
  'Cancelada': { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'color-mix(in srgb, var(--danger) 35%, transparent)' },
}

export const EMPTY = {
  nombre_empleado: '', dependencia: '',
  periodo_vacaciones: '',
  fecha_inicio: '', fecha_fin: '', total_dias: '',
  dias_disfrutados: '', dias_en_dinero: '',
  anio: '', mes_inicio: '',
  tipo_vacacion: 'Vacaciones', estado: 'Pendiente',
  observacion: '', observacion_contable: '', aprobado_por: '',
  fecha_solicitud: hoyISO(),
  fecha_ingreso: '',
  periodo_id: null,
}

export const TIPOS_VACACION = ['Vacaciones', 'Vacaciones en dinero', 'Vacaciones compensadas']

export const TIPO_STYLES = {
  'Vacaciones': { bg: 'var(--info-bg)', color: 'var(--info-text)', border: 'color-mix(in srgb, var(--info) 30%, transparent)' },
  'Vacaciones en dinero': { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'color-mix(in srgb, var(--warning) 40%, transparent)' },
  'Vacaciones compensadas': { bg: 'var(--purple-bg)', color: 'var(--purple-text)', border: 'color-mix(in srgb, var(--purple) 30%, transparent)' },
}
