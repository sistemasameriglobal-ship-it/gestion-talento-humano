// =============================================================
// src/components/ui/KpiCard.jsx
// -------------------------------------------------------------
// Tarjeta KPI con el mismo diseño de Productividad (etiqueta en
// mayúsculas, valor grande, detalle y acento en la esquina).
// Sustituye las tarjetas hechas a mano de cada módulo.
//
//   <KpiGrid>
//     <KpiCard label="Activos" value={21} sub="87% del total"
//              tone="success" icon={User} onClick={...} active />
//   </KpiGrid>
//
// tone: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple'
// =============================================================
import { memo } from 'react'
import './ui.css'

const TONOS = {
  success: 'var(--success)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--info)',
  purple: 'var(--purple)',
}

export function KpiGrid({ children, min = 170, style }) {
  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, ...style }}>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, tone = 'default', onClick, active = false, title }) {
  const color = TONOS[tone]
  return (
    <div
      className={`kpi-card${onClick ? ' kpi-card--click' : ''}${active ? ' kpi-card--active' : ''}`}
      style={color ? { '--kpi-color': color } : undefined}
      onClick={onClick}
      title={title}
    >
      <div className="kpi-accent" />
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {(sub || Icon) && (
        <span className="kpi-sub">
          {Icon && <Icon size={12} />}
          {sub}
        </span>
      )}
    </div>
  )
}

export default memo(KpiCard)
