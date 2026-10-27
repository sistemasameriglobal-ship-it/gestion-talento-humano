import { useState, useMemo, useCallback } from 'react'
import {
  TrendingUp, AlertTriangle,
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Layers,
} from 'lucide-react'
import {
  DEPTOS, MESES, MESES_FULL,
  CIERRE_CFG, ANIO_ACTUAL,
} from '../utils/productividadConstants'
import { calcPct } from '../utils/productividadHelpers'
import PersonaModal from '../components/productividad/PersonaModal'
import DetalleModal from '../components/productividad/DetalleModal'
import ProcesosDisciplinariosModal from '../components/productividad/ProcesosDisciplinariosModal'
import ModalGestionDepartamentos from '../components/usuarios/ModalGestionDepartamentos'
import ProductividadKPIs from '../components/productividad/ProductividadKPIs'
import ProductividadPodio from '../components/productividad/ProductividadPodio'
import ProductividadChart from '../components/productividad/ProductividadChart'
import ProductividadTable from '../components/productividad/ProductividadTable'
import '../components/productividad/productividad.css'

import CierreView from '../components/productividad/CierreView'
import { useProductividadDatos } from '../hooks/useProductividadDatos'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'

export default function Productividad() {
  const { currentCompany, departamentos, canWrite } = useCompany()
  const puedeEditar = canWrite ? canWrite('productividad') : true
  const { isAdmin } = useAuth()
  const [showGestionDep, setShowGestionDep] = useState(false)

  // Configuración de departamentos dinámicos sincronizados con la empresa
  const deptosConfig = useMemo(() => {
    if (currentCompany !== 'ameriglobal') {
      const res = {}
      const listaDeps = departamentos && departamentos.length > 0 ? departamentos : ['COBRANZA']
      listaDeps.forEach(depName => {
        const key = depName.toLowerCase().replace(/\s+/g, '-')
        res[key] = {
          id: key,
          tabLabel: depName,
          departamento: depName,
          dependenciaEmpleados: depName.toUpperCase(),
          personaLabel: 'Colaborador(a)',
          personaLabelLower: 'colaborador(a)',
          unidadPlural: 'registros',
        }
      })
      return res
    }

    // Para AmeriGlobal: únicamente Ventas y UW-BS (Cierre se renderiza como su propia pestaña)
    return DEPTOS
  }, [currentCompany, departamentos])

  const keysDisponibles = useMemo(() => Object.keys(deptosConfig), [deptosConfig])
  const [deptoActivoState, setDeptoActivoState] = useState('ventas')

  // Asegurar que deptoActivo pertenezca a los departamentos de la empresa activa
  const deptoActivo = useMemo(() => {
    if (currentCompany === 'global_link') {
      return keysDisponibles.includes(deptoActivoState) ? deptoActivoState : (keysDisponibles[0] || 'cobranza')
    }
    return deptoActivoState
  }, [currentCompany, keysDisponibles, deptoActivoState])

  const setDeptoActivo = setDeptoActivoState
  const esCierre = currentCompany !== 'global_link' && deptoActivo === 'cierre'
  const cfg = deptosConfig[deptoActivo] || (currentCompany === 'global_link' ? Object.values(deptosConfig)[0] : CIERRE_CFG)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [mesFiltro, setMesFiltro] = useState('todos') // 'todos' o índice de MESES (0=Ene ... 11=Dic) como string
  const [ordenCol, setOrdenCol] = useState('resueltos')
  const [ordenDir, setOrdenDir] = useState('desc')
  const [anioActivo, setAnioActivo] = useState(ANIO_ACTUAL)

  const [modal, setModal] = useState(null) // { esNuevo, inicial } | null
  const [detalle, setDetalle] = useState(null) // persona (datosCrudos item) | null
  const [verProcesos, setVerProcesos] = useState(null) // persona (datosCrudos item) | null

  const {
    datosCrudos, cargando, refrescando, errorCarga,
    guardando, errorGuardado, setErrorGuardado, eliminandoNombre,
    cargarDatos, guardarPersona, eliminarPersona, importarFilas,
  } = useProductividadDatos({ cfg, deptoActivo, esCierre, modal, setModal, setAnioActivo, currentCompany })


  const cambiarDepto = (id) => {
    if (id === deptoActivo) return
    setDeptoActivo(id)
    setBusqueda('')
    setFiltroCargo('todos')
    setMesFiltro('todos')
    setOrdenCol('resueltos')
    setOrdenDir('desc')
  }

  // Vista aplanada del año activo: cada persona con sus 12 meses de clientes
  // asignados, resueltos y clientes en frío de ese año. El porcentaje de resolución
  // de asignados es resueltos ÷ asignados (meta: 40%). Clientes en frío suma al total general.
  const datos = useMemo(() => datosCrudos.map(p => {
    const resueltos = p.resueltosPorAnio[anioActivo] || Array(MESES.length).fill(0)
    const asignados = p.asignadosPorAnio[anioActivo] || Array(MESES.length).fill(0)
    const frios = p.friosPorAnio?.[anioActivo] || Array(MESES.length).fill(0)
    const totalResueltos = resueltos.reduce((s, v) => s + v, 0)
    const totalAsignados = asignados.reduce((s, v) => s + v, 0)
    const totalFrios = frios.reduce((s, v) => s + v, 0)
    const totalResueltosGeneral = totalResueltos + totalFrios
    return {
      ...p,
      resueltos,
      asignados,
      frios,
      totalResueltos,
      totalAsignados,
      totalFrios,
      totalResueltosGeneral,
      pct: calcPct(totalResueltos, totalAsignados),
    }
  }), [datosCrudos, anioActivo])

  const mesFiltroIdx = mesFiltro === 'todos' ? -1 : Number(mesFiltro)
  // { asig, resu, frios, totalGen, pct } de una persona en el período seleccionado (mes o año completo)
  const statsPeriodo = useCallback((v) => {
    if (mesFiltroIdx >= 0) {
      const asig = v.asignados[mesFiltroIdx] || 0
      const resu = v.resueltos[mesFiltroIdx] || 0
      const frios = v.frios?.[mesFiltroIdx] || 0
      const totalGen = resu + frios
      return { asig, resu, frios, totalGen, pct: calcPct(resu, asig) }
    }
    return {
      asig: v.totalAsignados,
      resu: v.totalResueltos,
      frios: v.totalFrios,
      totalGen: v.totalResueltosGeneral,
      pct: v.pct,
    }
  }, [mesFiltroIdx])
  const valorPeriodo = useCallback((v) => statsPeriodo(v).totalGen, [statsPeriodo])

  const cargosUnicos = useMemo(
    () => Array.from(new Set(datos.map(v => v.cargo).filter(Boolean))),
    [datos]
  )

  const monthlyAsignados = useMemo(
    () => MESES.map((_, i) => datos.reduce((s, v) => s + v.asignados[i], 0)),
    [datos]
  )
  const monthlyTotals = useMemo( // clientes resueltos asignados por mes (equipo)
    () => MESES.map((_, i) => datos.reduce((s, v) => s + v.resueltos[i], 0)),
    [datos]
  )
  const monthlyFrios = useMemo( // clientes en frío por mes (equipo)
    () => MESES.map((_, i) => datos.reduce((s, v) => s + (v.frios[i] || 0), 0)),
    [datos]
  )
  const monthlyTotalGen = useMemo( // total resueltos general (asignados resueltos + fríos)
    () => MESES.map((_, i) => monthlyTotals[i] + monthlyFrios[i]),
    [monthlyTotals, monthlyFrios]
  )
  const monthlyPct = useMemo(
    () => monthlyTotals.map((r, i) => calcPct(r, monthlyAsignados[i])),
    [monthlyTotals, monthlyAsignados]
  )
  const maxMensual = Math.max(...monthlyTotalGen, ...(cfg.usaClientes ? monthlyAsignados : []), 1)
  const mesesConDatos = monthlyTotalGen.map((v, i) => ({ v, i })).filter(m => m.v > 0)
  const mejorMesIdx = mesesConDatos.length
    ? mesesConDatos.reduce((a, b) => (b.v > a.v ? b : a)).i
    : -1

  const resumenPeriodo = useMemo(() => {
    const asignados = datos.reduce((s, v) => s + statsPeriodo(v).asig, 0)
    const resueltos = datos.reduce((s, v) => s + statsPeriodo(v).resu, 0)
    const frios = datos.reduce((s, v) => s + statsPeriodo(v).frios, 0)
    const totalGen = resueltos + frios
    return { asignados, resueltos, frios, totalGen, pct: calcPct(resueltos, asignados) }
  }, [datos, statsPeriodo])
  const totalGeneral = resumenPeriodo.totalGen
  const promedioEquipo = datos.length ? totalGeneral / datos.length : 0

  // Ranking: más clientes resueltos generales primero; a igualdad, mayor % de resolución
  const rankedByPeriodo = useMemo(
    () => [...datos].sort((a, b) => {
      const sa = statsPeriodo(a)
      const sb = statsPeriodo(b)
      return (sb.totalGen - sa.totalGen) || (sb.resu - sa.resu) || (sb.pct - sa.pct)
    }),
    [datos, statsPeriodo]
  )
  const top3 = rankedByPeriodo.slice(0, 3)
  const ultimoMesVacio = monthlyTotalGen[monthlyTotalGen.length - 1] === 0

  const etiquetaPeriodo = mesFiltroIdx >= 0 ? `${MESES_FULL[mesFiltroIdx]} ${anioActivo}` : `de ${anioActivo}`

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    let list = datos.map(v => ({
      ...v,
      rank: rankedByPeriodo.findIndex(r => r.nombre === v.nombre) + 1,
    }))
    if (q) list = list.filter(v => v.nombre.toLowerCase().includes(q))
    if (filtroCargo !== 'todos') list = list.filter(v => v.cargo === filtroCargo)
    const dir = ordenDir === 'asc' ? 1 : -1
    const claveOrden = ordenCol === 'asignados' ? 'asig'
      : ordenCol === 'pct' ? 'pct'
      : ordenCol === 'frios' ? 'frios'
      : ordenCol === 'totalGen' ? 'totalGen'
      : 'resu'
    list.sort((a, b) => {
      if (ordenCol === 'nombre') return a.nombre.localeCompare(b.nombre) * dir
      if (ordenCol === 'cargo') return a.cargo.localeCompare(b.cargo) * dir
      return (statsPeriodo(a)[claveOrden] - statsPeriodo(b)[claveOrden]) * dir
    })
    return list
  }, [busqueda, filtroCargo, ordenCol, ordenDir, rankedByPeriodo, datos, statsPeriodo])

  const toggleOrden = (col) => {
    if (ordenCol === col) {
      setOrdenDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdenCol(col)
      setOrdenDir('desc')
    }
  }

  const abrirEditar = (v) => {
    const persona = datosCrudos.find(p => p.nombre === v.nombre)
    setErrorGuardado(null)
    setDetalle(null)
    setModal({
      esNuevo: false,
      persona,
      inicial: {
        nombre: v.nombre, cargo: v.cargo, ingreso: v.ingreso,
        anio: anioActivo,
        asignados: [...v.asignados],
        resueltos: [...v.resueltos],
        frios: [...(v.frios || Array(MESES.length).fill(0))],
      },
    })
  }
  const abrirVer = (v) => {
    const persona = datosCrudos.find(p => p.nombre === v.nombre)
    setDetalle(persona)
  }

  if (cargando) {
    return (
      <div className="pr-wrap">
        <div className="pr-state">
          <Loader2 size={26} />
          <span className="pr-state-title">Cargando productividad de {cfg.tabLabel}…</span>
        </div>
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="pr-wrap">
        <div className="pr-state pr-state-error">
          <AlertTriangle size={26} />
          <span className="pr-state-title">No se pudieron cargar los datos</span>
          <span className="pr-state-sub">{errorCarga}</span>
          <button className="pr-btn pr-btn--primary" onClick={() => cargarDatos()}>Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="pr-wrap">
      {modal && (
        <PersonaModal
          inicial={modal.inicial}
          cfg={cfg}
          persona={modal.persona}
          guardando={guardando}
          errorGuardado={errorGuardado}
          onGuardar={guardarPersona}
          onCerrar={() => { if (!guardando) { setModal(null); setErrorGuardado(null) } }}
        />
      )}
      {detalle && (
        <DetalleModal
          persona={detalle}
          anio={anioActivo}
          cfg={cfg}
          onCerrar={() => setDetalle(null)}
          onEditar={() => abrirEditar({
            ...detalle,
            asignados: detalle.asignadosPorAnio[anioActivo] || Array(MESES.length).fill(0),
            resueltos: detalle.resueltosPorAnio[anioActivo] || Array(MESES.length).fill(0),
            frios: detalle.friosPorAnio?.[anioActivo] || Array(MESES.length).fill(0),
          })}
        />
      )}
      {verProcesos && (
        <ProcesosDisciplinariosModal persona={verProcesos} onCerrar={() => setVerProcesos(null)} />
      )}
      {showGestionDep && (
        <ModalGestionDepartamentos onClose={() => setShowGestionDep(false)} />
      )}

      {/* Encabezado + pestañas de departamento */}
      <div className="pr-head">
        <div>
          <div className="pr-title">
            <div className="pr-title-icon"><TrendingUp size={17} /></div>
            Productividad
          </div>
          <div className="pr-subtitle">
            Consolidado Enero — Diciembre · Sincronizado con empleados activos de {cfg.tabLabel}
            <button
              className={`pr-refresh ${refrescando ? 'pr-refresh--spin' : ''}`}
              onClick={() => cargarDatos({ silencioso: true })}
              disabled={refrescando}
              title="Recargar datos"
            >
              <RefreshCw size={12} /> {refrescando ? 'Actualizando…' : 'Actualizar'}
            </button>
            {isAdmin && (
              <button
                className="btn btn-ghost"
                onClick={() => setShowGestionDep(true)}
                style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title="Administrar departamentos"
              >
                <Layers size={13} /> Departamentos
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="pr-year-switch">
            <button onClick={() => setAnioActivo(a => a - 1)} title="Año anterior"><ChevronLeft size={14} /></button>
            <span>{anioActivo}</span>
            <button onClick={() => setAnioActivo(a => a + 1)} title="Año siguiente"><ChevronRight size={14} /></button>
          </div>
          <div className="pr-tabs">
            {Object.values(deptosConfig).map(d => (
              <button
                key={d.id}
                className={`pr-tab ${deptoActivo === d.id ? 'pr-tab--active' : ''}`}
                onClick={() => cambiarDepto(d.id)}
              >
                {d.tabLabel}
              </button>
            ))}
            {currentCompany === 'ameriglobal' && (
              <button
                className={`pr-tab ${deptoActivo === 'cierre' ? 'pr-tab--active' : ''}`}
                onClick={() => cambiarDepto('cierre')}
              >
                {CIERRE_CFG.tabLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {esCierre ? (
        <CierreView anioActivo={anioActivo} />
      ) : (
      <>
      {/* KPIs */}
      <ProductividadKPIs
        cfg={cfg} etiquetaPeriodo={etiquetaPeriodo} totalGeneral={totalGeneral}
        datos={datos} promedioEquipo={promedioEquipo} resumenPeriodo={resumenPeriodo}
        rankedByPeriodo={rankedByPeriodo} valorPeriodo={valorPeriodo} statsPeriodo={statsPeriodo}
        mejorMesIdx={mejorMesIdx} monthlyTotals={monthlyTotals} monthlyTotalGen={monthlyTotalGen} MESES={MESES}
        currentCompany={currentCompany} mesFiltroIdx={mesFiltroIdx} anioActivo={anioActivo}
      />

      {/* Podio top 3 */}
      <ProductividadPodio cfg={cfg} etiquetaPeriodo={etiquetaPeriodo} top3={top3} statsPeriodo={statsPeriodo} />

      {/* Gráfico mensual del equipo */}
      <ProductividadChart
        cfg={cfg} monthlyTotals={monthlyTotals} monthlyAsignados={monthlyAsignados} monthlyPct={monthlyPct} maxMensual={maxMensual}
        mejorMesIdx={mejorMesIdx} mesFiltroIdx={mesFiltroIdx} setMesFiltro={setMesFiltro}
        anioActivo={anioActivo} ultimoMesVacio={ultimoMesVacio}
      />

      {/* Tabla de productividad */}
      <ProductividadTable
        cfg={cfg} datos={datos} filas={filas} datosCrudos={datosCrudos}
        anioActivo={anioActivo} mesFiltroIdx={mesFiltroIdx} statsPeriodo={statsPeriodo}
        busqueda={busqueda} setBusqueda={setBusqueda}
        filtroCargo={filtroCargo} setFiltroCargo={setFiltroCargo} cargosUnicos={cargosUnicos}
        mesFiltro={mesFiltro} setMesFiltro={setMesFiltro}
        ordenCol={ordenCol} ordenDir={ordenDir} toggleOrden={toggleOrden}
        eliminandoNombre={eliminandoNombre} importarFilas={puedeEditar ? importarFilas : null}
        abrirVer={abrirVer} abrirEditar={puedeEditar ? abrirEditar : null} eliminarPersona={puedeEditar ? eliminarPersona : null} setVerProcesos={setVerProcesos}
      />
      </>
      )}
    </div>
  )
}
