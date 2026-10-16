import { crearLibro, crearHoja, descargarWorkbook } from './exportarExcel'

// Exporta el Dashboard a un workbook de 5 hojas: datos completos filtrados,
// resumen por concepto, novedades por área, tendencia mensual y resumen general.
export async function exportarDashboardExcel({ data, stats, hasFilter, filterAnio, filterMeses, filterPeriodo, filterConcepto, empresaNombre = 'AmeriGlobal' }) {
  const wb = await crearLibro()

  // Hoja 1: Datos completos filtrados
  await crearHoja(wb, 'Novedades', data.map(r => ({
    'Empleado': r.nombre_empleado, 'Concepto': r.concepto, 'Periodo': r.periodo,
    'Fecha Inicio': r.fecha_inicio, 'Fecha Fin': r.fecha_fin, 'Total Días': r.total_dias,
    'Dependencia': r.dependencia, 'Válid. Incapacidad': r.validacion_incapacidad,
    'Prórroga': r.prorroga, 'Rad. Incapacidades': r.radicacion_incapacidad,
    'Obs. Contabilidad': r.observacion_contabilidad, 'Nómina Electrónica': r.nomina_electronica,
    'Seguridad Social': r.seguridad_social, 'Observación': r.observacion,
  })), { anchosColumnas: [30, 18, 12, 14, 14, 10, 22, 18, 10, 18, 18, 18, 16, 30], titulo: 'Novedades' })

  // Hoja 2: Resumen por concepto
  await crearHoja(wb, 'Por Concepto',
    stats.conceptosOrdenados.map(([concepto, cantidad]) => {
      const d = stats.porConceptoDetalle[concepto] || {}
      return {
        Concepto: concepto, Cantidad: cantidad,
        'Total Días': Math.round(d.totalDias || 0),
        'Prom. Días': (d.promDias || 0).toFixed(1),
        'Colaboradores': d.empUnicos || 0,
        'Con Prórroga': d.conProrroga || 0,
        'Reincidentes': d.reincidentes?.length || 0,
      }
    }),
    { anchosColumnas: [22, 10, 12, 12, 14, 12, 12], titulo: 'Resumen por concepto' }
  )

  // Hoja 3: Novedades por área
  await crearHoja(wb, 'Por Área',
    stats.depTodosOrdenadas.map(([area, cantidad]) => ({ 'Área / Dependencia': area, 'Novedades': cantidad })),
    { anchosColumnas: [26, 14], titulo: 'Novedades por área' }
  )

  // Hoja 4: Tendencia mensual
  await crearHoja(wb, 'Tendencia Mensual',
    stats.tendencia.map(([mes, cantidad]) => ({ 'Mes': mes, 'Novedades': cantidad })),
    { anchosColumnas: [12, 12], titulo: 'Tendencia mensual' }
  )

  // Hoja 5: Resumen general
  const resumen = [
    { Métrica: 'Total novedades', Valor: stats.total },
    { Métrica: 'Colaboradores únicos (con alguna novedad)', Valor: stats.empleadosUnicos },
    { Métrica: 'Colaboradores activos en el período (base de la tasa)', Valor: stats.empleadosUnicosBase },
    { Métrica: 'Días de ausencia (sin vacaciones)', Valor: Math.round(stats.diasAusentismoTotal) },
    { Métrica: 'Tasa de ausentismo (%)', Valor: stats.tasaAusentismoGlobal.toFixed(1) },
    ...stats.conceptosPresentes.map(c => {
      const d = stats.porConceptoDetalle[c]
      return { Métrica: `${c} — cantidad`, Valor: d.count }
    }),
    { Métrica: 'Filtro aplicado', Valor: hasFilter ? `Año:${filterAnio||'todos'} Mes:${filterMeses.length ? filterMeses.join(',') : 'todos'} Periodo:${filterPeriodo||'todos'} Concepto:${filterConcepto||'todos'}` : 'Sin filtro' },
  ]
  await crearHoja(wb, 'Resumen General', resumen, { anchosColumnas: [36, 20], titulo: 'Resumen general' })

  const label = filterAnio && filterMeses.length ? `${filterAnio}-${filterMeses.join('_')}` : filterAnio || filterPeriodo || 'todos'
  const cleanName = empresaNombre.replace(/[^a-zA-Z0-9_-]/g, '_')
  await descargarWorkbook(wb, `${cleanName}_Dashboard_${label}.xlsx`)
}