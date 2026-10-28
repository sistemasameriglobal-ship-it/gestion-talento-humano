import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CompanyProvider } from './context/CompanyContext'
import Login, { CuentaPendiente, PerfilNoEncontrado, AuthLoading } from './pages/Login'
import AppShell from './layout/AppShell'
import PaginaFirmaContrato from './pages/PaginaFirmaContrato'

export function isRutaFirma() {
  if (typeof window === 'undefined') return false
  const hash = (window.location.hash || '').toLowerCase()
  const path = (window.location.pathname || '').toLowerCase()
  const search = (window.location.search || '').toLowerCase()

  return (
    hash.includes('firmar-contrato') ||
    hash.includes('firmar/') ||
    path.includes('firmar-contrato') ||
    path.includes('firmar/') ||
    search.includes('firmar')
  )
}

// ── AuthGate ──────────────────────────────────────────────────────────────────
function AuthGate() {
  const [, setRerender] = useState(0)
  const { loading, session, perfil, perfilLoading } = useAuth()

  useEffect(() => {
    const onLocationChange = () => setRerender(n => n + 1)
    window.addEventListener('hashchange', onLocationChange)
    window.addEventListener('popstate', onLocationChange)
    return () => {
      window.removeEventListener('hashchange', onLocationChange)
      window.removeEventListener('popstate', onLocationChange)
    }
  }, [])

  // Ruta pública para que el colaborador firme sus contratos sin requerir sesión
  if (isRutaFirma()) {
    return <PaginaFirmaContrato />
  }

  if (loading)                    return <AuthLoading />
  if (!session)                   return <Login />
  if (!perfil && perfilLoading)   return <AuthLoading />
  if (!perfil)                    return <PerfilNoEncontrado />
  if (!perfil.activo)             return <CuentaPendiente />
  return (
    <CompanyProvider>
      <AppShell />
    </CompanyProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
