import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './layout/auth.css'
import App from './App.jsx'
import { obtenerTemaGuardado, aplicarTema, obtenerModoGuardado, aplicarModo } from './utils/temas.js'

// Manejo global ante nuevos despliegues: si Vite falla al precargar un chunk desactualizado,
// recarga automáticamente la página para obtener los hashes recientes sin bucles.
window.addEventListener('vite:preloadError', () => {
  const yaRecargado = window.sessionStorage.getItem('chunk_reload_triggered') === 'true'
  if (!yaRecargado) {
    window.sessionStorage.setItem('chunk_reload_triggered', 'true')
    window.location.reload()
  }
})

// Aplica el tema de color y el modo (claro/oscuro) guardados antes
// de pintar la app, para que no se vea un flash del tema por defecto.
aplicarTema(obtenerTemaGuardado())
aplicarModo(obtenerModoGuardado())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
