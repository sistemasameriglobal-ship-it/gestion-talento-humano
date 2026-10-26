// =============================================================
// src/utils/productividadExport.js
// -------------------------------------------------------------
// Excel de Productividad para departamentos con Clientes Asignados /
// Clientes Resueltos (Ventas, UW-BS). Dos hojas: consolidado del año y
// detalle mes a mes. El % de resolución siempre es resueltos ÷ asignados.
// =============================================================
import { crearLibro, crearHoja, descargarWorkbook } from './exportarExcel'
import { MESES_FULL } from './productividadConstants'
import { fmtFecha, calcPct } from './productividadHelpers'

export async function exportarProductividadClientesExcel({ cfg, anio, filas }) {
  const wb = await crearLibro()

  // 1. Consolidado anual por persona
  const consolidado = filas.map(v => ({
    'Posición': v.rank,
    [cfg.personaLabel]: v.nombre,
    'Cargo': v.cargo || '—',
    'Fecha Ingreso': fmtFecha(v.ingreso),
    'Clientes Asignados': v.totalAsignados,
    'Clientes Resueltos': v.totalResueltos,
    '% Resolución (Meta 40%)': `${v.pct}%`,
    'Clientes en Frío': v.totalFrios || 0,
    'Total Resueltos (General)': v.totalResueltosGeneral || (v.totalResueltos + (v.totalFrios || 0)),
    'Procesos Disciplinarios': v.procesos?.length || 0,
  }))
  await crearHoja(wb, `Consolidado ${anio}`, consolidado, {
    titulo: `Productividad — ${cfg.tabLabel} · Consolidado ${anio}`,
    anchosColumnas: [10, 28, 22, 16, 18, 18, 16, 18, 20, 22],
    marca: true,
  })

  // 2. Detalle mensual (una fila por persona + mes con datos)
  const detalle = []
  MESES_FULL.forEach((mes, i) => {
    filas.forEach(v => {
      const asig = v.asignados?.[i] || 0
      const resu = v.resueltos?.[i] || 0
      const fr = v.frios?.[i] || 0
      const totalGen = resu + fr
      if (!asig && !resu && !fr) return
      detalle.push({
        'Año': anio,
        'Mes': mes,
        [cfg.personaLabel]: v.nombre,
        'Cargo': v.cargo || '—',
        'Clientes Asignados': asig,
        'Clientes Resueltos': resu,
        '% Resolución (Meta 40%)': asig > 0 ? `${calcPct(resu, asig)}%` : '—',
        'Clientes en Frío': fr,
        'Total Resueltos': totalGen,
      })
    })
  })
  if (detalle.length > 0) {
    await crearHoja(wb, `Detalle Mensual ${anio}`, detalle, {
      titulo: `Productividad — ${cfg.tabLabel} · Detalle mensual ${anio}`,
      anchosColumnas: [8, 14, 28, 22, 18, 18, 16, 18, 18],
      marca: true,
    })
  }

  const hoy = new Date().toISOString().slice(0, 10)
  await descargarWorkbook(wb, `Productividad_${cfg.tabLabel}_${anio}_${hoy}.xlsx`)
}
