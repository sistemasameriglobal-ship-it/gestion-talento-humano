import { useMemo } from 'react'
import {
  BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'

function formatDMY(iso) {
  if (!iso) return '—'
  const clean = String(iso).trim().slice(0, 10)
  const parts = clean.split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : clean
}

function CustomBarTooltip({ active, payload, totalAll, color }) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]?.payload
  if (!item) return null
  const pct = totalAll ? Math.round((item.count / totalAll) * 100) : 0
  const filas = item.filas || []

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '10px 12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      color: 'var(--text)',
      maxWidth: 320,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: filas.length ? 6 : 0 }}>
        <span style={{ fontWeight: 800, fontSize: 12.5 }}>{item.label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color }}>
          {item.count} reg. ({pct}%)
        </span>
      </div>
      {filas.slice(0, 4).map((r, idx) => (
        <div key={r.id || idx} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 0', borderTop: idx === 0 ? '1px solid var(--border)' : 'none' }}>
          <strong style={{ color: 'var(--text)' }}>{r.nombre_empleado || '—'}</strong>
          {' • '}{r.conceptoNorm || r.concepto || 'Novedad'}
          {r.fecha_inicio ? ` • desde ${formatDMY(r.fecha_inicio)}` : ''}
        </div>
      ))}
      {filas.length > 4 && (
        <div style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600, marginTop: 3 }}>
          + {filas.length - 4} más... (clic para ver todos)
        </div>
      )}
      {filas.length > 0 && filas.length <= 4 && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
          Clic para abrir el detalle de colaboradores
        </div>
      )}
    </div>
  )
}

// ── Bar chart interactivo (Recharts) ───────────────────────────────────────
export default function BarChart({ items, detallesPorItem = {}, color = '#3B82F6', maxItems = 8, onBarClick, activeLabel }) {
  const top = useMemo(() => items.slice(0, maxItems).map(([label, count]) => ({
    label,
    count,
    filas: detallesPorItem[label] || [],
  })), [items, maxItems, detallesPorItem])
  const totalAll = useMemo(() => items.reduce((s, [, c]) => s + c, 0), [items])

  if (top.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos</p>
  }

  const rowH = 32
  const height = Math.max(top.length * rowH, 64)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={top} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category" dataKey="label" width={130}
          tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
          content={<CustomBarTooltip totalAll={totalAll} color={color} />}
        />
        <Bar
          dataKey="count" radius={[0, 6, 6, 0]} animationDuration={500}
          cursor={onBarClick ? 'pointer' : 'default'}
          activeBar={{ fillOpacity: 0.85, stroke: color, strokeWidth: 1 }}
          onClick={onBarClick ? (entry) => onBarClick(entry.label) : undefined}
        >
          {top.map((entry) => (
            <Cell
              key={entry.label}
              fill={color}
              opacity={!activeLabel || activeLabel === entry.label ? 1 : 0.35}
            />
          ))}
          <LabelList
            dataKey="count" position="right"
            style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text)' }}
          />
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  )
}
