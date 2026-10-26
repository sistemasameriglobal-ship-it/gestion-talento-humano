import PageTitle from '../components/ui/PageTitle'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as novedadesApi from '../api/novedades'
import * as empleadosApi from '../api/empleados'
import * as procesosApi from '../api/procesosDisciplinarios'
import * as productividadApi from '../api/productividad'
import { hoyISO } from '../utils/fecha'
import { normalizarConcepto } from '../utils/parseExcel'
import { exportarExcel } from '../utils/exportarExcel'
import { Users, Search, X, User, Download, LayoutGrid, List, ArrowUpDown } from 'lucide-react'
import {
  PAGE_SIZE, labelMes, CONCEPTOS_LIST, CONCEPTOS_AUSENTISMO,
  construirProductividad, anioProductividadEfectivo, productividadPorEmpleado,
  normalizeNombreProd, PRODUCTIVIDAD_MESES, diasCalendarioEntre, diasCalendarioDelMes,
} from '../utils/colaboradores'
import ColaboradorKpis from '../components/colaboradores/ColaboradorKpis'
import ColaboradorAreaTabs from '../components/colaboradores/ColaboradorAreaTabs'
import ColaboradorSkeleton from '../components/colaboradores/ColaboradorSkeleton'
import ColaboradorCard from '../components/colaboradores/ColaboradorCard'
import ColaboradorTable from '../components/colaboradores/ColaboradorTable'
import ColaboradorDetalleModal from '../components/colaboradores/ColaboradorDetalleModal'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import '../components/colaboradores/colaboradores.css'
import Paginacion from '../components/ui/Paginacion'

export default function Colaboradores() {
  const { currentCompany, canWrite } = useCompany()
  const puedeEditar = canWrite ? canWrite('colaboradores') : true
  const [rows, setRows] = useState([])
  const [empleadosTodos, setEmpleadosTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterConcepto, setFilterConcepto] = useState('')
  const [filterEstado, setFilterEstado] = useState('') // '' | 'con_novedades' | 'sin_novedades' | 'reincidente' | 'con_pd'
  const [filterMes, setFilterMes] = useState('') // '' | 'YYYY-MM'
  const [sortBy, setSortBy] = useState('dias_desc')
  const [vista, setVista] = useState('tarjetas')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [procesosPorEmpleado, setProcesosPorEmpleado] = useState({})
  const [productividadData, setProductividadData] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      novedadesApi.listarNovedadesCompleto(currentCompany),
      empleadosApi.listarEmpleadosParaColaboradores(currentCompany),
      procesosApi.listarNombresProcesosDisciplinarios(currentCompany),
      // Mismas tablas que usa la página Productividad: "productividad" cubre
      // Ventas y UW-BS (una fila por persona/mes/año), "cierre_meses" cubre Cierre.
      productividadApi.listarProductividadParaColaboradores(['Producción', 'Clientes Resueltos'], currentCompany),
      productividadApi.listarCierreMesesParaColaboradores(currentCompany),
    ]).then(([{ data }, { data: empData }, { data: pdData }, { data: prodData }, { data: cierreData }]) => {
      setRows(data || [])
      setEmpleadosTodos(empData || [])
      // Conteo de procesos disciplinarios por nombre de empleado
      const pdAcc = {}
      ;(pdData || []).forEach(p => {
        const k = p.nombre_empleado
        pdAcc[k] = (pdAcc[k] || 0) + 1
      })
      setProcesosPorEmpleado(pdAcc)
      setProductividadData(construirProductividad(prodData, cierreData, { usaClientes: currentCompany !== 'global_link' }))
      setLoading(false)
    })
  }, [currentCompany])

  useEffect(() => { Promise.resolve().then(() => load()) }, [load])

  const remove = async (id) => {
    try {
      const { error } = await novedadesApi.eliminarNovedad(id)
      if (error) throw error
      setDeleteId(null)
      load()
      setSelected(prev => prev ? { ...prev, novedades: prev.novedades.filter(n => n.id !== id) } : prev)
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Error al eliminar.' })
      setDeleteId(null)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  // ── Agrupar por colaborador ───────────────────────────────────────────────
  // Si hay un mes seleccionado, solo se agrupan las novedades cuya fecha de inicio
  // cae dentro de ese mes — así todos los conteos, KPIs, tarjetas, tabla y el
  // detalle del colaborador quedan filtrados por ese período.
  const rowsDelPeriodo = useMemo(() => {
    if (!filterMes) return rows
    return rows.filter(r => r.fecha_inicio && r.fecha_inicio.slice(0, 7) === filterMes)
  }, [rows, filterMes])

  const colaboradores = useMemo(() => {
    const acc = {}
    const empMap = new Map()
    ;(empleadosTodos || []).forEach(e => {
      if (e.nombre_completo) empMap.set(e.nombre_completo.trim().toLowerCase(), e)
    })

    rowsDelPeriodo.forEach(r => {
      const k = r.nombre_empleado
      const emp = empMap.get((k || '').trim().toLowerCase())
      const areaOficial = emp?.dependencia || r.dependencia || '—'
      if (!acc[k]) acc[k] = { nombre: k, area: areaOficial, novedades: [], diasInc: 0, episodiosInc: 0, porConcepto: {} }
      acc[k].novedades.push(r)
      const tipo = normalizarConcepto(r.concepto)
      if (tipo === 'Incapacidad') {
        acc[k].episodiosInc++
        acc[k].diasInc += parseFloat(r.total_dias) || 0
      }
      if (!acc[k].porConcepto[tipo]) acc[k].porConcepto[tipo] = { episodios: 0, dias: 0 }
      acc[k].porConcepto[tipo].episodios++
      acc[k].porConcepto[tipo].dias += parseFloat(r.total_dias) || 0
      if (areaOficial && areaOficial !== '—') acc[k].area = areaOficial
    })
    // Con un mes seleccionado no tiene sentido listar a todos los colaboradores
    // "sin novedades" (serían prácticamente todos); solo se muestran cuando
    // se está viendo el histórico completo.
    if (!filterMes) {
      empleadosTodos.forEach(e => {
        if (e.activo !== false && !acc[e.nombre_completo]) {
          acc[e.nombre_completo] = { nombre: e.nombre_completo, area: e.dependencia || '—', novedades: [], diasInc: 0, episodiosInc: 0, porConcepto: {}, sinNovedades: true }
        }
      })
    }
    // ── Días ausentes totales y tasa de ausentismo por colaborador ──────────
    // "Días ausente" (diasAusenteTotal) es informativo: suma los días CALENDARIO
    // de los conceptos que cuentan como ausentismo (Incapacidad, LNR, LR,
    // Maternidad, Paternidad, Calamidad/Luto, Día Familia, Hospitalización,
    // Otro) — Vacaciones y Embargo quedan fuera (no son ausencias).
    //
    // Para la TASA se usan días calendario en ambos lados (numerador y
    // denominador): una incapacidad corre todos los días, caiga donde caiga,
    // así que no tiene sentido convertirla a días hábiles. El numerador es
    // directamente diasAusenteTotal (ya en días calendario).
    //
    // El período de referencia es fijo e igual para TODOS los colaboradores,
    // para que las tasas sean comparables entre sí:
    //  - si hay un mes filtrado → ese mes completo
    //  - si no → desde la novedad con fecha más antigua de todo el sistema, hasta hoy
    const hoy = hoyISO()
    let periodoInicioGlobal, periodoFinGlobal, diasPeriodoGlobal
    if (filterMes) {
      const [y, m] = filterMes.split('-').map(Number)
      const ultimoDia = new Date(y, m, 0).getDate()
      periodoInicioGlobal = `${filterMes}-01`
      periodoFinGlobal = `${filterMes}-${String(ultimoDia).padStart(2, '0')}`
      diasPeriodoGlobal = diasCalendarioDelMes(filterMes)
    } else {
      const todasConFecha = rows.filter(r => r.fecha_inicio)
      periodoInicioGlobal = todasConFecha.length
        ? todasConFecha.reduce((min, r) => (r.fecha_inicio < min ? r.fecha_inicio : min), todasConFecha[0].fecha_inicio)
        : hoy
      periodoFinGlobal = hoy
      diasPeriodoGlobal = diasCalendarioEntre(periodoInicioGlobal, periodoFinGlobal)
    }
    const empleadosMap = {}
    empleadosTodos.forEach(e => { empleadosMap[e.nombre_completo] = e })
    const anioProd = anioProductividadEfectivo(productividadData, filterMes)
    const mesProdNombre = filterMes ? PRODUCTIVIDAD_MESES[parseInt(filterMes.slice(5, 7), 10) - 1] : null
    const productividadMap = productividadPorEmpleado(productividadData, anioProd, mesProdNombre)
    Object.values(acc).forEach(c => {
      c.diasAusenteTotal = CONCEPTOS_AUSENTISMO.reduce((sum, tipo) => sum + (c.porConcepto[tipo]?.dias || 0), 0)
      c.diasPeriodo = diasPeriodoGlobal
      c.tasaAusentismo = diasPeriodoGlobal > 0 ? (c.diasAusenteTotal / diasPeriodoGlobal) * 100 : 0
      c.periodoInicio = periodoInicioGlobal
      c.periodoFin = periodoFinGlobal
      c.tieneVehiculo = !!empleadosMap[c.nombre]?.tiene_vehiculo
      c.procesosDisciplinarios = procesosPorEmpleado[c.nombre] || 0
      const prod = productividadMap[normalizeNombreProd(c.nombre)]
      c.productividad = prod ? prod.total : null
      c.productividadCfg = prod ? prod.cfg : null
      c.productividadPeriodo = mesProdNombre ? `${mesProdNombre} ${anioProd}` : anioProd
    })
    return Object.values(acc)
  }, [rows, rowsDelPeriodo, empleadosTodos, filterMes, procesosPorEmpleado, productividadData])

  // ── KPIs globales ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = colaboradores.length
    const conNovedades = colaboradores.filter(c => c.novedades.length > 0).length
    const reincidentes = colaboradores.filter(c => c.episodiosInc >= 2).length
    const totalDiasInc = colaboradores.reduce((acc, c) => acc + c.diasInc, 0)
    const conTasa = colaboradores.filter(c => c.diasPeriodo > 0)
    const tasaAusentismoProm = conTasa.length
      ? conTasa.reduce((acc, c) => acc + c.tasaAusentismo, 0) / conTasa.length
      : 0
    const conProcesosDisciplinarios = colaboradores.filter(c => c.procesosDisciplinarios > 0).length
    const totalProcesosDisciplinarios = colaboradores.reduce((acc, c) => acc + (c.procesosDisciplinarios || 0), 0)
    return { total, conNovedades, reincidentes, totalDiasInc, tasaAusentismoProm, conProcesosDisciplinarios, totalProcesosDisciplinarios }
  }, [colaboradores])

  const areasDisponibles = [...new Set(colaboradores.map(c => c.area).filter(a => a && a !== '—'))].sort()

  // Meses con al menos una novedad registrada (más reciente primero)
  const mesesDisponibles = useMemo(() => {
    const set = new Set()
    rows.forEach(r => { if (r.fecha_inicio) set.add(r.fecha_inicio.slice(0, 7)) })
    return [...set].sort().reverse()
  }, [rows])

  const filtered = useMemo(() => {
    let res = colaboradores.filter(c => {
      const s = search.toLowerCase()
      if (s && !c.nombre.toLowerCase().includes(s) && !c.area.toLowerCase().includes(s)) return false
      if (filterArea && c.area !== filterArea) return false
      if (filterConcepto && !c.porConcepto[filterConcepto]) return false
      if (filterEstado === 'con_novedades' && c.novedades.length === 0) return false
      if (filterEstado === 'sin_novedades' && c.novedades.length > 0) return false
      if (filterEstado === 'reincidente' && c.episodiosInc < 2) return false
      if (filterEstado === 'con_pd' && !(c.procesosDisciplinarios > 0)) return false
      return true
    })
    res = [...res].sort((a, b) => {
      switch (sortBy) {
        case 'dias_desc':     return b.diasInc - a.diasInc
        case 'nombre_asc':   return a.nombre.localeCompare(b.nombre)
        case 'area_asc':     return a.area.localeCompare(b.area)
        case 'novedades_desc': return b.novedades.length - a.novedades.length
        default: return 0
      }
    })
    return res
  }, [colaboradores, search, filterArea, filterConcepto, filterEstado, sortBy])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasFilter = search || filterArea || filterConcepto || filterEstado || filterMes
  const clearFilters = () => { setSearch(''); setFilterArea(''); setFilterConcepto(''); setFilterEstado(''); setFilterMes(''); setPage(1) }

  // ── Chips activos ─────────────────────────────────────────────────────────
  const activeChips = [
    search        && { label: `"${search}"`,     clear: () => { setSearch(''); setPage(1) } },
    filterMes     && { label: labelMes(filterMes), clear: () => { setFilterMes(''); setPage(1) } },
    filterArea    && { label: filterArea,          clear: () => { setFilterArea(''); setPage(1) } },
    filterConcepto && { label: filterConcepto,     clear: () => { setFilterConcepto(''); setPage(1) } },
    filterEstado  && { label: { con_novedades: 'Con novedades', sin_novedades: 'Sin novedades', reincidente: 'Reincidentes', con_pd: 'Con procesos disciplinarios' }[filterEstado],
                       clear: () => { setFilterEstado(''); setPage(1) } },
  ].filter(Boolean)

  const exportExcel = () => {
    exportarExcel(filtered.map(c => ({
      'Colaborador': c.nombre, 'Área': c.area,
      'Incapacidades': c.episodiosInc, 'Días Incapacidad': c.diasInc.toFixed(0),
      'Días Ausente Total': c.diasAusenteTotal.toFixed(0),
      'Tasa Ausentismo (%)': c.tasaAusentismo.toFixed(1),
      'Total Novedades': c.novedades.length, 'Reincidente': c.episodiosInc >= 2 ? 'Sí' : 'No',
      'Tiene Vehículo': c.tieneVehiculo ? 'Sí' : 'No',
      'Procesos Disciplinarios': c.procesosDisciplinarios || 0,
      'Productividad': c.productividad != null ? c.productividad : '—',
      'Periodo Productividad': c.productividadPeriodo || '—',
    })), {
      nombreHoja: 'Colaboradores',
      nombreArchivo: `Colaboradores_${currentCompany || 'empresa'}_${hoyISO()}.xlsx`,
      anchosColumnas: [32, 20, 14, 16, 16, 16, 16, 12, 14, 18, 16],
    })
  }

  const maxDias = Math.max(1, ...colaboradores.map(c => c.diasInc))

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <PageTitle icon={Users}>Colaboradores</PageTitle>
          <p>Historial de novedades por colaborador</p>
        </div>
        <button className="btn btn-ghost" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Exportar Excel
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`} style={{ animation: 'fadeInUp .3s ease' }}>{msg.text}</div>}

      {/* ── KPIs animados ──────────────────────────────────────────────────── */}
      {!loading && (
        <ColaboradorKpis
          kpis={kpis}
          filterEstado={filterEstado}
          setFilterEstado={setFilterEstado}
          setPage={setPage}
        />
      )}

      {/* ── Tabs por área ──────────────────────────────────────────────────── */}
      {!loading && areasDisponibles.length > 0 && (
        <ColaboradorAreaTabs
          colaboradores={colaboradores}
          areasDisponibles={areasDisponibles}
          filterArea={filterArea}
          setFilterArea={setFilterArea}
          setPage={setPage}
        />
      )}

      {loading ? (
        /* ── Skeleton ──────────────────────────────────────────────────────── */
        <ColaboradorSkeleton />
      ) : (
        <>
          {/* ── Filtros y controles ── */}
          <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Búsqueda */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Buscar colaborador o área..."
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
              </div>

              {/* Mes */}
              <select className="form-control" style={{ flex: '0 0 160px' }} value={filterMes} onChange={e => { setFilterMes(e.target.value); setPage(1) }}>
                <option value="">Todos los meses</option>
                {mesesDisponibles.map(m => <option key={m} value={m}>{labelMes(m)}</option>)}
              </select>

              {/* Concepto */}
              <select className="form-control" style={{ flex: '0 0 160px' }} value={filterConcepto} onChange={e => { setFilterConcepto(e.target.value); setPage(1) }}>
                <option value="">Todos los conceptos</option>
                {CONCEPTOS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Ordenar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: '0 0 auto' }}>
                <ArrowUpDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <select className="form-control" style={{ flex: '0 0 170px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="dias_desc">Más días incapacidad</option>
                  <option value="novedades_desc">Más novedades</option>
                  <option value="nombre_asc">Nombre (A-Z)</option>
                  <option value="area_asc">Área (A-Z)</option>
                </select>
              </div>

              {hasFilter && (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={13} /> Limpiar todo</button>
              )}

              {/* Toggle vista */}
              <div style={{ display: 'flex', marginLeft: 'auto', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
                <button onClick={() => setVista('tarjetas')} title="Vista tarjetas" style={{ border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', background: vista === 'tarjetas' ? 'var(--surface)' : 'transparent', boxShadow: vista === 'tarjetas' ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
                  <LayoutGrid size={14} style={{ color: vista === 'tarjetas' ? 'var(--primary)' : 'var(--text-muted)' }} />
                </button>
                <button onClick={() => setVista('tabla')} title="Vista tabla" style={{ border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', background: vista === 'tabla' ? 'var(--surface)' : 'transparent', boxShadow: vista === 'tabla' ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
                  <List size={14} style={{ color: vista === 'tabla' ? 'var(--primary)' : 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Chips de filtros activos */}
            {activeChips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {activeChips.map((chip, i) => (
                  <span key={i} className="col-chip" style={{ animationDelay: `${i * 0.05}s` }}>
                    {chip.label}
                    <button onClick={chip.clear}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Contador */}
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''}{hasFilter ? ' filtrados' : ' totales'}</span>
              {filtered.length === 0 && hasFilter && (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={13} /> Limpiar filtros</button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state" style={{ animation: 'fadeIn .3s ease' }}>
              <User size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p>No hay colaboradores que coincidan con los filtros.</p>
            </div>
          ) : vista === 'tarjetas' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14, marginBottom: 20 }}>
              {paged.map((col, idx) => <ColaboradorCard key={col.nombre} col={col} idx={idx} maxDias={maxDias} onSelect={setSelected} />)}
            </div>
          ) : (
            <ColaboradorTable paged={paged} onSelect={setSelected} />
          )}

          {totalPages > 1 && (
            <Paginacion total={filtered.length} page={page} totalPages={totalPages} onChange={setPage} info={`${filtered.length} colaboradores · Página ${page} de ${totalPages}`} />
          )}
        </>
      )}

      {/* ── Modal confirmar eliminar ── */}
      <DeleteConfirmModal
        deleteId={deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        message="¿Eliminar este registro de novedad? Esta acción no se puede deshacer."
      />

      {/* ── Detalle colaborador ── */}
      {selected && (
        <ColaboradorDetalleModal
          selected={selected}
          onClose={() => setSelected(null)}
          onDelete={puedeEditar ? setDeleteId : null}
        />
      )}
    </div>
  )
}