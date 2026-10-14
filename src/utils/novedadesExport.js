import { exportarExcel } from './exportarExcel'
import { hoyISO } from './fecha'

export const COLUMNAS_NOVEDADES_REPORTE = [
  'Colaborador',
  'Concepto',
  'Jornada',
  'Fecha Inicio',
  'Fecha Fin',
  'Total Días',
  'Días en Tiempo',
  'Días en Dinero',
  'Periodo',
  'Dependencia/Área',
  'Observación',
  'Observación Contabilidad',
  'Validación Incapacidad',
  'Nómina Electrónica',
  'Seguridad Social',
  'Empresa',
]

export const COLUMNAS_NOVEDADES_IMPORTACION = [
  'Nombre',
  'Concepto',
  'Fecha inicio',
  'Fecha fin',
  'Total días',
  'Días en dinero',
  'Validación incapacidad',
  'Dependencia',
  'Observación',
  'Observación contabilidad',
  'Nómina electrónica',
  'Seguridad social',
]

// Mapeo al formato de importación estándar (para editar en bloque y volver a subir)
export function filaAFormatoImportacion(r) {
  return {
    'Nombre': r.nombre_empleado || '',
    'Concepto': r.jornada === 'Medio día' ? `1/2 ${r.concepto}` : (r.concepto || ''),
    'Fecha inicio': r.fecha_inicio ? String(r.fecha_inicio).slice(0, 10) : '',
    'Fecha fin': r.fecha_fin ? String(r.fecha_fin).slice(0, 10) : '',
    'Total días': r.total_dias ?? '',
    'Días en dinero': r.dias_en_dinero ?? '',
    'Validación incapacidad': r.validacion_incapacidad || '',
    'Dependencia': r.dependencia || '',
    'Observación': r.observacion || '',
    'Observación contabilidad': r.observacion_contabilidad || '',
    'Nómina electrónica': r.nomina_electronica || '',
    'Seguridad social': r.seguridad_social || '',
  }
}

// Exporta un conjunto de novedades con diseño profesional y columnas completas
export function exportarNovedadesExcel(filas, label = '', empresa = 'AmeriGlobal') {
  const dataToExport = filas || []
  const filasMapeadas = dataToExport.map(r => {
    return {
      'Colaborador': r.nombre_empleado || '—',
      'Concepto': r.concepto || '—',
      'Jornada': r.jornada || 'Día completo',
      'Fecha Inicio': r.fecha_inicio ? String(r.fecha_inicio).slice(0, 10) : '—',
      'Fecha Fin': r.fecha_fin ? String(r.fecha_fin).slice(0, 10) : '—',
      'Total Días': r.total_dias != null ? Number(r.total_dias) : '—',
      'Días en Tiempo': r.dias_disfrutados != null && r.dias_disfrutados !== '' ? Number(r.dias_disfrutados) : '—',
      'Días en Dinero': r.dias_en_dinero != null && r.dias_en_dinero !== '' ? Number(r.dias_en_dinero) : '—',
      'Periodo': r.periodo || '—',
      'Dependencia/Área': r.dependencia || '—',
      'Observación': r.observacion || '—',
      'Observación Contabilidad': r.observacion_contabilidad || '—',
      'Validación Incapacidad': r.validacion_incapacidad || '—',
      'Nómina Electrónica': r.nomina_electronica || '—',
      'Seguridad Social': r.seguridad_social || '—',
      'Empresa': r.empresa || empresa || 'AmeriGlobal',
    }
  })

  exportarExcel(filasMapeadas, {
    nombreHoja: 'Novedades',
    nombreArchivo: `Novedades_${empresa}_${label || hoyISO()}.xlsx`,
    titulo: `Registro de Novedades - ${empresa}`,
    marca: true,
    columnasDef: COLUMNAS_NOVEDADES_REPORTE,
  })
}

// Exporta TODOS los registros (sin importar filtros activos), pensado para
// editar en bloque en Excel y volver a subirlo con "Importar Excel".
export function exportarNovedadesParaImportar(filas, empresa = 'AmeriGlobal') {
  const dataToExport = filas || []
  exportarExcel(dataToExport.map(filaAFormatoImportacion), {
    nombreHoja: 'Novedades',
    nombreArchivo: `Novedades_ParaImportar_${empresa}_${hoyISO()}.xlsx`,
    marca: false, // este archivo se vuelve a subir con "Importar Excel": encabezado en fila 1
    columnasDef: COLUMNAS_NOVEDADES_IMPORTACION,
  })
}