import { X } from 'lucide-react'
import { CONCEPTO_ICONS } from '../../utils/productividadConstants'
import { iniciales } from '../../utils/productividadHelpers'

// Trae la info directo de la tabla "procesos_disciplinarios" (la misma que
// usa ProcesosDisciplinarios.jsx) para que se pueda ver, desde Productividad,
// si un agente tiene procesos abiertos, sin duplicar la gestión (crear/editar/
// borrar sigue haciéndose únicamente en la sección Procesos Disciplinarios).
export default function ProcesosDisciplinariosModal({ persona, onCerrar }) {
  const procesos = persona.procesos || []
  return (
    <div className="pr-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <div className="pr-modal">
        <div className="pr-modal-head">
          <div className="pr-view-head">
            <div className="pr-view-avatar">{iniciales(persona.nombre)}</div>
            <div>
              <div className="pr-view-name">{persona.nombre}</div>
              <div className="pr-view-sub">
                {procesos.length} proceso{procesos.length === 1 ? '' : 's'} disciplinario{procesos.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          <button className="pr-modal-close" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="pr-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {procesos.length === 0 ? (
            <div className="pr-view-empty">Esta persona no tiene procesos disciplinarios registrados.</div>
          ) : procesos.map(p => (
            <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-blue">{CONCEPTO_ICONS[p.concepto] || '📄'} {p.concepto === 'Disciplina (Llegadas tarde)' ? 'Falta Reglamento Interno' : p.concepto}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {p.fecha_inicio ? `${p.fecha_inicio} → ${p.fecha_fin || '—'}` : (p.fecha || '—')}
                </span>
              </div>
              {p.observacion && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{p.observacion}</div>
              )}
            </div>
          ))}
        </div>
        <div className="pr-modal-foot">
          <button className="pr-btn pr-btn--ghost" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
