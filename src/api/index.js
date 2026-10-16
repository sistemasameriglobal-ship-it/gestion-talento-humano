// =============================================================
// Punto de entrada único para todas las peticiones a Supabase.
// Cada módulo agrupa las funciones de una tabla/dominio, así que
// las páginas nunca importan `supabase` directamente ni escriben
// queries "sueltas": todo pasa por aquí.
//
// Uso:
//   import * as empleadosApi from '../api/empleados'
//   const { data, error } = await empleadosApi.listarEmpleados()
//
// o, si prefieres importar todo junto:
//   import * as api from '../api'
//   const { data, error } = await api.empleados.listarEmpleados()
// =============================================================
export * as empleados from './empleados'
export * as novedades from './novedades'
export * as vacaciones from './vacaciones'
export * as parqueadero from './parqueadero'
export * as procesosDisciplinarios from './procesosDisciplinarios'
export * as productividad from './productividad'
export * as perfiles from './perfiles'
export * as departamentos from './departamentos'
export * as empresas from './empresas'
export * as auditLogs from './auditLogs'
export * as sistema from './sistema'
export * as auth from './auth'

