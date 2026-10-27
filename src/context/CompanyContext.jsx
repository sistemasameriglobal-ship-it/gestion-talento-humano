import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './AuthContext'
import * as departamentosApi from '../api/departamentos'
import * as cargosApi from '../api/cargos'
import * as empresasApi from '../api/empresas'
import { DEPENDENCIAS, EMPRESAS_DISPONIBLES } from '../constants'

const CompanyContext = createContext(null)

export { EMPRESAS_DISPONIBLES }

export function CompanyProvider({ children }) {
  const { perfil, isAdmin } = useAuth()

  // Lista de empresas registradas (dinámicas desde Supabase + fallback a constantes)
  const [listaEmpresas, setListaEmpresas] = useState(() => empresasApi.obtenerEmpresasCache())

  const cargarEmpresas = useCallback(async () => {
    try {
      const { data } = await empresasApi.listarEmpresas()
      if (data && data.length > 0) {
        setListaEmpresas(data)
      }
    } catch (err) {
      console.warn('Error al cargar empresas dinámicas:', err)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => cargarEmpresas())
  }, [cargarEmpresas])

  // Empresas a las que tiene acceso el usuario actual
  const empresasPermitidas = useMemo(() => {
    const activas = listaEmpresas.filter(e => e.activo !== false)
    if (!perfil) return activas.slice(0, 1)
    if (isAdmin) return activas
    const userEmpresas = Array.isArray(perfil.empresas) ? perfil.empresas : ['ameriglobal']
    const filtradas = activas.filter(e => userEmpresas.includes(e.id) || userEmpresas.includes(e.codigo))
    return filtradas.length > 0 ? filtradas : activas.slice(0, 1)
  }, [perfil, isAdmin, listaEmpresas])

  const [currentCompany, setCurrentCompanyState] = useState(() => {
    const saved = localStorage.getItem('active_company')
    return saved || 'ameriglobal'
  })

  // Sincronizar si la empresa guardada ya no está entre las permitidas
  useEffect(() => {
    if (empresasPermitidas.length > 0) {
      const existe = empresasPermitidas.some(e => e.id === currentCompany || e.codigo === currentCompany)
      if (!existe) {
        const fallback = empresasPermitidas[0].id || empresasPermitidas[0].codigo
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
    return listaEmpresas.find(e => e.id === currentCompany || e.codigo === currentCompany) || listaEmpresas[0] || EMPRESAS_DISPONIBLES[0]
  }, [currentCompany, listaEmpresas])

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

  // Cargos dinámicos de la empresa activa
  const [cargos, setCargos] = useState([])
  const [cargosCompletos, setCargosCompletos] = useState([])
  const [, setLoadingCargos] = useState(false)

  const cargarCargos = useCallback(async () => {
    setLoadingCargos(true)
    try {
      const { data, error } = await cargosApi.listarCargos(currentCompany)
      if (!error && data && data.length > 0) {
        setCargosCompletos(data)
        setCargos(data.map(c => c.nombre))
      } else {
        setCargos([])
        setCargosCompletos([])
      }
    } catch {
      setCargos([])
      setCargosCompletos([])
    } finally {
      setLoadingCargos(false)
    }
  }, [currentCompany])

  useEffect(() => {
    Promise.resolve().then(() => cargarCargos())
  }, [cargarCargos])

  // Obtiene el nivel de acceso para una sección en la empresa actual:
  // Retorna 'total' (ver y modificar), 'lectura' (solo ver información), o 'none' (sin acceso)
  const getSectionAccess = useCallback((sectionId) => {
    if (!perfil) return 'none'
    if (isAdmin) return 'total' // Los administradores siempre tienen acceso total
    if ((sectionId === 'usuarios' || sectionId === 'sistema') && !isAdmin) return 'none'

    const permisosUser = perfil.permisos || {}
    const permisosEmpresa = permisosUser[currentCompany]

    // Si no tiene configuración específica de permisos, pero tiene acceso a la empresa
    if (!permisosEmpresa) {
      const tieneEmpresa = Array.isArray(perfil.empresas) && perfil.empresas.includes(currentCompany)
      return tieneEmpresa ? 'total' : 'none'
    }

    // Formato 1: Objeto con niveles por módulo { novedades: 'total', empleados: 'lectura', vacaciones: 'none' }
    if (typeof permisosEmpresa === 'object' && !Array.isArray(permisosEmpresa)) {
      if (permisosEmpresa[sectionId] !== undefined) {
        const val = permisosEmpresa[sectionId]
        if (val === 'total' || val === 'write' || val === true) return 'total'
        if (val === 'lectura' || val === 'read') return 'lectura'
        if (val === 'none' || val === false) return 'none'
      }
      if (permisosEmpresa.all === 'total' || permisosEmpresa.all === true) return 'total'
      if (permisosEmpresa.all === 'lectura' || permisosEmpresa.all === 'read') return 'lectura'
      return 'none'
    }

    // Formato 2: Array retrocompatible tipo ['all'], ['novedades'], ['novedades:lectura'], etc.
    if (Array.isArray(permisosEmpresa)) {
      if (permisosEmpresa.includes('all')) return 'total'
      if (permisosEmpresa.includes(`${sectionId}:lectura`) || permisosEmpresa.includes(`${sectionId}:read`)) {
        return 'lectura'
      }
      if (permisosEmpresa.includes(`${sectionId}:total`) || permisosEmpresa.includes(`${sectionId}:write`) || permisosEmpresa.includes(sectionId)) {
        return 'total'
      }
      return 'none'
    }

    return 'none'
  }, [perfil, isAdmin, currentCompany])

  // Verificador de si puede entrar/ver la sección
  const hasPermission = useCallback((sectionId) => {
    const access = getSectionAccess(sectionId)
    return access === 'total' || access === 'lectura'
  }, [getSectionAccess])

  // Verificador de si puede modificar/crear/eliminar en la sección (Acceso Total)
  const canWrite = useCallback((sectionId) => {
    return getSectionAccess(sectionId) === 'total'
  }, [getSectionAccess])

  const value = useMemo(() => ({
    currentCompany,
    companyConfig,
    setCompany,
    empresasPermitidas,
    empresasDisponibles: listaEmpresas,
    reloadEmpresas: cargarEmpresas,
    hasPermission,
    canWrite,
    getSectionAccess,
    departamentos,
    reloadDepartamentos: cargarDepartamentos,
    cargos,
    cargosCompletos,
    reloadCargos: cargarCargos,
  }), [
    currentCompany,
    companyConfig,
    setCompany,
    empresasPermitidas,
    listaEmpresas,
    cargarEmpresas,
    hasPermission,
    canWrite,
    getSectionAccess,
    departamentos,
    cargarDepartamentos,
    cargos,
    cargosCompletos,
    cargarCargos,
  ])

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany debe usarse dentro de <CompanyProvider>')
  return ctx
}
