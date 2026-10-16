import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

function formatDMY(iso) {
  if (!iso) return '—'
  const clean = String(iso).trim().slice(0, 10)
  const parts = clean.split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : clean
}

function CustomDonutTooltip({ active, payload, total }) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]?.payload
  if (!item) return null
  const pct = total ? Math.round((item.value / total) * 100) : 0
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 12.5 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: item.color }} />
          {item.name}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: item.color }}>
          {item.value} reg. ({pct}%)
        </span>
      </div>
      {filas.slice(0, 4).map((r, idx) => (
        <div key={r.id || idx} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 0', borderTop: idx === 0 ? '1px solid var(--border)' : 'none' }}>
          <strong style={{ color: 'var(--text)' }}>{r.nombre_empleado || '—'}</strong>
          {' • '}{r.dependencia || 'Sin área'}
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

// ── Donut de distribución por concepto (Recharts, clic para ver desglose) ────
export default function ConceptoDonut({ data, colors, activeConcepto, onSliceClick }) {
  const items = useMemo(() => data.map(([concepto, cantidad]) => ({
    name: concepto,
    value: cantidad,
    color: colors[concepto]?.color || '#6366F1',
    filas: colors[concepto]?.filas || [],
  })), [data, colors])

  const total = items.reduce((s, i) => s + i.value, 0)

  if (items.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos</p>

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart margin={{ top: 16, right: 36, bottom: 16, left: 36 }}>
          <Pie
            data={items}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="75%"
            paddingAngle={2}
            animationDuration={500}
            cursor={onSliceClick ? 'pointer' : 'default'}
            onClick={onSliceClick ? (entry) => onSliceClick(entry.name) : undefined}
            label={({ cx, cy, midAngle, outerRadius, value, name }) => {
              const RADIAN = Math.PI / 180
              const r = outerRadius + 16
              const x = cx + r * Math.cos(-midAngle * RADIAN)
              const y = cy + r * Math.sin(-midAngle * RADIAN)
              const pct = total ? Math.round((value / total) * 100) : 0
              return (
                <text
                  x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
                  style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text)' }}
                  opacity={!activeConcepto || activeConcepto === name ? 1 : 0.45}
                >
                  {value} ({pct}%)
                </text>
              )
            }}
            labelLine={{ stroke: 'var(--border)' }}
          >
            {items.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.color}
                opacity={!activeConcepto || activeConcepto === entry.name ? 1 : 0.35}
                stroke="var(--card-bg)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomDonutTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Total al centro del donut */}
      <div style={{
        position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{total}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>total</div>
      </div>
      {/* Leyenda clickeable */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        {items.map(entry => (
          <button
            key={entry.name}
            type="button"
            onClick={() => onSliceClick && onSliceClick(entry.name)}
            title="Clic para ver los colaboradores de este concepto"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
              cursor: onSliceClick ? 'pointer' : 'default',
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--bg)', border: `1px solid ${activeConcepto === entry.name ? entry.color : 'var(--border)'}`,
              color: 'var(--text)',
              transition: 'all .15s ease',
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{entry.name}</span>
            <strong style={{ color: 'var(--text)' }}>{entry.value}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}
