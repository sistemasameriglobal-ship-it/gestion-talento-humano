import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCompany } from '../context/CompanyContext'
import CompanySwitcher from './CompanySwitcher'
import AccountMenu from './AccountMenu'

export default function Sidebar({
  filteredSections,
  page,
  navigate,
  pendingCount,
  sidebarOpen,
  setSidebarOpen,
  collapsed,
  setCollapsed,
  searchQuery,
  setSearchQuery,
  onChangePassword,
  onChangeApariencia,
}) {
  const { currentCompany, companyConfig } = useCompany()

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}>

        {/* Header / Brand */}
        <div className="sidebar-header">
          <div className="brand">
            <div
              className="brand-logo"
              style={{
                background: companyConfig.colorPrincipal
                  ? `linear-gradient(135deg, ${companyConfig.colorPrincipal} 0%, ${companyConfig.colorSecundario || companyConfig.colorPrincipal} 100%)`
                  : (currentCompany === 'global_link'
                    ? 'linear-gradient(135deg, #0D9488 0%, #047857 100%)'
                    : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)')
              }}
            >
              {companyConfig.logoLetra || (companyConfig.nombre ? companyConfig.nombre.slice(0, 2).toUpperCase() : 'A')}
            </div>
            <span className="brand-text">
              {currentCompany === 'global_link' ? (
                <>Global<em>Link</em></>
              ) : currentCompany === 'ameriglobal' ? (
                <>Ameri<em>Global</em></>
              ) : (
                <>{companyConfig.nombre}</>
              )}
            </span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={17} />
          </button>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir menú' : 'Recoger menú'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Selector de Empresa */}
        <CompanySwitcher collapsed={collapsed} />

        {/* Búsqueda */}
        <div className="sb-search">
          <div className="sb-search-wrap">
            <Search size={13} className="sb-search-icon" />
            <input
              className="sb-search-input"
              placeholder="Buscar sección..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {filteredSections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 10px', color: '#6B7280', fontSize: 12 }}>
              Sin secciones disponibles
            </div>
          ) : (
            filteredSections.map((section, si) => (
              <div key={section.label}>
                {si > 0 && <div className="sb-divider" />}
                <span className="sb-section-label">{section.label}</span>
                {section.items.map(({ id, label, emoji }, itemIdx) => (
                  <button
                    key={id}
                    className={`nav-item ${page === id ? 'nav-item--active' : ''}`}
                    style={{ animationDelay: `${(si * 3 + itemIdx) * 0.04}s` }}
                    onClick={() => navigate(id)}
                    title={label}
                    aria-label={label}
                    data-badge={id === 'usuarios' && pendingCount > 0 ? 'true' : undefined}
                  >
                    <div className="nav-icon-box">{emoji}</div>
                    <span className="nav-label">{label}</span>
                    {id === 'usuarios' && pendingCount > 0 && (
                      <span className="nav-badge">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <AccountMenu onChangePassword={onChangePassword} onChangeApariencia={onChangeApariencia} />
          <div className="version-tag">
            <div className="v-dot" />
            <span className="version-text">{companyConfig.nombre} · Gestión Integral</span>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
    </>
  )
}
