// =============================================================
// src/components/procesos-disciplinarios/PdEmpleadoDetalleModal.jsx
// -------------------------------------------------------------
// Modal con todos los procesos de un empleado (extraído de
// ProcesosDisciplinarios.jsx).
// =============================================================
import { X, AlertTriangle, Paperclip, Eye, Edit2, Trash2, Plus } from 'lucide-react'
import { CONCEPTO_MAP, ALERT, UMBRAL_ALERTA } from '../../utils/procesosDisciplinariosConstants'

export default function PdEmpleadoDetalleModal({ empleadoDetalle, onClose, onVer, onEditar, onEliminar, onNuevoProceso }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {empleadoDetalle.nombre}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 22, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: empleadoDetalle.procesos.length >= UMBRAL_ALERTA ? ALERT.bgStrong : 'var(--bg)',
              color: empleadoDetalle.procesos.length >= UMBRAL_ALERTA ? ALERT.text : 'var(--text-muted)',
            }}>{empleadoDetalle.procesos.length}</span>
          </h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto' }}>
          {empleadoDetalle.procesos.length >= UMBRAL_ALERTA && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: ALERT.bg, border: `1px solid ${ALERT.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: ALERT.text, fontWeight: 600 }}>
              <AlertTriangle size={14} /> Este empleado supera el umbral de {UMBRAL_ALERTA} procesos disciplinarios.
            </div>
          )}
          {empleadoDetalle.procesos.map(p => {
            const meta = CONCEPTO_MAP[p.concepto] || { icon: '📄' }
            return (
              <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue">{meta.icon} {meta.label || p.concepto}</span>
                  {Array.isArray(p.archivos) && p.archivos.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }} title={`${p.archivos.length} adjunto(s)`}>
                      <Paperclip size={12} /> {p.archivos.length}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" title="Ver detalle" onClick={() => onVer(p)}><Eye size={13} /></button>
                    <button className="icon-btn" title="Editar" onClick={() => onEditar(p)}><Edit2 size={13} /></button>
                    <button className="icon-btn icon-btn--danger" title="Eliminar" onClick={() => onEliminar(p)}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>{p.departamento || '—'}</span>
                  <span>{meta.rango ? <>{p.fecha_inicio || '—'} → {p.fecha_fin || '—'}</> : <>{p.fecha || '—'}{p.hora ? ` · ${p.hora}` : ''}</>}</span>
                </div>
                {p.observacion && (
                  <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{p.observacion}</div>
                )}
              </div>
            )
          })}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={onNuevoProceso}><Plus size={14} /> Nuevo proceso para {empleadoDetalle.nombre.split(' ')[0]}</button>
        </div>
      </div>
    </div>
  )
}