// =============================================================
// src/components/colaboradores/ColaboradorKpis.jsx
// -------------------------------------------------------------
// Tarjetas KPI globales de Colaboradores:
// Incluye Novedades, Procesos Disciplinarios, Vacaciones y Parqueadero.
// =============================================================
import './colaboradores.css'
import { Users, ClipboardList, AlertTriangle, Stethoscope, Percent, Scale, Palmtree, Car } from 'lucide-react'
import KpiCard, { KpiGrid } from '../ui/KpiCard'

const KPIS = [
  { label: 'Total colaboradores', icon: Users, tone: 'info', sub: 'registrados', key: 'total', val: k => k.total },
  { label: 'Con novedades', icon: ClipboardList, tone: 'purple', sub: 'tienen historial', val: k => k.conNovedades, filtro: 'con_novedades' },
  { label: 'Reincidentes', icon: AlertTriangle, tone: 'danger', sub: '≥2 incapacidades', val: k => k.reincidentes, filtro: 'reincidente' },
  { label: 'Días incapacidad', icon: Stethoscope, tone: 'warning', sub: 'días acumulados', val: k => k.totalDiasInc.toFixed(0) },
  { label: 'Tasa ausentismo', icon: Percent, tone: 'info', sub: 'promedio', val: k => `${k.tasaAusentismoProm.toFixed(1)}%` },
  { label: 'Procesos disciplinarios', icon: Scale, tone: 'danger', sub: k => `${k.totalProcesosDisciplinarios} proceso${k.totalProcesosDisciplinarios !== 1 ? 's' : ''} en total`, val: k => k.conProcesosDisciplinarios, filtro: 'con_pd' },
  { label: 'Con vacaciones', icon: Palmtree, tone: 'purple', sub: 'activas o historial', val: k => k.conVacaciones || 0, filtro: 'con_vacaciones' },
  { label: 'Con parqueadero', icon: Car, tone: 'info', sub: 'cupo / vehículo', val: k => k.conParqueadero || 0, filtro: 'con_parqueadero' },
]

export default function ColaboradorKpis({ kpis, filterEstado, setFilterEstado, setPage }) {
  return (
    <KpiGrid min={140}>
      {KPIS.map(k => {
        const onClick = k.filtro
          ? () => { setFilterEstado(filterEstado === k.filtro ? '' : k.filtro); setPage(1) }
          : undefined
        return (
          <KpiCard
            key={k.label}
            label={k.label}
            value={String(k.val(kpis))}
            sub={typeof k.sub === 'function' ? k.sub(kpis) : k.sub}
            icon={k.icon}
            tone={k.tone}
            onClick={onClick}
            active={Boolean(k.filtro && filterEstado === k.filtro)}
          />
        )
      })}
    </KpiGrid>
  )
}
