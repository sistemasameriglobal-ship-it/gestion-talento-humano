import { Edit2, Trash2, Eye, Calendar } from 'lucide-react'
import { diasHabilesEntre } from '../../utils/diasHabiles'
import { PAGE_SIZE } from '../../utils/vacacionesConstants'
import { formatFecha, formatoDias, formatoDiasTexto } from '../../utils/vacacionesHelpers'
import { EditableEstadoBadge, TipoBadge } from './Badges'
import Paginacion from '../ui/Paginacion'
import PersonCell from '../ui/PersonCell'

function SortIcon({ field, sortField, sortAsc }) {
  return (
    <span style={{ marginLeft: 4, opacity: sortField === field ? 1 : 0.3, fontSize: 10 }}>
      {sortField === field && !sortAsc ? '▼' : '▲'}
    </span>
  )
}

export default function VacacionesTabla({
  paged, filtered, page, totalPages, setPage,
  sortField, sortAsc, toggleSort,
  quickSaveEstado, openEdit, setViewRow, setDeleteId,
}) {
  return (
    <>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('nombre_empleado')} style={{ cursor: 'pointer' }}>Empleado <SortIcon field="nombre_empleado" sortField={sortField} sortAsc={sortAsc} /></th>
              <th onClick={() => toggleSort('fecha_ingreso')} style={{ cursor: 'pointer' }}>F. Ingreso <SortIcon field="fecha_ingreso" sortField={sortField} sortAsc={sortAsc} /></th>
              <th>Área</th>
              <th>Periodo</th>
              <th>Tipo</th>
              <th onClick={() => toggleSort('fecha_inicio')} style={{ cursor: 'pointer' }}>Inicio <SortIcon field="fecha_inicio" sortField={sortField} sortAsc={sortAsc} /></th>
              <th onClick={() => toggleSort('fecha_fin')} style={{ cursor: 'pointer' }}>Finaliza <SortIcon field="fecha_fin" sortField={sortField} sortAsc={sortAsc} /></th>
              <th onClick={() => toggleSort('total_dias')} style={{ cursor: 'pointer', textAlign: 'center' }}>Días Hábiles <SortIcon field="total_dias" sortField={sortField} sortAsc={sortAsc} /></th>
              <th style={{ textAlign: 'center' }}>En Dinero</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th>Obs. Contable</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => (
              <tr key={row.id} className="vac-row" style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}>
                <td style={{ maxWidth: 230 }}><PersonCell nombre={row.nombre_empleado} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{row.fecha_ingreso ? formatFecha(row.fecha_ingreso) : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.dependencia || '—'}</td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{row.periodo_vacaciones || '—'}</td>
                <td><TipoBadge tipo={row.tipo_vacacion} /></td>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} style={{ flexShrink: 0 }} /> {formatFecha(row.fecha_inicio)}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} style={{ flexShrink: 0 }} /> {formatFecha(row.fecha_fin)}</span>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#7C3AED' }}>
                  {row.total_dias != null && row.total_dias !== '' ? formatoDias(row.total_dias) : (row.fecha_inicio && row.fecha_fin ? formatoDias(diasHabilesEntre(row.fecha_inicio, row.fecha_fin)) : '—')}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {row.dias_en_dinero != null && row.dias_en_dinero !== '' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)' }}>
                      💰 {formatoDiasTexto(row.dias_en_dinero)}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ textAlign: 'center' }}><EditableEstadoBadge estado={row.estado} rowId={row.id} onSave={quickSaveEstado} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.observacion_contable || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" title="Ver detalle" onClick={() => setViewRow(row)}><Eye size={13} /></button>
                    {openEdit && <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><Edit2 size={13} /></button>}
                    {setDeleteId && <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => setDeleteId(row.id)}><Trash2 size={13} /></button>}
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
