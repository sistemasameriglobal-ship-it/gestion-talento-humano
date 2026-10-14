import { useState } from 'react'
import * as novedadesApi from '../api/novedades'
import * as vacacionesApi from '../api/vacaciones'
import {
  normalizarConceptoImportado, parseFechaImportada, normalizarNombre, levenshtein,
} from '../utils/novedadesImport'
import { detectarIndicesEncabezadoNovedades } from '../utils/parseExcel'

const clean = v => { const t = (v || '').toString().trim(); return (!t || t.toUpperCase() === 'N/A' || t === '—' || t === '-') ? null : t }

// Hook que encapsula la importación masiva desde Excel según la plantilla oficial:
// lectura de la hoja 'Novedades', omisión de notas/ejemplos, mapeo a campos
// de BD y resolución relacional automática.
export function useImportacionExcel({ empleadosIndex, load, currentCompany = 'ameriglobal' }) {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importConfirming, setImportConfirming] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const parsearFilaImport = (row, colIndices) => {
    // Si tenemos encabezados detectados dinámicamente, usamos sus índices;
    // de lo contrario, aplicamos las posiciones de la plantilla oficial (13 columnas):
    // 0: Nombre, 1: Concepto, 2: Fecha inicio, 3: Fecha fin, 4: Total días,
    // 5: Validación incapacidad, 6: Prórroga, 7: RADICACION INCAPACIDADES,
    // 8: Dependencia, 9: Observación, 10: Observación contabilidad, 11: Nómina electrónica, 12: Seguridad social
    const idxNombre = colIndices?.nombre !== undefined ? colIndices.nombre : 0
    const idxConcepto = colIndices?.concepto !== undefined ? colIndices.concepto : 1
    const idxInicio = colIndices?.fecha_inicio !== undefined ? colIndices.fecha_inicio : 2
    const idxFin = colIndices?.fecha_fin !== undefined ? colIndices.fecha_fin : 3
    const idxTotal = colIndices?.total_dias !== undefined ? colIndices.total_dias : 4
    const idxValidacion = colIndices?.validacion_incapacidad !== undefined ? colIndices.validacion_incapacidad : 5
    const idxProrroga = colIndices?.prorroga !== undefined ? colIndices.prorroga : 6
    const idxRadicacion = colIndices?.radicacion_incapacidad !== undefined ? colIndices.radicacion_incapacidad : 7
    const idxDep = colIndices?.dependencia !== undefined ? colIndices.dependencia : 8
    const idxObs = colIndices?.observacion !== undefined ? colIndices.observacion : 9
    const idxObsCont = colIndices?.observacion_contabilidad !== undefined ? colIndices.observacion_contabilidad : 10
    const idxNomina = colIndices?.nomina_electronica !== undefined ? colIndices.nomina_electronica : 11
    const idxSegSocial = colIndices?.seguridad_social !== undefined ? colIndices.seguridad_social : 12

    const nombre = (row[idxNombre] || '').toString().trim()
    const conceptoRaw = (row[idxConcepto] || '').toString().trim()
    if (!nombre || !conceptoRaw) {
      return { omitir: true, motivoOmision: 'Falta nombre o concepto', filaOriginal: row }
    }

    // Validar que el empleado exista en el catálogo de Empleados
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
      dependencia,
      observacion: observacion || null,
      observacion_contabilidad: idxObsCont !== null ? clean(row[idxObsCont]) : null,
      validacion_incapacidad: idxValidacion !== null ? clean(row[idxValidacion]) : null,
      prorroga: idxProrroga !== null ? clean(row[idxProrroga]) : null,
      radicacion_incapacidad: idxRadicacion !== null ? clean(row[idxRadicacion]) : null,
      nomina_electronica: idxNomina !== null ? clean(row[idxNomina]) : null,
      seguridad_social: idxSegSocial !== null ? clean(row[idxSegSocial]) : null,
      periodo,
      jornada: medioDia ? 'Medio día' : null,
      empresa: currentCompany,
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

      // 1. Priorizar lectura de la hoja oficial 'Novedades' (sin importar mayúsculas/minúsculas)
      const sheetName = wb.SheetNames.find(n => n.trim().toLowerCase() === 'novedades') || wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      let raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      if (!raw || !raw.length) {
        setImportResult({ error: `El archivo no contiene filas legibles en la hoja "${sheetName}".` })
        return
      }

      // Quitar filas completamente vacías
      raw = raw.filter(row => row.some(v => (v || '').toString().trim() !== ''))
      if (!raw.length) {
        setImportResult({ error: 'El archivo no tiene filas con datos para importar.' })
        return
      }

      // 2. Detectar dinámicamente la fila de encabezados examinando las primeras filas
      let colIndices = null
      let headerRowIdx = -1

      for (let i = 0; i < Math.min(raw.length, 6); i++) {
        const detected = detectarIndicesEncabezadoNovedades(raw[i])
        if (detected) {
          colIndices = detected
          headerRowIdx = i
          break
        }
      }

      let dataRows = []
      if (headerRowIdx >= 0) {
        dataRows = raw.slice(headerRowIdx + 1)
      } else {
        const first0 = (raw[0][0] || '').toString().trim().toLowerCase()
        const first1 = (raw[0][1] || '').toString().trim().toLowerCase()
        if (['nombre', 'empleado', 'nombre completo', 'nombre_empleado', 'colaborador'].includes(first0) || first1 === 'concepto') {
          dataRows = raw.slice(1)
        } else {
          dataRows = raw
        }
      }

      // 3. Ignorar filas de ejemplo explicativas, notas o instrucciones de la plantilla
      const dataRowsLimpias = dataRows.filter(row => {
        const idxNombre = colIndices?.nombre !== undefined ? colIndices.nombre : 0
        const nombreVal = (row[idxNombre] || '').toString().trim().toLowerCase()
        if (!nombreVal) return false
        if (
          nombreVal.startsWith('ejemplo') ||
          nombreVal.startsWith('nota') ||
          nombreVal.startsWith('instrucci') ||
          nombreVal.startsWith('formato') ||
          nombreVal.startsWith('atencion') ||
          nombreVal.includes('seleccione')
        ) {
          return false
        }
        return true
      })

      const filas = dataRowsLimpias.map(row => parsearFilaImport(row, colIndices))
      if (!filas.length) {
        setImportResult({ error: 'El archivo no tiene filas de datos válidas para importar.' })
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

        const { error } = await novedadesApi.crearNovedad(payload, currentCompany)
        if (error) { errores++; continue }
        creadas++

        // Si el concepto es "Vacaciones", sincronizar con la tabla vacaciones
        if (payload.concepto === 'Vacaciones' && payload.fecha_inicio) {
          const { data: existentes } = await vacacionesApi.buscarVacacionPorEmpleadoYFecha(
            payload.nombre_empleado, payload.fecha_inicio, currentCompany
          )
          const vacacionPayload = {
            nombre_empleado: payload.nombre_empleado,
            dependencia: payload.dependencia,
            fecha_inicio: payload.fecha_inicio,
            fecha_fin: payload.fecha_fin,
            total_dias: payload.total_dias,
            tipo_vacacion: 'Vacaciones',
            estado: 'Pendiente',
            observacion_contable: payload.observacion,
            empresa: currentCompany,
          }
          if (existentes && existentes.length > 0) {
            await vacacionesApi.actualizarVacacion(existentes[0].id, vacacionPayload)
          } else {
            await vacacionesApi.crearVacacion(vacacionPayload, currentCompany)
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
