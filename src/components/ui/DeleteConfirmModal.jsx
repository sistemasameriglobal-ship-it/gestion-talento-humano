// =============================================================
// src/components/ui/DeleteConfirmModal.jsx
// -------------------------------------------------------------
// Modal genérico de confirmación de borrado, compartido por todas
// las páginas (Novedades, Vacaciones, Parqueadero, ...).
// Reemplaza las 3 copias que existían en cada módulo.
// =============================================================
import { X } from 'lucide-react'

export default function DeleteConfirmModal({
  deleteId,
  onClose,
  onConfirm,
  message = '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.',
  tip,
}) {
  if (!deleteId) return null
  return (
    <div className="modal-backdrop" tabIndex={-1}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar eliminación</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
          {tip && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{tip}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ background: '#DC2626', color: '#fff' }} onClick={() => onConfirm(deleteId)}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}