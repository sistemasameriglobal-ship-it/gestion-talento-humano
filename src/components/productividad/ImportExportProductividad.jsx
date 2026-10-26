// =============================================================
// ImportExportProductividad.jsx
// -------------------------------------------------------------
// Botones "Exportar para importar" + "Importar Excel" de las 3 secciones
// de Productividad (Ventas, UW-BS y Cierre), con vista previa antes de
// guardar. Funciona igual que en Novedades: nada se guarda hasta que la
// persona confirma. La lógica de lectura/validación vive en
// utils/productividadImport.js; cada sección solo aporta cómo guardar.
// =============================================================
import { useMemo, useState, useEffect } from 'react'
import { useCompany } from '../../context/CompanyContext'
import { Download, Upload, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { calcPct } from '../../utils/productividadHelpers'
import {
  ANCHOS_CLIENTES, ANCHOS_CIERRE, filasInstrucciones, indexarEmpleados,
  parsearImportProductividad, estadoContraExistente,
} from '../../utils/productividadImport'

const ESTADO_TXT = {
  nuevo: { txt: 'Nuevo', cls: 'pr-imp-tag--nuevo' },
  actualiza: { txt: 'Actualiza', cls: 'pr-imp-tag--actualiza' },
  igual: { txt: 'Sin cambios', cls: 'pr-imp-tag--igual' },
  desconocido: { txt: 'Se guardará', cls: 'pr-imp-tag--nuevo' },
}
const fmt = (n) => (n === undefined ? '—' : Number(n).toLocaleString('es-CO'))

export default function ImportExportProductividad({
  modo,            // 'clientes' | 'cierre'
  etiqueta,        // nombre de la sección (Ventas, UW - BS, Cierre)
  anio,            // año abierto en pantalla (año por defecto al importar)
  nombres,         // empleados activos de la sección (para validar el archivo)
  filasExport,     // () => filas del Excel "para importar"
  existentes,      // (nombre, anio, mes) => valores guardados | null | undefined
  onImportar,      // async (payloads[]) => guardar (lanza error si falla)
}) {
  const { companyConfig } = useCompany()
  const [exportando, setExportando] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [preview, setPreview] = useState(null) // { filas, ignoradasVacias }
  const [errorModal, setErrorModal] = useState(null)
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'error', texto }
  const [fileKey, setFileKey] = useState(0)
  const esCierre = modo === 'cierre'

  const empleadosIndex = useMemo(() => indexarEmpleados(nombres), [nombres])

  // El aviso se cierra solo a los 9 s
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 9000)
    return () => clearTimeout(t)
  }, [aviso])

  async function exportarParaImportar() {
    if (exportando) return
    setExportando(true)
    try {
      const { crearLibro, crearHoja, descargarWorkbook } = await import('../../utils/exportarExcel')
      const wb = await crearLibro()
      // marca:false → el encabezado queda en la fila 1 (el importador lo necesita ahí)
      await crearHoja(wb, 'Datos', filasExport(), { anchosColumnas: esCierre ? ANCHOS_CIERRE : ANCHOS_CLIENTES, marca: false })
      await crearHoja(wb, 'Instrucciones', filasInstrucciones(modo), { anchosColumnas: [26, 95], marca: false })
      const seccion = etiqueta.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const empNombre = (companyConfig?.nombre || 'AmeriGlobal').replace(/[^a-zA-Z0-9_-]/g, '_')
      await descargarWorkbook(wb, `${empNombre}_Productividad_${seccion}_${anio}_ParaImportar_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error(err)
      setAviso({ tipo: 'error', texto: err.message || 'No se pudo exportar el archivo.' })
    } finally {
      setExportando(false)
    }
  }

  async function leerArchivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLeyendo(true)
    setAviso(null)
    try {
      // xlsx se descarga solo cuando se va a importar un archivo
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const res = parsearImportProductividad(raw, { modo, empleadosIndex, anioDefault: anio })
      if (!res.filas.length) {
        setAviso({ tipo: 'error', texto: res.ignoradasVacias
          ? 'El archivo no trae valores para importar (todas las filas tienen los valores en blanco).'
          : 'El archivo no tiene filas con datos para importar.' })
      } else {
        setErrorModal(null)
        setPreview(res)
      }
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message || 'Error al leer el archivo.' })
    } finally {
      setLeyendo(false)
      setFileKey(k => k + 1)
    }
  }

  // Filas de la vista previa con su estado frente a lo ya guardado
  const filasPreview = useMemo(() => {
    if (!preview) return []
    return preview.filas.map(f => f.omitir ? f : {
      ...f, estado: estadoContraExistente(f.payload, existentes(f.payload.nombre, f.payload.anio, f.payload.mes), modo),
    })
  }, [preview, existentes, modo])

  const validas = filasPreview.filter(f => !f.omitir)
  const aGuardar = validas.filter(f => f.estado !== 'igual')
  const omitidas = filasPreview.filter(f => f.omitir)
  const conAdvertencia = validas.filter(f => f.advertencias.length > 0)
  const cuenta = (est) => validas.filter(f => f.estado === est).length

  async function confirmar() {
    if (!aGuardar.length) { setPreview(null); setAviso({ tipo: 'ok', texto: 'No hay nada que guardar: todos los valores del archivo ya estaban registrados.' }); return }
    setConfirmando(true)
    setErrorModal(null)
    try {
      await onImportar(aGuardar.map(f => f.payload))
      const anios = [...new Set(aGuardar.map(f => f.payload.anio))].sort().join(', ')
      const igual = cuenta('igual')
      setAviso({
        tipo: 'ok',
        texto: `Importación lista: ${aGuardar.length} registro${aGuardar.length !== 1 ? 's' : ''} guardado${aGuardar.length !== 1 ? 's' : ''} (año${anios.includes(',') ? 's' : ''} ${anios})`
          + (igual ? ` · ${igual} sin cambios` : '') + (omitidas.length ? ` · ${omitidas.length} omitida${omitidas.length !== 1 ? 's' : ''}` : '') + '.',
      })
      setPreview(null)
    } catch (err) {
      console.error(err)
      setErrorModal(err.message || 'No se pudo importar. No se guardó nada nuevo; intenta de nuevo.')
    } finally {
      setConfirmando(false)
    }
  }

  const cerrar = () => { if (!confirmando) { setPreview(null); setErrorModal(null) } }

  return (
    <>
      <button
        className="pr-btn pr-btn--ghost"
        style={{ padding: '7px 14px', fontSize: 12 }}
        onClick={exportarParaImportar}
        disabled={exportando || nombres.length === 0}
        title={`Descarga ${etiqueta} en el mismo formato que usa "Importar Excel": una fila por persona y mes, lista para editar en bloque y volver a subir.`}
      >
        {exportando ? <Loader2 size={13} className="pr-refresh--spin" /> : <Download size={13} />}
        {exportando ? 'Exportando…' : 'Exportar para importar'}
      </button>

      <label
        className="pr-btn pr-btn--ghost"
        style={{ padding: '7px 14px', fontSize: 12, cursor: leyendo || nombres.length === 0 ? 'not-allowed' : 'pointer', opacity: leyendo || nombres.length === 0 ? .6 : 1 }}
        title="Sube un Excel con el formato de 'Exportar para importar'. Verás una vista previa antes de guardar."
      >
        {leyendo ? <Loader2 size={13} className="pr-refresh--spin" /> : <Upload size={13} />}
        {leyendo ? 'Analizando…' : 'Importar Excel'}
        <input key={fileKey} type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivo} disabled={leyendo || nombres.length === 0} style={{ display: 'none' }} />
      </label>

      {aviso && (
        <div className={`pr-toast pr-toast--${aviso.tipo}`} role="status">
          {aviso.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{aviso.texto}</span>
          <button className="pr-modal-close" onClick={() => setAviso(null)} aria-label="Cerrar"><X size={14} /></button>
        </div>
      )}

      {preview && (
        <div className="pr-modal-overlay" onMouseDown={e => e.target === e.currentTarget && cerrar()}>
          <div className="pr-modal pr-modal--wide">
            <div className="pr-modal-head">
              <div>
                <div className="pr-modal-title">Vista previa de la importación · {etiqueta}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {preview.filas.length} fila{preview.filas.length !== 1 ? 's' : ''} leída{preview.filas.length !== 1 ? 's' : ''} — nada se ha guardado todavía.
                </div>
              </div>
              <button className="pr-modal-close" onClick={cerrar} disabled={confirmando}><X size={18} /></button>
            </div>

            <div className="pr-modal-body">
              {errorModal && <div className="pr-modal-error">{errorModal}</div>}

              <div className="pr-imp-pills">
                {cuenta('nuevo') + cuenta('desconocido') > 0 && <span className="pr-imp-pill pr-imp-pill--ok">✓ {cuenta('nuevo') + cuenta('desconocido')} nuevas</span>}
                {cuenta('actualiza') > 0 && <span className="pr-imp-pill pr-imp-pill--info">↻ {cuenta('actualiza')} actualizan valores</span>}
                {cuenta('igual') > 0 && <span className="pr-imp-pill pr-imp-pill--muted">= {cuenta('igual')} sin cambios (no se tocan)</span>}
                {conAdvertencia.length > 0 && <span className="pr-imp-pill pr-imp-pill--warn">⚠ {conAdvertencia.length} con advertencia (se importan igual)</span>}
                {omitidas.length > 0 && <span className="pr-imp-pill pr-imp-pill--bad">✕ {omitidas.length} se van a omitir</span>}
                {preview.ignoradasVacias > 0 && <span className="pr-imp-pill pr-imp-pill--muted">{preview.ignoradasVacias} fila{preview.ignoradasVacias !== 1 ? 's' : ''} sin valores ignorada{preview.ignoradasVacias !== 1 ? 's' : ''}</span>}
              </div>

              <div className="pr-table-scroll" style={{ maxHeight: '46vh', overflowY: 'auto' }}>
                <table className="pr-table pr-import-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Nombre</th><th>Año</th><th>Mes</th>
                      <th>Asignados</th><th>Resueltos</th><th>%</th>
                      {!esCierre && <th>Clientes en Frío</th>}
                      {!esCierre && <th>Total Resueltos</th>}
                      {esCierre && <><th>Monto total</th><th>Capital colocado</th></>}
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasPreview.map((f, i) => {
                      if (f.omitir) {
                        return (
                          <tr key={i} style={{ opacity: .6 }}>
                            <td>{i + 1}</td>
                            <td colSpan={esCierre ? 8 : 8}>{(f.filaOriginal || []).slice(0, 3).filter(c => c !== '' && c != null).join(' · ') || '(fila vacía)'}</td>
                            <td><span className="pr-imp-tag pr-imp-tag--omitida" title={f.motivoOmision}>Omitida — {f.motivoOmision}</span></td>
                          </tr>
                        )
                      }
                      const p = f.payload
                      const est = ESTADO_TXT[f.estado]
                      const totalGenFila = (Number(p.resueltos) || 0) + (Number(p.frios) || 0)
                      return (
                        <tr key={i}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 700 }}>{p.nombre}</td>
                          <td>{p.anio}</td>
                          <td>{p.mes}</td>
                          <td>{fmt(p.asignados)}</td>
                          <td>{fmt(p.resueltos)}</td>
                          <td>{p.asignados !== undefined && p.resueltos !== undefined && p.asignados > 0 ? `${calcPct(p.resueltos, p.asignados)}%` : '—'}</td>
                          {!esCierre && <td>{p.frios !== undefined ? fmt(p.frios) : '—'}</td>}
                          {!esCierre && <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(totalGenFila)}</td>}
                          {esCierre && <><td>{p.monto !== undefined ? `$ ${fmt(p.monto)}` : '—'}</td><td>{p.capital !== undefined ? `$ ${fmt(p.capital)}` : '—'}</td></>}
                          <td>
                            {f.advertencias.length > 0
                              ? <span className="pr-imp-tag pr-imp-tag--warn" title={f.advertencias.join(' · ')}>⚠ {f.advertencias[0]}</span>
                              : <span className={`pr-imp-tag ${est.cls}`}>{est.txt}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Los valores que dejaste en blanco no se modifican. El % de resolución siempre se calcula: resueltos ÷ asignados.
              </span>
            </div>

            <div className="pr-modal-foot">
              <button className="pr-btn pr-btn--ghost" onClick={cerrar} disabled={confirmando}>Cancelar</button>
              <button className="pr-btn pr-btn--primary" onClick={confirmar} disabled={confirmando || validas.length === 0}>
                {confirmando ? <Loader2 size={14} className="pr-refresh--spin" /> : null}
                {confirmando ? 'Importando…' : aGuardar.length
                  ? `Confirmar e importar ${aGuardar.length} registro${aGuardar.length !== 1 ? 's' : ''}`
                  : 'Cerrar (nada que guardar)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
