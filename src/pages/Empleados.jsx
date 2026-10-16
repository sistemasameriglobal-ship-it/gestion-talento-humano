import PageTitle from '../components/ui/PageTitle'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import * as empleadosApi from '../api/empleados'
import * as novedadesApi from '../api/novedades'
import * as vacacionesApi from '../api/vacaciones'
import * as procesosApi from '../api/procesosDisciplinarios'
import { hoyISO } from '../utils/fecha'
import { normalizarConcepto, mapearFilaEmpleadoExcel } from '../utils/parseExcel'
import { calcAntiguedadEmpleado, calcularSaldoVacacionesPeriodo } from '../utils/vacacionesHelpers'
import { exportarExcel } from '../utils/exportarExcel'
import { logAccion } from '../utils/auditLogger'
import { Contact, Plus, Search, X, Download, Upload, LayoutGrid, List, ArrowUpDown } from 'lucide-react'
import { PAGE_SIZE, EMPTY } from '../components/empleados/empleadosConstants'
import EmpleadoKpis from '../components/empleados/EmpleadoKpis'
import AreaDistribution from '../components/empleados/AreaDistribution'
import EmpleadoCards from '../components/empleados/EmpleadoCards'
import EmpleadoTable from '../components/empleados/EmpleadoTable'
import EmpleadoFormModal from '../components/empleados/EmpleadoFormModal'
import EmpleadoHistorialModal from '../components/empleados/EmpleadoHistorialModal'
import ModalRetiroEmpleado from '../components/empleados/ModalRetiroEmpleado'
import ModalReintegroEmpleado from '../components/empleados/ModalReintegroEmpleado'
import ModalLiquidarEmpleado from '../components/empleados/ModalLiquidarEmpleado'
import ModalSustitucionPatronal from '../components/empleados/ModalSustitucionPatronal'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import Paginacion from '../components/ui/Paginacion'

function normalizarNombre(s) {
  return (s || '')
    .toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export default function Empleados() {
  const { currentCompany, companyConfig, canWrite } = useCompany()
  const puedeEditar = canWrite ? canWrite('empleados') : true
  const [rows, setRows] = useState([])
  const [novedades, setNovedades] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [vacaciones, setVacaciones] = useState([])
  const [procesos, setProcesos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [filterDep, setFilterDep] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterTab, setFilterTab] = useState('')
  const [sortBy, setSortBy] = useState('nombre_asc')
  const [vista, setVista] = useState('tarjetas')
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [historialSection, setHistorialSection] = useState(null)
  const [duplicadoWarning, setDuplicadoWarning] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  // Estados para modales dedicados de Retiro, Reintegro, Liquidación y Sustitución Patronal
  const [retiroEmp, setRetiroEmp] = useState(null)
  const [reintegroEmp, setReintegroEmp] = useState(null)
  const [liquidarEmp, setLiquidarEmp] = useState(null)
  const [sustitucionEmp, setSustitucionEmp] = useState(null)
  const [actionSaving, setActionSaving] = useState(false)

  const handleSelectEmp = useCallback((emp, section = null) => {
    setSelectedEmp(emp)
    setHistorialSection(section)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    let [{ data }, { data: novData }, { data: periodosData }, { data: vacData }, { data: procData }] = await Promise.all([
      empleadosApi.listarEmpleados(currentCompany),
      novedadesApi.listarNovedadesCompleto(currentCompany),
      empleadosApi.listarTodosLosPeriodos(currentCompany).catch(() => ({ data: [] })),
      Promise.resolve(vacacionesApi.listarVacaciones(currentCompany)).catch(() => ({ data: [] })),
      Promise.resolve(procesosApi.listarProcesosDisciplinarios(currentCompany)).catch(() => ({ data: [] })),
    ])

    // Detectar y auto-sincronizar colaboradores recientes que no tengan su novedad de Ingreso registrada
    if (data && data.length > 0) {
      const ahora = Date.now()
      const sieteDiasMs = 7 * 24 * 60 * 60 * 1000
      let huboSincronizacion = false

      for (const emp of data) {
        const esReciente = emp.created_at && (ahora - new Date(emp.created_at).getTime() < sieteDiasMs)
        if (esReciente) {
          const tieneIngreso = (novData || []).some(n =>
            n.concepto === 'Ingreso' &&
            ((n.empleado_id && n.empleado_id === emp.id) ||
             (n.nombre_empleado && n.nombre_empleado.trim().toLowerCase() === emp.nombre_completo?.trim().toLowerCase()))
          )
          if (!tieneIngreso) {
            const fIngreso = emp.fecha_ingreso || (emp.created_at ? emp.created_at.slice(0, 10) : new Date().toISOString().split('T')[0])
            const { error: errIns } = await novedadesApi.crearNovedad({
              concepto: 'Ingreso',
              fecha_inicio: fIngreso,
              fecha_fin: fIngreso,
              total_dias: 0,
              periodo: fIngreso.slice(0, 7),
              observacion: 'Registro inicial de ingreso del colaborador',
              empleado_id: emp.id,
              nombre_empleado: emp.nombre_completo,
              dependencia: emp.dependencia || null,
              empresa: currentCompany,
              empresa_id: emp.empresa_id || null,
              departamento_id: emp.departamento_id || null,
            }, currentCompany)
            if (!errIns) huboSincronizacion = true
          }
        }
      }

      if (huboSincronizacion) {
        const { data: freshNov } = await novedadesApi.listarNovedadesCompleto(currentCompany)
        if (freshNov) novData = freshNov
      }
    }

    setRows(data || [])
    setNovedades(novData || [])
    setPeriodos(periodosData || [])
    setVacaciones(vacData || [])
    setProcesos(procData || [])
    setLoading(false)
  }, [currentCompany])

  useEffect(() => { Promise.resolve().then(() => load()) }, [load])

  const periodosPorEmpleado = useMemo(() => {
    const acc = {}
    ;(periodos || []).forEach(p => {
      if (!acc[p.empleado_id]) acc[p.empleado_id] = []
      acc[p.empleado_id].push(p)
    })
    Object.values(acc).forEach(list => list.sort((a, b) => (a.numero_periodo || 0) - (b.numero_periodo || 0)))
    return acc
  }, [periodos])

  const vacacionesPorEmpleado = useMemo(() => {
    const acc = {}
    ;(vacaciones || []).forEach(v => {
      if (v.empleado_id) {
        if (!acc[v.empleado_id]) acc[v.empleado_id] = []
        acc[v.empleado_id].push(v)
      }
      if (v.nombre_empleado) {
        const norm = normalizarNombre(v.nombre_empleado)
        if (!acc[norm]) acc[norm] = []
        acc[norm].push(v)
      }
    })
    return acc
  }, [vacaciones])

  const procesosPorEmpleado = useMemo(() => {
    const acc = {}
    const addUnique = (key, p) => {
      if (!key) return
      if (!acc[key]) acc[key] = []
      if (!acc[key].some(item => item.id === p.id)) {
        acc[key].push(p)
      }
    }
    ;(procesos || []).forEach(p => {
      if (p.empleado_id) addUnique(p.empleado_id, p)
      if (p.nombre_empleado) {
        addUnique(p.nombre_empleado.trim().toLowerCase(), p)
        addUnique(normalizarNombre(p.nombre_empleado), p)
      }
    })
    const fechaSort = (p) => p.fecha || p.fecha_inicio || (p.created_at ? p.created_at.slice(0, 10) : '')
    Object.values(acc).forEach(list => {
      list.sort((a, b) => fechaSort(b).localeCompare(fechaSort(a)))
    })
    return acc
  }, [procesos])

  const novedadesPorEmpleado = useMemo(() => {
    const acc = {}
    novedades.forEach(r => {
      const k = r.nombre_empleado
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
  }, [novedades])

  const filtered = useMemo(() => {
    let res = rows.filter(r => {
      const s = search.toLowerCase()
      const matchSearch = !s ||
        r.nombre_completo?.toLowerCase().includes(s) ||
        r.numero_documento?.toLowerCase().includes(s) ||
        r.correo?.toLowerCase().includes(s) ||
        r.correo_personal?.toLowerCase().includes(s) ||
        r.celular?.toLowerCase().includes(s) ||
        r.dependencia?.toLowerCase().includes(s) ||
        r.cargo?.toLowerCase().includes(s)
      const matchDep = !filterDep || r.dependencia === filterDep
      const matchEstado = !filterEstado || (filterEstado === 'activos' ? r.activo !== false : r.activo === false)
      // Tabs rápidos
      const nov = novedadesPorEmpleado[r.nombre_completo]
      const periodosEmp = periodosPorEmpleado[r.id] || []
      const ultimoPeriodoCerrado = [...periodosEmp].reverse().find(p => !p.es_periodo_actual) || periodosEmp[periodosEmp.length - 1]
      const estaLiquidado = Boolean(r.liquidado || ultimoPeriodoCerrado?.liquidado)

      const matchTab = !filterTab ||
        (filterTab === 'activos' && r.activo !== false) ||
        (filterTab === 'inactivos' && r.activo === false) ||
        (filterTab === 'pend_liquidar' && r.activo === false && !estaLiquidado) ||
        (filterTab === 'con_inc' && nov && nov.episodiosInc > 0) ||
        (filterTab === 'sin_correo' && !r.correo)
      return matchSearch && matchDep && matchEstado && matchTab
    })
    res = [...res].sort((a, b) => {
      switch (sortBy) {
        case 'nombre_asc': return (a.nombre_completo || '').localeCompare(b.nombre_completo || '')
        case 'area_asc': return (a.dependencia || '').localeCompare(b.dependencia || '')
        case 'reciente': return (b.created_at || '').localeCompare(a.created_at || '')
        case 'mas_novedades': {
          const na = novedadesPorEmpleado[a.nombre_completo]?.novedades.length || 0
          const nb = novedadesPorEmpleado[b.nombre_completo]?.novedades.length || 0
          return nb - na
        }
        default: return 0
      }
    })
    return res
  }, [rows, search, filterDep, filterEstado, filterTab, sortBy, novedadesPorEmpleado, periodosPorEmpleado])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openAdd = () => { setForm(EMPTY); setDuplicadoWarning(null); setModal('add') }
  const openEdit = (row) => {
    setForm({
      ...EMPTY,
      ...row,
      tipo_documento: row.tipo_documento || 'CC',
      numero_documento: row.numero_documento || '',
      fecha_nacimiento: row.fecha_nacimiento || '',
      tipo_sangre: row.tipo_sangre || '',
      direccion: row.direccion || '',
      barrio: row.barrio || '',
      municipio: row.municipio || '',
      celular: row.celular || '',
      correo_personal: row.correo_personal || '',
      salario: row.salario ?? '',
      auxilio_transporte: row.auxilio_transporte ?? '',
      eps: row.eps || '',
      pension: row.pension || '',
      cesantias: row.cesantias || '',
      banco: row.banco || '',
      tipo_cuenta: row.tipo_cuenta || 'Ahorros',
      numero_cuenta: row.numero_cuenta || '',
      contactos_emergencia: Array.isArray(row.contactos_emergencia) ? row.contactos_emergencia : [],
      fecha_primer_ingreso: row.fecha_primer_ingreso || '',
      fecha_terminacion_anterior: row.fecha_terminacion_anterior || '',
      fecha_inicio_empresa_actual: row.fecha_inicio_empresa_actual || row.fecha_ingreso || '',
      fecha_ingreso: row.fecha_ingreso || row.fecha_inicio_empresa_actual || '',
      fecha_retiro: row.fecha_retiro || '',
      dias_vacaciones_tomados_manual: row.dias_vacaciones_tomados_manual ?? 0,
    })
    setDuplicadoWarning(null)
    setModal('edit')
  }

  const checkDuplicado = (nombre, excludeId = null) => {
    const norm = normalizarNombre(nombre)
    if (!norm) return null
    for (const r of rows) {
      if (excludeId && r.id === excludeId) continue
      const rNorm = normalizarNombre(r.nombre_completo)
      if (rNorm === norm) return { tipo: 'exacto', nombre: r.nombre_completo, empleado: r }
      if (norm.length > 4 && levenshtein(norm, rNorm) <= 2) return { tipo: 'similar', nombre: r.nombre_completo, empleado: r }
    }
    return null
  }

  const onNombreChange = (e) => {
    const val = e.target.value
    setForm(p => ({ ...p, nombre_completo: val }))
    const dup = checkDuplicado(val, modal === 'edit' ? form.id : null)
    setDuplicadoWarning(dup)
  }

  const save = async (forzar = false) => {
    if (!form.nombre_completo?.trim()) return setMsg({ type: 'error', text: 'El nombre es obligatorio.' })
    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      return setMsg({ type: 'error', text: 'El correo empresarial no tiene un formato válido.' })
    }
    if (form.correo_personal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo_personal)) {
      return setMsg({ type: 'error', text: 'El correo personal no tiene un formato válido.' })
    }
    const dup = checkDuplicado(form.nombre_completo, modal === 'edit' ? form.id : null)
    if (dup && dup.tipo === 'exacto' && !forzar) {
      if (dup.empleado?.activo === false) {
        return setMsg({
          type: 'error',
          text: `Ya existe un colaborador inactivo llamado "${dup.nombre}". En lugar de crear un duplicado, puedes usar la opción "Reintegrar" en su fila o tarjeta para iniciar un nuevo ciclo contractual.`,
        })
      }
      return setMsg({ type: 'error', text: `Ya existe un empleado llamado "${dup.nombre}". Cambia el nombre o edita el registro existente.` })
    }
    setSaving(true)
    let err
    const fechaIngresoEfectiva = form.fecha_inicio_empresa_actual || form.fecha_ingreso || null
    const payload = {
      nombre_completo: form.nombre_completo.trim(),
      tipo_documento: form.tipo_documento || 'CC',
      numero_documento: form.numero_documento?.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      tipo_sangre: form.tipo_sangre || null,
      correo: form.correo?.trim() || null,
      correo_personal: form.correo_personal?.trim() || null,
      celular: form.celular?.trim() || null,
      direccion: form.direccion?.trim() || null,
      barrio: form.barrio?.trim() || null,
      municipio: form.municipio?.trim() || null,
      dependencia: form.dependencia || null,
      activo: form.activo ?? true,
      cargo: form.cargo?.trim() || null,
      fecha_primer_ingreso: form.fecha_primer_ingreso || null,
      fecha_terminacion_anterior: form.fecha_terminacion_anterior || null,
      fecha_inicio_empresa_actual: fechaIngresoEfectiva,
      fecha_ingreso: fechaIngresoEfectiva,
      salario: (form.salario !== '' && form.salario != null) ? Number(form.salario) || 0 : 0,
      auxilio_transporte: (form.auxilio_transporte !== '' && form.auxilio_transporte != null) ? Number(form.auxilio_transporte) || 0 : 0,
      eps: form.eps?.trim() || null,
      pension: form.pension?.trim() || null,
      cesantias: form.cesantias?.trim() || null,
      banco: form.banco?.trim() || null,
      tipo_cuenta: form.tipo_cuenta || 'Ahorros',
      numero_cuenta: form.numero_cuenta?.trim() || null,
      contactos_emergencia: Array.isArray(form.contactos_emergencia) ? form.contactos_emergencia : [],
      dias_vacaciones_tomados_manual: (form.dias_vacaciones_tomados_manual !== '' && form.dias_vacaciones_tomados_manual != null)
        ? Number(form.dias_vacaciones_tomados_manual)
        : 0,
      // Si quedó marcado como Activo, no debe arrastrar una fecha de retiro
      // vieja (evita que el dashboard lo siga excluyendo por error).
      fecha_retiro: form.activo ? null : (form.fecha_retiro || null),
    }
    if (modal === 'add') {
      const { data: createdData, error } = await empleadosApi.crearEmpleado(payload, currentCompany)
      err = error
      // a) Sincronización automática de evento contractual: Nuevo Ingreso
      if (!error) {
        const nuevoEmp = createdData?.[0]
        const fechaIngresoFinal = payload.fecha_ingreso || nuevoEmp?.fecha_ingreso || new Date().toISOString().split('T')[0]
        const { data: existentes } = await novedadesApi.buscarNovedadPorEmpleadoConceptoYFecha(
          payload.nombre_completo, 'Ingreso', fechaIngresoFinal, currentCompany
        )
        if (!existentes || existentes.length === 0) {
          const { error: errNov } = await novedadesApi.crearNovedad({
            concepto: 'Ingreso',
            fecha_inicio: fechaIngresoFinal,
            fecha_fin: fechaIngresoFinal,
            total_dias: 0,
            periodo: fechaIngresoFinal.slice(0, 7),
            observacion: 'Registro inicial de ingreso del colaborador',
            empleado_id: nuevoEmp?.id || null,
            nombre_empleado: payload.nombre_completo,
            dependencia: payload.dependencia || null,
            empresa: currentCompany,
            empresa_id: nuevoEmp?.empresa_id || null,
            departamento_id: nuevoEmp?.departamento_id || null,
          }, currentCompany)
          if (errNov) {
            console.warn('Error al sincronizar novedad de ingreso:', errNov)
          }
        }
      }
    } else {
      const { error } = await empleadosApi.actualizarEmpleado(form.id, payload)
      err = error
    }
    setSaving(false)
    if (err) return setMsg({ type: 'error', text: err.message })
    setMsg({ type: 'success', text: modal === 'add' ? 'Empleado agregado.' : 'Empleado actualizado.' })
    setModal(null)
    load()
    setTimeout(() => setMsg(null), 3000)
  }

  const remove = async (id) => {
    const { error } = await empleadosApi.eliminarEmpleado(id)
    if (!error) { setDeleteId(null); load() }
    else setMsg({ type: 'error', text: error.message })
  }

  const handleConfirmRetiro = async ({ fecha_retiro, concepto = 'Terminación de Contrato', observaciones }) => {
    if (!retiroEmp) return
    setActionSaving(true)
    try {
      const fRetiroFinal = fecha_retiro || new Date().toISOString().split('T')[0]
      const conceptoRetiro = concepto || 'Terminación de Contrato'

      // 1. Buscar periodo activo si existe y cerrarlo
      const periodosEmp = periodosPorEmpleado[retiroEmp.id] || []
      const periodoActivo = periodosEmp.find(p => p.es_periodo_actual)
      if (periodoActivo) {
        await empleadosApi.cerrarPeriodo(periodoActivo.id, {
          fecha_retiro: fRetiroFinal,
          observaciones: observaciones || `${conceptoRetiro} laboral`,
        })
      }

      // 2. Actualizar registro principal en empleados (espejo del periodo vigente)
      const { error } = await empleadosApi.actualizarEmpleado(retiroEmp.id, {
        activo: false,
        fecha_retiro: fRetiroFinal,
        liquidado: false,
        fecha_liquidacion: null,
        observacion_liquidacion: null,
      })
      if (error) throw error

      // 3. Sincronización automática de evento contractual en public.novedades con el concepto elegido
      const { data: existentes } = await novedadesApi.buscarNovedadPorEmpleadoConceptoYFecha(
        retiroEmp.nombre_completo, conceptoRetiro, fRetiroFinal, currentCompany
      )
      if (!existentes || existentes.length === 0) {
        const { error: errNov } = await novedadesApi.crearNovedad({
          concepto: conceptoRetiro,
          fecha_inicio: fRetiroFinal,
          fecha_fin: fRetiroFinal,
          total_dias: 0,
          periodo: fRetiroFinal.slice(0, 7),
          observacion: observaciones || `${conceptoRetiro} laboral`,
          empleado_id: retiroEmp.id,
          nombre_empleado: retiroEmp.nombre_completo,
          dependencia: retiroEmp.dependencia || null,
          empresa: currentCompany,
          empresa_id: retiroEmp.empresa_id || null,
          departamento_id: retiroEmp.departamento_id || null,
        }, currentCompany)
        if (errNov) {
          console.warn('Error al sincronizar novedad de retiro:', errNov)
        }
      }

      logAccion('RETIRAR', 'empleados', retiroEmp.id, currentCompany, { fecha_retiro: fRetiroFinal, concepto: conceptoRetiro, observaciones })
      setMsg({ type: 'success', text: `Colaborador ${retiroEmp.nombre_completo} retirado exitosamente con novedad de "${conceptoRetiro}".` })
      setRetiroEmp(null)
      await load()
      setTimeout(() => setMsg(null), 3500)
    } catch (e) {
      setMsg({ type: 'error', text: 'Error al retirar colaborador: ' + e.message })
    } finally {
      setActionSaving(false)
    }
  }

  const handleConfirmReintegro = async ({
    nueva_fecha_ingreso,
    cargo,
    dependencia,
    observaciones,
    continuidad_laboral = false,
    motivo_transicion = 'reintegro',
  }) => {
    if (!reintegroEmp) return
    setActionSaving(true)
    try {
      const periodosEmp = periodosPorEmpleado[reintegroEmp.id] || []
      const siguienteNumero = periodosEmp.length > 0
        ? Math.max(...periodosEmp.map(p => p.numero_periodo || 1)) + 1
        : 2

      // 1. Si el colaborador tenía un periodo activo previo (caso de ascenso mientras sigue activo),
      // cerramos formalmente ese periodo en la fecha de efectividad del nuevo cargo.
      const periodoActivoPrevio = periodosEmp.find(p => p.es_periodo_actual)
      if (periodoActivoPrevio) {
        await empleadosApi.cerrarPeriodo(periodoActivoPrevio.id, {
          fecha_retiro: nueva_fecha_ingreso,
          observaciones: observaciones || `Cierre por ${continuidad_laboral ? (motivo_transicion === 'ascenso' ? 'Ascenso de cargo' : 'Cambio de cargo') : 'Finalización de contrato anterior'}`,
        })
      }

      // 2. Crear nuevo periodo laboral en empleado_periodos
      const { error: errorPeriodo } = await empleadosApi.crearPeriodo({
        empleado_id: reintegroEmp.id,
        empresa: currentCompany,
        numero_periodo: siguienteNumero,
        fecha_ingreso: nueva_fecha_ingreso,
        fecha_retiro: null,
        cargo: cargo || reintegroEmp.cargo || null,
        dependencia: dependencia || reintegroEmp.dependencia || null,
        es_periodo_actual: true,
        continuidad_laboral: Boolean(continuidad_laboral),
        motivo_transicion: motivo_transicion || (continuidad_laboral ? 'ascenso' : 'reintegro'),
        observaciones: observaciones || (continuidad_laboral ? 'Ascenso con continuidad laboral' : 'Reintegro bajo nuevo contrato laboral'),
      })
      if (errorPeriodo) throw errorPeriodo

      // 3. Actualizar tabla empleados:
      // Si hay continuidad laboral, se conserva la fecha de ingreso histórica de la empresa.
      // Si es un reintegro tras retiro externo sin continuidad, inicia nuevo ciclo con la nueva fecha de ingreso.
      const fechaIngresoEmpFinal = continuidad_laboral
        ? (reintegroEmp.fecha_ingreso || nueva_fecha_ingreso)
        : nueva_fecha_ingreso

      const { error } = await empleadosApi.actualizarEmpleado(reintegroEmp.id, {
        activo: true,
        fecha_ingreso: fechaIngresoEmpFinal,
        fecha_retiro: null,
        cargo: cargo || reintegroEmp.cargo || null,
        dependencia: dependencia || reintegroEmp.dependencia || null,
      })
      if (error) throw error

      // 4. Sincronización automática de evento contractual en public.novedades
      const fEfectivaFinal = nueva_fecha_ingreso || new Date().toISOString().split('T')[0]
      const conceptoNovedad = continuidad_laboral
        ? (motivo_transicion === 'ascenso' ? 'Ascenso' : 'Cambio de Cargo')
        : 'Ingreso'

      const obsNovedad = observaciones || (
        continuidad_laboral
          ? (motivo_transicion === 'ascenso' ? `Ascenso a cargo "${cargo || 'Nuevo Rol'}" con continuidad laboral` : `Cambio de cargo a "${cargo || 'Nuevo Rol'}" con continuidad laboral`)
          : 'Reintegro bajo nuevo contrato laboral tras retiro externo'
      )

      const { data: existentes } = await novedadesApi.buscarNovedadPorEmpleadoConceptoYFecha(
        reintegroEmp.nombre_completo, conceptoNovedad, fEfectivaFinal, currentCompany
      )

      if (!existentes || existentes.length === 0) {
        const { error: errNov } = await novedadesApi.crearNovedad({
          concepto: conceptoNovedad,
          fecha_inicio: fEfectivaFinal,
          fecha_fin: fEfectivaFinal,
          total_dias: 0,
          periodo: fEfectivaFinal.slice(0, 7),
          observacion: obsNovedad,
          empleado_id: reintegroEmp.id,
          nombre_empleado: reintegroEmp.nombre_completo,
          dependencia: dependencia || reintegroEmp.dependencia || null,
          empresa: currentCompany,
          empresa_id: reintegroEmp.empresa_id || null,
          departamento_id: reintegroEmp.departamento_id || null,
        }, currentCompany)
        if (errNov) {
          console.warn('Error al sincronizar novedad de movimiento:', errNov)
        }
      }

      logAccion(continuidad_laboral ? 'ASCENSO' : 'REINTEGRAR', 'empleados', reintegroEmp.id, currentCompany, {
        nueva_fecha_ingreso,
        numero_periodo: siguienteNumero,
        continuidad_laboral,
        motivo_transicion,
      })

      const msgExito = continuidad_laboral
        ? `Colaborador ${reintegroEmp.nombre_completo} actualizado con continuidad laboral (${motivo_transicion === 'ascenso' ? 'Ascenso' : 'Cambio de cargo'}). Antigüedad y vacaciones acumuladas conservadas.`
        : `Colaborador ${reintegroEmp.nombre_completo} reintegrado exitosamente en nuevo ciclo contractual.`

      setMsg({ type: 'success', text: msgExito })
      setReintegroEmp(null)
      await load()
      setTimeout(() => setMsg(null), 4000)
    } catch (e) {
      setMsg({ type: 'error', text: 'Error al registrar movimiento del colaborador: ' + e.message })
    } finally {
      setActionSaving(false)
    }
  }

  const handleConfirmLiquidacion = async ({ liquidado, fecha_liquidacion, observacion_liquidacion }) => {
    if (!liquidarEmp) return
    setActionSaving(true)
    try {
      const periodosEmp = periodosPorEmpleado[liquidarEmp.id] || []
      const ultimoPeriodoCerrado = [...periodosEmp].reverse().find(p => !p.es_periodo_actual) || periodosEmp[periodosEmp.length - 1]
      const { error } = await empleadosApi.marcarLiquidado(liquidarEmp.id, {
        periodoId: ultimoPeriodoCerrado?.id || null,
        fecha_liquidacion,
        observacion_liquidacion,
        liquidado,
      })
      if (error) throw error

      logAccion('LIQUIDAR', 'empleados', liquidarEmp.id, currentCompany, {
        liquidado,
        fecha_liquidacion,
        observacion_liquidacion,
      })

      setMsg({
        type: 'success',
        text: liquidado
          ? `Liquidación de ${liquidarEmp.nombre_completo} registrada exitosamente (${fecha_liquidacion}).`
          : `Colaborador ${liquidarEmp.nombre_completo} marcado nuevamente como pendiente por liquidar.`,
      })
      setLiquidarEmp(null)
      await load()
      setTimeout(() => setMsg(null), 3500)
    } catch (e) {
      setMsg({ type: 'error', text: 'Error al registrar liquidación: ' + e.message })
    } finally {
      setActionSaving(false)
    }
  }

  const handleConfirmSustitucion = async (payload) => {
    if (!sustitucionEmp) return
    setActionSaving(true)
    try {
      const { error } = await empleadosApi.ejecutarSustitucionPatronal(sustitucionEmp, payload)
      if (error) throw error

      logAccion('SUSTITUCION_PATRONAL', 'empleados', sustitucionEmp.id, currentCompany, {
        empresa_origen: sustitucionEmp.empresa || currentCompany,
        empresa_destino: payload.empresa_destino,
        fecha_sustitucion: payload.fecha_sustitucion,
        cargo: payload.cargo,
        dependencia: payload.dependencia,
      })

      const nomDest = payload.empresa_destino === 'global_link' ? 'Global Link' : 'AmeriGlobal'
      setMsg({
        type: 'success',
        text: `Sustitución patronal de ${sustitucionEmp.nombre_completo} hacia ${nomDest} realizada con éxito. Se preservaron la antigüedad, novedades, procesos disciplinarios y vacaciones.`,
      })
      setSustitucionEmp(null)
      await load()
      setTimeout(() => setMsg(null), 5000)
    } catch (e) {
      setMsg({ type: 'error', text: 'Error al realizar la sustitución patronal: ' + e.message })
    } finally {
      setActionSaving(false)
    }
  }

  const f = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(p => ({ ...p, [k]: val }))
  }

  const depsEnUso = [...new Set(rows.map(r => r.dependencia).filter(Boolean))].sort()
  const hasFilter = search || filterDep || filterEstado || filterTab
  const clearFilters = () => { setSearch(''); setFilterDep(''); setFilterEstado(''); setFilterTab(''); setPage(1) }

  const conteoPorArea = useMemo(() => {
    const acc = {}
    rows.forEach(r => { const d = r.dependencia || 'Sin área'; acc[d] = (acc[d] || 0) + 1 })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [rows])
  const maxArea = Math.max(1, ...conteoPorArea.map(([, v]) => v))

  const exportExcel = () => {
    const dataToExport = filtered.length > 0 ? filtered : rows
    if (!dataToExport || dataToExport.length === 0) {
      setMsg({ type: 'error', text: 'No hay colaboradores para exportar.' })
      return
    }

    const COLUMNAS_EMPLEADOS = [
      'Nombre Completo',
      'Correo',
      'Dependencia/Área',
      'Cargo',
      'Estado (Activo/Inactivo)',
      'Fecha Ingreso',
      'Fecha Retiro',
      'Antigüedad',
      'Saldo Vacaciones',
      'Empresa',
    ]

    const filasMapeadas = dataToExport.map(e => {
      const periodosEmp = periodosPorEmpleado[e.id] || []
      const antig = calcAntiguedadEmpleado(e, periodosEmp)
      const pActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[periodosEmp.length - 1] || { fecha_ingreso: e.fecha_ingreso, es_periodo_actual: true }
      const vacsEmp = vacacionesPorEmpleado[e.id] || vacacionesPorEmpleado[normalizarNombre(e.nombre_completo)] || []
      const saldo = calcularSaldoVacacionesPeriodo(pActivo, vacsEmp, periodosEmp, e)

      return {
        'Nombre Completo': e.nombre_completo || '—',
        'Correo': e.correo || '—',
        'Dependencia/Área': e.dependencia || '—',
        'Cargo': e.cargo || '—',
        'Estado (Activo/Inactivo)': e.activo === false ? 'Inactivo' : 'Activo',
        'Fecha Ingreso': e.fecha_ingreso ? String(e.fecha_ingreso).slice(0, 10) : '—',
        'Fecha Retiro': (e.activo === false && e.fecha_retiro) ? String(e.fecha_retiro).slice(0, 10) : '—',
        'Antigüedad': antig?.texto || '—',
        'Saldo Vacaciones': e.activo === false ? '0 días' : `${saldo.saldoPendiente || 0} días`,
        'Empresa': e.empresa || companyConfig.nombre || 'AmeriGlobal',
      }
    })

    exportarExcel(filasMapeadas, {
      nombreHoja: 'Empleados',
      nombreArchivo: `Empleados_${companyConfig.id || 'AmeriGlobal'}_${hoyISO()}.xlsx`,
      titulo: `Directorio de Colaboradores - ${companyConfig.nombre || 'AmeriGlobal'}`,
      marca: true,
      columnasDef: COLUMNAS_EMPLEADOS,
    })
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (!data || data.length === 0) {
        setImportResult({ error: 'El archivo Excel no contiene filas de datos.' })
        return
      }

      let creados = 0, omitidos = 0, errores = 0
      const poolEmpleados = [...rows]

      for (const rawRow of data) {
        const row = mapearFilaEmpleadoExcel(rawRow)
        const nombre = (row.nombre_completo || '').trim()
        if (!nombre) { omitidos++; continue }

        const normNombre = normalizarNombre(nombre)
        const dupNombre = poolEmpleados.some(r => normalizarNombre(r.nombre_completo) === normNombre)
        const dupCorreo = row.correo && poolEmpleados.some(r => r.correo && r.correo.trim().toLowerCase() === row.correo.trim().toLowerCase())

        if (dupNombre || dupCorreo) {
          omitidos++
          continue
        }

        const payload = {
          nombre_completo: nombre,
          correo: row.correo || null,
          dependencia: row.dependencia || null,
          cargo: row.cargo || null,
          activo: row.activo !== false,
          fecha_ingreso: row.fecha_ingreso || null,
          fecha_retiro: row.activo === false ? (row.fecha_retiro || null) : null,
          empresa: row.empresa || currentCompany,
        }

        const { data: createdData, error } = await empleadosApi.crearEmpleado(payload, currentCompany)
        if (error) {
          errores++
        } else {
          creados++
          poolEmpleados.push({
            id: createdData?.[0]?.id,
            ...payload,
          })
        }
      }

      setImportResult({ creados, omitidos, errores })
      await load()
    } catch (err) {
      setImportResult({ error: err.message || 'Error al procesar el archivo Excel.' })
    } finally {
      setImporting(false)
      setFileInputKey(k => k + 1)
    }
  }

  // Tabs rápidos de estado (dependen de rows + novedades + liquidación)
  const conInc = rows.filter(r => (novedadesPorEmpleado[r.nombre_completo]?.episodiosInc || 0) > 0).length
  const sinCorreo = rows.filter(r => !r.correo).length
  const pendLiquidar = rows.filter(r => {
    if (r.activo !== false) return false
    const periodosEmp = periodosPorEmpleado[r.id] || []
    const ultimoCerrado = [...periodosEmp].reverse().find(p => !p.es_periodo_actual) || periodosEmp[periodosEmp.length - 1]
    return !r.liquidado && !ultimoCerrado?.liquidado
  }).length

  const tabs = [
    { val: '', label: `Todos (${rows.length})` },
    { val: 'activos', label: `Activos (${rows.filter(r => r.activo !== false).length})` },
    { val: 'inactivos', label: `Inactivos (${rows.filter(r => r.activo === false).length})` },
    ...(pendLiquidar > 0 ? [{ val: 'pend_liquidar', label: `⚠️ Pendientes por liquidar (${pendLiquidar})` }] : []),
    ...(conInc > 0 ? [{ val: 'con_inc', label: `Con incapacidades (${conInc})` }] : []),
    ...(sinCorreo > 0 ? [{ val: 'sin_correo', label: `Sin correo (${sinCorreo})` }] : []),
  ]

  const pagination = totalPages > 1 ? (
    <Paginacion
      total={filtered.length} page={page} totalPages={totalPages} onChange={setPage}
      info={vista === 'tarjetas'
        ? `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`
        : `${filtered.length} empleados`}
    />
  ) : null

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <PageTitle icon={Contact}>Empleados</PageTitle>
          <p>Gestiona el directorio de colaboradores de {companyConfig.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Exportar
          </button>
          {puedeEditar && (
            <>
              <label className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                <Upload size={14} /> {importing ? 'Importando...' : 'Importar Excel'}
                <input key={fileInputKey} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} disabled={importing} style={{ display: 'none' }} />
              </label>
              <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Nuevo empleado</button>
            </>
          )}
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      {importResult && (
        <div className={`alert alert-${importResult.error ? 'error' : 'success'}`}>
          {importResult.error
            ? importResult.error
            : `Importación completa: ${importResult.creados} creado(s), ${importResult.omitidos} omitido(s) por duplicado o nombre vacío, ${importResult.errores} error(es).`}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }} onClick={() => setImportResult(null)}>Cerrar</button>
        </div>
      )}

      {/* ── KPIs dinámicos ── */}
      <EmpleadoKpis
        rows={rows}
        novedadesPorEmpleado={novedadesPorEmpleado}
        depsEnUso={depsEnUso}
        setFilterTab={setFilterTab}
        setFilterEstado={setFilterEstado}
        setPage={setPage}
      />

      <AreaDistribution
        conteoPorArea={conteoPorArea}
        rows={rows}
        maxArea={maxArea}
        filterDep={filterDep}
        setFilterDep={setFilterDep}
        setPage={setPage}
      />

      <div className="card">
        {/* ── Tabs rápidos de estado ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.val} onClick={() => { setFilterTab(t.val); setFilterEstado(''); setPage(1) }} style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
              border: filterTab === t.val ? '1.5px solid var(--primary)' : '0.5px solid var(--border)',
              color: filterTab === t.val ? '#fff' : 'var(--text-muted)',
              background: filterTab === t.val ? 'var(--primary)' : 'var(--surface, var(--bg))',
              fontWeight: filterTab === t.val ? 700 : 400, transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>

        <div className="filters-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control search-input"
              style={{ paddingLeft: 32 }}
              placeholder="Buscar por nombre, correo, área o cargo..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select className="form-control" style={{ flex: '0 0 160px' }} value={filterDep} onChange={e => { setFilterDep(e.target.value); setPage(1) }}>
            <option value="">Todas las áreas</option>
            {depsEnUso.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={13} style={{ color: 'var(--text-muted)' }} />
            <select className="form-control" style={{ flex: '0 0 180px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="nombre_asc">Nombre (A-Z)</option>
              <option value="area_asc">Área (A-Z)</option>
              <option value="reciente">Más reciente</option>
              <option value="mas_novedades">Más novedades</option>
            </select>
          </div>
          {hasFilter && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={13} /> Limpiar
            </button>
          )}
          <div style={{ display: 'flex', marginLeft: 'auto', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setVista('tarjetas')} title="Vista tarjetas" style={{ border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', background: vista === 'tarjetas' ? 'var(--card-bg, #fff)' : 'transparent', boxShadow: vista === 'tarjetas' ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
              <LayoutGrid size={14} style={{ color: vista === 'tarjetas' ? 'var(--primary)' : 'var(--text-muted)' }} />
            </button>
            <button onClick={() => setVista('tabla')} title="Vista tabla" style={{ border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', background: vista === 'tabla' ? 'var(--card-bg, #fff)' : 'transparent', boxShadow: vista === 'tabla' ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
              <List size={14} style={{ color: vista === 'tabla' ? 'var(--primary)' : 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, marginTop: 4 }}>
          {filtered.length} empleado{filtered.length !== 1 ? 's' : ''}{hasFilter ? ' filtrados' : ''} · Clic en tarjeta para ver historial
        </div>

        {loading ? (
          <div className="empty-state"><p>Cargando...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No hay empleados que coincidan.</p></div>
        ) : vista === 'tarjetas' ? (
          <>
            <EmpleadoCards
              paged={paged}
              novedadesPorEmpleado={novedadesPorEmpleado}
              periodosPorEmpleado={periodosPorEmpleado}
              vacacionesPorEmpleado={vacacionesPorEmpleado}
              procesosPorEmpleado={procesosPorEmpleado}
              onSelect={handleSelectEmp}
              openEdit={puedeEditar ? openEdit : null}
              onRetirar={puedeEditar ? setRetiroEmp : null}
              onReintegrar={puedeEditar ? setReintegroEmp : null}
              onLiquidar={puedeEditar ? setLiquidarEmp : null}
              onSustitucion={puedeEditar ? setSustitucionEmp : null}
              setDeleteId={puedeEditar ? setDeleteId : null}
            />
            {pagination}
          </>
        ) : (
          <>
            <EmpleadoTable
              paged={paged}
              novedadesPorEmpleado={novedadesPorEmpleado}
              periodosPorEmpleado={periodosPorEmpleado}
              vacacionesPorEmpleado={vacacionesPorEmpleado}
              procesosPorEmpleado={procesosPorEmpleado}
              onSelect={handleSelectEmp}
              openEdit={puedeEditar ? openEdit : null}
              onRetirar={puedeEditar ? setRetiroEmp : null}
              onReintegrar={puedeEditar ? setReintegroEmp : null}
              onLiquidar={puedeEditar ? setLiquidarEmp : null}
              onSustitucion={puedeEditar ? setSustitucionEmp : null}
              setDeleteId={puedeEditar ? setDeleteId : null}
            />
            {pagination}
          </>
        )}
      </div>

      {modal && (
        <EmpleadoFormModal
          modal={modal}
          form={form}
          setForm={setForm}
          f={f}
          onNombreChange={onNombreChange}
          duplicadoWarning={duplicadoWarning}
          saving={saving}
          save={save}
          msg={msg}
          onClose={() => setModal(null)}
        />
      )}

      {retiroEmp && (
        <ModalRetiroEmpleado
          emp={retiroEmp}
          onClose={() => setRetiroEmp(null)}
          onConfirm={handleConfirmRetiro}
          saving={actionSaving}
        />
      )}

      {reintegroEmp && (
        <ModalReintegroEmpleado
          emp={reintegroEmp}
          departamentos={depsEnUso}
          onClose={() => setReintegroEmp(null)}
          onConfirm={handleConfirmReintegro}
          saving={actionSaving}
        />
      )}

      {liquidarEmp && (
        <ModalLiquidarEmpleado
          emp={liquidarEmp}
          onClose={() => setLiquidarEmp(null)}
          onConfirm={handleConfirmLiquidacion}
          saving={actionSaving}
        />
      )}

      {sustitucionEmp && (
        <ModalSustitucionPatronal
          emp={sustitucionEmp}
          onClose={() => setSustitucionEmp(null)}
          onConfirm={handleConfirmSustitucion}
          saving={actionSaving}
        />
      )}

      <DeleteConfirmModal
        deleteId={deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        message="¿Eliminar este empleado permanentemente? Sus novedades no se eliminarán, pero dejará de aparecer en los formularios."
        tip={'Tip: si solo quieres que deje de aparecer como activo sin perder el registro, usa "Desactivar" en su lugar.'}
      />

      {selectedEmp && (
        <EmpleadoHistorialModal
          selectedEmp={selectedEmp}
          novedadesPorEmpleado={novedadesPorEmpleado}
          periodos={selectedEmp ? periodosPorEmpleado[selectedEmp.id] || [] : []}
          vacaciones={selectedEmp ? (vacacionesPorEmpleado[selectedEmp.id] || vacacionesPorEmpleado[normalizarNombre(selectedEmp.nombre_completo)] || []) : []}
          procesos={selectedEmp ? (procesosPorEmpleado[selectedEmp.id] || procesosPorEmpleado[normalizarNombre(selectedEmp.nombre_completo)] || []) : []}
          initialSection={historialSection}
          onClose={() => { setSelectedEmp(null); setHistorialSection(null) }}
          onEdit={() => { const e = selectedEmp; setSelectedEmp(null); setHistorialSection(null); openEdit(e) }}
          onReintegrar={setReintegroEmp}
          onLiquidar={setLiquidarEmp}
          onSustitucion={puedeEditar ? setSustitucionEmp : null}
        />
      )}
    </div>
  )
}