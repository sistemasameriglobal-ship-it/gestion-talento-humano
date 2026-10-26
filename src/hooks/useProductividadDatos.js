import { useState, useEffect, useCallback } from 'react'
import * as empleadosApi from '../api/empleados'
import * as productividadApi from '../api/productividad'
import * as procesosApi from '../api/procesosDisciplinarios'
import { METRICA, METRICA_ASIGNADOS, METRICA_RESUELTOS, METRICA_FRIOS, MESES, MESES_FULL, ANIO_ACTUAL, normalizeNombre } from '../utils/productividadConstants'

// Encapsula la carga de datos (empleados + resumen + productividad + procesos
// disciplinarios) y las operaciones de guardado/eliminación para la vista
// principal de Productividad (Ventas / UW-BS). La vista de "Cierre" tiene su
// propia lógica en CierreView.jsx, separada porque su modelo de datos es
// distinto (tabla propia con métricas financieras adicionales).
//
// Modelo de datos por persona:
//   resueltosPorAnio: { 2026: [12 valores] }  → Clientes Resueltos
//   asignadosPorAnio: { 2026: [12 valores] }  → Clientes Asignados
//   friosPorAnio:     { 2026: [12 valores] }  → Clientes en Frío (Redes Sociales / Prospección)
// (En departamentos sin usaClientes, "resueltos" guarda el valor único
// "Producción" y "asignados"/"frios" quedan vacíos.)
export function useProductividadDatos({ cfg, deptoActivo, esCierre, modal, setModal, setAnioActivo, currentCompany }) {
  const [datosCrudos, setDatosCrudos] = useState([]) // [{ nombre, cargo, ingreso, procesos, resueltosPorAnio: {2025:[...]}, asignadosPorAnio: {2025:[...]}, friosPorAnio: {2025:[...]} }]
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [errorCarga, setErrorCarga] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(null)
  const [eliminandoNombre, setEliminandoNombre] = useState(null)

  const cargarDatos = useCallback(async ({ silencioso } = {}) => {
    silencioso ? setRefrescando(true) : setCargando(true)
    setErrorCarga(null)
    try {
      const [empleadosRes, resumenRes, prodRes, asigRes, friosRes, procesosRes] = await Promise.all([
        empleadosApi.listarEmpleadosActivosPorDependencia(cfg.dependenciaEmpleados, currentCompany),
        productividadApi.listarResumenPorDepartamento(cfg.departamento, currentCompany),
        productividadApi.listarProductividadPorDepartamento(cfg.departamento, cfg.usaClientes ? METRICA_RESUELTOS : METRICA, currentCompany),
        cfg.usaClientes
          ? productividadApi.listarProductividadPorDepartamento(cfg.departamento, METRICA_ASIGNADOS, currentCompany)
          : Promise.resolve({ data: [], error: null }),
        cfg.usaClientes
          ? productividadApi.listarProductividadPorDepartamento(cfg.departamento, METRICA_FRIOS, currentCompany)
          : Promise.resolve({ data: [], error: null }),
        procesosApi.listarProcesosDisciplinariosPorDepartamento(cfg.dependenciaEmpleados, currentCompany),
      ])
      if (empleadosRes.error) throw empleadosRes.error
      if (resumenRes.error) throw resumenRes.error
      if (prodRes.error) throw prodRes.error
      if (asigRes.error) throw asigRes.error
      if (friosRes.error) throw friosRes.error
      // Los procesos disciplinarios son un "plus" informativo: si falla esa consulta
      // (p.ej. permisos) no debe romper toda la vista de Productividad.
      if (procesosRes.error) console.error('No se pudieron cargar procesos disciplinarios:', procesosRes.error)

      // Agrupamos los procesos disciplinarios por nombre normalizado, más recientes primero.
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

      // La lista de personas la define siempre "Empleados" (activos, en la dependencia
      // de este departamento). Si alguien se desactiva o cambia de área allá, aquí deja
      // de aparecer.
      const porNombre = new Map()
      empleadosRes.data.forEach(e => {
        porNombre.set(e.nombre_completo, {
          nombre: e.nombre_completo,
          cargo: e.cargo || '',
          ingreso: e.fecha_ingreso || '',
          resueltosPorAnio: {},
          asignadosPorAnio: {},
          friosPorAnio: {},
          procesos: procesosPorNombre.get(normalizeNombre(e.nombre_completo)) || [],
        })
      })
      // Encima, se sobreponen cargo/ingreso ya guardados en Productividad (por si se
      // editaron ahí puntualmente). Los meses siempre empiezan en 0 hasta que se
      // registren manualmente.
      resumenRes.data.forEach(r => {
        const base = porNombre.get(r.nombre_empleado)
        if (!base) return // ya no es un empleado activo de Ventas: no se muestra
        porNombre.set(r.nombre_empleado, {
          ...base,
          cargo: r.cargo || base.cargo,
          ingreso: r.ingreso_texto || base.ingreso,
        })
      })
      let anioMasReciente = 0
      const volcar = (filas, destino) => filas.forEach(p => {
        const row = porNombre.get(p.nombre_empleado)
        if (!row) return
        const idx = MESES_FULL.indexOf(p.periodo)
        if (idx < 0) return
        if (!row[destino][p.anio]) row[destino][p.anio] = Array(MESES.length).fill(0)
        row[destino][p.anio][idx] = Number(p.valor) || 0
        if (p.anio > anioMasReciente) anioMasReciente = p.anio
      })
      volcar(prodRes.data, 'resueltosPorAnio')
      volcar(asigRes.data, 'asignadosPorAnio')
      volcar(friosRes.data, 'friosPorAnio')

      setDatosCrudos(Array.from(porNombre.values()))
      if (!silencioso && anioMasReciente) setAnioActivo(anioMasReciente)
    } catch (err) {
      console.error(err)
      setErrorCarga(err.message || 'No se pudieron cargar los datos.')
    } finally {
      setCargando(false)
      setRefrescando(false)
    }
  }, [cfg, setAnioActivo, currentCompany])

  useEffect(() => {
    if (esCierre) return
    Promise.resolve().then(() => cargarDatos())
  }, [deptoActivo, esCierre, cargarDatos])

  async function guardarPersona(form) {
    setGuardando(true)
    setErrorGuardado(null)
    const nombreTrim = form.nombre.trim()
    const anio = Number(form.anio) || ANIO_ACTUAL

    try {
      const resueltosArr = form.resueltos || []
      const friosArr = form.frios || []
      const totalResuAnio = resueltosArr.reduce((s, v) => s + (Number(v) || 0), 0)
      const totalFriosAnio = friosArr.reduce((s, v) => s + (Number(v) || 0), 0)
      const totalAnio = totalResuAnio + totalFriosAnio

      // El total_periodo guardado en el resumen refleja el total histórico de
      // clientes resueltos generales (resueltos asignados + clientes en frío de todos los años)
      const totalHistorico = Object.entries(modal?.persona?.resueltosPorAnio || {})
        .reduce((s, [a, meses]) => {
          if (Number(a) === anio) return s
          const friosHist = modal?.persona?.friosPorAnio?.[a] || []
          return s + meses.reduce((x, y) => x + y, 0) + friosHist.reduce((x, y) => x + y, 0)
        }, 0) + totalAnio

      const { error: eResumen } = await productividadApi.upsertResumen({
          nombre_empleado: nombreTrim,
          departamento: cfg.departamento,
          cargo: form.cargo.trim(),
          ingreso_texto: form.ingreso || null,
          total_periodo: totalHistorico,
          updated_at: new Date().toISOString(),
        }, currentCompany)
      if (eResumen) throw eResumen

      const ahora = new Date().toISOString()
      const filasDe = (metrica, valores) => MESES_FULL.map((periodo, i) => ({
        nombre_empleado: nombreTrim,
        departamento: cfg.departamento,
        periodo,
        metrica,
        anio,
        valor: Number(valores?.[i]) || 0,
        updated_at: ahora,
      }))
      const filasProd = cfg.usaClientes
        ? [
            ...filasDe(METRICA_ASIGNADOS, form.asignados),
            ...filasDe(METRICA_RESUELTOS, form.resueltos),
            ...filasDe(METRICA_FRIOS, form.frios || Array(MESES.length).fill(0)),
          ]
        : filasDe(METRICA, form.resueltos)
      const { error: eProd } = await productividadApi.upsertProductividad(filasProd, currentCompany)
      if (eProd) throw eProd

      await cargarDatos({ silencioso: true })
      setAnioActivo(anio)
      setModal(null)
    } catch (err) {
      console.error(err)
      setErrorGuardado(err.message || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // Importación masiva desde Excel (Ventas / UW-BS). Recibe filas ya validadas:
  // { nombre, anio, mes, asignados?, resueltos?, frios? }. Un valor ausente no se toca.
  async function importarFilas(filas) {
    const ahora = new Date().toISOString()
    const rows = []
    filas.forEach(({ nombre, anio, mes, asignados, resueltos, frios }) => {
      const base = { nombre_empleado: nombre, departamento: cfg.departamento, periodo: mes, anio, updated_at: ahora }
      if (asignados !== undefined) rows.push({ ...base, metrica: METRICA_ASIGNADOS, valor: asignados })
      if (resueltos !== undefined) rows.push({ ...base, metrica: METRICA_RESUELTOS, valor: resueltos })
      if (frios !== undefined) rows.push({ ...base, metrica: METRICA_FRIOS, valor: frios })
    })
    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await productividadApi.upsertProductividad(rows.slice(i, i + 400), currentCompany)
      if (error) throw error
    }
    await cargarDatos({ silencioso: true })
  }

  async function eliminarPersona(nombre) {
    if (!window.confirm(`¿Borrar todo el historial de ${nombre}? Sus valores quedarán en 0. Como sigue activo(a) en ${cfg.tabLabel}, la persona seguirá apareciendo en la lista. Esta acción no se puede deshacer.`)) return
    setEliminandoNombre(nombre)
    try {
      const { error: e1 } = await productividadApi.eliminarProductividadDePersona(nombre, cfg.departamento, currentCompany)
      if (e1) throw e1
      const { error: e2 } = await productividadApi.eliminarResumenDePersona(nombre, cfg.departamento, currentCompany)
      if (e2) throw e2
      // Sigue activo(a) en Ventas: se queda en la lista, solo con los datos en 0.
      setDatosCrudos(prev => prev.map(d => d.nombre === nombre
        ? { ...d, resueltosPorAnio: {}, asignadosPorAnio: {}, friosPorAnio: {} }
        : d))
    } catch (err) {
      console.error(err)
      alert('No se pudo eliminar: ' + (err.message || 'error desconocido'))
    } finally {
      setEliminandoNombre(null)
    }
  }

  return {
    datosCrudos, setDatosCrudos,
    cargando, refrescando, errorCarga,
    guardando, errorGuardado, setErrorGuardado,
    eliminandoNombre,
    cargarDatos, guardarPersona, eliminarPersona, importarFilas,
  }
}
