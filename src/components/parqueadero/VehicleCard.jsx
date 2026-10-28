import { Eye, Edit2, Trash2 } from 'lucide-react'

export default function VehicleCard({ row, idx, onView, onEdit, onDelete, onHistorial }) {
  const isCarro = row.tipo === 'CARRO'
  const isBici = row.tipo === 'BICICLETA'
  const isExento = row.observacion === 'EXENTOS DE PAGO'
  const hasReporte = !!row.fecha_envio_reporte
  return (
    <div className="park-card" style={{
      animationDelay: `${Math.min(idx, 8) * 0.04}s`,
      background: row.retirado ? 'var(--danger-bg)' : 'var(--surface)', borderRadius: 14,
      border: `${row.retirado ? '2px solid #DC2626' : '1px solid ' + (isExento ? 'color-mix(in srgb, var(--success) 35%, transparent)' : 'var(--border)')}`,
      overflow: 'hidden', transition: 'box-shadow .18s, transform .18s',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Franja tipo */}
      <div style={{ height: 4, background: row.retirado ? '#DC2626' : (isCarro ? '#3B82F6' : isBici ? '#10B981' : '#F59E0B') }} />

      <div style={{ padding: '14px 16px', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0, fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isCarro ? 'var(--info-bg)' : isBici ? '#D1FAE5' : 'var(--warning-bg)',
            }}>{isCarro ? '🚗' : isBici ? '🚲' : '🏍'}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.nombre_empleado}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isCarro ? 'var(--info-text)' : isBici ? '#047857' : 'var(--warning-text)', letterSpacing: isBici ? 'normal' : '0.06em', fontFamily: isBici ? 'inherit' : 'monospace' }}>
                  {row.placa || '—'}
                </span>
                {!row.empleado_id && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#D97706', background: 'rgba(217,119,6,0.12)', padding: '1px 6px', borderRadius: 20 }}>
                    Externo
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" title="Ver" onClick={() => onView(row)}><Eye size={12} /></button>
            <button className="btn btn-ghost btn-sm" title="Historial" onClick={() => onHistorial(row)} style={{ fontSize: 11, padding: '3px 6px' }}>📋</button>
            <button className="icon-btn" title="Editar" onClick={() => onEdit(row)}><Edit2 size={12} /></button>
            <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => onDelete(row.id)}><Trash2 size={12} /></button>
          </div>
        </div>

        {/* Info pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {row.mes && row.anio && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              📅 {row.mes} {row.anio}
            </span>
          )}
          {isExento && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)' }}>✓ Exento</span>
          )}
          {row.retirado && (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', lineHeight: 1 }}><span style={{ fontSize: 8 }}>●</span>Retirado</span>
          )}
        </div>

        {/* Fechas */}
        {(row.fecha_ingreso || row.fecha_retiro) && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, marginBottom: 8 }}>
            {row.fecha_ingreso && <span>↘ Ingreso: <strong>{row.fecha_ingreso}</strong></span>}
            {row.fecha_retiro && <span>↗ Retiro: <strong>{row.fecha_retiro}</strong></span>}
          </div>
        )}

        {/* Datos contacto */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {row.cedula && <span>🪪 {row.cedula}</span>}
          {row.telefono && <span>📱 {row.telefono}</span>}
        </div>
      </div>

      {/* Footer reporte */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid var(--border)',
        background: hasReporte ? 'var(--info-bg)' : 'var(--bg)',
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
      }}>
        {hasReporte ? (
          <>
            <span style={{ fontSize: 13 }}>📤</span>
            <span style={{ color: '#3730A3', fontWeight: 600 }}>Enviado {row.fecha_envio_reporte.split('T')[0]}</span>
          </>
        ) : (
          <>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: 'var(--warning-text)', fontWeight: 500 }}>Reporte pendiente</span>
          </>
        )}
      </div>
    </div>
  )
}
