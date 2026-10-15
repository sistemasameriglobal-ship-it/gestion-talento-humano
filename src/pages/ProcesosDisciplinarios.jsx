import PageTitle from '../components/ui/PageTitle'
import { Scale as TitleIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as procesosApi from '../api/procesosDisciplinarios'
import * as empleadosApi from '../api/empleados'
import { hoyISO } from '../utils/fecha'
import { omit } from '../utils/omit'
import { logAccion } from '../utils/auditLogger'
import { exportarExcel } from '../utils/exportarExcel'
import { Plus, Search, X, Download, AlertTriangle } from 'lucide-react'
import {
  PAGE_SIZE, UMBRAL_ALERTA, CONCEPTOS, CONCEPTO_MAP, DEPARTAMENTOS,
  BUCKET_ADJUNTOS, MAX_ADJUNTO_MB, EMPTY, normalizeNombre, ALERT,
} from '../utils/procesosDisciplinariosConstants'
import PdAlertBanner from '../components/procesos-disciplinarios/PdAlertBanner'
import Paginacion from '../components/ui/Paginacion'
import PdGruposTable from '../components/procesos-disciplinarios/PdGruposTable'
import PdFormModal from '../components/procesos-disciplinarios/PdFormModal'
import PdDeleteModal from '../components/procesos-disciplinarios/PdDeleteModal'
import PdEmpleadoDetalleModal from '../components/procesos-disciplinarios/PdEmpleadoDetalleModal'
import PdViewModal from '../components/procesos-disciplinarios/PdViewModal'

export default function ProcesosDisciplinarios() {
  const { currentCompany } = useCompany()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [empleados, setEmpleados] = useState({ activos: [], inactivos: [] })

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterConcepto, setFilterConcepto] = useState('')
  const [filterDepartamento, setFilterDepartamento] = useState('')
  const [soloAlertas, setSoloAlertas] = useState(false)
  const [bannerExpandido, setBannerExpandido] = useState(false)
  const [ordenReincidencia, setOrdenReincidencia] = useState(false)
  const [page, setPage] = useState(1)

  const [modal, setModal] = useState(null) // 'add' | 'edit' | null
  const [form, setForm] = useState(EMPTY)
  const [formDirty, setFormDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [viewRow, setViewRow] = useState(null)
  const [uploadingAdjunto, setUploadingAdjunto] = useState(false)
  const [adjuntoInputKey, setAdjuntoInputKey] = useState(0)
  const [signedUrlLoading, setSignedUrlLoading] = useState(null) // path que se está abriendo, para el spinner del botón

  const loadProcesos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await procesosApi.listarProcesosDisciplinarios(currentCompany)
    if (error) setMsg({ type: 'error', text: 'No se pudieron cargar los procesos disciplinarios.' })
    setRows(data || [])
    setLoading(false)
  }, [currentCompany])

  useEffect(() => {
    Promise.resolve().then(() => loadProcesos())
    empleadosApi.listarEmpleadosBasico(currentCompany)
      .then(({ data }) => {
        if (!data) return
        setEmpleados({
          activos: data.filter(e => e.activo !== false).map(e => e.nombre_completo),
          inactivos: data.filter(e => e.activo === false).map(e => e.nombre_completo),
          mapa: data.reduce((acc, e) => {
            acc[e.nombre_completo] = e.dependencia || ''
            return acc
          }, {}),
        })
      })
  }, [loadProcesos, currentCompany])

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 200)
    return () => clearTimeout(t)
  }, [searchInput])

  // ── Conteo de procesos por empleado (para la alerta de reincidencia) ───────
  // La clave se normaliza (trim + minúsculas) para que no falle por typos de
  // capitalización, pero se conserva el nombre "bonito" tal como se guardó
  // para mostrarlo en la UI.
  const conteoDetalleEmpleado = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      const key = normalizeNombre(r.nombre_empleado)
      if (!key) return
      if (!map[key]) map[key] = { count: 0, display: (r.nombre_empleado || '').trim() }
      map[key].count += 1
    })
    return map
  }, [rows])

  // Mapa simple clave→cantidad, para los lugares que solo necesitan el número
  const conteoPorEmpleado = useMemo(() => {
    const map = {}
    Object.entries(conteoDetalleEmpleado).forEach(([k, v]) => { map[k] = v.count })
    return map
  }, [conteoDetalleEmpleado])

  const empleadosEnAlerta = useMemo(() =>
    Object.values(conteoDetalleEmpleado)
      .filter(({ count }) => count >= UMBRAL_ALERTA)
      .sort((a, b) => b.count - a.count)
    , [conteoDetalleEmpleado])

  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      const s = search.toLowerCase()
      const matchSearch = !s ||
        r.nombre_empleado?.toLowerCase().includes(s) ||
        r.departamento?.toLowerCase().includes(s) ||
        r.concepto?.toLowerCase().includes(s)
      const matchConcepto = !filterConcepto || r.concepto === filterConcepto
      const matchDep = !filterDepartamento || r.departamento === filterDepartamento
      const matchAlerta = !soloAlertas || (conteoPorEmpleado[normalizeNombre(r.nombre_empleado)] || 0) >= UMBRAL_ALERTA
      return matchSearch && matchConcepto && matchDep && matchAlerta
    })
    result = [...result].sort((a, b) => {
      if (ordenReincidencia) {
        const ca = conteoPorEmpleado[normalizeNombre(a.nombre_empleado)] || 0
        const cb = conteoPorEmpleado[normalizeNombre(b.nombre_empleado)] || 0
        if (ca !== cb) return cb - ca
      }
      const fa = a.fecha_inicio || a.fecha || a.created_at || ''
      const fb = b.fecha_inicio || b.fecha || b.created_at || ''
      return fa < fb ? 1 : fa > fb ? -1 : 0
    })
    return result
  }, [rows, search, filterConcepto, filterDepartamento, soloAlertas, conteoPorEmpleado, ordenReincidencia])

  // ── Agrupamiento por empleado ────────────────────────────────────────────
  // groupedTodos: a partir de TODAS las filas (sin filtrar), para que el modal
  // de detalle de un empleado siempre refleje la realidad aunque haya filtros activos.
  const groupedTodos = useMemo(() => {
    const map = new Map()
      // Recorremos ya ordenado por fecha desc (created_at) para que procesos[0] sea el más reciente
      ;[...rows].sort((a, b) => {
        const fa = a.fecha_inicio || a.fecha || a.created_at || ''
        const fb = b.fecha_inicio || b.fecha || b.created_at || ''
        return fa < fb ? 1 : fa > fb ? -1 : 0
      }).forEach(r => {
        const key = normalizeNombre(r.nombre_empleado)
        if (!key) return
        if (!map.has(key)) map.set(key, { key, nombre: (r.nombre_empleado || '').trim(), procesos: [] })
        map.get(key).procesos.push(r)
      })
    return map
  }, [rows])

  // groupedFiltered: agrupa las filas YA filtradas, preservando el orden en que
  // aparecen en `filtered` (que ya respeta la búsqueda/orden actual)
  const groupedFiltered = useMemo(() => {
    const map = new Map()
    filtered.forEach(r => {
      const key = normalizeNombre(r.nombre_empleado)
      if (!key) return
      if (!map.has(key)) map.set(key, { key, nombre: (r.nombre_empleado || '').trim(), procesos: [] })
      map.get(key).procesos.push(r)
    })
    return Array.from(map.values())
  }, [filtered])

  const [detalleKey, setDetalleKey] = useState(null)
  const empleadoDetalle = useMemo(() => detalleKey ? groupedTodos.get(detalleKey) || null : null, [groupedTodos, detalleKey])
  // Si el empleado se queda sin procesos (se borró el último), cerramos el modal solo
  useEffect(() => { if (detalleKey && !empleadoDetalle) Promise.resolve().then(() => setDetalleKey(null)) }, [detalleKey, empleadoDetalle])

  const totalPages = Math.max(1, Math.ceil(groupedFiltered.length / PAGE_SIZE))
  const pagedGrupos = groupedFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { Promise.resolve().then(() => setPage(1)) }, [filterConcepto, filterDepartamento, soloAlertas])

  const conceptoActual = CONCEPTO_MAP[form.concepto] || CONCEPTOS[0]

  const f = (k) => (e) => { setFormDirty(true); setForm(p => ({ ...p, [k]: e.target.value })) }

  const openAdd = () => { setForm(EMPTY); setFormDirty(false); setModal('add') }
  const openAddForEmployee = (nombre) => { setForm({ ...EMPTY, nombre_empleado: nombre }); setFormDirty(false); setDetalleKey(null); setModal('add') }
  const openEdit = (row) => { setForm({ ...EMPTY, ...row, archivos: Array.isArray(row.archivos) ? row.archivos : [] }); setFormDirty(false); setModal('edit') }
  const closeModal = () => {
    if (formDirty && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return
    setModal(null)
  }

  const sanitizeForm = (data) => {
    const rango = CONCEPTO_MAP[data.concepto]?.rango
    return {
      ...data,
      fecha: rango ? null : (data.fecha || null),
      fecha_inicio: rango ? (data.fecha_inicio || null) : null,
      fecha_fin: rango ? (data.fecha_fin || null) : null,
      hora: rango ? null : (data.hora || null),
    }
  }

  // Conteo previo del empleado seleccionado (para avisar dentro del modal)
  const conteoEmpleadoForm = useMemo(() => {
    const nombre = normalizeNombre(form.nombre_empleado)
    if (!nombre) return 0
    let count = conteoPorEmpleado[nombre] || 0
    // Si estamos editando un registro que ya pertenece a este empleado, no lo contamos doble
    if (modal === 'edit' && form.id && normalizeNombre(rows.find(r => r.id === form.id)?.nombre_empleado) === nombre) {
      count -= 1
    }
    return count
  }, [form.nombre_empleado, form.id, modal, conteoPorEmpleado, rows])

  // ── Adjuntos PDF (Supabase Storage, bucket privado) ─────────────────────
  const subirAdjuntos = async (fileList) => {
    const archivos = Array.from(fileList || [])
    if (!archivos.length) return
    setUploadingAdjunto(true)
    setMsg(null)
    try {
      const nuevos = []
      for (const file of archivos) {
        if (file.type !== 'application/pdf') {
          setMsg({ type: 'error', text: `"${file.name}" no es un PDF, se omitió.` })
          continue
        }
        if (file.size > MAX_ADJUNTO_MB * 1024 * 1024) {
          setMsg({ type: 'error', text: `"${file.name}" pesa más de ${MAX_ADJUNTO_MB}MB, se omitió.` })
          continue
        }
        const nombreSeguro = file.name.replace(/[^\w.-]+/g, '_')
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nombreSeguro}`
        const { error } = await procesosApi.subirAdjuntoProceso(BUCKET_ADJUNTOS, path, file)
        if (error) { setMsg({ type: 'error', text: `Error subiendo "${file.name}": ${error.message}` }); continue }
        nuevos.push({ path, nombre: file.name, tamano: file.size, subido_en: new Date().toISOString() })
      }
      if (nuevos.length) {
        setForm(p => ({ ...p, archivos: [...(p.archivos || []), ...nuevos] }))
        setFormDirty(true)
      }
    } finally {
      setUploadingAdjunto(false)
      setAdjuntoInputKey(k => k + 1)
    }
  }

  const quitarAdjunto = async (idx) => {
    const archivo = form.archivos[idx]
    // Se borra también del storage para no dejar archivos huérfanos. Si falla
    // el borrado remoto (p.ej. ya no existe), igual se quita de la lista.
    if (archivo?.path) {
      await procesosApi.eliminarAdjuntoProceso(BUCKET_ADJUNTOS, archivo.path).catch(() => {})
    }
    setForm(p => ({ ...p, archivos: p.archivos.filter((_, i) => i !== idx) }))
    setFormDirty(true)
  }

  const verAdjunto = async (archivo) => {
    setSignedUrlLoading(archivo.path)
    try {
      const { data, error } = await procesosApi.obtenerUrlFirmadaAdjunto(BUCKET_ADJUNTOS, archivo.path, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setMsg({ type: 'error', text: `No se pudo abrir "${archivo.nombre}": ${e.message}` })
    } finally {
      setSignedUrlLoading(null)
    }
  }

  const save = async () => {
    if (!form.nombre_empleado?.trim() || !form.concepto) {
      setMsg({ type: 'error', text: 'Empleado y concepto son obligatorios.' })
      return
    }
    setSaving(true)
    const clean = sanitizeForm(form)
    try {
      if (modal === 'add') {
        const insertData = omit(['id', 'created_at', 'updated_at'], clean)
        const { error } = await procesosApi.crearProcesoDisciplinario(insertData, currentCompany)
        if (error) throw error
        logAccion('CREAR', 'procesos_disciplinarios', null, currentCompany, { empleado: clean.nombre_empleado, concepto: clean.concepto })
      } else {
        if (!clean.id) throw new Error('ID de registro no encontrado.')
        const rest = omit(['id', 'created_at', 'updated_at'], clean)
        const { error } = await procesosApi.actualizarProcesoDisciplinario(clean.id, rest)
        if (error) throw error
        logAccion('ACTUALIZAR', 'procesos_disciplinarios', clean.id, currentCompany, { empleado: clean.nombre_empleado, concepto: clean.concepto })
      }

      const nuevoConteo = conteoEmpleadoForm + 1
      setMsg({
        type: nuevoConteo >= UMBRAL_ALERTA ? 'error' : 'success',
        text: nuevoConteo >= UMBRAL_ALERTA
          ? `⚠️ Guardado. ${form.nombre_empleado} ya acumula ${nuevoConteo} procesos disciplinarios.`
          : (modal === 'add' ? 'Proceso disciplinario registrado.' : 'Proceso disciplinario actualizado.'),
      })
      setModal(null); setFormDirty(false)
      await loadProcesos()
      setTimeout(() => setMsg(null), 4500)
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Error al guardar.' })
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    setDeleting(true)
    try {
      const { error } = await procesosApi.eliminarProcesoDisciplinario(id)
      if (error) throw error
      logAccion('ELIMINAR', 'procesos_disciplinarios', id, currentCompany)
      setDeleteRow(null)
      await loadProcesos()
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Error al eliminar.' })
      setTimeout(() => setMsg(null), 5000)
    } finally {
      setDeleting(false)
    }
  }

  const exportExcel = () => {
    exportarExcel(filtered.map(r => ({
      'Empleado': r.nombre_empleado,
      'Concepto': r.concepto,
      'Departamento': r.departamento,
      'Fecha': r.fecha || '',
      'Fecha Inicio': r.fecha_inicio || '',
      'Fecha Fin': r.fecha_fin || '',
      'Observación': r.observacion,
      'Total procesos del empleado': conteoPorEmpleado[normalizeNombre(r.nombre_empleado)] || 0,
    })), {
      nombreHoja: 'Procesos Disciplinarios',
      nombreArchivo: `Procesos_Disciplinarios_${hoyISO()}.xlsx`,
      anchosColumnas: [30, 24, 16, 12, 12, 12, 34, 14],
    })
  }

  const hasFilter = searchInput || filterConcepto || filterDepartamento || soloAlertas || ordenReincidencia
  const clearFilters = () => { setSearchInput(''); setSearch(''); setFilterConcepto(''); setFilterDepartamento(''); setSoloAlertas(false); setOrdenReincidencia(false); setPage(1) }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <PageTitle icon={TitleIcon}>Procesos Disciplinarios</PageTitle>
          <p>Registro y seguimiento de faltas, disciplina y citaciones</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15} />Nuevo proceso</button>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* ── Banner de alerta: empleados con 3+ procesos ── */}
      {empleadosEnAlerta.length > 0 && (
        <PdAlertBanner
          empleadosEnAlerta={empleadosEnAlerta}
          bannerExpandido={bannerExpandido}
          setBannerExpandido={setBannerExpandido}
          onVerTodos={() => { setSoloAlertas(true); setSearchInput(''); setFilterConcepto(''); setFilterDepartamento(''); setOrdenReincidencia(true) }}
          onSelectEmpleado={setDetalleKey}
        />
      )}

      <div className="card">
        {/* ── Filtros ── */}
        <div className="filters-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control search-input" style={{ paddingLeft: 32 }}
              placeholder="Buscar empleado, área..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>

          <select className="form-control" style={{ flex: '1 1 180px', minWidth: 160 }}
            value={filterConcepto} onChange={e => setFilterConcepto(e.target.value)}>
            <option value="">Todos los conceptos</option>
            {CONCEPTOS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
          </select>

          <select className="form-control" style={{ flex: '1 1 150px', minWidth: 140 }}
            value={filterDepartamento} onChange={e => setFilterDepartamento(e.target.value)}>
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
            color: soloAlertas ? ALERT.text : 'var(--text-muted)', cursor: 'pointer',
            padding: '7px 12px', borderRadius: 8, border: `1px solid ${soloAlertas ? ALERT.border : 'var(--border)'}`,
            background: soloAlertas ? ALERT.bg : 'var(--surface)', whiteSpace: 'nowrap',
          }}>
            <input type="checkbox" checked={soloAlertas} onChange={e => setSoloAlertas(e.target.checked)} style={{ margin: 0 }} />
            <AlertTriangle size={13} /> Solo en alerta
          </label>

          <button
            onClick={() => setOrdenReincidencia(v => !v)}
            title="Ordenar mostrando primero a quienes tienen más procesos acumulados"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
              color: ordenReincidencia ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer',
              padding: '7px 12px', borderRadius: 8, border: `1px solid ${ordenReincidencia ? 'var(--primary)' : 'var(--border)'}`,
              background: ordenReincidencia ? 'var(--primary-light)' : 'var(--surface)', whiteSpace: 'nowrap',
            }}>
            ⇅ Más reincidentes primero
          </button>

          {hasFilter && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={13} />Limpiar</button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>
            {groupedFiltered.length} empleado{groupedFiltered.length !== 1 ? 's' : ''} · {filtered.length} proceso{filtered.length !== 1 ? 's' : ''}{hasFilter ? ' (filtrado)' : ''}
          </span>
        </div>

        {loading ? (
          <div className="empty-state"><p>Cargando...</p></div>
        ) : groupedFiltered.length === 0 ? (
          <div className="empty-state"><p>No hay registros que coincidan.</p></div>
        ) : (
          <>
            <PdGruposTable pagedGrupos={pagedGrupos} onSelectEmpleado={setDetalleKey} />

            <Paginacion total={groupedFiltered.length} page={page} totalPages={totalPages} onChange={setPage} info={`Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, groupedFiltered.length)} de ${groupedFiltered.length} empleados`} />
          </>
        )}
      </div>

      {/* ── Modal agregar/editar ── */}
      <PdFormModal
        modal={modal}
        form={form}
        f={f}
        setForm={setForm}
        setFormDirty={setFormDirty}
        conteoEmpleadoForm={conteoEmpleadoForm}
        conceptoActual={conceptoActual}
        saving={saving}
        save={save}
        closeModal={closeModal}
        empleados={empleados}
        subirAdjuntos={subirAdjuntos}
        quitarAdjunto={quitarAdjunto}
        verAdjunto={verAdjunto}
        signedUrlLoading={signedUrlLoading}
        uploadingAdjunto={uploadingAdjunto}
        adjuntoInputKey={adjuntoInputKey}
      />

      {/* ── Modal confirmar eliminación ── */}
      <PdDeleteModal
        deleteRow={deleteRow}
        deleting={deleting}
        onClose={() => setDeleteRow(null)}
        onConfirm={remove}
      />

      {/* ── Modal detalle de empleado: todos sus procesos ── */}
      {empleadoDetalle && (
        <PdEmpleadoDetalleModal
          empleadoDetalle={empleadoDetalle}
          onClose={() => setDetalleKey(null)}
          onVer={(p) => { setDetalleKey(null); setViewRow(p) }}
          onEditar={(p) => { setDetalleKey(null); openEdit(p) }}
          onEliminar={(p) => { setDetalleKey(null); setDeleteRow(p) }}
          onNuevoProceso={() => openAddForEmployee(empleadoDetalle.nombre)}
        />
      )}

      {/* ── Modal ver detalle ── */}
      {viewRow && (
        <PdViewModal
          viewRow={viewRow}
          conteoPorEmpleado={conteoPorEmpleado}
          signedUrlLoading={signedUrlLoading}
          verAdjunto={verAdjunto}
          onClose={() => setViewRow(null)}
          onEditar={() => { setViewRow(null); openEdit(viewRow) }}
        />
      )}
    </div>
  )
}