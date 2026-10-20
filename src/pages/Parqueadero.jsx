import PageTitle from '../components/ui/PageTitle'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as parqueaderoApi from '../api/parqueadero'
import * as empleadosApi from '../api/empleados'
import { ParkingSquare, Plus, X, Car, Download } from 'lucide-react'
import { PAGE_SIZE, MESES, ANIOS, EMPTY } from '../utils/parqueaderoConstants'
import { omit } from '../utils/omit'
import { exportarExcelParqueadero as exportarExcel, enviarReporte } from '../utils/parqueaderoHelpers'
import ModalDetalle from '../components/parqueadero/ModalDetalle'
import ModalHistorial from '../components/parqueadero/ModalHistorial'
import ModalForm from '../components/parqueadero/ModalForm'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import ModalCopiar from '../components/parqueadero/ModalCopiar'
import ModalDuplicado from '../components/parqueadero/ModalDuplicado'
import ParqueaderoKPIs from '../components/parqueadero/ParqueaderoKPIs'
import ParqueaderoChart from '../components/parqueadero/ParqueaderoChart'
import ParqueaderoFiltros from '../components/parqueadero/ParqueaderoFiltros'
import ParqueaderoTabla from '../components/parqueadero/ParqueaderoTabla'
import ParqueaderoCards from '../components/parqueadero/ParqueaderoCards'
import '../components/parqueadero/parqueadero.css'

export default function Parqueadero() {
  const { currentCompany, canWrite } = useCompany()
  const puedeEditar = canWrite ? canWrite('parqueadero') : true
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterMes, setFilterMes]   = useState('')
  const [filterAnio, setFilterAnio] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterTab, setFilterTab]   = useState('')
  const [vista, setVista]       = useState('tabla') // 'tabla' | 'cards'
  const [page, setPage]         = useState(1)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [viewRow, setViewRow]   = useState(null)
  const [historial, setHistorial] = useState(null)
  const [empleados, setEmpleados] = useState({ activos: [], inactivos: [], lista: [] })
  const [listaEmpleados, setListaEmpleados] = useState([])
  const [dupWarn, setDupWarn]     = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [modalCopiar, setModalCopiar]     = useState(null)
  const [copiando, setCopiando]           = useState(false)
  const [modalDuplicado, setModalDuplicado] = useState(null) // { mesDestino, anioDestino, placas[] }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: parkData }, { data: empData }] = await Promise.all([
      parqueaderoApi.listarRegistrosParqueadero(currentCompany),
      empleadosApi.listarEmpleadosBasico(currentCompany),
    ])
    setRows(parkData || [])
    if (empData?.length > 0) {
      setEmpleados({
        activos:   empData.filter(e => e.activo !== false).map(e => e.nombre_completo),
        inactivos: empData.filter(e => e.activo === false).map(e => e.nombre_completo),
        lista:     empData,
      })
      setListaEmpleados(empData)
    } else {
      setEmpleados({ activos: [], inactivos: [], lista: [] })
      setListaEmpleados([])
    }
    setLoading(false)
  }, [currentCompany])

  useEffect(() => { Promise.resolve().then(() => load()) }, [load])

  useEffect(() => {
    if (form.nombre_empleado && form.mes && form.anio) {
      Promise.resolve().then(() =>
        setDupWarn(rows.some(r => r.nombre_empleado===form.nombre_empleado && r.mes===form.mes && r.anio===form.anio && r.id!==form.id)))
    } else {
      Promise.resolve().then(() => setDupWarn(false))
    }
  }, [form.nombre_empleado, form.mes, form.anio, form.id, rows])

  const filtered = useMemo(() => rows.filter(r => {
    const s = search.toLowerCase()
    const matchSearch = !s || r.nombre_empleado?.toLowerCase().includes(s) || r.placa?.toLowerCase().includes(s) || r.cedula?.toString().includes(s)
    const matchMes    = !filterMes  || r.mes  === filterMes
    const matchAnio   = !filterAnio || r.anio === filterAnio
    const matchTipo   = !filterTipo || r.tipo === filterTipo
    const matchTab = !filterTab ||
      (filterTab === 'CARRO'   && r.tipo === 'CARRO') ||
      (filterTab === 'MOTO'    && r.tipo === 'MOTO') ||
      (filterTab === 'exentos' && r.observacion === 'EXENTOS DE PAGO') ||
      (filterTab === 'sin_rep' && !r.fecha_envio_reporte)
    const matchEstado = !filterEstado ||
      (filterEstado === 'retirados' && !!r.retirado) ||
      (filterEstado === 'activos'   && !r.retirado)
    return matchSearch && matchMes && matchAnio && matchTipo && matchTab && matchEstado
  }), [rows, search, filterMes, filterAnio, filterTipo, filterTab, filterEstado])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const aniosDisponibles = [...new Set([...ANIOS, ...rows.map(r=>r.anio).filter(Boolean)])].sort().reverse()

  const hoy = new Date()
  const mesActual  = MESES[hoy.getMonth()]
  const anioActual = String(hoy.getFullYear())
  const sinReporte = rows.filter(r => !r.fecha_envio_reporte && r.mes===mesActual && r.anio===anioActual).length

  // Base para KPIs: si hay filtro de mes/año activo se usa ese período, si no se usa el mes actual
  const mesBase  = filterMes  || mesActual
  const anioBase = filterAnio || anioActual
  const rowsBase = rows.filter(r => r.mes===mesBase && r.anio===anioBase)
  const carros  = rowsBase.filter(r => r.tipo==='CARRO').length
  const motos   = rowsBase.filter(r => r.tipo==='MOTO').length
  const exentos = rowsBase.filter(r => r.observacion==='EXENTOS DE PAGO').length
  const total   = rowsBase.length || 1

  const openAdd  = () => { setForm({ ...EMPTY, mes: mesActual, anio: anioActual }); setDupWarn(false); setModal('add') }
  const openEdit = (row) => { setForm({...row}); setDupWarn(false); setModal('edit') }
  const f = k => e => { let v = e.target.value; if (k==='placa') v=v.toUpperCase(); setForm(p=>({...p,[k]:v})) }

  const save = async () => {
    if (!form.nombre_empleado || !form.placa || !form.tipo)
      return setMsg({type:'error',text:'Nombre, placa y tipo de vehículo son obligatorios.'})
    if (!form.mes || !form.anio)
      return setMsg({type:'error',text:'Selecciona el mes y el año del registro.'})
    setSaving(true)
    const cleanForm = { ...form, placa: form.placa.toUpperCase(), fecha_ingreso: form.fecha_ingreso||null, fecha_retiro: form.fecha_retiro||null, fecha_envio_reporte: form.fecha_envio_reporte||null }
    try {
      if (modal==='add') {
        const { error } = await parqueaderoApi.crearRegistroParqueadero(omit(['id', 'created_at'], cleanForm), currentCompany)
        if (error) throw error
      } else {
        const { error } = await parqueaderoApi.actualizarRegistroParqueadero(cleanForm.id, omit(['id', 'created_at'], cleanForm))
        if (error) throw error
      }
      setMsg({type:'success',text:modal==='add'?'Registro creado.':'Registro actualizado.'})
      setModal(null); load()
      setTimeout(()=>setMsg(null),3000)
    } catch(e) {
      setMsg({type:'error',text:e.message||'Error al guardar.'})
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    try {
      const { error } = await parqueaderoApi.eliminarRegistroParqueadero(id)
      if (error) throw error
      setDeleteId(null); load()
    } catch(e) {
      setMsg({type:'error',text:e.message||'Error al eliminar.'})
      setDeleteId(null)
      setTimeout(()=>setMsg(null),5000)
    }
  }

  const siguienteMes = (mes, anio) => {
    const idx = MESES.indexOf(mes)
    if (idx===-1) return { mes:'', anio:'' }
    if (idx===11)  return { mes:MESES[0], anio:String(parseInt(anio)+1) }
    return { mes:MESES[idx+1], anio }
  }

  const abrirModalCopiar = () => {
    if (!filterMes || !filterAnio) return setMsg({type:'error',text:'Filtra por un Mes y un Año específico antes de copiar al siguiente mes.'})
    const registrosOrigen = rows.filter(r=>r.mes===filterMes && r.anio===filterAnio)
    if (registrosOrigen.length===0) return setMsg({type:'error',text:'No hay registros en el mes/año seleccionado para copiar.'})
    const { mes: mesDestino, anio: anioDestino } = siguienteMes(filterMes, filterAnio)
    const yaExisten = rows.filter(r=>r.mes===mesDestino && r.anio===anioDestino)

    // Bloquear si ya se copió: detectar placas del origen que ya están en el destino
    const placasOrigen    = new Set(registrosOrigen.map(r=>r.placa).filter(Boolean))
    const placasDestino   = new Set(yaExisten.map(r=>r.placa).filter(Boolean))
    const placasDuplicadas = [...placasOrigen].filter(p => placasDestino.has(p))

    if (placasDuplicadas.length > 0) {
      return setModalDuplicado({ mesDestino, anioDestino, placas: placasDuplicadas })
    }

    setModalCopiar({ mesOrigen:filterMes, anioOrigen:filterAnio, mesDestino, anioDestino, registros:registrosOrigen, yaExisten })
  }

  const ejecutarCopia = async () => {
    if (!modalCopiar) return
    setCopiando(true)
    try {
      const { mesDestino, anioDestino, registros } = modalCopiar
      const nuevos = registros.map(r => ({
        ...omit(['id', 'created_at', 'fecha_ingreso', 'fecha_retiro', 'fecha_envio_reporte'], r),
        mes:mesDestino, anio:anioDestino, fecha_ingreso:null, fecha_retiro:null, fecha_envio_reporte:null,
      }))
      const { error } = await parqueaderoApi.crearRegistrosParqueadero(nuevos, currentCompany)
      if (error) throw error
      setMsg({type:'success',text:`✅ ${nuevos.length} registro(s) copiados a ${mesDestino} ${anioDestino}.`})
      setModalCopiar(null); setFilterMes(mesDestino); setFilterAnio(anioDestino); setPage(1); load()
      setTimeout(()=>setMsg(null),4000)
    } catch(e) {
      setMsg({type:'error',text:e.message||'Error al copiar registros.'})
    } finally { setCopiando(false) }
  }

  // ── Chips activos ────────────────────────────────────────────────────────────
  const hasFilter = search || filterMes || filterAnio || filterTipo || filterTab || filterEstado
  const clearAll  = () => { setSearch(''); setFilterMes(''); setFilterAnio(''); setFilterTipo(''); setFilterTab(''); setFilterEstado(''); setPage(1) }
  const activeChips = [
    search    && { label:`"${search}"`,       clear:()=>{setSearch('');setPage(1)} },
    filterAnio && filterMes && { label:`${filterMes} ${filterAnio}`, clear:()=>{setFilterMes('');setFilterAnio('');setPage(1)} },
    filterAnio && !filterMes && { label:filterAnio,                  clear:()=>{setFilterAnio('');setPage(1)} },
    !filterAnio && filterMes && { label:filterMes,                   clear:()=>{setFilterMes('');setPage(1)} },
    filterTipo && { label:filterTipo,         clear:()=>{setFilterTipo('');setPage(1)} },
    filterTab  && { label:{CARRO:'Carros',MOTO:'Motos',exentos:'Exentos',sin_rep:'Sin reporte'}[filterTab], clear:()=>{setFilterTab('');setPage(1)} },
    filterEstado && { label:filterEstado==='retirados'?'Retirados':'Activos', clear:()=>{setFilterEstado('');setPage(1)} },
  ].filter(Boolean)

  // ── Gráfica de registros por mes ─────────────────────────────────────────────
  const conteoMes = useMemo(() => {
    const acc = {}
    rows.forEach(r => {
      if (!r.mes || !r.anio) return
      const key = `${r.mes}|${r.anio}`
      if (!acc[key]) acc[key] = { mes:r.mes, anio:r.anio, total:0, carros:0, motos:0 }
      acc[key].total++
      if (r.tipo==='CARRO') acc[key].carros++
      if (r.tipo==='MOTO')  acc[key].motos++
    })
    return Object.values(acc).sort((a,b) => {
      const ya=parseInt(a.anio), yb=parseInt(b.anio)
      if (ya!==yb) return yb-ya
      return MESES.indexOf(b.mes)-MESES.indexOf(a.mes)
    }).slice(0,8)
  }, [rows])
  const maxConteo = Math.max(1, ...conteoMes.map(e=>e.total))

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <PageTitle icon={ParkingSquare}>Parqueadero</PageTitle>
          <p>Registro de vehículos y control de parqueadero</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-ghost" onClick={()=>exportarExcel(filtered,filterMes,filterAnio)} style={{display:'flex',alignItems:'center',gap:6}}>
            <Download size={14}/> Exportar
          </button>
          {puedeEditar && (
            <>
              <button className="btn btn-ghost"
                disabled={!filterMes||!filterAnio}
                title={!filterMes||!filterAnio?'Filtra por mes y año para habilitar':`Copiar ${filterMes} ${filterAnio} → siguiente mes`}
                style={{background:'var(--success-bg)',color:'var(--success-text)',border:'1px solid color-mix(in srgb, var(--success) 35%, transparent)'}}
                onClick={abrirModalCopiar}>
                📋 Copiar al siguiente mes
              </button>
              <button className="btn btn-ghost" disabled={sendingReport||filtered.length===0}
                style={{background:'var(--info-bg)',color:'var(--info-text)',border:'1px solid color-mix(in srgb, var(--info) 35%, transparent)'}}
                onClick={async()=>{
                  setSendingReport(true)
                  await enviarReporte(filtered, filterMes, filterAnio, () => { load(); setSendingReport(false) })
                }}>
                {sendingReport?'⏳ Generando...':'📤 Envío de reporte'}
              </button>
              <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Nuevo registro</button>
            </>
          )}
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`} style={{animation:'fadeInUp .3s ease'}}>{msg.text}</div>}

      {/* ── KPIs animados ── */}
      {!loading && (
        <ParqueaderoKPIs
          rowsBase={rowsBase} carros={carros} motos={motos} exentos={exentos} total={total} sinReporte={sinReporte}
          mesBase={mesBase} anioBase={anioBase} mesActual={mesActual} anioActual={anioActual} filterTab={filterTab}
          setFilterTab={setFilterTab} setFilterTipo={setFilterTipo} setFilterMes={setFilterMes} setFilterAnio={setFilterAnio} setPage={setPage}
        />
      )}

      {/* ── Alerta sin reporte ── */}
      {!loading && sinReporte > 0 && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:8,background:'var(--info-bg)',border:'1px solid color-mix(in srgb, var(--info) 35%, transparent)',color:'#3730A3',fontSize:12,fontWeight:500,marginBottom:12,flexWrap:'wrap',animation:'fadeIn .3s ease'}}>
          📤 <span><strong>{sinReporte}</strong> registro{sinReporte!==1?'s':''} de <strong>{mesActual}</strong> sin envío de reporte</span>
          <button onClick={()=>{setFilterTab('sin_rep');setFilterMes(mesActual);setFilterAnio(anioActual);setPage(1)}}
            style={{marginLeft:'auto',background:'none',border:'none',color:'#3730A3',fontSize:12,cursor:'pointer',fontWeight:700,textDecoration:'underline',padding:0}}>
            Filtrar pendientes →
          </button>
        </div>
      )}

      {/* ── Gráfica registros por mes ── */}
      {!loading && (
        <ParqueaderoChart
          conteoMes={conteoMes} maxConteo={maxConteo}
          filterMes={filterMes} filterAnio={filterAnio} setFilterMes={setFilterMes} setFilterAnio={setFilterAnio} setPage={setPage}
        />
      )}

      <div className="card">
        <ParqueaderoFiltros
          rows={rows} carros={carros} motos={motos} exentos={exentos} sinReporte={sinReporte}
          filterTab={filterTab} setFilterTab={setFilterTab} setFilterTipo={setFilterTipo}
          vista={vista} setVista={setVista}
          search={search} setSearch={setSearch}
          filterAnio={filterAnio} setFilterAnio={setFilterAnio} aniosDisponibles={aniosDisponibles}
          filterMes={filterMes} setFilterMes={setFilterMes}
          filterTipo={filterTipo}
          filterEstado={filterEstado} setFilterEstado={setFilterEstado}
          hasFilter={hasFilter} clearAll={clearAll} activeChips={activeChips}
          filtered={filtered}
          setPage={setPage}
        />

        {/* ── Contenido ── */}
        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {Array.from({length:6}).map((_,i)=>(
              <div key={i} style={{display:'flex',gap:12,padding:'10px 4px',alignItems:'center'}}>
                <div className="park-skel" style={{width:160,height:14}}/>
                <div className="park-skel" style={{width:80,height:14}}/>
                <div className="park-skel" style={{width:90,height:22,borderRadius:999}}/>
                <div className="park-skel" style={{width:70,height:14}}/>
                <div className="park-skel" style={{flex:1,height:14}}/>
              </div>
            ))}
          </div>
        ) : filtered.length===0 ? (
          <div className="empty-state" style={{animation:'fadeIn .3s ease'}}>
            <Car size={32} style={{color:'var(--text-muted)',marginBottom:8}}/>
            <p>No hay registros que coincidan.</p>
            {hasFilter && <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{marginTop:8}}><X size={13}/> Limpiar filtros</button>}
          </div>
        ) : vista==='cards' ? (
          <ParqueaderoCards
            paged={paged} filtered={filtered} page={page} totalPages={totalPages} setPage={setPage}
            setViewRow={setViewRow} openEdit={puedeEditar ? openEdit : null} setDeleteId={puedeEditar ? setDeleteId : null} setHistorial={setHistorial}
          />
        ) : (
          <ParqueaderoTabla
            paged={paged} filtered={filtered} page={page} totalPages={totalPages} setPage={setPage}
            setViewRow={setViewRow} setHistorial={setHistorial} openEdit={puedeEditar ? openEdit : null} setDeleteId={puedeEditar ? setDeleteId : null}
          />
        )}
      </div>

      {/* ── Modal agregar/editar ── */}
      {modal && (
        <ModalForm
          modal={modal} form={form} setForm={setForm} f={f} save={save} saving={saving} dupWarn={dupWarn}
          empleados={empleados} listaEmpleados={listaEmpleados} aniosDisponibles={aniosDisponibles} mesActual={mesActual} anioActual={anioActual}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Modal confirmar eliminación ── */}
      <DeleteConfirmModal deleteId={deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} />

      {/* ── Modal ver detalle ── */}
      {viewRow && <ModalDetalle row={viewRow} onClose={() => setViewRow(null)} onEdit={row => { setViewRow(null); openEdit(row) }} />}

      {/* ── Modal historial ── */}
      {historial && <ModalHistorial nombre={historial.nombre_empleado} placa={historial.placa} allRows={rows} onClose={() => setHistorial(null)} />}

      {/* ── Modal copiar al siguiente mes ── */}
      <ModalCopiar modalCopiar={modalCopiar} copiando={copiando} onClose={() => setModalCopiar(null)} onConfirm={ejecutarCopia} />

      {/* ── Modal duplicado ── */}
      <ModalDuplicado
        modalDuplicado={modalDuplicado} filterMes={filterMes} filterAnio={filterAnio}
        onClose={() => setModalDuplicado(null)}
        onVerMesDestino={() => {
          setModalDuplicado(null)
          setFilterMes(modalDuplicado.mesDestino)
          setFilterAnio(modalDuplicado.anioDestino)
          setPage(1)
        }}
      />
    </div>
  )
}
