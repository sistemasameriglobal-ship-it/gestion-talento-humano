import { useState } from 'react'
import * as novedadesApi from '../api/novedades'
import * as vacacionesApi from '../api/vacaciones'
import {
  normalizarConceptoImportado, parseFechaImportada, normalizarNombre, levenshtein,
} from '../utils/novedadesImport'
import { detectarIndicesEncabezadoNovedades } from '../utils/parseExcel'

const clean = v => { const t = (v || '').toString().trim(); return (!t || t.toUpperCase() === 'N/A' || t === '—' || t === '-') ? null : t }

// Hook que encapsula toda la importación masiva desde Excel: parseo de filas,
// detección dinámica de encabezados, armado de la vista previa, y la confirmación
// que inserta los registros conectando el modelo relacional.
export function useImportacionExcel({ empleadosIndex, load }) {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importConfirming, setImportConfirming] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const parsearFilaImport = (row, colIndices) => {
    // Si tenemos encabezados detectados dinámicamente, usamos sus índices; si no, posiciones estándar
    const idxNombre = colIndices?.nombre !== undefined ? colIndices.nombre : 0
    const idxConcepto = colIndices?.concepto !== undefined ? colIndices.concepto : 1
    const idxInicio = colIndices?.fecha_inicio !== undefined ? colIndices.fecha_inicio : 2
    const idxFin = colIndices?.fecha_fin !== undefined ? colIndices.fecha_fin : 3
    const idxTotal = colIndices?.total_dias !== undefined ? colIndices.total_dias : 4
    const idxDinero = colIndices?.dias_en_dinero !== undefined ? colIndices.dias_en_dinero : 5
    const idxValidacion = colIndices?.validacion_incapacidad !== undefined ? colIndices.validacion_incapacidad : (colIndices ? null : 5)
    const idxDep = colIndices?.dependencia !== undefined ? colIndices.dependencia : (row[8] !== undefined ? 8 : 7)
    const idxObs = colIndices?.observacion !== undefined ? colIndices.observacion : (row[9] !== undefined ? 9 : 8)
    const idxObsCont = colIndices?.observacion_contabilidad !== undefined ? colIndices.observacion_contabilidad : (row[10] !== undefined ? 10 : 9)
    const idxNomina = colIndices?.nomina_electronica !== undefined ? colIndices.nomina_electronica : (row[11] !== undefined ? 11 : 10)
    const idxSegSocial = colIndices?.seguridad_social !== undefined ? colIndices.seguridad_social : (row[12] !== undefined ? 12 : 11)

    const nombre = (row[idxNombre] || '').toString().trim()
    const conceptoRaw = (row[idxConcepto] || '').toString().trim()
    if (!nombre || !conceptoRaw) {
      return { omitir: true, motivoOmision: 'Falta nombre o concepto', filaOriginal: row }
    }

    // Validar que el empleado exista en Empleados antes de seguir
    const nombreNormalizado = normalizarNombre(nombre)
    const nombreEnBD = empleadosIndex.get(nombreNormalizado)
    if (!nombreEnBD) {
      let sugerencia = null
      let mejorDistancia = Infinity
      for (const [norm, original] of empleadosIndex) {
        const dist = levenshtein(nombreNormalizado, norm)
        if (dist < mejorDistancia) { mejorDistancia = dist; sugerencia = original }
      }
      const umbral = nombreNormalizado.length <= 8 ? 1 : 3
      const motivo = (sugerencia && mejorDistancia <= umbral)
        ? `"${nombre}" no existe en Empleados (¿quisiste decir "${sugerencia}"?)`
        : `"${nombre}" no existe en el directorio de Empleados`
      return { omitir: true, motivoOmision: motivo, filaOriginal: row }
    }

    const fecha_inicio = parseFechaImportada(row[idxInicio])
    let fecha_fin = parseFechaImportada(row[idxFin])
    const { concepto, medioDia, observacionExtra } = normalizarConceptoImportado(conceptoRaw)
    if (medioDia && !fecha_fin) fecha_fin = fecha_inicio

    let total_dias = null
    if (medioDia) {
      total_dias = 0.5
    } else {
      const totalRaw = (row[idxTotal] || '').toString().trim()
      if (totalRaw) {
        const n = parseFloat(totalRaw.replace(',', '.'))
        total_dias = isNaN(n) ? null : n
      } else if (fecha_inicio && fecha_fin) {
        total_dias = Math.round((new Date(fecha_fin) - new Date(fecha_inicio)) / 86400000) + 1
      }
    }

    // Extracción de días en dinero si la columna existe en el archivo
    let dias_en_dinero = null
    const dineroRaw = idxDinero !== null && row[idxDinero] !== undefined ? (row[idxDinero] || '').toString().trim() : ''
    if (dineroRaw && !isNaN(parseFloat(dineroRaw.replace(',', '.')))) {
      const n = parseFloat(dineroRaw.replace(',', '.'))
      if (n > 0) dias_en_dinero = n
    }

    const dependencia = (row[idxDep] || '').toString().trim().toUpperCase() || null
    let observacion = (row[idxObs] || '').toString().trim()
    if (observacionExtra) observacion = observacion ? `${observacion} — ${observacionExtra}` : observacionExtra

    const periodo = fecha_inicio ? `${fecha_inicio.slice(0, 4)}-${parseInt(fecha_inicio.slice(5, 7), 10)}` : null

    const payload = {
      nombre_empleado: nombreEnBD,
      concepto,
      fecha_inicio,
      fecha_fin: fecha_fin || null,
      total_dias,
      dias_en_dinero,
      dependencia,
      observacion: observacion || null,
      observacion_contabilidad: idxObsCont !== null ? clean(row[idxObsCont]) : null,
      validacion_incapacidad: idxValidacion !== null ? clean(row[idxValidacion]) : null,
      radicacion_incapacidad: null,
      prorroga: null,
      nomina_electronica: idxNomina !== null ? clean(row[idxNomina]) : null,
      seguridad_social: idxSegSocial !== null ? clean(row[idxSegSocial]) : null,
      periodo,
      jornada: medioDia ? 'Medio día' : null,
    }

    const advertencias = []
    if (concepto === 'Otros') advertencias.push(`Concepto no reconocido: "${conceptoRaw}" → se guardará como "Otros"`)
    if (!fecha_inicio) advertencias.push('Sin fecha de inicio válida')

    return { omitir: false, conceptoOriginal: conceptoRaw, payload, advertencias }
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      let raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      if (!raw || !raw.length) {
        setImportResult({ error: 'El archivo Excel no contiene filas con datos.' })
        return
      }

      // Quitar filas completamente vacías
      raw = raw.filter(row => row.some(v => (v || '').toString().trim() !== ''))
      if (!raw.length) {
        setImportResult({ error: 'El archivo no tiene filas con datos para importar.' })
        return
      }

      // Detectar dinámicamente si la primera fila es encabezado
      let colIndices = null
      const encabezadosDetectados = detectarIndicesEncabezadoNovedades(raw[0])
      if (encabezadosDetectados) {
        colIndices = encabezadosDetectados
        raw = raw.slice(1)
      } else {
        const first0 = (raw[0][0] || '').toString().trim().toLowerCase()
        const first1 = (raw[0][1] || '').toString().trim().toLowerCase()
        if (['nombre', 'empleado', 'nombre completo', 'nombre_empleado', 'colaborador'].includes(first0) || first1 === 'concepto') {
          raw = raw.slice(1)
        }
      }

      const filas = raw.map(row => parsearFilaImport(row, colIndices))
      if (!filas.length) {
        setImportResult({ error: 'El archivo no tiene filas con datos para importar.' })
      } else {
        setImportPreview(filas)
      }
    } catch (err) {
      setImportResult({ error: err.message || 'Error al leer el archivo.' })
    } finally {
      setImporting(false)
      setFileInputKey(k => k + 1)
    }
  }

  // Se ejecuta solo cuando el usuario confirma desde el modal de vista previa
  const confirmarImportacion = async () => {
    if (!importPreview) return
    setImportConfirming(true)
    let creadas = 0, errores = 0
    const otrosDetectados = []
    try {
      for (const fila of importPreview) {
        if (fila.omitir) continue
        const { payload, conceptoOriginal } = fila
        if (payload.concepto === 'Otros') otrosDetectados.push(conceptoOriginal)

        const { error } = await novedadesApi.crearNovedad(payload)
        if (error) { errores++; continue }
        creadas++

        // Si el concepto es "Vacaciones", se sincroniza con la tabla vacaciones
        if (payload.concepto === 'Vacaciones' && payload.fecha_inicio) {
          const { data: existentes } = await vacacionesApi.buscarVacacionPorEmpleadoYFecha(
            payload.nombre_empleado, payload.fecha_inicio
          )
          const vacacionPayload = {
            nombre_empleado: payload.nombre_empleado,
            dependencia: payload.dependencia,
            fecha_inicio: payload.fecha_inicio,
            fecha_fin: payload.fecha_fin,
            total_dias: payload.total_dias,
            tipo_vacacion: payload.dias_en_dinero && !payload.total_dias ? 'Vacaciones en dinero' : 'Vacaciones',
            estado: 'Pendiente',
            observacion_contable: payload.observacion,
            dias_en_dinero: payload.dias_en_dinero || null,
          }
          if (existentes && existentes.length > 0) {
            await vacacionesApi.actualizarVacacion(existentes[0].id, vacacionPayload)
          } else {
            await vacacionesApi.crearVacacion(vacacionPayload)
          }
        }
      }
      const omitidas = importPreview.filter(f => f.omitir).length
      setImportResult({ creadas, omitidas, errores, otros: otrosDetectados })
      setImportPreview(null)
      await load()
    } catch (err) {
      setImportResult({ error: err.message || 'Error al importar.' })
    } finally {
      setImportConfirming(false)
    }
  }

  const cancelarImportacion = () => setImportPreview(null)

  return {
    importing,
    importResult, setImportResult,
    importPreview,
    importConfirming,
    fileInputKey,
    handleImportFile,
    confirmarImportacion,
    cancelarImportacion,
  }
}
