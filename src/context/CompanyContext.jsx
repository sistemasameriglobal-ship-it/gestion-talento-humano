import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './AuthContext'
import * as departamentosApi from '../api/departamentos'
import { DEPENDENCIAS, EMPRESAS_DISPONIBLES } from '../constants'

const CompanyContext = createContext(null)

export { EMPRESAS_DISPONIBLES }

export function CompanyProvider({ children }) {
  const { perfil, isAdmin } = useAuth()

  // Empresas a las que tiene acceso el usuario actual
  const empresasPermitidas = useMemo(() => {
    if (!perfil) return [EMPRESAS_DISPONIBLES[0]]
    if (isAdmin) return EMPRESAS_DISPONIBLES
    const userEmpresas = Array.isArray(perfil.empresas) ? perfil.empresas : ['ameriglobal']
    const filtradas = EMPRESAS_DISPONIBLES.filter(e => userEmpresas.includes(e.id))
    return filtradas.length > 0 ? filtradas : [EMPRESAS_DISPONIBLES[0]]
  }, [perfil, isAdmin])

  const [currentCompany, setCurrentCompanyState] = useState(() => {
    const saved = localStorage.getItem('active_company')
    return saved || 'ameriglobal'
  })

  // Sincronizar si la empresa guardada ya no está entre las permitidas
  useEffect(() => {
    if (empresasPermitidas.length > 0) {
      const existe = empresasPermitidas.some(e => e.id === currentCompany)
      if (!existe) {
        const fallback = empresasPermitidas[0].id
        Promise.resolve().then(() => {
          setCurrentCompanyState(fallback)
          localStorage.setItem('active_company', fallback)
        })
      }
    }
  }, [empresasPermitidas, currentCompany])

  const setCompany = useCallback((companyId) => {
    setCurrentCompanyState(companyId)
    localStorage.setItem('active_company', companyId)
  }, [])

  const companyConfig = useMemo(() => {
    return EMPRESAS_DISPONIBLES.find(e => e.id === currentCompany) || EMPRESAS_DISPONIBLES[0]
  }, [currentCompany])

  // Departamentos dinámicos de la empresa activa
  const [departamentos, setDepartamentos] = useState([])
  const [, setLoadingDepartamentos] = useState(false)

  const cargarDepartamentos = useCallback(async () => {
    setLoadingDepartamentos(true)
    try {
      const { data, error } = await departamentosApi.listarDepartamentos(currentCompany)
      if (!error && data && data.length > 0) {
        setDepartamentos(data.map(d => d.nombre))
      } else {
        // Fallback si no hay registros aún
        if (currentCompany === 'global_link') {
          setDepartamentos(['COBRANZA'])
        } else {
          setDepartamentos(DEPENDENCIAS)
        }
      }
    } catch {
      setDepartamentos(currentCompany === 'global_link' ? ['COBRANZA'] : DEPENDENCIAS)
    } finally {
      setLoadingDepartamentos(false)
    }
  }, [currentCompany])

  useEffect(() => {
    Promise.resolve().then(() => cargarDepartamentos())
  }, [cargarDepartamentos])

  // Verificador de permisos por sección para la empresa actual
  const hasPermission = useCallback((sectionId) => {
    if (!perfil) return false
    if (isAdmin) return true // Los administradores tienen acceso total
    if ((sectionId === 'usuarios' || sectionId === 'sistema') && !isAdmin) return false

    const permisosUser = perfil.permisos || {}
    const permisosEmpresa = permisosUser[currentCompany]

    if (!permisosEmpresa) {
      return Array.isArray(perfil.empresas) && perfil.empresas.includes(currentCompany)
    }

    if (Array.isArray(permisosEmpresa)) {
      return permisosEmpresa.includes('all') || permisosEmpresa.includes(sectionId)
    }

    return false
  }, [perfil, isAdmin, currentCompany])

  const value = {
    currentCompany,
    companyConfig,
    setCompany,
    empresasPermitidas,
    hasPermission,
    departamentos,
    reloadDepartamentos: cargarDepartamentos,
  }

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany debe usarse dentro de <CompanyProvider>')
  return ctx
}
