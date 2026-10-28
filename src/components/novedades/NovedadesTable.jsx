import { Eye, Edit2, Trash2 } from 'lucide-react'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { hoyISO } from '../../utils/fecha'
import { diasHabilesEntre, evaluarEstadoTemporalAusencia } from '../../utils/diasHabiles'
import { PAGE_SIZE } from '../../utils/novedadesConstants'
import { EditablePill, EditableDiagnostico, SortIcon, IncompleteIndicator } from './Pills'
import Paginacion from '../ui/Paginacion'
import PersonCell from '../ui/PersonCell'

// Cabecera de columna ordenable
function Th({ field, children, style = {}, sortField, sortDir, onSort }) {
  return (
    <th
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  )
}

export default function NovedadesTable({
  loading, filtered, paged, page, totalPages,
  sortField, sortDir, onSort,
  highlightId, soloActivas,
  quickSave, onView, onEdit, onDelete,
  setPage,
}) {
  if (loading) {
    return <div className="empty-state"><p>Cargando...</p></div>
  }
  if (filtered.length === 0) {
    return <div className="empty-state"><p>No hay registros que coincidan.</p></div>
  }

  return (
    <>
      <div className="table-container table-container--tall">
        <table>
          <thead>
            <tr>
              <Th field="nombre_empleado" sortField={sortField} sortDir={sortDir} onSort={onSort}>Empleado</Th>
              <Th field="concepto" sortField={sortField} sortDir={sortDir} onSort={onSort}>Concepto</Th>
              <Th field="fecha_inicio" sortField={sortField} sortDir={sortDir} onSort={onSort}>Inicio</Th>
              <Th field="fecha_fin" sortField={sortField} sortDir={sortDir} onSort={onSort}>Fin</Th>
              <Th field="total_dias" style={{ textAlign: 'center' }} sortField={sortField} sortDir={sortDir} onSort={onSort}>Días</Th>
              <Th field="dependencia" sortField={sortField} sortDir={sortDir} onSort={onSort}>Cargo / Área</Th>
              <Th field="periodo" sortField={sortField} sortDir={sortDir} onSort={onSort}>Periodo</Th>
              <th style={{ minWidth: 80 }}>Diag.</th>
              <th style={{ textAlign: 'center', minWidth: 80, borderLeft: '2px solid var(--border)' }}>Válid. Inc.</th>
              <th style={{ textAlign: 'center', minWidth: 70 }}>Prórroga</th>
              <th style={{ textAlign: 'center', minWidth: 70 }}>Rad. Inc.</th>
              <th style={{ textAlign: 'center', minWidth: 70 }}>Obs. Cont.</th>
              <th style={{ textAlign: 'center', minWidth: 70 }}>Nómina E.</th>
              <th style={{ textAlign: 'center', minWidth: 70 }}>Seg. Soc.</th>
              <th style={{ minWidth: 160 }}>Observación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => {
              const tipo = normalizarConcepto(row.concepto)
              const color = CONCEPTO_COLORS[tipo] || '#374151'
              return (
                <tr
                  key={row.id}
                  className={`nv-anim-row${row.id === highlightId ? ' nv-row-highlight' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
                >
                  <td style={{ maxWidth: 230 }}>
                    <PersonCell nombre={row.nombre_empleado} sub={row.cargo}>
                      <IncompleteIndicator row={row} />
                    </PersonCell>
                  </td>
                  <td>
                    <span className="badge tag-c" style={{ '--tag': color }}>{row.concepto}</span>
                    {row.jornada === 'Medio día' && (
                      <span title="Medio día" style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: 'var(--warning-text)', background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)', borderRadius: 999, padding: '1px 6px', whiteSpace: 'nowrap' }}>🕐 ½ día</span>
                    )}
                    {row.dias_en_dinero != null && Number(row.dias_en_dinero) > 0 && (
                      <span
                        title={`${row.dias_en_dinero} días solicitados en dinero (compensación económica)`}
                        style={{
                          marginLeft: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#0369a1',
                          background: '#e0f2fe',
                          border: '1px solid #bae6fd',
                          borderRadius: 999,
                          padding: '1px 7px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        💰 {row.dias_en_dinero}d dinero
                      </span>
                    )}
                    {soloActivas && row.fecha_inicio && (() => {
                      const estadoTemp = evaluarEstadoTemporalAusencia(row, hoyISO())
                      if (!estadoTemp) return null
                      const esActiva = estadoTemp.esActivaHoy
                      return (
                        <span style={{
                          marginLeft: 5, display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontWeight: 700,
                          color: esActiva ? '#DC2626' : '#2563EB',
                          background: esActiva ? 'rgba(220, 38, 38, 0.12)' : 'rgba(37, 99, 235, 0.1)',
                          border: `1px solid ${esActiva ? 'rgba(220, 38, 38, 0.35)' : 'rgba(37, 99, 235, 0.3)'}`,
                          borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: esActiva ? '#DC2626' : '#2563EB' }} />
                          {estadoTemp.badgeTexto}
                        </span>
                      )
                    })()}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12.5 }}>{row.fecha_inicio || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12.5 }}>{row.fecha_fin || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {row.dias_en_periodo != null && row.total_dias != null && Number(row.dias_en_periodo) !== Number(row.total_dias) ? (
                        <div title={`Novedad de ${row.total_dias} días totales. ${row.dias_en_periodo} días corresponden al mes filtrado.`}>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{row.dias_en_periodo}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 3 }}>/ {row.total_dias}d</span>
                        </div>
                      ) : (
                        Number(row.total_dias) === 0.5 || row.jornada === 'Medio día' ? '0.5 (½)' : (row.total_dias ?? '—')
                      )}
                    </div>
                    {row.dias_en_dinero != null && Number(row.dias_en_dinero) > 0 && (() => {
                      const dDisfrute = row.dias_disfrutados != null && row.dias_disfrutados !== ''
                        ? Number(row.dias_disfrutados)
                        : (row.fecha_inicio && row.fecha_fin
                            ? diasHabilesEntre(row.fecha_inicio, row.fecha_fin)
                            : Math.max(0, Number(row.total_dias || 0) - Number(row.dias_en_dinero)))
                      return (
                        <div
                          title={`Desglose: ${dDisfrute} días disfrute físico + ${row.dias_en_dinero} días en dinero`}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#0369a1',
                            background: '#f0f9ff',
                            border: '1px solid #e0f2fe',
                            borderRadius: 4,
                            padding: '1px 5px',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}
                        >
                          {dDisfrute > 0 ? `${dDisfrute}d disfrute + ${row.dias_en_dinero}d dinero` : `${row.dias_en_dinero}d dinero`}
                        </div>
                      )
                    })()}
                  </td>
                  <td
                    style={{ color: 'var(--text-muted)', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={row.cargo && row.dependencia ? `${row.cargo} - ${row.dependencia}` : (row.cargo || row.dependencia || '')}
                  >
                    {row.cargo && row.dependencia ? (
                      <span>
                        <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{row.cargo}</strong>
                        <span style={{ opacity: 0.75 }}> - {row.dependencia}</span>
                      </span>
                    ) : (
                      row.cargo || row.dependencia || '—'
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12.5 }}>{row.periodo || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <EditableDiagnostico
                      value={row.diagnostico}
                      rowId={row.id}
                      onSave={quickSave}
                    />
                  </td>
                  <td style={{ textAlign: 'center', borderLeft: '2px solid var(--border)' }}>
                    <EditablePill field="validacion_incapacidad" value={row.validacion_incapacidad} rowId={row.id} onSave={quickSave} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <EditablePill field="prorroga" value={row.prorroga} rowId={row.id} onSave={quickSave} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <EditablePill field="radicacion_incapacidad" value={row.radicacion_incapacidad} rowId={row.id} onSave={quickSave} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <EditablePill field="observacion_contabilidad" value={row.observacion_contabilidad} rowId={row.id} onSave={quickSave} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <EditablePill field="nomina_electronica" value={row.nomina_electronica} rowId={row.id} onSave={quickSave} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <EditablePill field="seguridad_social" value={row.seguridad_social} rowId={row.id} onSave={quickSave} />
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }} title={row.observacion || ''}>
                    {row.observacion || <span style={{ color: '#D1D5DB' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" title="Ver detalle" onClick={() => onView(row)}><Eye size={13} /></button>
                      {onEdit && <button className="icon-btn" title="Editar" onClick={() => onEdit(row)}><Edit2 size={13} /></button>}
                      {onDelete && <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => onDelete(row.id)}><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <Paginacion total={filtered.length} page={page} totalPages={totalPages} onChange={setPage} info={`Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`} />
    </>
  )
}
