import { X } from 'lucide-react'

export default function ColaboradoresBaseModal({ show, onCerrar, diasPeriodoLabel, filterDependencia, empleadosActivosPeriodo }) {
  if (!show) return null
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Colaboradores activos en el período</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {diasPeriodoLabel}{filterDependencia ? ` · Área: ${filterDependencia}` : ''}
            </div>
          </div>
          <button className="modal-close" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {empleadosActivosPeriodo.length} colaborador{empleadosActivosPeriodo.length !== 1 ? 'es' : ''} usados como denominador de la tasa (fecha de ingreso ≤ fin del período y sin retiro antes del inicio del período).
          </div>
          {empleadosActivosPeriodo.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No hay colaboradores que cumplan la condición para este período.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '6px 8px' }}>Nombre</th>
                  <th style={{ padding: '6px 8px' }}>Área</th>
                  <th style={{ padding: '6px 8px' }}>Ingreso</th>
                  <th style={{ padding: '6px 8px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {[...empleadosActivosPeriodo]
                  .sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''))
                  .map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--bg)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{e.nombre_completo || '—'}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{e.dependencia_en_periodo || e.dependencia || 'Sin área'}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{e.fecha_ingreso || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {e.activo === false
                          ? <span style={{ color: 'var(--danger-text)', fontWeight: 600 }}>
                              Inactivo{e.fecha_retiro ? ` · retiro ${e.fecha_retiro}` : ' · sin fecha de retiro'}
                            </span>
                          : <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>Activo</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
