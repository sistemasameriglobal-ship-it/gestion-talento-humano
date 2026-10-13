// =============================================================
// src/components/empleados/EmpleadoHistorialModal.jsx
// -------------------------------------------------------------
// Modal con el historial de novedades de un empleado (KPIs por
// concepto + tabla de registros).
// =============================================================
import { X, Edit2 } from 'lucide-react'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { CONCEPTOS_CON_FECHA } from './empleadosConstants'

export default function EmpleadoHistorialModal({ selectedEmp, novedadesPorEmpleado, periodos = [], onClose, onEdit }) {
  const nov = novedadesPorEmpleado[selectedEmp.nombre_completo]

  // Si no hay lista de periodos de la BD, armar periodo base con los datos del empleado
  const listaPeriodos = (periodos && periodos.length > 0)
    ? periodos
    : (selectedEmp.fecha_ingreso ? [{
        id: 'base',
        numero_periodo: 1,
        fecha_ingreso: selectedEmp.fecha_ingreso,
        fecha_retiro: selectedEmp.fecha_retiro,
        cargo: selectedEmp.cargo,
        dependencia: selectedEmp.dependencia,
        es_periodo_actual: selectedEmp.activo !== false,
        observaciones: 'Periodo inicial registrado'
      }] : [])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h2>{selectedEmp.nombre_completo}</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedEmp.dependencia || '—'}{selectedEmp.cargo ? ` · ${selectedEmp.cargo}` : ''}</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Historial de Contratos / Periodos */}
          {listaPeriodos.length > 0 && (
            <div style={{ marginBottom: 18, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📜 Periodos Laborales ({listaPeriodos.length})</span>
                {listaPeriodos.length > 1 && (
                  <span style={{ background: '#F3E8FF', color: '#7E22CE', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                    Reintegrado
                  </span>
                )}
              </div>
              <div className="table-container" style={{ border: 'none', margin: 0 }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px' }}>Periodo</th>
                      <th style={{ padding: '6px 8px' }}>Ingreso</th>
                      <th style={{ padding: '6px 8px' }}>Retiro</th>
                      <th style={{ padding: '6px 8px' }}>Área / Cargo</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px' }}>Estado</th>
                      <th style={{ padding: '6px 8px' }}>Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaPeriodos.map(p => (
                      <tr key={p.id || p.numero_periodo}>
                        <td style={{ fontWeight: 700, padding: '6px 8px' }}>#{p.numero_periodo}</td>
                        <td style={{ padding: '6px 8px' }}>{p.fecha_ingreso || '—'}</td>
                        <td style={{ padding: '6px 8px', color: p.fecha_retiro ? 'var(--danger-text)' : 'inherit' }}>{p.fecha_retiro || '—'}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{[p.dependencia, p.cargo].filter(Boolean).join(' · ') || '—'}</td>
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {p.es_periodo_actual
                            ? <span style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 12, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>Vigente</span>
                            : <span style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>Cerrado</span>}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.observaciones || ''}>
                          {p.observaciones || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!nov || nov.novedades.length === 0 ? (
            <div className="empty-state"><p>Este empleado no tiene novedades registradas.</p></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>{nov.novedades.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total novedades</div>
                </div>
                {CONCEPTOS_CON_FECHA.filter(c => nov.porConcepto[c]).map(concepto => {
                  const data = nov.porConcepto[concepto]
                  const color = CONCEPTO_COLORS[concepto] || '#374151'
                  return (
                    <div key={concepto} style={{ background: color + '10', border: `1px solid ${color}35`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{data.episodios}</div>
                      <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 2 }}>{concepto}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.dias.toFixed(0)} día{data.dias !== 1 ? 's' : ''}</div>
                    </div>
                  )
                })}
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Concepto</th><th>F. Inicio</th><th>F. Fin</th><th>Días</th><th>Periodo</th></tr></thead>
                  <tbody>
                    {[...nov.novedades].sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')).map(r => {
                      const tipo = normalizarConcepto(r.concepto)
                      const color = CONCEPTO_COLORS[tipo] || '#374151'
                      return (
                        <tr key={r.id}>
                          <td><span className="badge tag-c" style={{ '--tag': color }}>{r.concepto}</span></td>
                          <td>{r.fecha_inicio || '—'}</td>
                          <td>{r.fecha_fin || '—'}</td>
                          <td>{r.total_dias ?? '—'}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{r.periodo || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={onEdit}><Edit2 size={14} /> Editar empleado</button>
        </div>
      </div>
    </div>
  )
}