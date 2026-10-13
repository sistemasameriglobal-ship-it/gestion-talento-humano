import PageTitle from '../components/ui/PageTitle'
import { LayoutDashboard as TitleIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as novedadesApi from '../api/novedades'
import * as empleadosApi from '../api/empleados'
import { hoyISO } from '../utils/fecha'
import { MESES_DASHBOARD as MESES } from '../utils/dashboardConstants'
import { filtrarNovedades, calcularDiasPeriodo, calcularStats } from '../utils/dashboardStats'
import { exportarDashboardExcel } from '../utils/dashboardExport'
import { AlertCircle, Download, Activity, Users, Percent } from 'lucide-react'
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

  // Datos filtrados
  const data = useMemo(() => filtrarNovedades(allData, {
    filterPeriodo, filterConcepto, filterDependencia, filterAnio, filterMeses, rangoMes,
  }), [allData, filterAnio, filterMeses, filterPeriodo, filterConcepto, filterDependencia, rangoMes])

  // Datos con los mismos filtros EXCEPTO el de concepto — se usan como base
  // para el denominador de "tasa de ausentismo", que siempre debe representar
  // el total de colaboradores del periodo/área, sin importar qué concepto
  // esté seleccionado. Si se usara `data` (ya filtrada por concepto) el
  // denominador cambiaría según el filtro y la tasa dejaría de ser comparable
  // entre Incapacidad, LNR, etc.
  const dataBase = useMemo(() => filtrarNovedades(allData, {
    filterPeriodo, filterDependencia, filterAnio, filterMeses, rangoMes, incluirConcepto: false,
  }), [allData, filterAnio, filterMeses, filterPeriodo, filterDependencia, rangoMes])

  const hasFilter = filterAnio || filterMeses.length > 0 || filterPeriodo || filterDependencia || (filterConcepto && filterConcepto !== 'Incapacidad')

  // Días calendario REALES del período que está filtrado (respeta meses de
  // 28/29/30/31 días y años bisiestos) — reemplaza el supuesto fijo de "30
  // días por persona" que antes se usaba en la tasa de ausentismo. La lógica
  // vive en utils/dashboardStats.js (calcularDiasPeriodo).
  const { diasPeriodoBase, diasPeriodoLabel, periodoIni, periodoFin } = useMemo(
    () => calcularDiasPeriodo({ rangoMes, filterAnio, filterMeses, filterPeriodo, dataBase }),
    [rangoMes, filterAnio, filterMeses, filterPeriodo, dataBase]
  )

  // ── Colaboradores realmente activos durante el período filtrado ────────────
  // Antes el denominador de la tasa de ausentismo salía de "nombres únicos con
  // alguna novedad en el período" (tabla `novedades`). Eso metía en la cuenta a
  // gente que ya no está en la empresa (si tuvo una novedad dentro del rango de
  // fechas usado) y, al revés, dejaba fuera a quien no tuvo ninguna novedad
  // aunque estuviera activo todo el período. Ahora se calcula cruzando contra
  // la tabla `empleados` real: cuenta a quien ya había ingresado antes de que
  // terminara el período Y no se había retirado antes de que empezara.
  const empleadosActivosPeriodo = useMemo(() => {
    const hoy = hoyISO()
    // Indexar periodos laborales por empleado_id
    const periodosPorEmp = new Map()
    periodosLaborales.forEach(p => {
      if (!periodosPorEmp.has(p.empleado_id)) {
        periodosPorEmp.set(p.empleado_id, [])
      }
      periodosPorEmp.get(p.empleado_id).push(p)
    })

    return empleados.filter(e => {
      if (filterDependencia && (e.dependencia || 'Sin área') !== filterDependencia) return false

      const misPeriodos = periodosPorEmp.get(e.id)
      if (misPeriodos && misPeriodos.length > 0) {
        // Un empleado estuvo activo en el rango del dashboard si al menos UNO de sus periodos
        // laborales se solapa con el intervalo [periodoIni, periodoFin].
        return misPeriodos.some(p => {
          // Si el periodo inició después de que terminó el rango del dashboard, no se solapa
          if (p.fecha_ingreso && periodoFin && p.fecha_ingreso > periodoFin) return false
          // Si el periodo terminó antes de que iniciara el rango del dashboard, no se solapa
          if (p.fecha_retiro && periodoIni && p.fecha_retiro < periodoIni) return false
          return true
        })
      }

      // Fallback a los campos de la tabla empleados para compatibilidad previa
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

  const clearFilters = () => { setFilterAnio(''); setFilterMeses([]); setFilterPeriodo(''); setFilterConcepto('Incapacidad'); setFilterDependencia('') }

  // ── Estadísticas derivadas ──────────────────────────────────────────────────
  // La lógica completa vive en utils/dashboardStats.js (calcularStats).
  const stats = useMemo(
    () => calcularStats(data, allData, diasPeriodoBase, diasPeriodoLabel, empleadosActivosPeriodo),
    [data, allData, diasPeriodoBase, diasPeriodoLabel, empleadosActivosPeriodo]
  )

  // ── Export Excel ────────────────────────────────────────────────────────────
  // La construcción del workbook vive en utils/dashboardExport.js.
  const exportExcel = () => exportarDashboardExcel({
    data, stats, hasFilter, filterAnio, filterMeses, filterPeriodo, filterConcepto,
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
          <PageTitle icon={TitleIcon}>Panel General</PageTitle>
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
                  sub={d.totalDias > 0 ? `${Math.round(d.totalDias)} días en total` : `${d.empUnicos || 0} colaboradores`}
                  color={d.color}
                  active={filterConcepto === concepto}
                  onClick={() => setFilterConcepto(filterConcepto === concepto ? '' : concepto)}
                  delay={150 + i * 60}
                />
              )
            })}
          </div>

          {/* ── Comparativo mensual ──────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Comparativo mensual (datos globales)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: stats.cntMismoMesAnio > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { label: `Mes actual (${stats.mesActual})`, val: stats.cntMesActual, varVal: null, varLabel: '' },
                { label: `Mes anterior (${stats.mesAnterior})`, val: stats.cntMesAnterior, varVal: stats.varMesAnterior, varLabel: 'vs mes ant.' },
                stats.cntMismoMesAnio > 0 ? { label: 'Mismo mes año pasado', val: stats.cntMismoMesAnio, varVal: stats.varAnioAnterior, varLabel: 'vs año ant.' } : null,
              ].filter(Boolean).map((c, i) => (
                <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{c.val}</div>
                  {c.varVal !== null && c.varVal !== undefined && (
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: c.varVal > 0 ? '#DC2626' : c.varVal < 0 ? '#16A34A' : '#374151' }}>
                      {c.varVal > 0 ? '▲' : c.varVal < 0 ? '▼' : '='} {Math.abs(c.varVal)}% {c.varLabel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Distribución por concepto (donut) + Novedades por área (clic = drill-down) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12, marginBottom: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Distribución por concepto</h3>
              <ConceptoDonut
                data={stats.conceptosOrdenados}
                colors={stats.porConceptoDetalle}
                activeConcepto={filterConcepto}
                onSliceClick={(concepto) => setFilterConcepto(filterConcepto === concepto ? '' : concepto)}
              />
            </div>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Novedades por área</h3>
              <BarChart
                items={stats.depTodosOrdenadas}
                color="#7C3AED"
                maxItems={10}
                activeLabel={filterDependencia}
                onBarClick={(area) => setFilterDependencia(filterDependencia === area ? '' : area)}
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
        </>
        </FadeSwitch>
      )}

      {/* ── Modal detalle de persona ─────────────────────────────────────── */}
      <PersonaDetalleModal personaDetalle={personaDetalle} onCerrar={() => setPersonaDetalle(null)} />

      {/* ── Modal: detalle de colaboradores contados en el denominador de la tasa ── */}
      <ColaboradoresBaseModal
        show={showColaboradoresBase}
        onCerrar={() => setShowColaboradoresBase(false)}
        diasPeriodoLabel={stats.diasPeriodoLabel}
        filterDependencia={filterDependencia}
        empleadosActivosPeriodo={empleadosActivosPeriodo}
      />
    </div>
  )
}
