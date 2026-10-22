import { Edit2, Trash2, Eye, Calendar } from 'lucide-react'
import { diasHabilesEntre } from '../../utils/diasHabiles'
import { PAGE_SIZE, ESTADO_STYLES } from '../../utils/vacacionesConstants'
import { formatFecha, formatoDias, formatoDiasTexto } from '../../utils/vacacionesHelpers'
import { EditableEstadoBadge, TipoBadge } from './Badges'
import Paginacion from '../ui/Paginacion'

export default function VacacionesCards({
  paged, filtered, page, totalPages, setPage,
  quickSaveEstado, openEdit, setViewRow, setDeleteId,
  onSelectEmpleado,
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12, paddingTop: 4 }}>
        {paged.map((row, idx) => {
          const estadoStyle = ESTADO_STYLES[row.estado] || ESTADO_STYLES['Pendiente']
          const habiles = row.total_dias != null && row.total_dias !== '' ? row.total_dias : (row.fecha_inicio && row.fecha_fin ? diasHabilesEntre(row.fecha_inicio, row.fecha_fin) : null)
          return (
            <div key={row.id} className="vac-card" style={{
              animationDelay: `${Math.min(idx, 8) * 0.04}s`,
              background: 'var(--surface)', borderRadius: 12,
              border: `1px solid ${estadoStyle.border}`,
              overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s',
            }}>

              {/* Franja de color de estado */}
              <div style={{ height: 4, background: estadoStyle.border }} />

              {/* Header */}
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEmpleado?.(row.empleado_id || row.nombre_empleado)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        onSelectEmpleado?.(row.empleado_id || row.nombre_empleado)
                      }
                    }}
                    style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}
                    className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors text-left"
                    title={`Ver expediente de ${row.nombre_empleado || 'empleado'}`}
                  >
                    {row.nombre_empleado}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TipoBadge tipo={row.tipo_vacacion} />
                    <EditableEstadoBadge estado={row.estado} rowId={row.id} onSave={quickSaveEstado} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" title="Ver detalle" onClick={() => setViewRow(row)}><Eye size={12} /></button>
                  {openEdit && <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><Edit2 size={12} /></button>}
                  {setDeleteId && <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDeleteId(row.id)}><Trash2 size={12} /></button>}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '10px 14px' }}>
                {/* Fechas */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {row.fecha_inicio && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />
                      {formatFecha(row.fecha_inicio)}{row.fecha_fin ? ` → ${formatFecha(row.fecha_fin)}` : ''}
                    </span>
                  )}
                  {habiles != null && (
                    <span style={{ background: '#F5F3FF', color: '#7C3AED', borderRadius: 999, padding: '1px 8px', fontWeight: 700, fontSize: 11, marginLeft: 'auto' }}>
                      {formatoDias(habiles)}
                    </span>
                  )}
                </div>

                {/* Info secundaria */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {row.dependencia && <span>📍 {row.dependencia}</span>}
                  {row.periodo_vacaciones && <span>📆 {row.periodo_vacaciones}</span>}
                  {row.aprobado_por && <span>✔ {row.aprobado_por}</span>}
                </div>

                {/* Días en dinero */}
                {row.dias_en_dinero != null && row.dias_en_dinero !== '' && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
                    borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, marginBottom: 8,
                  }}>
                    💰 {formatoDiasTexto(row.dias_en_dinero)} en dinero
                  </div>
                )}

                {/* Observación contable */}
                {row.observacion_contable && (
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
                    background: 'var(--bg)', borderRadius: 6, padding: '5px 8px',
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {row.observacion_contable}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Paginacion total={filtered.length} page={page} totalPages={totalPages} onChange={setPage} info={`Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`} />
    </>
  )
}
