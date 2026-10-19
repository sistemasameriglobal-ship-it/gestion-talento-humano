// =============================================================
// src/constants/index.js
// -------------------------------------------------------------
// FUENTE ÚNICA de meses, años y dependencias.
// Cada módulo (Novedades, Vacaciones, Parqueadero, Dashboard,
// Productividad) re-exporta desde aquí la forma que necesita,
// evitando las 5 definiciones de MESES que existían antes.
// =============================================================

// Meses en MAYÚSCULAS (usado por Vacaciones y Parqueadero).
export const MESES_MAYUSCULA = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

// Meses en formato corto (usado por Productividad).
export const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Meses en formato completo (Enero, Febrero, ...).
export const MESES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Meses como objetos { val: '01', label: 'Enero' } (usado por Novedades y Dashboard).
export const MESES_OPCIONES = [
  { val: '01', label: 'Enero' }, { val: '02', label: 'Febrero' },
  { val: '03', label: 'Marzo' }, { val: '04', label: 'Abril' },
  { val: '05', label: 'Mayo' }, { val: '06', label: 'Junio' },
  { val: '07', label: 'Julio' }, { val: '08', label: 'Agosto' },
  { val: '09', label: 'Septiembre' }, { val: '10', label: 'Octubre' },
  { val: '11', label: 'Noviembre' }, { val: '12', label: 'Diciembre' },
]

// Años disponibles en los filtros.
export const ANIOS = ['2024', '2025', '2026', '2027', '2028']

// Dependencias (áreas) de la empresa.
export const DEPENDENCIAS = [
  'COBRANZA', 'CIERRE', 'VENTAS', 'UNDERWRITING', 'CONTABILIDAD', 'RRHH', 'GERENCIA', 'SOPORTE TI',
]

// Dependencias incluyendo áreas con pocos colaboradores (Empleados y Novedades).
export const DEPENDENCIAS_EXTENDIDAS = [...DEPENDENCIAS, 'SERVICIOS GENERALES', 'APRENDIZ']

// Empresas disponibles en el sistema multi-empresa.
export const EMPRESAS_DISPONIBLES = [
  {
    id: 'ameriglobal',
    nombre: 'AmeriGlobal',
    razonSocial: 'AmeriGlobal S.A.S',
    tagline: 'Gestión Humana & Operaciones',
    logoLetra: 'A',
    colorPrincipal: '#2563EB',
    colorSecundario: '#1E40AF',
    colorFondoTag: '#EFF6FF',
    icono: '🏢',
  },
  {
    id: 'global_link',
    nombre: 'Global Link',
    razonSocial: 'Global Link S.A.S',
    tagline: 'Cobranza & Operaciones',
    logoLetra: 'GL',
    colorPrincipal: '#0D9488',
    colorSecundario: '#0F766E',
    colorFondoTag: '#F0FDFA',
    icono: '🌐',
  },
]