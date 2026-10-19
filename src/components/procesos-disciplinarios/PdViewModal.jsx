// =============================================================
// src/components/procesos-disciplinarios/PdViewModal.jsx
// -------------------------------------------------------------
// Modal de detalle de un solo proceso (extraído de
// ProcesosDisciplinarios.jsx).
// =============================================================
import { X, AlertTriangle, FileText, Eye, Edit2, Printer } from 'lucide-react'
import { CONCEPTO_MAP, ALERT, UMBRAL_ALERTA, normalizeNombre, formatTamano } from '../../utils/procesosDisciplinariosConstants'
import { generarPdfProcesoDisciplinario } from '../../utils/pdfGenerator'
import { useCompany } from '../../context/CompanyContext'

export default function PdViewModal({ viewRow, conteoPorEmpleado, signedUrlLoading, verAdjunto, onClose, onEditar }) {
  const { companyConfig } = useCompany()
  const meta = CONCEPTO_MAP[viewRow.concepto] || { icon: '📄' }
  const count = conteoPorEmpleado[normalizeNombre(viewRow.nombre_empleado)] || 0
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>{meta.icon} {viewRow.nombre_empleado}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {count >= UMBRAL_ALERTA && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: ALERT.bg, border: `1px solid ${ALERT.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: ALERT.text, fontWeight: 600 }}>
              <AlertTriangle size={14} /> Este empleado tiene {count} procesos disciplinarios en total.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Concepto</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{meta.label || viewRow.concepto}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Departamento</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{viewRow.departamento || '—'}</div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Fecha(s)</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {meta.rango ? `${viewRow.fecha_inicio || '—'} → ${viewRow.fecha_fin || '—'}` : `${viewRow.fecha || '—'}${viewRow.hora ? ` · ${viewRow.hora}` : ''}`}
              </div>
            </div>
          </div>
          {viewRow.observacion && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Observación</div>
              <div style={{ fontSize: 13.5, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{viewRow.observacion}</div>
            </div>
          )}
          {Array.isArray(viewRow.archivos) && viewRow.archivos.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Adjuntos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {viewRow.archivos.map((a, idx) => (
                  <div key={a.path || idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5,
                  }}>
                    <FileText size={15} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.nombre}>{a.nombre}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>{formatTamano(a.tamano)}</span>
                    <button className="btn btn-ghost btn-sm" title="Ver PDF" disabled={signedUrlLoading === a.path} onClick={() => verAdjunto(a)}>
                      {signedUrlLoading === a.path ? '⏳' : <Eye size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => generarPdfProcesoDisciplinario(viewRow, companyConfig?.nombre)}>
            <Printer size={14} /> Imprimir / PDF
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={onEditar}><Edit2 size={14} /> Editar</button>
        </div>
      </div>
    </div>
  )
}