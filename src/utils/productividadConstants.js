// Este componente gestiona la productividad por departamento. Cada pestaña
// (Ventas, UW-BS...) usa las mismas tablas de Supabase, filtrando por su
// propio valor de "departamento", y su propia dependencia en Empleados.
//
// Ventas y UW-BS (usaClientes: true) registran DOS valores por persona/mes:
// "Clientes Asignados" y "Clientes Resueltos". El porcentaje de resolución
// NO se guarda: siempre se calcula como resueltos ÷ asignados. Ambos valores
// viven en la tabla "productividad" como filas distintas (columna "metrica").
// Los departamentos dinámicos de Global Link siguen con un solo valor
// ("Producción").
import { MESES_CORTO as MESES, MESES_FULL } from '../constants'

export { MESES, MESES_FULL }

// Métrica de un solo valor (departamentos sin clientes asignados/resueltos)
export const METRICA = 'Producción'
// Métricas de los departamentos con usaClientes: true (Ventas, UW-BS)
export const METRICA_ASIGNADOS = 'Clientes Asignados'
export const METRICA_RESUELTOS = 'Clientes Resueltos'
export const METRICA_FRIOS = 'Clientes en Frío'

// Meta de cumplimiento de resolución para asesores de ventas (40%)
export const META_RESOLUCION_PCT = 40

// Meta mínima individual mensual de clientes en frío por asesor (11)
export const META_FRIOS_MINIMO = 11

// Meta mensual global del equipo de ventas (por defecto 600 clientes cerrados, editable)
export const META_EQUIPO_MENSUAL_DEFAULT = 600

export const DEPTOS = {
  ventas: {
    id: 'ventas',
    tabLabel: 'Ventas',
    departamento: 'Ventas',           // valor guardado en productividad / productividad_resumen
    dependenciaEmpleados: 'VENTAS',   // valor guardado en empleados.dependencia
    personaLabel: 'Vendedor(a)',
    personaLabelLower: 'vendedor(a)',
    unidadPlural: 'clientes resueltos',
    usaClientes: true,
  },
  'uw-bs': {
    id: 'uw-bs',
    tabLabel: 'UW - BS',
    departamento: 'UW - BS',
    dependenciaEmpleados: 'UNDERWRITING',
    personaLabel: 'Analista',
    personaLabelLower: 'analista',
    unidadPlural: 'clientes resueltos',
    usaClientes: true,
  },
}

export const DEPARTAMENTOS_FUTUROS = [
  { id: 'cobranzas', label: 'Cobranzas' },
]

// ── Config del departamento "Cierre" ─────────────────────────────────────
// Igual que Ventas/UW-BS maneja Clientes Asignados / Clientes Resueltos, pero
// además suma 3 métricas financieras (6 en total por persona en cada mes de
// cierre). Vive en su propia tabla de
// Supabase: "cierre_meses" (una fila por persona + mes + año). Los procesos
// disciplinarios se traen de "procesos_disciplinarios" filtrando por
// dependenciaEmpleados, igual que hacen Ventas y UW-BS.
export const CIERRE_CFG = {
  id: 'cierre',
  tabLabel: 'Cierre',
  departamento: 'Cierre',
  dependenciaEmpleados: 'CIERRE', // valor esperado en empleados.dependencia
  personaLabel: 'Analista de Cierre',
}

// Cada fila de métrica: key = identificador principal, dbFallback = columna previa en cierre_meses para retrocompatibilidad
export const CIERRE_METRICAS = [
  { key: 'cierres_asignados', dbFallback: 'new_offers_units', label: 'Clientes Asignados', tipo: 'num', grupo: 'casos' },
  { key: 'cierres_cerrados', dbFallback: 'new_offers_dollars', label: 'Clientes Resueltos', tipo: 'num', grupo: 'casos' },
  { key: 'porcentaje_cierres', dbFallback: 'renewal_units', label: 'Tasa de Efectividad', tipo: 'pct', grupo: 'casos' },
  { key: 'total_plata', dbFallback: 'renewal_dollars', label: 'Monto Total Gestionado', tipo: 'moneda', espacioAntes: true, grupo: 'financiero' },
  { key: 'plata_prestada', dbFallback: 'total_units', label: 'Capital Colocado', tipo: 'moneda', grupo: 'financiero' },
  { key: 'porcentaje_plata', dbFallback: 'total_dollars', label: 'Tasa de Colocación', tipo: 'pct', grupo: 'financiero' },
]

export const ANIO_ACTUAL = new Date().getFullYear()

// Normaliza nombres para cruzar "empleados" con "procesos_disciplinarios"
// sin que falle por mayúsculas/espacios extra (igual que en ProcesosDisciplinarios.jsx)
export const normalizeNombre = (s) => (s || '').trim().toLowerCase()

// Íconos/colores por concepto de proceso disciplinario (mismos que ProcesosDisciplinarios.jsx)
export const CONCEPTO_ICONS = {
  'Falta Reglamento Interno': '📕',
  'Disciplina (Llegadas tarde)': '📕',
  'Productividad': '📉',
  'Citación a Descargos': '📨',
}
