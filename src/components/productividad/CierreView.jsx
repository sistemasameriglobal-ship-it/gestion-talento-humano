import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  TrendingUp, Trophy, Medal, AlertTriangle, Award,
  Pencil, Loader2, ChevronDown, ChevronUp, DollarSign, Sparkles,
  ShieldAlert, FileSpreadsheet, Target, CheckCircle2,
} from 'lucide-react'
import { MESES_FULL, CIERRE_CFG, CIERRE_METRICAS, normalizeNombre } from '../../utils/productividadConstants'
import { fmtMoneda, iniciales, fmtFecha, noHabiaIngresado, calcPct } from '../../utils/productividadHelpers'
import { exportarCierreExcel } from '../../utils/cierreExport'
import { armarFilaCierre, upsertCierreConFallback, valoresDeFilaCierre } from '../../utils/cierreFilas'
import * as empleadosApi from '../../api/empleados'
import * as productividadApi from '../../api/productividad'
import * as procesosApi from '../../api/procesosDisciplinarios'
import { filasExportCierre } from '../../utils/productividadImport'
import ImportExportProductividad from './ImportExportProductividad'
import PctBar from './PctBar'
import MesCierreModal from './MesCierreModal'
import ProcesosDisciplinariosModal from './ProcesosDisciplinariosModal'

export default function CierreView({ anioActivo }) {
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [empleados, setEmpleados] = useState([]) // [{nombre, cargo, ingreso, procesos}]
  const [datosPorMes, setDatosPorMes] = useState({}) // { 'Marzo': { 'Juan...': {cierres_asignados:..., ...} } }
  const [mesesAbiertos, setMesesAbiertos] = useState(new Set())

  const [modalMes, setModalMes] = useState(null) // { mesInicial } | null
  const [verProcesos, setVerProcesos] = useState(null) // persona | null
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(null)
  const [exportando, setExportando] = useState(false)
  const [mesFiltro, setMesFiltro] = useState('todos') // 'todos' | nombre del mes

  // silencioso: recarga sin la pantalla de "Cargando…" (la usa la importación, para que
  // el aviso de resultado no se pierda al desmontarse la vista)
  const cargar = useCallback(async ({ silencioso } = {}) => {
    if (!silencioso) setCargando(true)
    setErrorCarga(null)
    try {
      const [empleadosRes, mesesRes, procesosRes] = await Promise.all([
        empleadosApi.listarEmpleadosActivosPorDependencia(CIERRE_CFG.dependenciaEmpleados),
        productividadApi.listarCierreMesesPorAnio(anioActivo),
        procesosApi.listarProcesosDisciplinariosPorDepartamento(CIERRE_CFG.dependenciaEmpleados),
      ])
      if (empleadosRes.error) throw empleadosRes.error
      if (mesesRes.error) throw mesesRes.error
      if (procesosRes.error) console.error('No se pudieron cargar procesos disciplinarios:', procesosRes.error)

      // Procesos disciplinarios ordenados
      const procesosPorNombre = new Map()
      ;(procesosRes.data || [])
        .slice()
        .sort((a, b) => {
          const fa = a.fecha_inicio || a.fecha || a.created_at || ''
          const fb = b.fecha_inicio || b.fecha || b.created_at || ''
          return fa < fb ? 1 : fa > fb ? -1 : 0
        })
        .forEach(p => {
          const key = normalizeNombre(p.nombre_empleado)
          if (!key) return
          if (!procesosPorNombre.has(key)) procesosPorNombre.set(key, [])
          procesosPorNombre.get(key).push(p)
        })

      const porNombre = new Map()
      empleadosRes.data.forEach(e => {
        porNombre.set(e.nombre_completo, {
          nombre: e.nombre_completo,
          cargo: e.cargo || '',
          ingreso: e.fecha_ingreso || '',
          procesos: procesosPorNombre.get(normalizeNombre(e.nombre_completo)) || [],
        })
      })

      const porMes = {}
      mesesRes.data.forEach(row => {
        if (!porNombre.has(row.nombre_empleado)) return
        if (!porMes[row.mes]) porMes[row.mes] = {}

        // Normalizamos los valores usando tanto los nombres nuevos como los previos
        const asignados = Number(row.cierres_asignados ?? row.new_offers_units) || 0
        const cerrados = Number(row.cierres_cerrados ?? row.new_offers_dollars) || 0
        // El % de resolución siempre sale de resueltos ÷ asignados (solo esos dos)
        const pctCierres = calcPct(cerrados, asignados)

        const totalPlata = Number(row.total_plata ?? row.renewal_dollars) || 0
        const plataPrestada = Number(row.plata_prestada ?? row.total_units) || 0
        let pctPlata = Number(row.porcentaje_plata ?? row.total_dollars)
        if (isNaN(pctPlata) || pctPlata === 0) {
          pctPlata = totalPlata > 0 ? Math.round((plataPrestada / totalPlata) * 100) : 0
        }

        porMes[row.mes][row.nombre_empleado] = {
          ...row,
          cierres_asignados: asignados,
          cierres_cerrados: cerrados,
          porcentaje_cierres: pctCierres,
          total_plata: totalPlata,
          plata_prestada: plataPrestada,
          porcentaje_plata: pctPlata,
        }
      })

      setEmpleados(Array.from(porNombre.values()))
      setDatosPorMes(porMes)
      const ordenados = MESES_FULL.filter(m => porMes[m])
      setMesesAbiertos(new Set(ordenados.length ? [ordenados[ordenados.length - 1]] : []))
    } catch (err) {
      console.error(err)
      setErrorCarga(err.message || 'No se pudieron cargar los datos de Cierre.')
    } finally {
      setCargando(false)
    }
  }, [anioActivo])

  useEffect(() => { Promise.resolve().then(() => cargar()) }, [anioActivo, cargar])

  const mesesOrdenados = MESES_FULL.filter(m => datosPorMes[m])
  const mesesVisibles = mesFiltro === 'todos' ? mesesOrdenados : mesesOrdenados.filter(m => m === mesFiltro)

  const toggleMes = (mes) => setMesesAbiertos(prev => {
    const next = new Set(prev)
    next.has(mes) ? next.delete(mes) : next.add(mes)
    return next
  })
  const expandirTodos = () => setMesesAbiertos(new Set(mesesOrdenados))
  const colapsarTodos = () => setMesesAbiertos(new Set())

  // ── Métricas agregadas para KPIs / podio / gráfico ──────────────────────
  const etiquetaPeriodo = mesFiltro === 'todos' ? String(anioActivo) : `${mesFiltro} ${anioActivo}`

  const resumenEquipo = useMemo(() => {
    const porPersona = new Map(empleados.map(e => [
      e.nombre,
      {
        nombre: e.nombre,
        cargo: e.cargo,
        totalAsignados: 0,
        totalCerrados: 0,
        totalPlata: 0,
        plataPrestada: 0,
        conteoMeses: 0,
      }
    ]))

    mesesVisibles.forEach(mes => {
      const fila = datosPorMes[mes] || {}
      empleados.forEach(e => {
        const d = fila[e.nombre]
        if (!d) return
        const p = porPersona.get(e.nombre)
        p.totalAsignados += Number(d.cierres_asignados) || 0
        p.totalCerrados += Number(d.cierres_cerrados) || 0
        p.totalPlata += Number(d.total_plata) || 0
        p.plataPrestada += Number(d.plata_prestada) || 0
        p.conteoMeses += 1
      })
    })

    return Array.from(porPersona.values()).map(p => ({
      ...p,
      pctCierres: calcPct(p.totalCerrados, p.totalAsignados),
      pctPlata: p.totalPlata > 0 ? Math.round((p.plataPrestada / p.totalPlata) * 100) : 0,
    }))
  }, [empleados, datosPorMes, mesesVisibles])

  const monthlyPlataPrestadaTotals = mesesVisibles.map(mes => {
    const fila = datosPorMes[mes] || {}
    return empleados.reduce((s, e) => s + (Number(fila[e.nombre]?.plata_prestada) || 0), 0)
  })

  const totalPlataPrestadaAnio = monthlyPlataPrestadaTotals.reduce((s, v) => s + v, 0)
  const totalPlataAsignadaAnio = resumenEquipo.reduce((s, p) => s + p.totalPlata, 0)
  const totalCierresAsignadosAnio = resumenEquipo.reduce((s, p) => s + p.totalAsignados, 0)
  const totalCierresCerradosAnio = resumenEquipo.reduce((s, p) => s + p.totalCerrados, 0)

  const pctCierresGlobal = calcPct(totalCierresCerradosAnio, totalCierresAsignadosAnio)

  const pctPlataGlobal = totalPlataAsignadaAnio > 0
    ? Math.round((totalPlataPrestadaAnio / totalPlataAsignadaAnio) * 100)
    : 0

  const rankedPorPlata = useMemo(
    () => [...resumenEquipo].sort((a, b) => b.plataPrestada - a.plataPrestada),
    [resumenEquipo]
  )
  const top3 = rankedPorPlata.filter(p => p.plataPrestada > 0 || p.totalCerrados > 0).slice(0, 3)
  const maxMensualPlata = Math.max(...monthlyPlataPrestadaTotals, 1)
  const mejorMesIdx = monthlyPlataPrestadaTotals.length
    ? monthlyPlataPrestadaTotals.reduce((best, v, i) => (v > monthlyPlataPrestadaTotals[best] ? i : best), 0)
    : -1

  async function handleExportarExcel() {
    if (exportando) return
    setExportando(true)
    try {
      await exportarCierreExcel({
        anio: anioActivo,
        empleados,
        datosPorMes,
        mesesOrdenados,
      })
    } catch (err) {
      console.error(err)
      alert('Error al exportar a Excel: ' + (err.message || 'Error desconocido'))
    } finally {
      setExportando(false)
    }
  }

  async function guardarMes(mes, valores) {
    setGuardando(true)
    setErrorGuardado(null)
    try {
      const filas = Object.entries(valores).map(([nombre, v]) => armarFilaCierre(nombre, anioActivo, mes, v))

      // Si la BD aún no tiene columnas nuevas, se reintenta con las heredadas
      const error = await upsertCierreConFallback(productividadApi.upsertCierreMeses, filas)

      if (error) throw error
      await cargar()
      setMesesAbiertos(prev => new Set(prev).add(mes))
      setModalMes(null)
    } catch (err) {
      console.error(err)
      setErrorGuardado(err.message || 'No se pudo guardar la información.')
    } finally {
      setGuardando(false)
    }
  }

  // Importación desde Excel: se leen los valores ya guardados de cada año del archivo
  // para que las celdas en blanco NO borren nada (solo se cambia lo que trae el archivo).
  async function importarCierre(payloads) {
    const previos = new Map()
    for (const anio of [...new Set(payloads.map(p => p.anio))]) {
      const { data, error } = await productividadApi.listarCierreMesesPorAnio(anio)
      if (error) throw error
      ;(data || []).forEach(r => previos.set(`${anio}|${r.nombre_empleado}|${r.mes}`, valoresDeFilaCierre(r)))
    }
    const filas = payloads.map(p => {
      const prev = previos.get(`${p.anio}|${p.nombre}|${p.mes}`) || {}
      return armarFilaCierre(p.nombre, p.anio, p.mes, {
        cierres_asignados: p.asignados ?? prev.cierres_asignados,
        cierres_cerrados: p.resueltos ?? prev.cierres_cerrados,
        total_plata: p.monto ?? prev.total_plata,
        plata_prestada: p.capital ?? prev.plata_prestada,
      })
    })
    const error = await upsertCierreConFallback(productividadApi.upsertCierreMeses, filas)
    if (error) throw error
    await cargar({ silencioso: true })
  }

  // Lo ya guardado (solo del año abierto; otros años se leen al confirmar)
  const existentesCierre = (nombre, anio, mes) => {
    if (anio !== anioActivo) return undefined
    const d = datosPorMes[mes]?.[nombre]
    return d ? { asignados: d.cierres_asignados, resueltos: d.cierres_cerrados, monto: d.total_plata, capital: d.plata_prestada } : null
  }

  if (cargando) {
    return (
      <div className="pr-state">
        <Loader2 size={26} />
        <span className="pr-state-title">Cargando productividad de Cierre…</span>
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="pr-state pr-state-error">
        <AlertTriangle size={26} />
        <span className="pr-state-title">No se pudieron cargar los datos</span>
        <span className="pr-state-sub">{errorCarga}</span>
        <button className="pr-btn pr-btn--primary" onClick={cargar}>Reintentar</button>
      </div>
    )
  }

  return (
    <>
      {verProcesos && (
        <ProcesosDisciplinariosModal persona={verProcesos} onCerrar={() => setVerProcesos(null)} />
      )}

      {modalMes && (
        <MesCierreModal
          mesInicial={modalMes.mesInicial}
          anio={anioActivo}
          empleados={empleados}
          datosIniciales={modalMes.mesInicial ? datosPorMes[modalMes.mesInicial] : null}
          mesesOcupados={mesesOrdenados}
          guardando={guardando}
          errorGuardado={errorGuardado}
          onGuardar={guardarMes}
          onCerrar={() => { if (!guardando) { setModalMes(null); setErrorGuardado(null) } }}
        />
      )}

      {empleados.length === 0 ? (
        <div className="pr-card">
          <div className="ci-empty-mes">
            No hay empleados activos con dependencia <b>{CIERRE_CFG.dependenciaEmpleados}</b>. Agrégalos o actívalos en la sección Empleados.
          </div>
        </div>
      ) : (
        <>
          {/* Barra de Acciones y Exportación */}
          <div className="ci-top-banner">
            <div className="ci-top-left">
              <span className="ci-dept-badge">
                <Target size={13} /> Departamento de Cierre
              </span>
              <span className="ci-analysts-count">
                <b>{empleados.length}</b> analistas activos vinculados
              </span>
            </div>
            <div className="ci-top-actions">
              <ImportExportProductividad
                modo="cierre"
                etiqueta={CIERRE_CFG.tabLabel}
                anio={anioActivo}
                nombres={empleados.map(e => e.nombre)}
                filasExport={() => filasExportCierre(empleados, datosPorMes, anioActivo)}
                existentes={existentesCierre}
                onImportar={importarCierre}
              />
              <button
                className="pr-btn pr-btn--excel"
                onClick={handleExportarExcel}
                disabled={exportando || mesesOrdenados.length === 0}
                title="Exportar consolidado y detalle de Cierre a Excel"
              >
                {exportando ? <Loader2 size={13} className="pr-refresh--spin" /> : <FileSpreadsheet size={14} />}
                {exportando ? 'Exportando…' : 'Exportar a Excel'}
              </button>
              <button
                className="pr-btn pr-btn--primary"
                onClick={() => setModalMes({ mesInicial: null })}
              >
                <Sparkles size={13} /> Registrar mes de cierre
              </button>
            </div>
          </div>

          {/* KPIs Renovados */}
          <div className="pr-kpis">
            <div className="pr-kpi">
              <div className="pr-kpi-accent" />
              <span className="pr-kpi-label">Capital Colocado ({etiquetaPeriodo})</span>
              <span className="pr-kpi-value" style={{ color: 'var(--success)' }}>
                {fmtMoneda(totalPlataPrestadaAnio)}
              </span>
              <span className="pr-kpi-sub">
                <DollarSign size={12} color="var(--success)" /> Colocación efectiva en dólares
              </span>
            </div>

            <div className="pr-kpi">
              <div className="pr-kpi-accent" />
              <span className="pr-kpi-label">Monto Total Gestionado</span>
              <span className="pr-kpi-value">
                {fmtMoneda(totalPlataAsignadaAnio)}
              </span>
              <span className="pr-kpi-sub">
                <TrendingUp size={12} color="var(--secondary-dark)" /> {pctPlataGlobal}% de efectividad en colocación
              </span>
            </div>

            <div className="pr-kpi">
              <div className="pr-kpi-accent" />
              <span className="pr-kpi-label">Clientes Resueltos</span>
              <span className="pr-kpi-value">
                {totalCierresCerradosAnio.toLocaleString('es-CO')}
              </span>
              <span className="pr-kpi-sub">
                <Target size={12} color="var(--secondary-dark)" /> de {totalCierresAsignadosAnio.toLocaleString('es-CO')} clientes asignados ({pctCierresGlobal}%)
              </span>
            </div>

            {mesFiltro === 'todos' ? (
              <div className="pr-kpi">
                <div className="pr-kpi-accent" />
                <span className="pr-kpi-label">Mejor Mes de Colocación</span>
                <span className="pr-kpi-value">
                  {mejorMesIdx >= 0 ? mesesVisibles[mejorMesIdx] : '—'}
                </span>
                <span className="pr-kpi-sub">
                  {mejorMesIdx >= 0 ? `${fmtMoneda(monthlyPlataPrestadaTotals[mejorMesIdx])} prestados` : 'sin datos aún'}
                </span>
              </div>
            ) : (
              <div className="pr-kpi">
                <div className="pr-kpi-accent" />
                <span className="pr-kpi-label">Líder de {mesFiltro}</span>
                <span className="pr-kpi-value">{top3[0]?.nombre || '—'}</span>
                <span className="pr-kpi-sub">
                  {top3[0] ? `${fmtMoneda(top3[0].plataPrestada)} prestados (${top3[0].totalCerrados} clientes resueltos)` : 'sin datos aún'}
                </span>
              </div>
            )}
          </div>

          {/* Podio Top 3 */}
          {top3.length > 0 && (
            <div className="pr-card">
              <div className="pr-card-head">
                <span className="pr-card-title">
                  <Award size={16} /> Top Analistas de Cierre · {etiquetaPeriodo}
                </span>
                <span className="pr-count">Clasificación por mayor dinero prestado / clientes resueltos</span>
              </div>
              <div className="pr-podio">
                {top3[1] && (
                  <div className="pr-podio-item pr-podio-2">
                    <div className="pr-podio-avatar">{iniciales(top3[1].nombre)}</div>
                    <span className="pr-podio-name">{top3[1].nombre}</span>
                    <span className="pr-podio-total">{fmtMoneda(top3[1].plataPrestada)}</span>
                    <span className="ci-podio-sub">{top3[1].totalCerrados} de {top3[1].totalAsignados} clientes ({top3[1].pctCierres}%)</span>
                    <div className="pr-podio-bar" />
                  </div>
                )}
                {top3[0] && (
                  <div className="pr-podio-item pr-podio-1">
                    <Medal size={18} color="#F59E0B" />
                    <div className="pr-podio-avatar">{iniciales(top3[0].nombre)}</div>
                    <span className="pr-podio-name">{top3[0].nombre}</span>
                    <span className="pr-podio-total">{fmtMoneda(top3[0].plataPrestada)}</span>
                    <span className="ci-podio-sub">{top3[0].totalCerrados} de {top3[0].totalAsignados} clientes ({top3[0].pctCierres}%)</span>
                    <div className="pr-podio-bar" />
                  </div>
                )}
                {top3[2] && (
                  <div className="pr-podio-item pr-podio-3">
                    <div className="pr-podio-avatar">{iniciales(top3[2].nombre)}</div>
                    <span className="pr-podio-name">{top3[2].nombre}</span>
                    <span className="pr-podio-total">{fmtMoneda(top3[2].plataPrestada)}</span>
                    <span className="ci-podio-sub">{top3[2].totalCerrados} de {top3[2].totalAsignados} clientes ({top3[2].pctCierres}%)</span>
                    <div className="pr-podio-bar" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gráfico de Evolución Mensual */}
          {mesesVisibles.length > 0 && (
            <div className="pr-card">
              <div className="pr-card-head">
                <span className="pr-card-title">
                  <TrendingUp size={16} /> Dinero Prestado por Mes · {etiquetaPeriodo}
                </span>
                <span className="pr-count">Haz clic en un mes para ver su desglose completo</span>
              </div>
              <div className="pr-chart">
                {mesesVisibles.map((mes, i) => (
                  <div className="pr-chart-col" key={mes}>
                    <span className="pr-chart-val">
                      {monthlyPlataPrestadaTotals[i] ? fmtMoneda(monthlyPlataPrestadaTotals[i]) : ''}
                    </span>
                    <div
                      className={`pr-chart-bar ${i === mejorMesIdx ? 'pr-chart-bar--best' : ''} ${monthlyPlataPrestadaTotals[i] === 0 ? 'pr-chart-bar--empty' : ''} ${mesesAbiertos.has(mes) ? 'pr-chart-bar--selected' : ''}`}
                      style={{ height: `${Math.max((monthlyPlataPrestadaTotals[i] / maxMensualPlata) * 100, monthlyPlataPrestadaTotals[i] === 0 ? 4 : 6)}%` }}
                    />
                    <span className="pr-chart-label" onClick={() => toggleMes(mes)}>{mes.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procesos Disciplinarios */}
          <div className="pr-card">
            <div className="pr-card-head">
              <span className="pr-card-title">
                <ShieldAlert size={16} color="var(--danger)" /> Procesos Disciplinarios por Analista
              </span>
              <span className="pr-count">Monitoreo de asistencia y normatividad interna</span>
            </div>
            <div className="ci-table-scroll">
              <table className="ci-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>Analista</th>
                    {empleados.map(e => (
                      <th key={e.nombre} style={{ minWidth: 120 }}>
                        <div className="ci-th-nombre">{e.nombre}</div>
                        {e.ingreso && <div className="ci-th-ingreso">Ingreso: {fmtFecha(e.ingreso)}</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Procesos disciplinarios activos</b></td>
                    {empleados.map(e => (
                      <td key={e.nombre}>
                        {(e.procesos?.length || 0) > 0 ? (
                          <button
                            className="pr-flag pr-flag--warn"
                            style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'none' }}
                            title="Ver detalle de procesos disciplinarios"
                            onClick={() => setVerProcesos(e)}
                          >
                            <ShieldAlert size={12} /> {e.procesos.length}
                          </button>
                        ) : (
                          <span className="pr-flag pr-flag--ok">
                            <CheckCircle2 size={12} color="#16A34A" /> 0
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Controles de Filtros y Despliegue */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="pr-select" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}>
                <option value="todos">Todos los meses</option>
                {mesesOrdenados.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {mesesOrdenados.length > 0 && (
                <>
                  <button className="pr-btn pr-btn--ghost" onClick={expandirTodos}>Expandir todos</button>
                  <button className="pr-btn pr-btn--ghost" onClick={colapsarTodos}>Colapsar todos</button>
                </>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Mostrando <b>{mesesVisibles.length}</b> mes(es) con registros
            </div>
          </div>

          {/* Listado de Meses y Métricas */}
          {mesesOrdenados.length === 0 ? (
            <div className="pr-card">
              <div className="ci-empty-mes">
                Todavía no hay meses de cierre registrados para {anioActivo}. Usa "Registrar mes de cierre" para empezar.
              </div>
            </div>
          ) : mesesVisibles.length === 0 ? (
            <div className="pr-card">
              <div className="ci-empty-mes">
                No hay datos de cierre para {mesFiltro} de {anioActivo}.
              </div>
            </div>
          ) : (
            mesesVisibles.map((mes) => {
              const datos = datosPorMes[mes] || {}
              const abierto = mesesAbiertos.has(mes)
              
              const plataMes = empleados.reduce((s, e) => s + (Number(datos[e.nombre]?.plata_prestada) || 0), 0)
              const asignadosMes = empleados.reduce((s, e) => s + (Number(datos[e.nombre]?.cierres_asignados) || 0), 0)
              const cerradosMes = empleados.reduce((s, e) => s + (Number(datos[e.nombre]?.cierres_cerrados) || 0), 0)
              const pctCierresMes = calcPct(cerradosMes, asignadosMes)

              let mejorNombre = null
              let mejorValor = 0
              empleados.forEach(e => {
                const v = Number(datos[e.nombre]?.plata_prestada) || 0
                if (v > mejorValor) {
                  mejorValor = v
                  mejorNombre = e.nombre
                }
              })

              return (
                <div className="pr-card ci-mes-card" key={mes}>
                  <div className="ci-mes-title" onClick={() => toggleMes(mes)}>
                    <div className="ci-mes-title-left">
                      <div className="ci-mes-icon"><Target size={16} /></div>
                      <div>
                        <b>Cierre de {mes} · {anioActivo}</b>
                        <div className="ci-mes-sub">
                          <span style={{ color: '#16A34A', fontWeight: 800 }}>{fmtMoneda(plataMes)}</span> prestados · {cerradosMes}/{asignadosMes} clientes resueltos ({pctCierresMes}%)
                        </div>
                      </div>
                    </div>
                    <div className="ci-mes-actions">
                      <button
                        className="pr-btn pr-btn--ghost"
                        onClick={e => { e.stopPropagation(); setModalMes({ mesInicial: mes }) }}
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {abierto && (
                    <div className="ci-table-scroll">
                      <table className="ci-table">
                        <thead>
                          <tr>
                            <th style={{ minWidth: 200, textAlign: 'left' }}>Métrica</th>
                            {empleados.map(e => (
                              <th key={e.nombre} style={{ minWidth: 130 }}>
                                <div className="ci-th-nombre">{e.nombre}</div>
                                {e.ingreso && <div className="ci-th-ingreso">Ingreso: {fmtFecha(e.ingreso)}</div>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {CIERRE_METRICAS.map(met => (
                            <Fragment key={met.key}>
                              {met.espacioAntes && (
                                <tr className="ci-row--spacer">
                                  <td colSpan={empleados.length + 1} />
                                </tr>
                              )}
                              <tr className={met.tipo === 'moneda' ? 'ci-row--total' : ''}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {met.grupo === 'financiero' ? <DollarSign size={13} color="#16A34A" /> : <Target size={13} color="#2563EB" />}
                                    <span>{met.label}</span>
                                  </div>
                                </td>
                                {empleados.map(e => {
                                  if (noHabiaIngresado(e, mes, anioActivo)) {
                                    return <td key={e.nombre}><span className="ci-na-cell" title={`Ingresó el ${fmtFecha(e.ingreso)}`}>N/A</span></td>
                                  }
                                  const v = datos[e.nombre]?.[met.key]
                                  if (v == null) return <td key={e.nombre}>—</td>
                                  if (met.tipo === 'pct') return <td key={e.nombre}><PctBar value={v} /></td>
                                  if (met.tipo === 'moneda') return (
                                    <td key={e.nombre}>
                                      <span className="ci-total-cell">
                                        {fmtMoneda(v)}
                                        {met.key === 'plata_prestada' && e.nombre === mejorNombre && mejorValor > 0 && (
                                          <Trophy size={13} className="ci-crown" title="Líder en dinero colocado este mes" />
                                        )}
                                      </span>
                                    </td>
                                  )
                                  return <td key={e.nombre} style={{ fontWeight: 700 }}>{v.toLocaleString('es-CO')}</td>
                                })}
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </>
      )}
    </>
  )
}
