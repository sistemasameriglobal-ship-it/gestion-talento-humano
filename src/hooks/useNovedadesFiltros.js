import { useMemo } from 'react'
import { hoyISO } from '../utils/fecha'
import { normalizarConcepto } from '../utils/parseExcel'
import { evaluarEstadoTemporalAusencia } from '../utils/diasHabiles'
import { PAGE_SIZE } from '../utils/novedadesConstants'

// Agrupa todo el cálculo derivado de la tabla de Novedades: opciones de
// filtro disponibles (años, dependencias), el rango de fechas cuando se
// filtra por año+mes, el filtrado + ordenamiento de las filas, y la
// paginación resultante. La página solo mantiene el estado crudo de los
// filtros/orden/página y se los pasa a este hook.
export function useNovedadesFiltros({
  rows,
  search, filterConcepto, filterPeriodo, filterDep, filterDiagnostico,
  filterAnio, filterMes, soloActivas,
  sortField, sortDir, setSortField, setSortDir,
  page, setPage,
}) {
  // Años disponibles
  const aniosDisponibles = useMemo(() =>
    [...new Set(rows.map(r => {
      if (r.fecha_inicio) return r.fecha_inicio.substring(0, 4)
      if (r.periodo) return r.periodo.substring(0, 4)
      return null
    }).filter(Boolean))].sort().reverse()
    , [rows])

  // Dependencias únicas en los datos
  const depsEnDatos = useMemo(() =>
    [...new Set(rows.map(r => r.dependencia).filter(Boolean))].sort()
    , [rows])

  const rangoMes = useMemo(() => {
    if (!filterAnio || !filterMes) return null
    const ini = `${filterAnio}-${filterMes}-01`
    const lastDay = new Date(parseInt(filterAnio), parseInt(filterMes), 0).getDate()
    const fin = `${filterAnio}-${filterMes}-${String(lastDay).padStart(2, '0')}`
    return { ini, fin, lastDay }
  }, [filterAnio, filterMes])

  // Filtrado
  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      const s = search.toLowerCase()
      const matchSearch = !s || r.nombre_empleado?.toLowerCase().includes(s) || r.concepto?.toLowerCase().includes(s) || r.dependencia?.toLowerCase().includes(s)

      // Concepto: comparar contra el valor raw (trim+lowercase) Y el normalizado
      const conceptoRow = (r.concepto || '').trim()
      const matchConcepto = !filterConcepto ||
        conceptoRow === filterConcepto ||
        conceptoRow.toLowerCase() === filterConcepto.toLowerCase() ||
        normalizarConcepto(r.concepto) === filterConcepto

      const matchPeriodo = !filterPeriodo || r.periodo === filterPeriodo
      const matchDep = !filterDep || r.dependencia === filterDep
      const matchDiagnostico = !filterDiagnostico || (r.diagnostico || '').toLowerCase().includes(filterDiagnostico.toLowerCase())

      const hoy = hoyISO()
      const matchActiva = !soloActivas || (!!r.fecha_inicio && evaluarEstadoTemporalAusencia(r, hoy)?.esActivaHoy === true)

      let matchFecha = true
      if (rangoMes) {
        // Si hay rango de mes: solo pasan registros con fecha_inicio dentro del rango
        // Los que no tienen fecha_inicio NO pasan (antes pasaban incorrectamente)
        if (!r.fecha_inicio) {
          matchFecha = false
        } else {
          matchFecha = r.fecha_inicio >= rangoMes.ini && r.fecha_inicio <= rangoMes.fin
        }
      } else if (filterAnio && !filterMes) {
        // Solo año: buscar en fecha_inicio O en periodo
        const enFecha = r.fecha_inicio?.startsWith(filterAnio)
        const enPeriodo = r.periodo?.startsWith(filterAnio)
        matchFecha = !!(enFecha || enPeriodo)
      }

      return matchSearch && matchConcepto && matchPeriodo && matchDep && matchDiagnostico && matchFecha && matchActiva
    })

    // Ordenar
    result = [...result].sort((a, b) => {
      let va = a[sortField] ?? ''
      let vb = b[sortField] ?? ''
      if (sortField === 'total_dias') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [rows, search, filterConcepto, filterPeriodo, filterDep, filterDiagnostico, filterAnio, filterMes, rangoMes, sortField, sortDir, soloActivas])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  return { aniosDisponibles, depsEnDatos, rangoMes, filtered, totalPages, paged, handleSort }
}
