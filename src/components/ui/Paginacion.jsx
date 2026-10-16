// =============================================================
// src/components/ui/Paginacion.jsx
// -------------------------------------------------------------
// Controles de paginación compartidos por todos los módulos
// (antes había 8 copias con el mismo markup y la misma lógica
// de ventana de 5 páginas).
// =============================================================
import { memo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function Paginacion({ total, page, totalPages, onChange, info, style }) {
  const infoText = info ?? `${total} registros · Página ${page} de ${totalPages}`
  return (
    <div className="pagination" style={style}>
      <div className="pagination-info">{infoText}</div>
      <div className="pagination-controls">
        <button className="page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft size={13} /></button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
          return <button key={p} className={`page-btn ${p === page ? 'page-btn--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        })}
        <button className="page-btn" disabled={page === totalPages || totalPages === 0} onClick={() => onChange(page + 1)}><ChevronRight size={13} /></button>
      </div>
    </div>
  )
}

export default memo(Paginacion)