export function TipoBadge({ tipo }) {
  const isCarro = tipo === 'CARRO'
  const isBici = tipo === 'BICICLETA'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: isCarro ? 'var(--info-bg)' : isBici ? '#D1FAE5' : 'var(--warning-bg)',
      color: isCarro ? 'var(--info-text)' : isBici ? '#047857' : 'var(--warning-text)',
      border: isCarro ? '1px solid color-mix(in srgb, var(--info) 35%, transparent)' : isBici ? '1px solid #6EE7B7' : '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
    }}>{isCarro ? '🚗' : isBici ? '🚲' : '🏍'} {tipo}</span>
  )
}

export function ObsBadge({ obs }) {
  if (!obs) return <span style={{ color: '#D1D5DB' }}>—</span>
  if (obs === 'EXENTOS DE PAGO') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)' }}>✓ Exento</span>
  )
  return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{obs}</span>
}
