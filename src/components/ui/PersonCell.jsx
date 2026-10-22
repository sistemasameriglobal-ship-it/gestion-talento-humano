// =============================================================
// src/components/ui/PersonCell.jsx
// -------------------------------------------------------------
// Celda de persona (avatar con iniciales + nombre) igual a la de
// las tablas de Productividad. Se usa en la primera columna de las
// tablas de empleados / novedades / vacaciones / etc.
// =============================================================
import { memo } from 'react'
import './ui.css'
import { iniciales } from '../../utils/productividadHelpers'

function PersonCell({ nombre, sub, children, muted = false, color, className = '' }) {
  return (
    <div className={`person-cell ${className}`.trim()} style={muted ? { opacity: .85 } : undefined}>
      <div className="person-avatar" style={color ? { background: color } : undefined}>{iniciales(nombre || '?')}</div>
      <div className="person-info">
        <span className="person-name" title={nombre}>{nombre || '—'}</span>
        {sub && <span className="person-sub">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

export default memo(PersonCell)

