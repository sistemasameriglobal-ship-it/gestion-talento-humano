import { useState, useRef, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import { ChevronDown, Check } from 'lucide-react'

export default function CompanySwitcher({ collapsed }) {
  const { currentCompany, companyConfig, setCompany, empresasPermitidas } = useCompany()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (empresasPermitidas.length <= 1) {
    // Si solo tiene acceso a 1 empresa, mostrar solo la insignia informativa
    return (
      <div className="company-badge-single" title={companyConfig.razonSocial}>
        <span className="company-badge-icon">{companyConfig.icono}</span>
        {!collapsed && <span className="company-badge-name">{companyConfig.nombre}</span>}
      </div>
    )
  }

  return (
    <div className="company-switcher-container" ref={ref}>
      <button
        type="button"
        className={`company-switcher-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        title={`Empresa actual: ${companyConfig.nombre}. Clic para cambiar.`}
      >
        <div
          className="company-logo-avatar"
          style={{
            background: companyConfig.colorPrincipal
              ? `linear-gradient(135deg, ${companyConfig.colorPrincipal} 0%, ${companyConfig.colorSecundario || companyConfig.colorPrincipal} 100%)`
              : (currentCompany === 'global_link'
                ? 'linear-gradient(135deg, #0D9488 0%, #047857 100%)'
                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)')
          }}
        >
          {companyConfig.icono}
        </div>
        {!collapsed && (
          <>
            <div className="company-info-text">
              <span className="company-label-micro">EMPRESA ACTIVA</span>
              <span className="company-name-bold">{companyConfig.nombre}</span>
            </div>
            <ChevronDown size={14} className={`company-chevron ${open ? 'rotated' : ''}`} />
          </>
        )}
      </button>

      {open && (
        <div className="company-dropdown-menu">
          <div className="company-dropdown-header">
            <span>Cambiar de Empresa</span>
          </div>
          {empresasPermitidas.map((emp) => {
            const isSelected = emp.id === currentCompany
            return (
              <button
                key={emp.id}
                type="button"
                className={`company-dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setCompany(emp.id)
                  setOpen(false)
                }}
              >
                <div
                  className="company-item-icon"
                  style={{
                    background: emp.colorPrincipal
                      ? `linear-gradient(135deg, ${emp.colorPrincipal} 0%, ${emp.colorSecundario || emp.colorPrincipal} 100%)`
                      : (emp.id === 'global_link'
                        ? 'linear-gradient(135deg, #0D9488 0%, #047857 100%)'
                        : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)')
                  }}
                >
                  {emp.icono}
                </div>
                <div className="company-item-details">
                  <span className="company-item-title">{emp.nombre}</span>
                  <span className="company-item-sub">{emp.tagline}</span>
                </div>
                {isSelected && <Check size={16} className="company-check-icon" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
