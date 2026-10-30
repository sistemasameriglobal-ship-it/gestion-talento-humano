import PageTitle from '../components/ui/PageTitle'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as novedadesApi from '../api/novedades'
import * as empleadosApi from '../api/empleados'
import * as vacacionesApi from '../api/vacaciones'
import { omit } from '../utils/omit'
import { logAccion } from '../utils/auditLogger'
import { diasHabilesEntre } from '../utils/diasHabiles'
import { normalizarConcepto } from '../utils/parseExcel'
import { extraerDiasEnDinero } from '../utils/vacacionesHelpers'
import { validarContraFichaEmpleado, validarContraHistorial, sanitizeForm, obtenerPeriodoPorFecha } from '../utils/novedadesValidacion'
import {
  CONCEPTOS_LIST, CONCEPTOS_SIN_FECHAS, DEPENDENCIAS_INICIALES,
  MESES, EMPTY, loadExtraDeps,
} from '../utils/novedadesConstants'
import { normalizarNombre } from '../utils/novedadesImport'
import { exportarNovedadesExcel, exportarNovedadesParaImportar } from '../utils/novedadesExport'
import { useImportacionExcel } from '../hooks/useImportacionExcel'
import { useNovedadesFiltros } from '../hooks/useNovedadesFiltros'
import NovedadesFiltros from '../components/novedades/NovedadesFiltros'
import {
  ClipboardList, Plus, Download, Upload, AlertCircle
} from 'lucide-react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import LiveIndicator from '../components/ui/LiveIndicator'
import NovedadFormModal from '../components/novedades/NovedadFormModal'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import ViewDetailModal from '../components/novedades/ViewDetailModal'
import ImportPreviewModal from '../components/novedades/ImportPreviewModal'
import NovedadesTable from '../components/novedades/NovedadesTable'
import '../components/novedades/novedades-anim.css'

// ── Componente principal ──────────────────────────────────────────────────────
export default function Novedades() {
  const { currentCompany, departamentos, canWrite } = useCompany()
  const puedeEditar = canWrite ? canWrite('novedades') : true
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('') // valor crudo del input (instantáneo)
  const [search, setSearch] = useState('') // valor con debounce, usado para filtrar
  const [filterConcepto, setFilterConcepto] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState('')
  const [filterAnio, setFilterAnio] = useState('')
  const [filterMes, setFilterMes] = useState('')
  const [filterDep, setFilterDep] = useState('')
  const [filterDiagnostico, setFilterDiagnostico] = useState('')
  const [soloActivas, setSoloActivas] = useState(false)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [formDirty, setFormDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [periodos, setPeriodos] = useState([])
  const [nuevoPeriodoMode, setNuevoPeriodoMode] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [viewRow, setViewRow] = useState(null)
  const [sortField, setSortField] = useState('fecha_inicio')
  const [sortDir, setSortDir] = useState('desc')
  const [highlightId, setHighlightId] = useState(null) // fila recién creada/editada

  const [empleados, setEmpleados] = useState({ activos: [], inactivos: [] })
  const [listaEmpleados, setListaEmpleados] = useState([])
  const [empleadoFiltro, setEmpleadoFiltro] = useState('')
  const [fichasEmpleados, setFichasEmpleados] = useState({}) // nombre -> { activo, fecha_ingreso, fecha_retiro }

  // Índice normalizado (sin tildes/mayúsculas/espacios) de los nombres que
  // existen en Empleados, para validar contra él al importar novedades.
  const empleadosIndex = useMemo(() => {
    const map = new Map()
    Object.keys(fichasEmpleados).forEach(nombre => map.set(normalizarNombre(nombre), nombre))
    return map
  }, [fichasEmpleados])
  const dependencias = useMemo(() => {
    return departamentos && departamentos.length > 0 ? departamentos : loadExtraDeps(DEPENDENCIAS_INICIALES)
  }, [departamentos])

  // Auto-refresh
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    let [{ data }, { data: empData }, { data: periodosData }, { data: vacData }] = await Promise.all([
      novedadesApi.listarNovedades(currentCompany),
      empleadosApi.listarEmpleadosParaNovedades(currentCompany),
      empleadosApi.listarTodosLosPeriodos(currentCompany).catch(() => ({ data: [] })),
      Promise.resolve(vacacionesApi.listarVacaciones(currentCompany)).catch(() => ({ data: [] })),
    ])


    // Deduplicación proactiva y auto-sincronización de eventos contractuales
    if (empData && empData.length > 0) {
      let huboSincronizacion = false
      const CONCEPTOS_MOV = ['Ascenso', 'Cambio de Área', 'Cambio de Cargo', 'Ajuste Salarial', 'Paso a Etapa Productiva', 'Ingreso']
      const idsAEliminar = new Set()

      // ── PASO 1: Deduplicación proactiva de registros repetidos (Ingresos y Movimientos) ──
      for (const emp of empData) {
        const normEmp = normalizarNombre(emp.nombre_completo)
        const novsDeEmp = (data || []).filter(n =>
          (n.empleado_id && n.empleado_id === emp.id) ||
          (n.nombre_empleado && normalizarNombre(n.nombre_empleado) === normEmp)
        )

        if (novsDeEmp.length === 0) continue

        // A) Múltiples 'Ingreso' para el mismo colaborador
        const novsIngreso = novsDeEmp.filter(n => n.concepto === 'Ingreso')
        if (novsIngreso.length > 1) {
          const porFechaIngreso = {}
          for (const n of novsIngreso) {
            const f = n.fecha_inicio || 'sin_fecha'
            if (!porFechaIngreso[f]) porFechaIngreso[f] = []
            porFechaIngreso[f].push(n)
          }

          for (const [, grupo] of Object.entries(porFechaIngreso)) {
            if (grupo.length > 1) {
              const ordenados = [...grupo].sort((a, b) => {
                if (a.empleado_id && !b.empleado_id) return -1
                if (!a.empleado_id && b.empleado_id) return 1
                return (b.observacion?.length || 0) - (a.observacion?.length || 0)
              })
              for (let i = 1; i < ordenados.length; i++) {
                idsAEliminar.add(ordenados[i].id)
              }
            }
          }
        }

        // B) Deduplicación de novedades contractuales con el MISMO concepto en la misma fecha
        const porConceptoYFecha = {}
        for (const n of novsDeEmp) {
          if (!n.fecha_inicio || !CONCEPTOS_MOV.includes(n.concepto)) continue
          const key = `${n.concepto}_${n.fecha_inicio}`
          if (!porConceptoYFecha[key]) porConceptoYFecha[key] = []
          porConceptoYFecha[key].push(n)
        }

        for (const [, grupo] of Object.entries(porConceptoYFecha)) {
          const vigentes = grupo.filter(n => !idsAEliminar.has(n.id))
          if (vigentes.length > 1) {
            const ordenados = [...vigentes].sort((a, b) => {
              if (a.empleado_id && !b.empleado_id) return -1
              if (!a.empleado_id && b.empleado_id) return 1
              return (b.observacion?.length || 0) - (a.observacion?.length || 0)
            })
            for (let i = 1; i < ordenados.length; i++) {
              idsAEliminar.add(ordenados[i].id)
            }
          }
        }
      }

      if (idsAEliminar.size > 0) {
        for (const id of idsAEliminar) {
          await novedadesApi.eliminarNovedad(id)
        }
        data = (data || []).filter(d => !idsAEliminar.has(d.id))
        huboSincronizacion = true
      }

      // ── PASO 2: Sincronización de Ingreso inicial y Movimientos contractuales posteriores ──
      for (const emp of empData) {
        const empPeriodos = (periodosData || []).filter(p => p.empleado_id === emp.id)
        const pActivo = empPeriodos.find(p => p.es_periodo_actual) || empPeriodos[empPeriodos.length - 1]
        const fIngresoReal = emp.fecha_inicio_empresa_actual || emp.fecha_ingreso || pActivo?.fecha_ingreso || emp.fecha_primer_ingreso || null

        if (!fIngresoReal) continue

        const normEmp = normalizarNombre(emp.nombre_completo)
        const novIngreso = (data || []).find(n =>
          n.concepto === 'Ingreso' &&
          ((n.empleado_id && n.empleado_id === emp.id) ||
           (n.nombre_empleado && normalizarNombre(n.nombre_empleado) === normEmp))
        )

        if (!novIngreso) {
          // Si el colaborador no tiene su novedad de Ingreso inicial, crearla automáticamente
          const { data: novCreada, error: errCrea } = await novedadesApi.crearNovedad({
            concepto: 'Ingreso',
            fecha_inicio: fIngresoReal,
            fecha_fin: fIngresoReal,
            total_dias: 0,
            periodo: fIngresoReal.slice(0, 7),
            observacion: 'Registro inicial de ingreso del colaborador',
            empleado_id: emp.id,
            nombre_empleado: emp.nombre_completo,
            dependencia: emp.dependencia || pActivo?.dependencia || null,
            cargo: emp.cargo || pActivo?.cargo || null,
            empresa: currentCompany,
            empresa_id: emp.empresa_id || null,
            departamento_id: emp.departamento_id || null,
          }, currentCompany)
          if (!errCrea) {
            huboSincronizacion = true
            if (novCreada && novCreada[0]) {
              data.push(novCreada[0])
            }
          }
        } else if (novIngreso.fecha_inicio !== fIngresoReal) {
          const { error: errUpd } = await novedadesApi.actualizarNovedad(novIngreso.id, {
            fecha_inicio: fIngresoReal,
            fecha_fin: fIngresoReal,
            periodo: fIngresoReal.slice(0, 7),
          })
          if (!errUpd) huboSincronizacion = true
        }
      }

      if (huboSincronizacion) {
        const { data: freshData } = await novedadesApi.listarNovedades(currentCompany)
        if (freshData) data = freshData
      }
    }

    const fichas = {}
    if (empData && empData.length > 0) {
      setListaEmpleados(empData)
      setEmpleados({
        activos: empData.filter(e => e.activo !== false).map(e => e.nombre_completo),
        inactivos: empData.filter(e => e.activo === false).map(e => e.nombre_completo),
      })
      empData.forEach(e => {
        const empPeriodos = (periodosData || []).filter(p => p.empleado_id === e.id)
        const pActivo = empPeriodos.find(p => p.es_periodo_actual) || empPeriodos[empPeriodos.length - 1]
        fichas[e.nombre_completo] = {
          id: e.id,
          nombre_completo: e.nombre_completo,
          activo: e.activo !== false,
          fecha_ingreso: e.fecha_inicio_empresa_actual || e.fecha_ingreso || pActivo?.fecha_ingreso || e.fecha_primer_ingreso || null,
          fecha_retiro: e.fecha_retiro || pActivo?.fecha_retiro || null,
          dependencia: e.dependencia || pActivo?.dependencia || '',
          cargo: e.cargo || pActivo?.cargo || '',
          periodos: empPeriodos,
        }
      })
      setFichasEmpleados(fichas)
    } else {
      setListaEmpleados([])
      setEmpleados({ activos: [], inactivos: [] })
      setFichasEmpleados({})
    }

    const empPorId = new Map()
    const empPorNombreNorm = new Map()
    ;(empData || []).forEach(e => {
      if (e.id) empPorId.set(e.id, e)
      if (e.nombre_completo) empPorNombreNorm.set(normalizarNombre(e.nombre_completo), e)
    })

    const periodosPorEmpId = new Map()
    ;(periodosData || []).forEach(p => {
      if (!p.empleado_id) return
      if (!periodosPorEmpId.has(p.empleado_id)) periodosPorEmpId.set(p.empleado_id, [])
      periodosPorEmpId.get(p.empleado_id).push(p)
    })

    const mismatchesToHeal = []
    const enrichedRows = (data || []).map(r => {
      let diasEnDinero
      let diasDisfrutados = null
      const esVac = r.concepto === 'Vacaciones' || (r.concepto || '').toLowerCase().includes('vacacion')
      if (esVac) {
        const rNombre = (r.nombre_empleado || '').trim().toLowerCase()
        const vacMatch = (vacData || []).find(v => {
          const vNombre = (v.nombre_empleado || '').trim().toLowerCase()
          if (vNombre !== rNombre) return false
          if (v.fecha_inicio && r.fecha_inicio) return v.fecha_inicio === r.fecha_inicio
          return true
        })
        diasEnDinero = extraerDiasEnDinero(r, vacMatch)
        diasDisfrutados = vacMatch?.dias_disfrutados != null
          ? Number(vacMatch.dias_disfrutados)
          : (r.fecha_inicio && r.fecha_fin ? diasHabilesEntre(r.fecha_inicio, r.fecha_fin) : null)
      } else {
        diasEnDinero = extraerDiasEnDinero(r, null)
      }

      // Buscar colaborador de forma robusta: por ID, nombre exacto o normalizado
      const emp = (r.empleado_id && empPorId.get(r.empleado_id)) ||
        (r.nombre_empleado && empPorNombreNorm.get(normalizarNombre(r.nombre_empleado))) ||
        (r.nombre_empleado ? fichas[r.nombre_empleado] : null) ||
        null

      const empId = r.empleado_id || emp?.id || null
      const periodosEmp = (empId && periodosPorEmpId.get(empId)) ||
        emp?.periodos ||
        (r.nombre_empleado ? fichas[r.nombre_empleado]?.periodos : null) ||
        []
      const periodoHistorico = obtenerPeriodoPorFecha(periodosEmp, r.fecha_inicio)

      // Respetar el área y cargo históricos correspondientes a la fecha de la novedad.
      // Si la novedad cae en un período histórico previo (p. ej. Ventas) y su dependencia estaba vacía o
      // sincronizada por error con el área actual del empleado (p. ej. Underwriting), prevalece el área del período.
      const depHistorica = (periodoHistorico?.dependencia && (!r.dependencia || r.dependencia === emp?.dependencia))
        ? periodoHistorico.dependencia
        : (periodoHistorico?.dependencia || r.dependencia || emp?.dependencia || '')

      const cargoHistorico = (periodoHistorico?.cargo && (!r.cargo || r.cargo === emp?.cargo))
        ? periodoHistorico.cargo
        : (periodoHistorico?.cargo || r.cargo || emp?.cargo || '')

      // Auto-sanar en segundo plano si hay desfase de área histórica, cargo o ID faltante
      if (r.id && (
        (emp?.id && !r.empleado_id) ||
        (depHistorica && r.dependencia !== depHistorica) ||
        (cargoHistorico && r.cargo !== cargoHistorico)
      )) {
        mismatchesToHeal.push({
          id: r.id,
          empleado_id: empId,
          dependencia: depHistorica,
          cargo: cargoHistorico,
        })
      }

      return {
        ...r,
        nombre_empleado: emp?.nombre_completo || r.nombre_empleado,
        empleado_id: empId,
        cargo: cargoHistorico,
        dependencia: depHistorica,
        dias_en_dinero: diasEnDinero > 0 ? diasEnDinero : null,
        dias_disfrutados: diasDisfrutados,
      }
    })

    // Auto-sanar en segundo plano las novedades con área desactualizada o sin ID en Supabase
    if (mismatchesToHeal.length > 0) {
      Promise.allSettled(
        mismatchesToHeal.map(item =>
          novedadesApi.actualizarNovedad(item.id, {
            dependencia: item.dependencia,
            cargo: item.cargo,
            empleado_id: item.empleado_id,
          })
        )
      ).catch(() => {})
    }

    setRows(enrichedRows)
    const ps = [...new Set((data || []).map(r => r.periodo).filter(Boolean))].sort().reverse()
    setPeriodos(ps)
    setLastUpdated(new Date())
    if (!silent) setLoading(false)
    setRefreshing(false)
  }, [currentCompany])

  useEffect(() => { Promise.resolve().then(() => load()) }, [load])

  const {
    importing, importResult, setImportResult, importPreview, importConfirming,
    fileInputKey, handleImportFile, confirmarImportacion, cancelarImportacion,
  } = useImportacionExcel({ empleadosIndex, listaEmpleados, load, currentCompany })

  // Auto-refresh cada 60s (silencioso, sin pantalla de carga)
  useEffect(() => {
    const interval = setInterval(() => load(true), 60000)
    return () => clearInterval(interval)
  }, [load])

  // Búsqueda con debounce: el input responde al instante, el filtrado pesado espera 200ms
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 200)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (form.fecha_inicio && form.fecha_fin) {
      const ini = new Date(form.fecha_inicio)
      const fin = new Date(form.fecha_fin)
      if (!isNaN(ini) && !isNaN(fin) && fin >= ini) {
        let dias = form.concepto === 'Vacaciones'
          ? diasHabilesEntre(form.fecha_inicio, form.fecha_fin)
          : Math.round((fin - ini) / (1000 * 60 * 60 * 24)) + 1

        // Si es jornada de medio día y las fechas corresponden al mismo día, son 0.5 días (½ día)
        if (form.jornada === 'Medio día' && form.fecha_inicio === form.fecha_fin) {
          dias = 0.5
        }

        Promise.resolve().then(() => setForm(p => {
          const diasFinal = (p.jornada === 'Medio día' && p.fecha_inicio === p.fecha_fin) ? 0.5 : dias
          const next = { ...p, total_dias: diasFinal }
          if (normalizarConcepto(next.concepto) === 'Incapacidad') {
            if (diasFinal < 3 && !next.radicacion_incapacidad) {
              next.radicacion_incapacidad = 'N/A'
            } else if (diasFinal >= 3 && next.radicacion_incapacidad === 'N/A') {
              next.radicacion_incapacidad = ''
            }
          }
          return next
        }))
      }
    }
  }, [form.fecha_inicio, form.fecha_fin, form.concepto, form.jornada])

  const empleadosActivos = useMemo(() => {
    return (listaEmpleados || [])
      .filter(e => e.activo !== false)
      .sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''))
  }, [listaEmpleados])

  const { aniosDisponibles, depsEnDatos, rangoMes, filtered, totalPages, paged, handleSort } =
    useNovedadesFiltros({
      rows, search, filterConcepto, filterPeriodo, filterDep, filterDiagnostico,
      filterAnio, filterMes, soloActivas,
      empleadoFiltro, listaEmpleados,
      sortField, sortDir, setSortField, setSortDir,
      page, setPage,
    })


  const openAdd = () => { setForm(EMPTY); setFormDirty(false); setNuevoPeriodoMode(false); setFormError(null); setModal('add') }
  const openEdit = (row) => {
    const emp = (listaEmpleados || []).find(e =>
      (row.empleado_id && e.id === row.empleado_id) ||
      e.nombre_completo === row.nombre_empleado ||
      normalizarNombre(e.nombre_completo) === normalizarNombre(row.nombre_empleado)
    )
    const ficha = fichasEmpleados?.[row.nombre_empleado] ||
      Object.values(fichasEmpleados || {}).find(f => (f.nombre_completo || '').trim().toLowerCase() === (row.nombre_empleado || '').trim().toLowerCase())

    const diasDinero = row.dias_en_dinero != null && row.dias_en_dinero !== ''
      ? row.dias_en_dinero
      : (row.concepto === 'Vacaciones' ? (extraerDiasEnDinero(row) || '') : '')

    setForm({
      ...EMPTY,
      ...row,
      empleado_id: row.empleado_id || emp?.id || ficha?.id || null,
      dependencia: row.dependencia || emp?.dependencia || ficha?.dependencia || '',
      cargo: row.cargo || emp?.cargo || ficha?.cargo || '',
      dias_en_dinero: diasDinero,
      dias_disfrutados: row.dias_disfrutados ?? '',
    })
    setFormDirty(false)
    setNuevoPeriodoMode(false)
    setFormError(null)
    setModal('edit')
  }

  const closeModal = () => {
    if (formDirty && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return
    setFormError(null)
    setModal(null)
  }

  const save = async () => {
    setFormError(null)
    if (!form.nombre_empleado || !form.concepto) return setMsg({ type: 'error', text: 'Nombre y concepto son obligatorios.' })

    const avisoFicha = validarContraFichaEmpleado(form, fichasEmpleados)
    if (avisoFicha) {
      setFormError(avisoFicha)
      return
    }

    const avisoHistorial = validarContraHistorial(form, rows)
    if (avisoHistorial) {
      setFormError(avisoHistorial)
      return
    }

    setSaving(true)
    const emp = (listaEmpleados || []).find(e =>
      (form.empleado_id && e.id === form.empleado_id) ||
      e.nombre_completo === form.nombre_empleado ||
      normalizarNombre(e.nombre_completo) === normalizarNombre(form.nombre_empleado)
    )
    const fichaEmp = fichasEmpleados?.[form.nombre_empleado] ||
      Object.values(fichasEmpleados || {}).find(f => (f.nombre_completo || '').trim().toLowerCase() === (form.nombre_empleado || '').trim().toLowerCase())
    const depFinal = form.dependencia || emp?.dependencia || fichaEmp?.dependencia || ''
    const cleanForm = sanitizeForm({
      ...form,
      nombre_empleado: emp?.nombre_completo || form.nombre_empleado,
      empleado_id: emp?.id || form.empleado_id || null,
      dependencia: depFinal,
    })
    try {
      let savedId = null
      let errorVacacion = null

      const esVac = cleanForm.concepto === 'Vacaciones'
      const diasDinero = cleanForm.dias_en_dinero != null && cleanForm.dias_en_dinero !== '' ? Number(cleanForm.dias_en_dinero) : 0
      const diasFisicos = cleanForm.fecha_inicio && cleanForm.fecha_fin ? diasHabilesEntre(cleanForm.fecha_inicio, cleanForm.fecha_fin, { periodo: cleanForm.periodo }) : (cleanForm.dias_disfrutados != null && cleanForm.dias_disfrutados !== '' ? Number(cleanForm.dias_disfrutados) : null)

      if (esVac && diasDinero > 0) {
        const detalleDinero = `Compensación: ${diasDinero} días en dinero`
        const desglose = diasFisicos != null ? `${diasFisicos} días disfrute + ${diasDinero} en dinero` : detalleDinero
        if (!cleanForm.observacion_contabilidad) {
          cleanForm.observacion_contabilidad = detalleDinero
        }
        if (cleanForm.observacion && !cleanForm.observacion.includes('en dinero')) {
          cleanForm.observacion = `[${desglose}] ${cleanForm.observacion}`
        } else if (!cleanForm.observacion) {
          cleanForm.observacion = `[${desglose}]`
        }
        if (diasFisicos != null) {
          cleanForm.total_dias = diasFisicos + diasDinero
        } else if (!cleanForm.total_dias) {
          cleanForm.total_dias = diasDinero
        }
      }

      if (normalizarConcepto(cleanForm.concepto) === 'Incapacidad') {
        const diasIncap = parseFloat(cleanForm.total_dias) || 0
        if (diasIncap > 0 && diasIncap < 3 && !cleanForm.radicacion_incapacidad) {
          cleanForm.radicacion_incapacidad = 'N/A'
        }
      }

      const payloadSupabase = omit(['id', 'created_at', 'updated_at', 'dias_en_dinero', 'dias_disfrutados', 'dias_en_periodo'], cleanForm)

      if (modal === 'add') {
        const { data, error } = await novedadesApi.crearNovedad(payloadSupabase, currentCompany)
        if (error) throw error
        savedId = data?.[0]?.id ?? null
        logAccion('CREAR', 'novedades', savedId, currentCompany, { concepto: cleanForm.concepto, empleado: cleanForm.nombre_empleado })
      } else {
        if (!cleanForm.id) throw new Error('ID de registro no encontrado.')
        const { error } = await novedadesApi.actualizarNovedad(cleanForm.id, payloadSupabase, currentCompany)
        if (error) throw error
        savedId = cleanForm.id
        logAccion('ACTUALIZAR', 'novedades', savedId, currentCompany, { concepto: cleanForm.concepto, empleado: cleanForm.nombre_empleado })
      }

      // Sincronización bidireccional hacia la tabla 'vacaciones'
      if (esVac && cleanForm.fecha_inicio) {
        const vacacionPayload = {
          nombre_empleado: cleanForm.nombre_empleado,
          dependencia: cleanForm.dependencia || null,
          fecha_inicio: cleanForm.fecha_inicio,
          fecha_fin: cleanForm.fecha_fin || null,
          total_dias: cleanForm.total_dias === '' ? null : cleanForm.total_dias,
          dias_disfrutados: diasFisicos,
          dias_en_dinero: diasDinero || null,
          tipo_vacacion: (diasDinero > 0 && !cleanForm.fecha_fin) ? 'Vacaciones en dinero' : 'Vacaciones',
          estado: 'Pendiente',
          observacion_contable: cleanForm.observacion_contabilidad || null,
          observacion: cleanForm.observacion || null,
        }

        const { data: existentes, error: errorCheck } = await vacacionesApi.buscarVacacionPorEmpleadoYFecha(
          cleanForm.nombre_empleado, cleanForm.fecha_inicio, currentCompany
        )

        if (errorCheck) {
          errorVacacion = errorCheck
        } else if (existentes && existentes.length > 0) {
          const { error: errorUpdate } = await vacacionesApi.actualizarVacacion(existentes[0].id, vacacionPayload)
          errorVacacion = errorUpdate
        } else {
          const { error: errorInsert } = await vacacionesApi.crearVacacion(vacacionPayload, currentCompany)
          errorVacacion = errorInsert
        }
      }

      if (errorVacacion) {
        console.error('No se pudo reflejar en vacaciones:', errorVacacion.message)
        setMsg({ type: 'error', text: `${modal === 'add' ? 'Novedad creada' : 'Novedad actualizada'}, pero no se pudo reflejar automáticamente en Vacaciones: ` + errorVacacion.message })
      } else {
        setMsg({ type: 'success', text: modal === 'add' ? 'Novedad creada.' : 'Novedad actualizada.' })
      }
      setModal(null); setFormDirty(false)
      await load()
      if (savedId != null) {
        setHighlightId(savedId)
        setTimeout(() => setHighlightId(null), 2200)
      }
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Error al guardar.' })
    } finally { setSaving(false) }
  }

  // Guardado rápido de pill (edición inline)
  const quickSave = async (id, field, value) => {
    try {
      const { error } = await novedadesApi.actualizarCampoNovedad(id, field, value)
      if (error) throw error
      logAccion('ACTUALIZAR', 'novedades', id, currentCompany, { campo: field, nuevo_valor: value })
      setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
      setHighlightId(id)
      setTimeout(() => setHighlightId(null), 2200)
    } catch (e) {
      setMsg({ type: 'error', text: `Error al guardar: ${e.message}` })
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const remove = async (id) => {
    try {
      if (!id) throw new Error('ID no válido')
      setRows(prev => prev.filter(r => r.id !== id))
      setDeleteId(null)
      const { error } = await novedadesApi.eliminarNovedad(id)
      if (error) {
        await load(true)
        throw error
      }
      logAccion('ELIMINAR', 'novedades', id, currentCompany)
      setMsg({ type: 'success', text: 'Novedad eliminada correctamente.' })
      await load(true)
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Error al eliminar la novedad.' })
      setDeleteId(null)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const f = (k) => (e) => {
    const val = e.target.value
    setFormDirty(true)
    setFormError(null)
    if (k === 'concepto' && CONCEPTOS_SIN_FECHAS.includes(val)) {
      setForm(p => ({ ...p, concepto: val, fecha_inicio: '', fecha_fin: '', total_dias: '' }))
    } else if (k === 'total_dias') {
      let diasVal = val
      if (typeof val === 'string') {
        const clean = val.trim().replace(',', '.')
        if (clean === '1/2' || clean === '½') {
          diasVal = 0.5
        } else {
          diasVal = clean
        }
      }
      const diasNum = parseFloat(diasVal) || 0
      setForm(p => {
        const esMedio = diasNum === 0.5 || diasVal === 0.5 || diasVal === '0.5' || val === '1/2' || val === '½'
        const next = {
          ...p,
          total_dias: diasVal,
          jornada: esMedio ? 'Medio día' : (diasNum >= 1 && p.jornada === 'Medio día' ? '' : p.jornada),
        }
        if (normalizarConcepto(p.concepto) === 'Incapacidad') {
          if (diasNum > 0 && diasNum < 3 && !next.radicacion_incapacidad) {
            next.radicacion_incapacidad = 'N/A'
          } else if (diasNum >= 3 && next.radicacion_incapacidad === 'N/A') {
            next.radicacion_incapacidad = ''
          }
        }
        return next
      })
    } else {
      setForm(p => ({ ...p, [k]: val }))
    }
  }

  const sinFechas = CONCEPTOS_SIN_FECHAS.includes(form.concepto)

  // Rango de fechas permitido para el empleado seleccionado, según su ficha
  // en Empleados (fuente de verdad de ingreso/retiro). Se usa como min/max
  // de los inputs de fecha para que el propio calendario ya no deje elegir
  // una fecha fuera de rango, en vez de solo rechazarla al guardar.
  // No aplica cuando el concepto ES "Ingreso" o "Terminación de Contrato",
  // porque esa novedad es justamente la que puede estar definiendo/ajustando
  // esa fecha límite.
  const fichaSel = fichasEmpleados[form.nombre_empleado]
  const limitaPorConcepto = form.concepto !== 'Ingreso' && form.concepto !== 'Terminación de Contrato' && form.concepto !== 'No renovación de contrato' && form.concepto !== 'Renuncia' && form.concepto !== 'Renuncia/Retiro'
  const minFechaForm = (limitaPorConcepto && fichaSel?.fecha_ingreso) ? fichaSel.fecha_ingreso : undefined
  const maxFechaForm = (limitaPorConcepto && fichaSel && fichaSel.activo === false && fichaSel.fecha_retiro) ? fichaSel.fecha_retiro : undefined

  // Periodo como select dinámico en el form
  const periodosForm = useMemo(() => {
    const set = new Set(periodos)
    if (form.periodo && !set.has(form.periodo)) set.add(form.periodo)
    return [...set].sort().reverse()
  }, [periodos, form.periodo])

  // ── Export Excel ────────────────────────────────────────────────────────────
  // ── Importación masiva desde Excel ── ver src/hooks/useImportacionExcel.js

  // Exporta lo que está filtrado/visible en pantalla ahora mismo.
  const exportExcel = async () => {
    try {
      const dataToExport = filtered.length > 0 ? filtered : rows
      if (!dataToExport || dataToExport.length === 0) {
        setMsg({ type: 'error', text: 'No hay novedades para exportar.' })
        return
      }
      const label = filterAnio && filterMes ? `${filterAnio}-${filterMes}` : filterAnio || filterPeriodo || 'todos'
      await exportarNovedadesExcel(dataToExport, label, currentCompany)
    } catch (e) {
      console.error(e)
      setMsg({ type: 'error', text: 'Error al exportar novedades: ' + (e?.message || e) })
    }
  }

  // Exporta TODOS los registros (sin importar filtros activos en pantalla),
  // pensado para editar en bloque en Excel y volver a subirlo con "Importar Excel".
  // Si no hay registros aún, descarga la plantilla oficial vacía con los encabezados y validaciones.
  const exportExcelParaImportar = async () => {
    try {
      await exportarNovedadesParaImportar(rows || [], currentCompany)
    } catch (e) {
      console.error(e)
      setMsg({ type: 'error', text: 'Error al exportar plantilla: ' + (e?.message || e) })
    }
  }


  const hasFilter = searchInput || filterConcepto || filterPeriodo || filterAnio || filterMes || filterDep || filterDiagnostico || soloActivas || (empleadoFiltro && empleadoFiltro !== 'Todos')
  const clearFilters = () => { setSearchInput(''); setSearch(''); setFilterConcepto(''); setFilterPeriodo(''); setFilterAnio(''); setFilterMes(''); setFilterDep(''); setFilterDiagnostico(''); setSoloActivas(false); setEmpleadoFiltro(''); setPage(1) }

  const [recalculando, setRecalculando] = useState(false)
  const recalcularDiasVacaciones = async () => {
    if (!window.confirm('Esto va a recalcular los "Días" de TODAS las novedades con concepto "Vacaciones" que ya existen, usando días hábiles en vez de días de calendario. ¿Continuar?')) return
    setRecalculando(true)
    try {
      const actualizados = await novedadesApi.recalcularDiasVacaciones()
      setMsg({ type: 'success', text: `Listo: ${actualizados} registro(s) de Vacaciones actualizados a días hábiles.` })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: 'Error al recalcular: ' + e.message })
    } finally {
      setRecalculando(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <PageTitle icon={ClipboardList}>Novedades</PageTitle>
          <p>Consulta, agrega y edita los registros de novedades</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <LiveIndicator lastUpdated={lastUpdated} refreshing={refreshing} onRefreshNow={() => load(true)} />
          {puedeEditar && (
            <button
              className="btn btn-ghost"
              onClick={recalcularDiasVacaciones}
              disabled={recalculando}
              title="Recalcula los días de las Vacaciones ya guardadas para que cuenten días hábiles"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🔄 {recalculando ? 'Recalculando…' : 'Recalcular días hábiles'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Exportar Excel
          </button>
          {puedeEditar && (
            <>
              <button className="btn btn-ghost" onClick={exportExcelParaImportar}
                title="Exporta TODOS los registros (sin importar filtros) en el mismo formato que usa 'Importar Excel', listo para editar en bloque y volver a subir."
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={15} /> Exportar para importar
              </button>
              <label className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                <Upload size={15} /> {importing ? 'Analizando…' : 'Importar Excel'}
                <input key={fileInputKey} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} disabled={importing} style={{ display: 'none' }} />
              </label>
              <button className="btn btn-primary" onClick={openAdd}><Plus size={15} />Nueva novedad</button>
            </>
          )}
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      {importResult && (
        <div className={`alert alert-${importResult.error ? 'error' : 'success'}`}>
          {importResult.error ? importResult.error : (
            <>
              Importación completa: {importResult.creadas} creada(s), {importResult.omitidas} omitida(s) (fila vacía, sin nombre/concepto, o empleado no encontrado en Empleados), {importResult.errores} error(es).
              {importResult.otros.length > 0 && (
                <> · {importResult.otros.length} registrada(s) como "Otros" por no reconocer el concepto — revísalas: {[...new Set(importResult.otros)].join(', ')}</>
              )}
            </>
          )}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }} onClick={() => setImportResult(null)}>Cerrar</button>
        </div>
      )}

      <div className="card">
        {/* ── Filtros ── */}
        <NovedadesFiltros
          searchInput={searchInput} setSearchInput={setSearchInput}
          empleadoFiltro={empleadoFiltro} setEmpleadoFiltro={setEmpleadoFiltro}
          empleadosActivos={empleadosActivos}
          filterConcepto={filterConcepto} setFilterConcepto={setFilterConcepto}
          filterDep={filterDep} setFilterDep={setFilterDep} depsEnDatos={depsEnDatos}
          filterDiagnostico={filterDiagnostico} setFilterDiagnostico={setFilterDiagnostico}
          filterAnio={filterAnio} setFilterAnio={setFilterAnio}
          filterMes={filterMes} setFilterMes={setFilterMes}
          periodos={periodos} filterPeriodo={filterPeriodo} setFilterPeriodo={setFilterPeriodo}
          soloActivas={soloActivas} setSoloActivas={setSoloActivas}
          rangoMes={rangoMes} hasFilter={hasFilter} clearFilters={clearFilters}
          conceptos={CONCEPTOS_LIST} meses={MESES} aniosDisponibles={aniosDisponibles}
          setPage={setPage}
        />

        {/* Contador de resultados */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              Mostrando <strong style={{ color: 'var(--text)' }}><AnimatedNumber value={filtered.length} /></strong> {filtered.length === 1 ? 'novedad' : 'novedades'}
              {hasFilter ? ` (filtradas de ${rows.length})` : ' en total'}
            </span>
            <span style={{
              background: 'var(--primary-light, #EFF6FF)',
              color: 'var(--primary, #2563EB)',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              Total de novedades: <AnimatedNumber value={filtered.length} />
            </span>
            {filtered.some(r => {
              if (normalizarConcepto(r.concepto) !== 'Incapacidad') return false
              const v = (r.validacion_incapacidad || '').toLowerCase().trim()
              const dias = parseFloat(r.total_dias) || 0
              const faltaRadicacion = dias >= 3 && !(r.radicacion_incapacidad || '').trim()
              return faltaRadicacion || !(r.nomina_electronica || '').trim() || !(r.seguridad_social || '').trim() || v === '' || v === 'validar'
            }) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--warning-text)', fontWeight: 600, fontSize: 12 }}>
                <AlertCircle size={12} /> hay registros incompletos
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            Clic en encabezado para ordenar {puedeEditar ? '· Clic en pill para editar' : '· Solo lectura'}
          </span>
        </div>

        <NovedadesTable
          loading={loading} filtered={filtered} paged={paged} page={page} totalPages={totalPages}
          sortField={sortField} sortDir={sortDir} onSort={handleSort}
          highlightId={highlightId} soloActivas={soloActivas}
          quickSave={puedeEditar ? quickSave : null} onView={setViewRow}
          onEdit={puedeEditar ? openEdit : null} onDelete={puedeEditar ? setDeleteId : null}
          setPage={setPage}
        />
      </div>

      {/* ── Modal agregar/editar ─────────────────────────────────────────────── */}
      <NovedadFormModal
        modal={modal} form={form} setForm={setForm} setFormDirty={setFormDirty}
        formError={formError} saving={saving}
        nuevoPeriodoMode={nuevoPeriodoMode} setNuevoPeriodoMode={setNuevoPeriodoMode}
        empleados={empleados} fichasEmpleados={fichasEmpleados} rows={rows}
        periodosForm={periodosForm} dependencias={dependencias}
        sinFechas={sinFechas} minFechaForm={minFechaForm} maxFechaForm={maxFechaForm}
        f={f} save={save} closeModal={closeModal}
      />

      {/* ── Modal confirmar eliminación ──────────────────────────────────────── */}
      <DeleteConfirmModal deleteId={deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} />

      {/* ── Modal ver detalle ────────────────────────────────────────────────── */}
      <ViewDetailModal
        viewRow={viewRow}
        fichasEmpleados={fichasEmpleados}
        onClose={() => setViewRow(null)}
        onEdit={(row) => { setViewRow(null); openEdit(row) }}
      />


      {/* ── Modal vista previa de importación ───────────────────────────────── */}
      <ImportPreviewModal
        importPreview={importPreview}
        importConfirming={importConfirming}
        onCancel={cancelarImportacion}
        onConfirm={confirmarImportacion}
      />
    </div>
  )
}
