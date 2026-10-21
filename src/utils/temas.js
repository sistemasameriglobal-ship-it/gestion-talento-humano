// =============================================================
// Temas de color (acento) de la aplicación
// =============================================================
// El navy del sidebar/header y el fondo claro se mantienen fijos;
// lo único que cambia entre temas es el color de acento
// (--secondary / --secondary-light / --secondary-dark), usado en
// botones, estados activos, gráficas y barras de progreso.
// =============================================================

export const TEMAS = [
  {
    id: 'dorado',
    nombre: 'Dorado',
    swatch: '#E8A93A',
    vars: {
      '--secondary': '#E8A93A',
      '--secondary-rgb': '232,169,58',
      '--secondary-light': '#FBE7BB',
      '--secondary-dark': '#C9821F',
    },
  },
  {
    id: 'turquesa',
    nombre: 'Turquesa',
    swatch: '#02B2AF',
    vars: {
      '--secondary': '#02B2AF',
      '--secondary-rgb': '2,178,175',
      '--secondary-light': '#CDF7F5',
      '--secondary-dark': '#028F8C',
    },
  },
  {
    id: 'esmeralda',
    nombre: 'Esmeralda',
    swatch: '#0F9D58',
    vars: {
      '--secondary': '#0F9D58',
      '--secondary-rgb': '15,157,88',
      '--secondary-light': '#D3F2E1',
      '--secondary-dark': '#0C7A44',
    },
  },
  {
    id: 'vino',
    nombre: 'Vino',
    swatch: '#9C2B4E',
    vars: {
      '--secondary': '#9C2B4E',
      '--secondary-rgb': '156,43,78',
      '--secondary-light': '#F3D9E1',
      '--secondary-dark': '#7A2039',
    },
  },
  {
    id: 'tecnologia',
    nombre: 'Tecnología',
    swatch: '#2563EB',
    vars: {
      '--secondary': '#2563EB',
      '--secondary-rgb': '37,99,235',
      '--secondary-light': '#D8E3FB',
      '--secondary-dark': '#7C3AED',
    },
  },
  {
    id: 'minimalista',
    nombre: 'Minimalista',
    swatch: '#10B981',
    vars: {
      '--secondary': '#10B981',
      '--secondary-rgb': '16,185,129',
      '--secondary-light': '#D4F2E8',
      '--secondary-dark': '#111827',
    },
  },
  {
    id: 'creativa',
    nombre: 'Creativa',
    swatch: '#F97316',
    vars: {
      '--secondary': '#F97316',
      '--secondary-rgb': '249,115,22',
      '--secondary-light': '#FEE6D5',
      '--secondary-dark': '#FB7185',
    },
  },
  {
    id: 'elegante',
    nombre: 'Elegante',
    swatch: '#0EA5E9',
    vars: {
      '--secondary': '#0EA5E9',
      '--secondary-rgb': '14,165,233',
      '--secondary-light': '#D4EFFB',
      '--secondary-dark': '#1E40AF',
    },
  },
  {
    id: 'natural',
    nombre: 'Natural',
    swatch: '#22C55E',
    vars: {
      '--secondary': '#22C55E',
      '--secondary-rgb': '34,197,94',
      '--secondary-light': '#D7F5E2',
      '--secondary-dark': '#84CC16',
    },
  },
  {
    id: 'vibrante',
    nombre: 'Vibrante',
    swatch: '#EC4899',
    vars: {
      '--secondary': '#EC4899',
      '--secondary-rgb': '236,72,153',
      '--secondary-light': '#FCDEED',
      '--secondary-dark': '#8B5CF6',
    },
  },
]

export const TEMA_DEFAULT = 'dorado'
const STORAGE_KEY = 'tema_color'

export function obtenerTemaGuardado() {
  const id = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return TEMAS.find(t => t.id === id) || TEMAS.find(t => t.id === TEMA_DEFAULT)
}

export function aplicarTema(tema) {
  const root = document.documentElement
  Object.entries(tema.vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value)
  })
}

export function guardarTema(id) {
  localStorage.setItem(STORAGE_KEY, id)
}

// =============================================================
// Modo (claro / oscuro)
// =============================================================
// Independiente del color de acento. Se aplica como atributo
// data-theme="dark" en <html>; todas las variables de superficie
// (--bg, --surface, --text, --border, etc.) se sobreescriben en
// App.css bajo ese selector.
// =============================================================

export const MODO_DEFAULT = 'claro'
const MODO_STORAGE_KEY = 'modo_apariencia'

export function obtenerModoGuardado() {
  if (typeof window === 'undefined') return MODO_DEFAULT
  const guardado = localStorage.getItem(MODO_STORAGE_KEY)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  // Si nunca ha elegido, respeta la preferencia del sistema operativo.
  const prefiereOscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefiereOscuro ? 'oscuro' : 'claro'
}

export function aplicarModo(modo) {
  const root = document.documentElement
  if (modo === 'oscuro') {
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
  } else {
    root.removeAttribute('data-theme')
    root.style.colorScheme = 'light'
  }
}

export function guardarModo(modo) {
  localStorage.setItem(MODO_STORAGE_KEY, modo)
}
