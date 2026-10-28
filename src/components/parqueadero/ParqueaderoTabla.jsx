import { Eye, Edit2, Trash2, History } from 'lucide-react'
import { PAGE_SIZE } from '../../utils/parqueaderoConstants'
import { TipoBadge, ObsBadge } from './Badges'
import Paginacion from '../ui/Paginacion'
import PersonCell from '../ui/PersonCell'

export default function ParqueaderoTabla({
  paged, filtered, page, totalPages, setPage,
  setViewRow, setHistorial, openEdit, setDeleteId,
}) {
  return (
    <>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Empleado</th><th>Mes / Año</th><th>Placa / Marca</th>
              <th>Cédula</th><th>Teléfono</th>
              <th style={{ textAlign: 'center' }}>Tipo</th>
              <th>F. Ingreso</th><th>F. Retiro</th>
              <th style={{ textAlign: 'center' }}>Observación</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th>Nota vehículo</th>
              <th style={{ textAlign: 'center' }}>Envío Reporte</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => (
              <tr key={row.id} className="park-row" style={{
                animationDelay: `${Math.min(idx, 8) * 0.03}s`,
                '--row-bg': row.retirado ? 'var(--danger-bg)' : undefined,
                borderLeft: row.retirado ? '4px solid #DC2626' : '4px solid transparent',
              }}>
                <td style={{ maxWidth: 230 }}>
                  <PersonCell
                    nombre={row.nombre_empleado}
                    sub={!row.empleado_id ? 'Persona externa' : undefined}
                    color={row.retirado ? '#DC2626' : undefined}
                  />
                </td>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{[row.mes, row.anio].filter(Boolean).join(' ') || '—'}</td>
                <td style={{ fontFamily: row.tipo === 'BICICLETA' ? 'inherit' : 'monospace', fontWeight: 700, letterSpacing: row.tipo === 'BICICLETA' ? 'normal' : '0.05em' }}>{row.placa || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{row.cedula || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{row.telefono || '—'}</td>
                <td style={{ textAlign: 'center' }}>{row.tipo ? <TipoBadge tipo={row.tipo} /> : '—'}</td>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.fecha_ingreso || '—'}</td>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.fecha_retiro || '—'}</td>
                <td style={{ textAlign: 'center' }}><ObsBadge obs={row.observacion} /></td>
                <td style={{ textAlign: 'center' }}>
                  {row.retirado
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: '#DC2626', color: '#fff', lineHeight: 1 }}><span style={{ fontSize: 8 }}>●</span>RETIRADO</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)' }}>✓ Activo</span>}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.nota_vehiculo || ''}>{row.nota_vehiculo || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  {row.fecha_envio_reporte ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid color-mix(in srgb, var(--info) 35%, transparent)' }}>
                      📤 {row.fecha_envio_reporte.split('T')[0]}
                    </span>
                  ) : <span style={{ color: 'color-mix(in srgb, var(--warning) 40%, transparent)', fontSize: 12, fontWeight: 600 }}>● Pendiente</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" title="Ver detalle" onClick={() => setViewRow(row)}><Eye size={13} /></button>
                    <button className="icon-btn" title="Historial" onClick={() => setHistorial(row)}><History size={13} /></button>
                    <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><Edit2 size={13} /></button>
                    <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDeleteId(row.id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion total={filtered.length} page={page} totalPages={totalPages} onChange={setPage} info={`Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`} />
    </>
  )
}
