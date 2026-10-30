import PageTitle from '../components/ui/PageTitle'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as novedadesApi from '../api/novedades'
import * as empleadosApi from '../api/empleados'
import { hoyISO } from '../utils/fecha'
import { MESES_DASHBOARD as MESES } from '../utils/dashboardConstants'
import { filtrarNovedades, calcularDiasPeriodo, calcularStats } from '../utils/dashboardStats'
import { exportarDashboardExcel } from '../utils/dashboardExport'
import { LayoutDashboard, AlertCircle, Download, Activity, Users, Percent } from 'lucide-react'
import BarChart from '../components/dashboard/BarChart'
import ConceptoDonut from '../components/dashboard/ConceptoDonut'
import TendenciaChart from '../components/dashboard/TendenciaChart'
import StatCard from '../components/dashboard/StatCard'
import FadeSwitch from '../components/dashboard/FadeSwitch'
import LiveIndicator from '../components/ui/LiveIndicator'
import DashboardFiltros from '../components/dashboard/DashboardFiltros'
import ConceptoSeccion from '../components/dashboard/ConceptoSeccion'
import PersonaDetalleModal from '../components/dashboard/PersonaDetalleModal'
import ColaboradoresBaseModal from '../components/dashboard/ColaboradoresBaseModal'
import AusentesHoyWidget from '../components/dashboard/AusentesHoyWidget'
import DrillDownModal from '../components/dashboard/DrillDownModal'
import UltimasNovedadesTabla from '../components/dashboard/UltimasNovedadesTabla'
import EmpleadoHistorialModal from '../components/empleados/EmpleadoHistorialModal'
import { normalizarConcepto } from '../utils/parseExcel'
import { obtenerPeriodoPorFecha } from '../utils/novedadesValidacion'
import '../components/dashboard/dashboard.css'

export default function Dashboard({ onNavigate }) {
  const { currentCompany, companyConfig } = useCompany()
  const [allData, setAllData] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [periodosLaborales, setPeriodosLaborales] = useState([])
  const [showColaboradoresBase, setShowColaboradoresBase] = useState(false)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filterAnio, setFilterAnio] = useState('')
  const [filterMeses, setFilterMeses] = useState([]) // array de 'MM' — permite rango de varios meses
  const toggleMes = (val) => setFilterMeses(prev =>
    prev.includes(val) ? prev.filter(m => m !== val) : [...prev, val].sort()
  )
  const [filterPeriodo, setFilterPeriodo] = useState('')
  const [filterConcepto, setFilterConcepto] = useState('Incapacidad')
  const [filterDependencia, setFilterDependencia] = useState('')

  // Orden de la tabla "Top colaboradores" (dinámica: clic en encabezado para ordenar)
  const [sortBy, setSortBy] = useState('dias') // 'dias' | 'episodios' | 'prom'

  // Auto-refresh
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [personaDetalle, setPersonaDetalle] = useState(null) // { nombre, concepto, color, registros }
  const [drillDown, setDrillDown] = useState(null) // { tipo, titulo, color, registros }
  const [selectedEmpForExpediente, setSelectedEmpForExpediente] = useState(null)

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    const [{ data, error }, { data: empData, error: empError }, { data: persData }] = await Promise.all([
      novedadesApi.listarNovedadesCompleto(currentCompany),
      empleadosApi.listarEmpleados(currentCompany),
      empleadosApi.listarTodosLosPeriodos(currentCompany).catch(() => ({ data: [] })),
    ])
    if (!error) {
      setAllData(data || [])
      setLastUpdated(new Date())
    }
    if (!empError) setEmpleados(empData || [])
    if (persData) setPeriodosLaborales(persData || [])
    if (!silent) setLoading(false)
    setRefreshing(false)
  }, [currentCompany])

  useEffect(() => {
    // fetchData es async: todo setState ocurre después del `await`, nunca de
    // forma síncrona dentro del efecto. Es el patrón estándar de "cargar datos
    // al montar" documentado por React; la regla set-state-in-effect (versión
    // experimental del plugin) da falso positivo aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    const interval = setInterval(() => fetchData(true), 60000) // cada 60s
    return () => clearInterval(interval)
  }, [fetchData])

  // Años y periodos disponibles
  const aniosDisponibles = useMemo(() =>
    [...new Set(allData.map(r => r.fecha_inicio?.substring(0, 4) || r.periodo?.substring(0, 4)).filter(Boolean))].sort().reverse()
  , [allData])

  const periodosDisponibles = useMemo(() =>
    [...new Set(allData.map(r => r.periodo).filter(Boolean))].sort().reverse()
  , [allData])

  // Rango de meses seleccionados: toma el primero y el último mes elegidos
  // (aunque no sean contiguos) y arma el rango completo de fechas entre ambos.
  const rangoMes = useMemo(() => {
    if (!filterAnio || filterMeses.length === 0) return null
    const primerMes = filterMeses[0]
    const ultimoMes = filterMeses[filterMeses.length - 1]
    const ini = `${filterAnio}-${primerMes}-01`
    const lastDay = new Date(parseInt(filterAnio), parseInt(ultimoMes), 0).getDate()
    const fin = `${filterAnio}-${ultimoMes}-${String(lastDay).padStart(2, '0')}`
    return { ini, fin }
  }, [filterAnio, filterMeses])

  // Enriquecer allData con cargo y área oficial, respetando los períodos históricos del colaborador
  const allDataEnriched = useMemo(() => {
    if (!empleados || empleados.length === 0) return allData
    const empMap = new Map()
    const empIdMap = new Map()
    empleados.forEach(e => {
      if (e.nombre_completo) empMap.set(e.nombre_completo.trim().toLowerCase(), e)
      if (e.id) empIdMap.set(e.id, e)
    })

    const periodosPorEmp = new Map()
    ;(periodosLaborales || []).forEach(p => {
      if (!p.empleado_id) return
      if (!periodosPorEmp.has(p.empleado_id)) periodosPorEmp.set(p.empleado_id, [])
      periodosPorEmp.get(p.empleado_id).push(p)
    })

    return allData.map(r => {
      const e = (r.empleado_id && empIdMap.get(r.empleado_id)) ||
        empMap.get((r.nombre_empleado || '').trim().toLowerCase())

      const empId = r.empleado_id || e?.id
      const misPeriodos = empId ? (periodosPorEmp.get(empId) || []) : []
      const periodoHistorico = obtenerPeriodoPorFecha(misPeriodos, r.fecha_inicio)

      // El área y cargo históricos correspondientes a la fecha_inicio tienen prioridad sobre
      // el área actual del empleado (e.dependencia) y sobre registros erróneamente sincronizados.
      const depHistorica = (periodoHistorico?.dependencia && (!r.dependencia || r.dependencia === e?.dependencia))
        ? periodoHistorico.dependencia
        : (periodoHistorico?.dependencia || r.dependencia || e?.dependencia || '')

      const cargoHistorico = (periodoHistorico?.cargo && (!r.cargo || r.cargo === e?.cargo))
        ? periodoHistorico.cargo
        : (periodoHistorico?.cargo || r.cargo || e?.cargo || '')

      return {
        ...r,
        cargo: cargoHistorico,
        dependencia: depHistorica,
      }
    })
  }, [allData, empleados, periodosLaborales])

  const hasFilter = filterAnio || filterMeses.length > 0 || filterPeriodo || filterDependencia || (filterConcepto && filterConcepto !== 'Incapacidad')

  // Días calendario REALES del período que está filtrado (respeta meses de
  // 28/29/30/31 días y años bisiestos) — define las fechas de corte periodoIni y periodoFin
  const { diasPeriodoBase, diasPeriodoLabel, periodoIni, periodoFin } = useMemo(
    () => calcularDiasPeriodo({ rangoMes, filterAnio, filterMeses, filterPeriodo, dataBase: allDataEnriched }),
    [rangoMes, filterAnio, filterMeses, filterPeriodo, allDataEnriched]
  )

  // Datos filtrados (incluye novedades solapadas con el período)
  const data = useMemo(() => filtrarNovedades(allDataEnriched, {
    filterPeriodo, filterConcepto, filterDependencia, filterAnio, filterMeses, rangoMes, periodoIni, periodoFin,
  }), [allDataEnriched, filterAnio, filterMeses, filterPeriodo, filterConcepto, filterDependencia, rangoMes, periodoIni, periodoFin])

  // Datos con los mismos filtros EXCEPTO el de concepto — se usan como base
  // para el denominador de "tasa de ausentismo", que siempre debe representar
  // el total de colaboradores del periodo/área, sin importar qué concepto
  // esté seleccionado.
  const dataBase = useMemo(() => filtrarNovedades(allDataEnriched, {
    filterPeriodo, filterDependencia, filterAnio, filterMeses, rangoMes, periodoIni, periodoFin, incluirConcepto: false,
  }), [allDataEnriched, filterAnio, filterMeses, filterPeriodo, filterDependencia, rangoMes, periodoIni, periodoFin])

  // ── Colaboradores realmente activos durante el período filtrado ────────────
  // Denominador exacto de la tasa de ausentismo cruzando contra `empleados` y `empleado_periodos`.
  // Si hay filtro por área, se evalúa el área en la que el colaborador estuvo durante el período filtrado.
  const empleadosActivosPeriodo = useMemo(() => {
    const hoy = hoyISO()
    // Indexar periodos laborales por empleado_id
    const periodosPorEmp = new Map()
    ;(periodosLaborales || []).forEach(p => {
      if (!periodosPorEmp.has(p.empleado_id)) {
        periodosPorEmp.set(p.empleado_id, [])
      }
      periodosPorEmp.get(p.empleado_id).push(p)
    })

    return empleados.filter(e => {
      const misPeriodos = periodosPorEmp.get(e.id)
      if (misPeriodos && misPeriodos.length > 0) {
        // Encontrar los períodos que se solapan con el intervalo [periodoIni, periodoFin]
        const periodosSolapados = misPeriodos.filter(p => {
          if (p.fecha_ingreso && periodoFin && p.fecha_ingreso > periodoFin) return false
          if (p.fecha_retiro && periodoIni && p.fecha_retiro < periodoIni) return false
          return true
        })

        if (periodosSolapados.length === 0) return false

        // Si hay filtro de área, validar que en alguno de los períodos solapados perteneciera a esa área
        if (filterDependencia && !periodosSolapados.some(p => (p.dependencia || 'Sin área') === filterDependencia)) {
          return false
        }

        const pActivoEnPeriodo = periodosSolapados[periodosSolapados.length - 1]
        e.dependencia_en_periodo = pActivoEnPeriodo?.dependencia || e.dependencia || ''
        return true
      }

      // Fallback a los campos de la tabla empleados para compatibilidad previa
      if (filterDependencia && (e.dependencia || 'Sin área') !== filterDependencia) return false
      // Aún no había ingresado cuando terminó el período
      if (e.fecha_ingreso && periodoFin && e.fecha_ingreso > periodoFin) return false
      if (e.fecha_retiro) {
        // Ya se había retirado antes de que empezara el período
        if (periodoIni && e.fecha_retiro < periodoIni) return false
      } else if (e.activo === false && periodoFin >= hoy) {
        // Inactivo pero sin fecha de retiro registrada (dato antiguo)
        return false
      }
      return true
    })
  }, [empleados, periodosLaborales, filterDependencia, periodoIni, periodoFin])

  const novedadesPorEmpleado = useMemo(() => {
    const acc = {}
    allData.forEach(r => {
      const k = r.nombre_empleado
      if (!k) return
      if (!acc[k]) acc[k] = { novedades: [], diasInc: 0, episodiosInc: 0, porConcepto: {} }
      acc[k].novedades.push(r)
      const tipo = normalizarConcepto(r.concepto)
      if (tipo === 'Incapacidad') {
        acc[k].episodiosInc++
        acc[k].diasInc += parseFloat(r.total_dias) || 0
      }
      if (!acc[k].porConcepto[tipo]) acc[k].porConcepto[tipo] = { episodios: 0, dias: 0 }
      acc[k].porConcepto[tipo].episodios++
      acc[k].porConcepto[tipo].dias += parseFloat(r.total_dias) || 0
    })
    return acc
  }, [allData])

  const periodosPorEmpMap = useMemo(() => {
    const acc = {}
    periodosLaborales.forEach(p => {
      if (!acc[p.empleado_id]) acc[p.empleado_id] = []
      acc[p.empleado_id].push(p)
    })
    Object.values(acc).forEach(list => list.sort((a, b) => (a.numero_periodo || 0) - (b.numero_periodo || 0)))
    return acc
  }, [periodosLaborales])

  const handleOpenExpediente = useCallback((nombreOId) => {
    if (!nombreOId) return
    const norm = String(nombreOId).trim().toLowerCase()
    let emp = empleados.find(e => e.id === nombreOId || (e.nombre_completo && e.nombre_completo.trim().toLowerCase() === norm))
    if (!emp) {
      emp = {
        id: `virtual-${Date.now()}`,
        nombre_completo: nombreOId,
        dependencia: 'Sin área',
        activo: true,
      }
    }
    setSelectedEmpForExpediente(emp)
  }, [empleados])

  const clearFilters = () => { setFilterAnio(''); setFilterMeses([]); setFilterPeriodo(''); setFilterConcepto('Incapacidad'); setFilterDependencia('') }

  // ── Estadísticas derivadas ──────────────────────────────────────────────────
  // La lógica completa vive en utils/dashboardStats.js (calcularStats).
  const stats = useMemo(
    () => calcularStats(data, allDataEnriched, diasPeriodoBase, diasPeriodoLabel, empleadosActivosPeriodo, { periodoIni, periodoFin }),
    [data, allDataEnriched, diasPeriodoBase, diasPeriodoLabel, empleadosActivosPeriodo, periodoIni, periodoFin]
  )

  // ── Export Excel ────────────────────────────────────────────────────────────
  // La construcción del workbook vive en utils/dashboardExport.js.
  const exportExcel = () => exportarDashboardExcel({
    data, stats, hasFilter, filterAnio, filterMeses, filterPeriodo, filterConcepto,
    empresaNombre: companyConfig?.nombre || 'AmeriGlobal',
  })

  if (loading) return <div className="empty-state"><p>Cargando datos...</p></div>

  const labelFiltro = [
    filterAnio && filterMeses.length
      ? (filterMeses.length === 1
          ? `${MESES.find(m => m.val === filterMeses[0])?.label} ${filterAnio}`
          : `${MESES.find(m => m.val === filterMeses[0])?.label}–${MESES.find(m => m.val === filterMeses[filterMeses.length - 1])?.label} ${filterAnio}`)
      : filterAnio ? `Año ${filterAnio}` : filterPeriodo ? `Periodo ${filterPeriodo}` : null,
    filterConcepto ? filterConcepto : null,
    filterDependencia ? `Área: ${filterDependencia}` : null,
  ].filter(Boolean).join(' · ') || null

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <PageTitle icon={LayoutDashboard}>Panel General</PageTitle>
          <p>Resumen de novedades · {companyConfig.nombre}
            {labelFiltro && <strong style={{ marginLeft: 6, color: 'var(--primary)' }}>— {labelFiltro}</strong>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <LiveIndicator lastUpdated={lastUpdated} refreshing={refreshing} onRefreshNow={() => fetchData(true)} />
          <button
            className="btn btn-primary"
            onClick={exportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={15} /> Descargar Excel
          </button>
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <DashboardFiltros
        dataLength={data.length} hasFilter={hasFilter} clearFilters={clearFilters}
        aniosDisponibles={aniosDisponibles} filterAnio={filterAnio} setFilterAnio={setFilterAnio}
        filterMeses={filterMeses} setFilterMeses={setFilterMeses} toggleMes={toggleMes}
        periodosDisponibles={periodosDisponibles} filterPeriodo={filterPeriodo} setFilterPeriodo={setFilterPeriodo}
        filterConcepto={filterConcepto} setFilterConcepto={setFilterConcepto}
        filterDependencia={filterDependencia} setFilterDependencia={setFilterDependencia}
      />


      {data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <AlertCircle size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ marginBottom: 8 }}>{hasFilter ? 'Sin datos para este filtro' : 'Sin datos registrados'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            {hasFilter ? 'Prueba con otro periodo o limpia los filtros.' : 'Importa el archivo Excel para comenzar.'}
          </p>
          {hasFilter
            ? <button className="btn btn-ghost" onClick={clearFilters}>Limpiar filtros</button>
            : <button className="btn btn-primary" onClick={() => onNavigate('importar')}>Importar Excel</button>
          }
        </div>
      ) : (
        <FadeSwitch fadeKey={`${filterAnio}-${filterMeses.join(',')}-${filterPeriodo}-${filterConcepto}-${filterDependencia}`}>
        <>
          {/* ── KPI globales ─────────────────────────────────────────────────── */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <StatCard
              accent icon={Activity} label="Total Novedades" value={stats.total}
              sub="registros en el periodo" delay={0}
              trend={stats.varMesAnterior ?? null}
            />
            <StatCard icon={Users} label="Colaboradores" value={stats.empleadosUnicos} sub="con alguna novedad" delay={60} />
            <StatCard
              icon={Percent}
              label="Tasa ausentismo"
              value={stats.tasaAusentismoGlobal}
              decimals={1}
              suffix="%"
              sub={`${Math.round(stats.diasAusentismoTotal)} días de ausencia · ${stats.empleadosUnicosBase} colaboradores activos — clic para ver el detalle`}
              title={`Tasa = días de ausencia / (colaboradores activos en el período × días del período). Colaboradores activos: ${stats.empleadosUnicosBase} (cruce con fecha de ingreso/retiro en Empleados; no cuenta a quien ya se retiró antes de este período). Período usado: ${stats.diasPeriodoLabel}. Clic para ver el listado.`}
              color="#0369A1"
              delay={90}
              onClick={() => setShowColaboradoresBase(true)}
            />
            {/* Una tarjeta por cada concepto presente — clic para filtrar por ese concepto */}
            {stats.conceptosOrdenados.map(([concepto, cnt], i) => {
              const d = stats.porConceptoDetalle[concepto] || {}
              return (
                <StatCard
                  key={concepto}
                  label={concepto}
                  value={cnt}
                  sub={d.totalDias > 0 ? `${Math.round(d.totalDias)} días en total` : `${d.empUnicos || 1} colaborador${(d.empUnicos || 1) !== 1 ? 'es' : ''}`}
                  color={d.color}
                  active={filterConcepto === concepto}
                  onClick={() => setFilterConcepto(filterConcepto === concepto ? '' : concepto)}
                  delay={150 + i * 60}
                />
              )
            })}
          </div>

          {/* ── Widget: Colaboradores Ausentes Hoy ──────────────────────────── */}
          <AusentesHoyWidget
            ausentesHoy={stats.ausentesHoy}
            ausenciasPeriodo={stats.ausenciasPeriodo}
            onOpenExpediente={handleOpenExpediente}
          />

          {/* ── Comparativo mensual ──────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Comparativo mensual (datos globales)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: stats.cntMismoMesAnio > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { label: `Mes actual (${stats.mesActual})`, val: stats.cntMesActual, varVal: stats.varMesAnterior, varLabel: 'vs mes ant.' },
                { label: `Mes anterior (${stats.mesAnterior})`, val: stats.cntMesAnterior, varVal: null, varLabel: '' },
                stats.cntMismoMesAnio > 0 ? { label: 'Mismo mes año pasado', val: stats.cntMismoMesAnio, varVal: stats.varAnioAnterior, varLabel: 'vs año ant.' } : null,
              ].filter(Boolean).map((c, i) => (
                <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{c.val}</div>
                  {c.varVal !== null && c.varVal !== undefined && (
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: c.varVal > 0 ? '#DC2626' : c.varVal < 0 ? '#16A34A' : '#374151' }}>
                      {c.varVal > 0 ? '▲ +' : c.varVal < 0 ? '▼ ' : '='}{Math.abs(c.varVal)}% {c.varLabel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Distribución por concepto (donut) + Novedades por área (clic = drill-down) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12, marginBottom: 16 }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Distribución por concepto</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clic para desglose</span>
              </div>
              <ConceptoDonut
                data={stats.conceptosOrdenados}
                colors={stats.porConceptoDetalle}
                activeConcepto={filterConcepto}
                onSliceClick={(concepto) => {
                  const d = stats.porConceptoDetalle[concepto]
                  setDrillDown({
                    tipo: 'concepto',
                    titulo: concepto,
                    color: d?.color,
                    registros: d?.filas || [],
                  })
                }}
              />
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Novedades por área</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clic para desglose</span>
              </div>
              <BarChart
                items={stats.depTodosOrdenadas}
                detallesPorItem={stats.porDepDetalle}
                color="#7C3AED"
                maxItems={10}
                activeLabel={filterDependencia}
                onBarClick={(area) => {
                  const filas = stats.porDepDetalle[area] || []
                  setDrillDown({
                    tipo: 'area',
                    titulo: area,
                    color: '#7C3AED',
                    registros: filas,
                  })
                }}
              />
            </div>
          </div>

          {/* ── Tendencia mensual ────────────────────────────────────────────── */}
          {stats.tendencia.length > 1 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Tendencia mensual de novedades</h3>
              <TendenciaChart tendencia={stats.tendencia} />
            </div>
          )}

          {/* ── Sección dinámica por cada concepto ───────────────────────────── */}
          {stats.conceptosPresentes.map((concepto, idx) => {
            const d = stats.porConceptoDetalle[concepto]
            if (!d || d.count === 0) return null
            return (
              <ConceptoSeccion
                key={concepto}
                concepto={concepto} d={d} idx={idx}
                empleadosUnicosBase={stats.empleadosUnicosBase}
                diasPeriodoBase={stats.diasPeriodoBase}
                diasPeriodoLabel={stats.diasPeriodoLabel}
                filterDependencia={filterDependencia} setFilterDependencia={setFilterDependencia}
                sortBy={sortBy} setSortBy={setSortBy}
                setPersonaDetalle={setPersonaDetalle}
              />
            )
          })}

          {/* ── Tabla Resumen: Últimas novedades registradas ────────────────── */}
          <UltimasNovedadesTabla
            novedades={stats.ultimasNovedades}
            onVerDetalle={(item) => setPersonaDetalle(item)}
            onOpenExpediente={handleOpenExpediente}
          />
        </>
        </FadeSwitch>
      )}

      {/* ── Modal detalle de persona ─────────────────────────────────────── */}
      <PersonaDetalleModal personaDetalle={personaDetalle} onCerrar={() => setPersonaDetalle(null)} />

      {/* ── Modal Drill-Down (desglose al hacer clic en dona o barras) ────── */}
      <DrillDownModal
        drillDown={drillDown}
        onCerrar={() => setDrillDown(null)}
        onVerExpediente={handleOpenExpediente}
        onFiltrar={(tipo, val) => {
          if (tipo === 'concepto') {
            setFilterConcepto(filterConcepto === val ? '' : val)
          } else {
            setFilterDependencia(filterDependencia === val ? '' : val)
          }
        }}
      />

      {/* ── Modal: detalle de colaboradores contados en el denominador de la tasa ── */}
      <ColaboradoresBaseModal
        show={showColaboradoresBase}
        onCerrar={() => setShowColaboradoresBase(false)}
        diasPeriodoLabel={stats.diasPeriodoLabel}
        filterDependencia={filterDependencia}
        empleadosActivosPeriodo={empleadosActivosPeriodo}
      />

      {/* ── Modal: Expediente Integral del Colaborador ────────────────────── */}
      {selectedEmpForExpediente && (
        <EmpleadoHistorialModal
          selectedEmp={selectedEmpForExpediente}
          novedadesPorEmpleado={novedadesPorEmpleado}
          periodos={periodosPorEmpMap[selectedEmpForExpediente.id] || []}
          vacaciones={[]}
          procesos={[]}
          onClose={() => setSelectedEmpForExpediente(null)}
        />
      )}
    </div>
  )
}
