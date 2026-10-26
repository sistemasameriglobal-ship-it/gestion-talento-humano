import { colorPct } from '../../utils/productividadHelpers'

export default function PctBar({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const color = colorPct(v)
  return (
    <div
      className="ci-pct-cell"
      title={`Resolución: ${Number(value) || 0}% · Meta: 40% (${v >= 40 ? 'Cumple' : 'Bajo meta'})`}
    >
      <div className="ci-pct-bar" style={{ width: `${v}%`, background: color }} />
      <span className="ci-pct-text" style={{ color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {Number(value) || 0}%
        {v >= 40 && <span style={{ fontSize: 9, opacity: .9 }}>✓</span>}
      </span>
    </div>
  )
}
