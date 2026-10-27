import { useState, useEffect, useMemo, Suspense } from 'react'
import { lazyWithReload } from '../utils/lazyWithReload'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import * as perfilesApi from '../api/perfiles'
import { Menu, Eye } from 'lucide-react'

// ── Carga diferida de páginas (code-splitting) ─────────────────────────────
const Dashboard = lazyWithReload(() => import('../pages/Dashboard'))
const Novedades = lazyWithReload(() => import('../pages/Novedades'))
const ProcesosDisciplinarios = lazyWithReload(() => import('../pages/ProcesosDisciplinarios'))
const Colaboradores = lazyWithReload(() => import('../pages/Colaboradores'))
const Empleados = lazyWithReload(() => import('../pages/Empleados'))
const Contratos = lazyWithReload(() => import('../pages/Contratos'))
const Parqueadero = lazyWithReload(() => import('../pages/Parqueadero'))
const Vacaciones = lazyWithReload(() => import('../pages/Vacaciones'))
const Usuarios = lazyWithReload(() => import('../pages/Usuarios'))
const Productividad = lazyWithReload(() => import('../pages/Productividad'))
const Sistema = lazyWithReload(() => import('../pages/Sistema'))
import { NAV_SECTIONS, ADMIN_SECTION } from './navConfig'
import Sidebar from './Sidebar'
import ModalCambiarPassword from './ModalCambiarPassword'
import ModalApariencia from './ModalApariencia'
import './sidebar.css'

const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  novedades: Novedades,
  disciplinarios: ProcesosDisciplinarios,
  colaboradores: Colaboradores,
  empleados: Empleados,
  contratos: Contratos,
  parqueadero: Parqueadero,
  vacaciones: Vacaciones,
  productividad: Productividad,
  usuarios: Usuarios,
  sistema: Sistema,
}

export default function AppShell() {
  const { isAdmin } = useAuth()
  const { currentCompany, companyConfig, hasPermission, getSectionAccess } = useCompany()
  const [page, setPage] = useState(() => window.location.hash.replace('#/', '') || 'dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === '1')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showApariencia, setShowApariencia] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  // ── Sincroniza la sección activa con el hash de la URL ──
  useEffect(() => {
    const onHashChange = () => {
      setPage(window.location.hash.replace('#/', '') || 'dashboard')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // ── Atajo de teclado Ctrl/Cmd + B para recoger/expandir el sidebar ──
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setCollapsed(c => !c)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Cuenta de usuarios pendientes de aprobación ──
  useEffect(() => {
    if (!isAdmin) { Promise.resolve().then(() => setPendingCount(0)); return }
    let vivo = true
    const cargarPendientes = async () => {
      const { count } = await perfilesApi.contarPerfilesPendientes()
      if (vivo) setPendingCount(count || 0)
    }
    cargarPendientes()
    const interval = setInterval(cargarPendientes, 60000)
    return () => { vivo = false; clearInterval(interval) }
  }, [isAdmin])

  // Secciones base según si es admin o no
  const baseSections = useMemo(
    () => isAdmin ? [...NAV_SECTIONS, ADMIN_SECTION] : NAV_SECTIONS,
    [isAdmin]
  )

  // Secciones filtradas por permisos del usuario en la empresa activa
  const permittedSections = useMemo(() => {
    return baseSections.map(section => ({
      ...section,
      items: section.items.filter(item => hasPermission(item.id)),
    })).filter(section => section.items.length > 0)
  }, [baseSections, hasPermission])

  // Redireccionar si la página actual no está permitida en esta empresa
  useEffect(() => {
    const allPermitted = permittedSections.flatMap(s => s.items)
    if (allPermitted.length > 0) {
      const allowed = allPermitted.some(item => item.id === page)
      if (!allowed) {
        const fallbackPage = allPermitted[0].id
        Promise.resolve().then(() => {
          setPage(fallbackPage)
          window.location.hash = '/' + fallbackPage
        })
      }
    }
  }, [currentCompany, permittedSections, page])

  // Todos los items permitidos
  const allItems = useMemo(() => permittedSections.flatMap(s => s.items), [permittedSections])

  // Items filtrados por búsqueda
  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return permittedSections
    return permittedSections.map(s => ({
      ...s,
      items: s.items.filter(item => item.label.toLowerCase().includes(q)),
    })).filter(s => s.items.length > 0)
  }, [permittedSections, searchQuery])

  const currentItem = allItems.find(n => n.id === page)

  const PageComponent = ((page === 'usuarios' || page === 'sistema') && !isAdmin)
    ? Dashboard
    : (PAGE_COMPONENTS[page] || Dashboard)

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const navigate = (id) => {
    setPage(id)
    window.location.hash = '/' + id
    setSidebarOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="app-shell">
      <Sidebar
        filteredSections={filteredSections}
        page={page}
        navigate={navigate}
        pendingCount={pendingCount}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onChangePassword={() => setShowPasswordModal(true)}
        onChangeApariencia={() => setShowApariencia(true)}
      />

      {/* ── Main content ── */}
      <main className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            {currentItem?.emoji && (
              <span style={{ marginRight: 7, fontSize: 16 }}>{currentItem.emoji}</span>
            )}
            {currentItem?.label || 'Dashboard'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="topbar-company-tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: companyConfig?.colorFondoTag || '#EFF6FF',
                color: companyConfig?.colorPrincipal || '#1D4ED8',
                border: `1px solid ${companyConfig?.colorPrincipal ? companyConfig.colorPrincipal + '33' : '#BFDBFE'}`
              }}
            >
              <span>{companyConfig.icono}</span>
              <span>{companyConfig.nombre}</span>
            </div>

            <div className="topbar-date">
              📅 {dateStr}
            </div>
          </div>
        </header>

        <div className="page-wrapper">
          {getSectionAccess && getSectionAccess(page) === 'lectura' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 10,
              marginBottom: 16,
              color: '#92400E',
              fontSize: 12.5,
              fontWeight: 500,
            }}>
              <Eye size={16} style={{ flexShrink: 0, color: '#D97706' }} />
              <span><strong>Modo Solo Lectura:</strong> Tienes permisos para consultar y descargar la información de este módulo. Las funciones de registro, edición o eliminación no están habilitadas para tu usuario.</span>
            </div>
          )}
          <Suspense fallback={<div className="empty-state"><p>Cargando...</p></div>}>
            <PageComponent onNavigate={navigate} />
          </Suspense>
        </div>
      </main>

      {showPasswordModal && (
        <ModalCambiarPassword onClose={() => setShowPasswordModal(false)} />
      )}
      {showApariencia && (
        <ModalApariencia onClose={() => setShowApariencia(false)} />
      )}
    </div>
  )
}
