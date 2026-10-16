import PageTitle from '../components/ui/PageTitle'
import { Sun as TitleIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as vacacionesApi from '../api/vacaciones'
import * as empleadosApi from '../api/empleados'
import * as novedadesApi from '../api/novedades'
import { hoyISO } from '../utils/fecha'
import { diasHabilesEntre } from '../utils/diasHabiles'
import { exportarExcel } from '../utils/exportarExcel'
import { logAccion } from '../utils/auditLogger'
import { Plus, X, Download, AlertCircle, Sun } from 'lucide-react'
import {
  PAGE_SIZE, MESES, ANIOS, EMPTY,
} from '../utils/vacacionesConstants'
import { diasAcumuladosAnio, calcularSaldoVacacionesPeriodo, obtenerFechaIngresoContinua, aFechaInputDate } from '../utils/vacacionesHelpers'
import ModalDetalle from '../components/vacaciones/ModalDetalle'
import ModalForm from '../components/vacaciones/ModalForm'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import VacacionesKPIs from '../components/vacaciones/VacacionesKPIs'
import VacacionesFiltros from '../components/vacaciones/VacacionesFiltros'
import VacacionesTabla from '../components/vacaciones/VacacionesTabla'
import VacacionesCards from '../components/vacaciones/VacacionesCards'
import '../components/vacaciones/vacaciones.css'

export default function Vacaciones() {
  const { currentCompany, canWrite } = useCompany()
  const puedeEditar = canWrite ? canWrite('vacaciones') : true
  const [rows, setRows]           = useState([])
  const [empleados, setEmpleados] = useState([])
  const [periodos, setPeriodos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterEstado, setFilterEstado]   = useState('')
  const [filterAnio, setFilterAnio]       = useState('')
  const [filterMes, setFilterMes]         = useState('')
  const [filterDep, setFilterDep]         = useState('')
  const [filterTipo, setFilterTipo]       = useState('')
  const [page, setPage]           = useState(1)
  const [viewMode, setViewMode]   = useState('table') // 'table' | 'cards'
  const [modal, setModal]         = useState(null)   // 'add' | 'edit'
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [viewRow, setViewRow]     = useState(null)
  const [sortField, setSortField] = useState('fecha_inicio')
  const [sortAsc, setSortAsc]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: vac }, { data: emp }, { data: pers }] = await Promise.all([
      vacacionesApi.listarVacaciones(currentCompany),
      empleadosApi.listarEmpleadosParaVacaciones(currentCompany),
      empleadosApi.listarTodosLosPeriodos(currentCompany).catch(() => ({ data: [] })),
    ])

    const hoy = hoyISO()
    let listaVac = vac || []

    // Transicionar automáticamente solicitudes que ya concluyeron (hoy > fecha_fin) y siguen "En curso"
    const concluidas = listaVac.filter(v => v.estado === 'En curso' && v.fecha_fin && v.fecha_fin < hoy)
    if (concluidas.length > 0) {
      Promise.all(concluidas.map(c => vacacionesApi.actualizarEstadoVacacion(c.id, 'Finalizada').catch(() => {})))
      listaVac = listaVac.map(v => (v.estado === 'En curso' && v.fecha_fin && v.fecha_fin < hoy) ? { ...v, estado: 'Finalizada' } : v)
    }

    setRows(listaVac)
    setEmpleados(emp || [])
    setPeriodos(pers || [])
    setLoading(false)
  }, [currentCompany])

  useEffect(() => { Promise.resolve().then(() => load()) }, [load])

  const saldoVacacionesForm = useMemo(() => {
    if (!form.nombre_empleado?.trim()) return null
    const emp = empleados.find(e => e.nombre_completo?.trim().toLowerCase() === form.nombre_empleado.trim().toLowerCase())
    const periodoActivo = periodos.find(p => (emp && p.empleado_id === emp.id && p.es_periodo_actual))
    const fechaIngreso = periodoActivo?.fecha_ingreso || emp?.fecha_ingreso || form.fecha_ingreso
    if (!fechaIngreso) return null

    // 1. Solicitudes guardadas de este empleado (excluyendo la que se está editando en el modal)
    const otrasVacs = rows.filter(r =>
      r.id !== form.id &&
      r.nombre_empleado?.trim().toLowerCase() === form.nombre_empleado.trim().toLowerCase()
    )

    // Saldo considerando únicamente las otras solicitudes (tope disponible para esta solicitud)
    const periodosEmp = (periodos || []).filter(p => emp && p.empleado_id === emp.id)
    const periodoRef = periodoActivo || {
      id: form.periodo_id || null,
      fecha_ingreso: fechaIngreso,
      fecha_retiro: periodoActivo?.fecha_retiro || null,
      continuidad_laboral: periodoActivo?.continuidad_laboral || false,
    }

    const saldoOtras = calcularSaldoVacacionesPeriodo(periodoRef, otrasVacs, periodosEmp, emp)

    // 2. Incluir dinámicamente la solicitud actual si su estado es válido (Aprobada, En curso, Finalizada)
    const ESTADOS_VALIDOS = ['Aprobada', 'En curso', 'Finalizada']
    const vacsParaSaldo = [...otrasVacs]
    if (form.estado && ESTADOS_VALIDOS.includes(form.estado)) {
      vacsParaSaldo.push({
        id: form.id || 'temp-current-id',
        periodo_id: form.periodo_id || periodoActivo?.id,
        nombre_empleado: form.nombre_empleado,
        estado: form.estado,
        tipo_vacacion: form.tipo_vacacion,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        total_dias: form.total_dias,
        dias_disfrutados: form.dias_disfrutados,
        dias_en_dinero: form.dias_en_dinero,
      })
    }

    const saldoActual = calcularSaldoVacacionesPeriodo(periodoRef, vacsParaSaldo, periodosEmp, emp)

    return {
      ...saldoActual,
      topeDisponible: saldoOtras.saldoPendiente,
    }
  }, [
    form.nombre_empleado, form.id, form.periodo_id, form.fecha_ingreso,
    form.estado, form.tipo_vacacion, form.fecha_inicio, form.fecha_fin,
    form.total_dias, form.dias_disfrutados, form.dias_en_dinero,
    empleados, periodos, rows
  ])

  const filtered = useMemo(() => {
    let res = rows.filter(r => {
      const s = search.toLowerCase()
      const matchSearch = !s ||
        r.nombre_empleado?.toLowerCase().includes(s) ||
        r.dependencia?.toLowerCase().includes(s) ||
        r.cargo?.toLowerCase().includes(s) ||
        r.aprobado_por?.toLowerCase().includes(s)
      const matchEstado = !filterEstado || r.estado === filterEstado
      const matchAnio   = !filterAnio   || (r.fecha_inicio || '').startsWith(filterAnio)
      const matchDep    = !filterDep    || r.dependencia === filterDep
      const matchTipo   = !filterTipo   || r.tipo_vacacion === filterTipo
      const matchMes    = !filterMes    || (() => {
        if (!r.fecha_inicio) return false
        const mesNum = MESES.indexOf(filterMes) + 1
        const mesStr = String(mesNum).padStart(2, '0')
        return r.fecha_inicio.substring(5, 7) === mesStr
      })()
      return matchSearch && matchEstado && matchAnio && matchDep && matchTipo && matchMes
    })
    res = [...res].sort((a, b) => {
      let va = a[sortField] || '', vb = b[sortField] || ''
      if (sortField === 'total_dias') { va = parseFloat(va)||0; vb = parseFloat(vb)||0 }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })
    return res
  }, [rows, search, filterEstado, filterAnio, filterMes, filterDep, filterTipo, sortField, sortAsc])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const aniosDisponibles = [...new Set([
    ...ANIOS,
    ...rows.map(r => (r.fecha_inicio || '').substring(0, 4)).filter(Boolean)
  ])].sort().reverse()

  const anioActual = String(new Date().getFullYear())
  const diasAcumuladosForm = useMemo(() => {
    if (!form.nombre_empleado?.trim()) return 0
    return diasAcumuladosAnio(rows, form.nombre_empleado, anioActual, modal === 'edit' ? form.id : null)
  }, [form.nombre_empleado, rows, modal, form.id, anioActual])



  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  const openAdd = () => {
    setForm({ ...EMPTY, fecha_solicitud: hoyISO() })
    setModal('add')
  }
  const openEdit = row => {
    const emp = empleados.find(e => e.nombre_completo?.trim().toLowerCase() === row.nombre_empleado?.trim().toLowerCase())
    const periodosEmp = periodos?.filter(p => emp && p.empleado_id === emp.id) || []
    const pActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[0] || null
    const fIngRaw = pActivo
      ? (obtenerFechaIngresoContinua(pActivo, periodosEmp) || pActivo.fecha_ingreso)
      : (emp?.fecha_ingreso || row.fecha_ingreso || '')
    const fIngreso = fIngRaw ? aFechaInputDate(fIngRaw) : (row.fecha_ingreso ? aFechaInputDate(row.fecha_ingreso) : '')

    setForm({
      ...EMPTY,
      ...row,
      cargo: row.cargo || emp?.cargo || pActivo?.cargo || '',
      dependencia: row.dependencia || emp?.dependencia || pActivo?.dependencia || '',
      fecha_ingreso: fIngreso,
    })
    setModal('edit')
  }

  const save = async () => {
    if (!form.nombre_empleado?.trim()) return flash('error', 'El nombre del empleado es obligatorio.')
    if (form.fecha_inicio && form.fecha_fin && new Date(form.fecha_fin) < new Date(form.fecha_inicio))
      return flash('error', 'La fecha de fin no puede ser anterior a la fecha de inicio.')



    // Validar límite estricto de días disponibles según el saldo del periodo
    if (saldoVacacionesForm != null) {
      const diasDisfrute = (form.fecha_inicio && form.fecha_fin)
        ? (diasHabilesEntre(form.fecha_inicio, form.fecha_fin) || 0)
        : (Number(form.dias_disfrutados) || Number(form.total_dias) || 0)
      const diasDinero = (form.tipo_vacacion === 'Vacaciones en dinero')
        ? (Number(form.dias_en_dinero) || 15)
        : (Number(form.dias_en_dinero) || 0)
      const diasSolicitados = (form.tipo_vacacion === 'Vacaciones en dinero')
        ? diasDinero
        : (diasDisfrute + diasDinero)

      const topeMax = saldoVacacionesForm.topeDisponible != null
        ? saldoVacacionesForm.topeDisponible
        : saldoVacacionesForm.saldoPendiente

      if (diasSolicitados > topeMax) {
        return flash('error', `No puedes solicitar ${diasSolicitados} días. El colaborador solo tiene ${topeMax} días disponibles.`)
      }
    }

    setSaving(true)
    let periodoId = form.periodo_id || null
    if (!periodoId && form.nombre_empleado) {
      const emp = empleados.find(e => e.nombre_completo?.trim().toLowerCase() === form.nombre_empleado.trim().toLowerCase())
      if (emp) {
        const pActivo = periodos.find(p => p.empleado_id === emp.id && p.es_periodo_actual)
        if (pActivo) periodoId = pActivo.id
      }
    }

    const payload = {
      nombre_empleado:     form.nombre_empleado.trim(),
      cargo:               form.cargo || null,
      periodo_id:          periodoId,
      dependencia:         form.dependencia || null,
      periodo_vacaciones:  form.periodo_vacaciones || null,
      fecha_inicio:        form.fecha_inicio || null,
      fecha_fin:           form.fecha_fin || null,
      total_dias:          form.total_dias === '' ? null : form.total_dias,
      dias_disfrutados:    form.dias_disfrutados === '' ? null : form.dias_disfrutados,
      dias_en_dinero:      form.dias_en_dinero === '' ? null : form.dias_en_dinero,
      tipo_vacacion:       form.tipo_vacacion || 'Vacaciones',
      estado:              form.estado || 'Pendiente',
      observacion:         form.observacion || null,
      observacion_contable: form.observacion_contable || null,
      aprobado_por:        form.aprobado_por || null,
      fecha_ingreso:       form.fecha_ingreso || null,
    }

    let error
    let errorNovedad = null
    if (modal === 'add') {
      ({ error } = await vacacionesApi.crearVacacion(payload, currentCompany))
      if (!error) logAccion('CREAR', 'vacaciones', null, currentCompany, { empleado: payload.nombre_empleado, tipo: payload.tipo_vacacion })

      // Al crear o actualizar una vacación, sincronizar hacia Novedades:
      // Conserva desglose de disfrute físico y compensación en dinero en observación y soporte contable.
      const diasDinero = payload.dias_en_dinero != null && payload.dias_en_dinero !== '' ? Number(payload.dias_en_dinero) : 0
      const diasFisicos = payload.fecha_inicio && payload.fecha_fin ? diasHabilesEntre(payload.fecha_inicio, payload.fecha_fin) : (payload.dias_disfrutados != null && payload.dias_disfrutados !== '' ? Number(payload.dias_disfrutados) : null)
      let totalDiasNovedad = payload.total_dias != null && payload.total_dias !== '' ? Number(payload.total_dias) : null
      if (payload.tipo_vacacion === 'Vacaciones en dinero') {
        totalDiasNovedad = diasDinero || totalDiasNovedad
      } else if (diasDinero > 0 && diasFisicos != null) {
        totalDiasNovedad = diasFisicos + diasDinero
      } else if (diasFisicos != null) {
        totalDiasNovedad = diasFisicos
      }

      const detalleDinero = diasDinero > 0 ? `Compensación: ${diasDinero} días en dinero` : ''
      const desgloseDias = diasDinero > 0 && diasFisicos != null ? `${diasFisicos} días disfrute + ${diasDinero} en dinero` : ''
      const obsPartes = [
        desgloseDias ? `[${desgloseDias}]` : detalleDinero ? `[${detalleDinero}]` : null,
        payload.observacion_contable,
        payload.observacion,
      ].filter(Boolean)
      const observacionFinal = obsPartes.join(' • ') || null
      const obsContabilidadFinal = detalleDinero || payload.observacion_contable || null

      const novedadPayload = {
        nombre_empleado: payload.nombre_empleado,
        concepto: 'Vacaciones',
        dependencia: payload.dependencia,
        periodo: '',
        fecha_inicio: payload.fecha_inicio,
        fecha_fin: payload.fecha_fin,
        total_dias: totalDiasNovedad,
        observacion: observacionFinal,
        observacion_contabilidad: obsContabilidadFinal,
      }

      if (!error && payload.fecha_inicio) {
        const { data: existentes, error: errorCheck } = await novedadesApi.buscarNovedadPorEmpleadoConceptoYFecha(
          payload.nombre_empleado, 'Vacaciones', payload.fecha_inicio, currentCompany
        )

        if (errorCheck) {
          errorNovedad = errorCheck
        } else if (existentes && existentes.length > 0) {
          const { error: errorUpdate } = await novedadesApi.actualizarNovedad(existentes[0].id, novedadPayload)
          errorNovedad = errorUpdate
        } else {
          const { error: errorInsert } = await novedadesApi.crearNovedad(novedadPayload, currentCompany)
          errorNovedad = errorInsert
        }
      }
    } else {
      ({ error } = await vacacionesApi.actualizarVacacion(form.id, payload))
      if (!error) logAccion('ACTUALIZAR', 'vacaciones', form.id, currentCompany, { empleado: payload.nombre_empleado, tipo: payload.tipo_vacacion })

      // Sincronizar actualización hacia Novedades
      if (!error && (payload.fecha_inicio || form.fecha_inicio)) {
        const fInicioBusqueda = form.fecha_inicio || payload.fecha_inicio
        const diasDinero = payload.dias_en_dinero != null && payload.dias_en_dinero !== '' ? Number(payload.dias_en_dinero) : 0
        const diasFisicos = payload.fecha_inicio && payload.fecha_fin ? diasHabilesEntre(payload.fecha_inicio, payload.fecha_fin) : (payload.dias_disfrutados != null && payload.dias_disfrutados !== '' ? Number(payload.dias_disfrutados) : null)
        let totalDiasNovedad = payload.total_dias != null && payload.total_dias !== '' ? Number(payload.total_dias) : null
        if (payload.tipo_vacacion === 'Vacaciones en dinero') {
          totalDiasNovedad = diasDinero || totalDiasNovedad
        } else if (diasDinero > 0 && diasFisicos != null) {
          totalDiasNovedad = diasFisicos + diasDinero
        } else if (diasFisicos != null) {
          totalDiasNovedad = diasFisicos
        }

        const detalleDinero = diasDinero > 0 ? `Compensación: ${diasDinero} días en dinero` : ''
        const desgloseDias = diasDinero > 0 && diasFisicos != null ? `${diasFisicos} días disfrute + ${diasDinero} en dinero` : ''
        const obsPartes = [
          desgloseDias ? `[${desgloseDias}]` : detalleDinero ? `[${detalleDinero}]` : null,
          payload.observacion_contable,
          payload.observacion,
        ].filter(Boolean)
        const observacionFinal = obsPartes.join(' • ') || null
        const obsContabilidadFinal = detalleDinero || payload.observacion_contable || null

        const novedadPayload = {
          nombre_empleado: payload.nombre_empleado,
          concepto: 'Vacaciones',
          dependencia: payload.dependencia,
          fecha_inicio: payload.fecha_inicio,
          fecha_fin: payload.fecha_fin,
          total_dias: totalDiasNovedad,
          observacion: observacionFinal,
          observacion_contabilidad: obsContabilidadFinal,
        }

        const { data: existentes } = await novedadesApi.buscarNovedadPorEmpleadoConceptoYFecha(
          payload.nombre_empleado, 'Vacaciones', fInicioBusqueda, currentCompany
        )
        if (existentes && existentes.length > 0) {
          await novedadesApi.actualizarNovedad(existentes[0].id, novedadPayload)
        }
      }
    }

    setSaving(false)
    if (error) return flash('error', 'Error al guardar: ' + error.message)

    if (errorNovedad) {
      console.error('No se pudo crear la novedad de vacaciones:', errorNovedad.message)
      flash('error', 'Vacación registrada, pero no se pudo reflejar automáticamente en Novedades: ' + errorNovedad.message)
    } else {
      flash('success', modal === 'add' ? 'Vacación registrada.' : 'Registro actualizado.')
    }
    setModal(null)
    await load()
  }

  const remove = async (id) => {
    const { error } = await vacacionesApi.eliminarVacacion(id)
    setDeleteId(null)
    if (error) return flash('error', 'Error al eliminar.')
    logAccion('ELIMINAR', 'vacaciones', id, currentCompany)
    flash('success', 'Registro eliminado.')
    await load()
  }

  // Guardado rápido del estado (edición inline desde la tabla/tarjetas)
  const quickSaveEstado = async (id, value) => {
    try {
      const { error } = await vacacionesApi.actualizarEstadoVacacion(id, value)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === id ? { ...r, estado: value } : r))
      await load()
    } catch (e) {
      flash('error', 'Error al actualizar estado: ' + e.message)
    }
  }

  const exportarExcelHandler = () => {
    const dataToExport = filtered.length > 0 ? filtered : rows
    if (!dataToExport || dataToExport.length === 0) {
      flash('error', 'No hay solicitudes de vacaciones para exportar.')
      return
    }

    const COLUMNAS_VACACIONES = [
      'Colaborador',
      'Dependencia/Área',
      'Fecha Ingreso',
      'Periodo Vacaciones',
      'Inicio Vacaciones',
      'Fin Vacaciones',
      'Total Días',
      'Días en Tiempo',
      'Días en Dinero',
      'Tipo Solicitud',
      'Estado',
      'Aprobado Por',
      'Observación Contable',
      'Empresa',
    ]

    const filasMapeadas = dataToExport.map(r => {
      const diasDinero = r.dias_en_dinero != null && r.dias_en_dinero !== ''
        ? Number(r.dias_en_dinero)
        : (r.tipo_vacacion === 'Vacaciones en dinero' ? (Number(r.total_dias) || 15) : 0)

      const diasTiempo = r.tipo_vacacion === 'Vacaciones en dinero'
        ? 0
        : (r.dias_disfrutados != null && r.dias_disfrutados !== ''
            ? Number(r.dias_disfrutados)
            : (r.total_dias != null ? Number(r.total_dias) : 0))

      return {
        'Colaborador': r.nombre_empleado || '—',
        'Dependencia/Área': r.dependencia || '—',
        'Fecha Ingreso': r.fecha_ingreso ? String(r.fecha_ingreso).slice(0, 10) : '—',
        'Periodo Vacaciones': r.periodo_vacaciones || '—',
        'Inicio Vacaciones': r.fecha_inicio ? String(r.fecha_inicio).slice(0, 10) : '—',
        'Fin Vacaciones': r.fecha_fin ? String(r.fecha_fin).slice(0, 10) : '—',
        'Total Días': r.total_dias != null ? Number(r.total_dias) : '—',
        'Días en Tiempo': diasTiempo,
        'Días en Dinero': diasDinero,
        'Tipo Solicitud': r.tipo_vacacion || '—',
        'Estado': r.estado || '—',
        'Aprobado Por': r.aprobado_por || '—',
        'Observación Contable': r.observacion_contable || '—',
        'Empresa': r.empresa || currentCompany || 'AmeriGlobal',
      }
    })

    exportarExcel(filasMapeadas, {
      nombreHoja: 'Vacaciones',
      nombreArchivo: `Vacaciones_${currentCompany}_${hoyISO()}.xlsx`,
      titulo: `Registro de Vacaciones - ${currentCompany}`,
      marca: true,
      columnasDef: COLUMNAS_VACACIONES,
    })
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = rows.length
    const pendientes = rows.filter(r => r.estado === 'Pendiente').length
    const aprobadas  = rows.filter(r => r.estado === 'Aprobada').length
    const enCurso    = rows.filter(r => r.estado === 'En curso').length
    const diasTotales = rows.reduce((acc, r) => {
      if (r.tipo_vacacion === 'Vacaciones en dinero') return acc
      const habiles = (r.fecha_inicio && r.fecha_fin)
        ? diasHabilesEntre(r.fecha_inicio, r.fecha_fin)
        : (parseFloat(r.total_dias) || 0)
      return acc + (habiles || 0)
    }, 0)
    return { total, pendientes, aprobadas, enCurso, diasTotales }
  }, [rows])

  // ── Empleados para datalist ───────────────────────────────────────────────
  const empActivos   = empleados.filter(e => e.activo !== false).map(e => e.nombre_completo)
  const empInactivos = empleados.filter(e => e.activo === false).map(e => e.nombre_completo)

  const hayFiltros = search || filterEstado || filterAnio || filterMes || filterDep || filterTipo
  const clearFilters = () => { setSearch(''); setFilterEstado(''); setFilterAnio(''); setFilterMes(''); setFilterDep(''); setFilterTipo(''); setPage(1) }

  const activeChips = [
    search       && { label: `"${search}"`,   clear: () => { setSearch(''); setPage(1) } },
    filterEstado && { label: filterEstado,     clear: () => { setFilterEstado(''); setPage(1) } },
    filterTipo   && { label: filterTipo,       clear: () => { setFilterTipo(''); setPage(1) } },
    filterDep    && { label: filterDep,        clear: () => { setFilterDep(''); setPage(1) } },
    filterAnio   && { label: filterMes ? `${filterMes} ${filterAnio}` : filterAnio, clear: () => { setFilterAnio(''); setFilterMes(''); setPage(1) } },
  ].filter(Boolean)

  const enrichedViewRow = useMemo(() => {
    if (!viewRow) return null
    const emp = empleados.find(e => e.nombre_completo?.trim().toLowerCase() === viewRow.nombre_empleado?.trim().toLowerCase())
    const periodosEmp = (periodos || []).filter(p => emp && p.empleado_id === emp.id)
    const pActivo = periodosEmp.find(p => p.es_periodo_actual)
    return {
      ...viewRow,
      fecha_ingreso: viewRow.fecha_ingreso || pActivo?.fecha_ingreso || emp?.fecha_ingreso || null,
      periodo_id: viewRow.periodo_id || pActivo?.id || null,
      empleado: emp,
      periodos: periodosEmp,
    }
  }, [viewRow, empleados, periodos])

  return (
    <div>
      <div className="page-header" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <PageTitle icon={TitleIcon}>Vacaciones</PageTitle>
          <p>Gestión y seguimiento de solicitudes de vacaciones</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" onClick={exportarExcelHandler} style={{display:'flex',alignItems:'center',gap:6}}>
            <Download size={15}/> Exportar
          </button>
          {puedeEditar && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={15}/> Nueva solicitud
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{marginBottom:16,animation:'fadeInUp 0.3s ease'}}>
          {msg.type === 'error' && <AlertCircle size={15}/>} {msg.text}
        </div>
      )}

      {/* ── KPIs animados ────────────────────────────────────────────────────── */}
      {!loading && rows.length > 0 && (
        <VacacionesKPIs stats={stats} hayFiltros={hayFiltros} />
      )}

      <div className="card">
        <VacacionesFiltros
          rows={rows} filtered={filtered} hayFiltros={hayFiltros} clearFilters={clearFilters} activeChips={activeChips}
          search={search} setSearch={setSearch}
          filterAnio={filterAnio} setFilterAnio={setFilterAnio} aniosDisponibles={aniosDisponibles}
          filterMes={filterMes} setFilterMes={setFilterMes}
          filterEstado={filterEstado} setFilterEstado={setFilterEstado}
          filterTipo={filterTipo} setFilterTipo={setFilterTipo}
          filterDep={filterDep} setFilterDep={setFilterDep}
          viewMode={viewMode} setViewMode={setViewMode}
          setPage={setPage}
        />

        {/* ── Contenido ────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:4}}>
            {Array.from({length:6}).map((_,i) => (
              <div key={i} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 4px'}}>
                <div className="vac-skeleton" style={{width:160,height:14}}/>
                <div className="vac-skeleton" style={{width:90,height:20,borderRadius:999}}/>
                <div className="vac-skeleton" style={{width:90,height:14}}/>
                <div className="vac-skeleton" style={{width:80,height:14}}/>
                <div className="vac-skeleton" style={{width:70,height:22,borderRadius:999}}/>
                <div className="vac-skeleton" style={{flex:1,height:14}}/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{animation:'fadeIn 0.3s ease'}}>
            <Sun size={32} style={{color:'color-mix(in srgb, var(--warning) 40%, transparent)',marginBottom:8}}/>
            <p>No hay registros que coincidan.</p>
            {hayFiltros && <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{marginTop:8}}><X size={13}/> Limpiar filtros</button>}
          </div>
        ) : viewMode === 'table' ? (
          <VacacionesTabla
            paged={paged} filtered={filtered} page={page} totalPages={totalPages} setPage={setPage}
            sortField={sortField} sortAsc={sortAsc} toggleSort={toggleSort}
            quickSaveEstado={puedeEditar ? quickSaveEstado : null} openEdit={puedeEditar ? openEdit : null} setViewRow={setViewRow} setDeleteId={puedeEditar ? setDeleteId : null}
          />
        ) : (
          <VacacionesCards
            paged={paged} filtered={filtered} page={page} totalPages={totalPages} setPage={setPage}
            quickSaveEstado={puedeEditar ? quickSaveEstado : null} openEdit={puedeEditar ? openEdit : null} setViewRow={setViewRow} setDeleteId={puedeEditar ? setDeleteId : null}
          />
        )}
      </div>

      {/* ── Modal agregar / editar ──────────────────────────────────────────── */}
      {modal && (
        <ModalForm
          modal={modal} form={form} setForm={setForm} f={f} save={save} saving={saving}
          empleados={empleados}
          empActivos={empActivos} empInactivos={empInactivos}
          diasAcumuladosForm={diasAcumuladosForm} anioActual={anioActual}
          saldoVacacionesForm={saldoVacacionesForm}
          periodos={periodos}
          rows={rows}
          onClose={() => setModal(null)}
        />
      )}


      {/* ── Modal eliminar ────────────────────────────────────────────────────── */}
      <DeleteConfirmModal deleteId={deleteId} onClose={() => setDeleteId(null)} onConfirm={remove}
        message="¿Estás seguro de que deseas eliminar este registro de vacaciones? Esta acción no se puede deshacer." />

      {/* ── Modal ver detalle ─────────────────────────────────────────────────── */}
      {enrichedViewRow && (
        <ModalDetalle
          row={enrichedViewRow}
          onClose={() => setViewRow(null)}
          onEdit={row => { setViewRow(null); openEdit(row) }}
          allRows={rows}
        />
      )}
    </div>
  )
}
