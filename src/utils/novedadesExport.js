import { exportarExcel } from './exportarExcel'
import { hoyISO } from './fecha'

// Columnas oficiales de la plantilla en el orden estricto exigido
export const COLUMNAS_PLANTILLA_NOVEDADES = [
  'Nombre',
  'Concepto',
  'Fecha inicio',
  'Fecha fin',
  'Total días',
  'Validación incapacidad',
  'Prórroga',
  'RADICACION INCAPACIDADES',
  'Dependencia',
  'Observación',
  'Observación contabilidad',
  'Nómina electrónica',
  'Seguridad social',
]

// Lista oficial de conceptos para Data Validation (Desplegables en Excel)
export const LISTA_CONCEPTOS_VALIDACION = [
  'Incapacidad',
  'Vacaciones',
  'LNR',
  'LR',
  '1/2 LR y 1/2 LNR',
  'Maternidad',
  'Paternidad',
  'Calamidad/Luto',
  'Renuncia',
  'Ingreso',
  'Terminación de Contrato',
  'Ascenso',
  'Cambio de Cargo',
  'Cambio de Área',
  'Suspensión',
  'Recargo Dominical o Festivos',
  'Ausente',
  'Otros',
]

// Lista oficial de opciones para validación contable y nómina
export const LISTA_VALIDACION_CONTABLE = [
  'OK-DIANA',
  'OK-ANDRES',
  'OK-ALEJANDRO',
  'VALIDAR',
]

export const VALIDACIONES_NOVEDADES = {
  'Concepto': LISTA_CONCEPTOS_VALIDACION,
  'Observación contabilidad': LISTA_VALIDACION_CONTABLE,
  'Nómina electrónica': LISTA_VALIDACION_CONTABLE,
  'Seguridad social': LISTA_VALIDACION_CONTABLE,
}

// Mapeo de una novedad hacia las 13 columnas de la plantilla oficial
export function filaAPlantillaNovedades(r) {
  let conceptoFinal = r.concepto || ''
  if (r.jornada === 'Medio día' && !conceptoFinal.startsWith('1/2')) {
    conceptoFinal = `1/2 ${conceptoFinal}`
  }

  return {
    'Nombre': r.nombre_empleado || '',
    'Concepto': conceptoFinal,
    'Fecha inicio': r.fecha_inicio ? String(r.fecha_inicio).slice(0, 10) : '',
    'Fecha fin': r.fecha_fin ? String(r.fecha_fin).slice(0, 10) : '',
    'Total días': r.total_dias != null ? Number(r.total_dias) : '',
    'Validación incapacidad': r.validacion_incapacidad || '',
    'Prórroga': r.prorroga || '',
    'RADICACION INCAPACIDADES': r.radicacion_incapacidad || '',
    'Dependencia': r.dependencia || '',
    'Observación': r.observacion || '',
    'Observación contabilidad': r.observacion_contabilidad || '',
    'Nómina electrónica': r.nomina_electronica || '',
    'Seguridad social': r.seguridad_social || '',
  }
}

// Exporta un conjunto de novedades (ej. las filtradas en pantalla) en el formato oficial
export function exportarNovedadesExcel(filas, label = '', empresa = 'AmeriGlobal') {
  const dataToExport = filas || []
  const filasMapeadas = dataToExport.map(filaAPlantillaNovedades)

  exportarExcel(filasMapeadas, {
    nombreHoja: 'Novedades',
    nombreArchivo: `Plantilla_Importar_Novedades_${empresa}_${label || hoyISO()}.xlsx`,
    marca: false, // Formato oficial de plantilla con encabezado en fila 1
    columnasDef: COLUMNAS_PLANTILLA_NOVEDADES,
    validaciones: VALIDACIONES_NOVEDADES,
  })
}

// Exporta TODOS los registros en el mismo formato oficial de plantilla
export function exportarNovedadesParaImportar(filas, empresa = 'AmeriGlobal') {
  const dataToExport = filas || []
  const filasMapeadas = dataToExport.map(filaAPlantillaNovedades)

  exportarExcel(filasMapeadas, {
    nombreHoja: 'Novedades',
    nombreArchivo: `Plantilla_Importar_Novedades_${empresa}_${hoyISO()}.xlsx`,
    marca: false,
    columnasDef: COLUMNAS_PLANTILLA_NOVEDADES,
    validaciones: VALIDACIONES_NOVEDADES,
  })
}