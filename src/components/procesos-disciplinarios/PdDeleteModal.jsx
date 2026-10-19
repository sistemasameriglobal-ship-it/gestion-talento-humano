// =============================================================
// src/components/procesos-disciplinarios/PdDeleteModal.jsx
// -------------------------------------------------------------
// Modal de confirmación de borrado con resumen del registro
// (extraído de ProcesosDisciplinarios.jsx).
// =============================================================
import { X } from 'lucide-react'
import { CONCEPTO_MAP, ALERT } from '../../utils/procesosDisciplinariosConstants'

export default function PdDeleteModal({ deleteRow, deleting, onClose, onConfirm }) {
  if (!deleteRow) return null
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !deleting && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>Confirmar eliminación</h2>
          <button className="modal-close" onClick={onClose} disabled={deleting}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p>¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.</p>
          <div style={{
            marginTop: 10, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 13,
          }}>
            <div style={{ fontWeight: 700 }}>{deleteRow.nombre_empleado}</div>
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              {CONCEPTO_MAP[deleteRow.concepto]?.icon} {CONCEPTO_MAP[deleteRow.concepto]?.label || deleteRow.concepto}
              {deleteRow.departamento ? ` · ${deleteRow.departamento}` : ''}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={deleting}>Cancelar</button>
          <button className="btn" style={{ background: ALERT.solid, color: '#fff' }} onClick={() => onConfirm(deleteRow.id)} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}