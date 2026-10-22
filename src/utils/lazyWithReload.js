import { lazy } from 'react'

/**
 * Wrapper para React.lazy que intercepta errores de carga de chunks (ChunkLoadError)
 * originados cuando se despliega una nueva versión y los hashes antiguos ya no existen en el servidor.
 * Recarga automáticamente la página para obtener la versión fresca de la aplicación.
 *
 * Incluye protección con sessionStorage para evitar bucles infinitos de recarga si
 * la conexión a internet falla por completo.
 *
 * @param {Function} componentImport Función que realiza el import dinámico: () => import(...)
 * @returns {React.LazyExoticComponent}
 */
export const lazyWithReload = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = window.sessionStorage.getItem('chunk_reload_triggered') === 'true'

    try {
      const module = await componentImport()
      // Si cargó con éxito, liberamos la bandera para futuros despliegues
      window.sessionStorage.removeItem('chunk_reload_triggered')
      return module
    } catch (error) {
      const errorMessage = error?.message || ''
      const isDynamicImportError =
        (error instanceof TypeError && errorMessage.includes('Failed to fetch dynamically imported module')) ||
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed') ||
        errorMessage.includes('error loading dynamically imported module') ||
        errorMessage.includes('MIME type of "text/html"') ||
        error?.name === 'ChunkLoadError'

      if (isDynamicImportError && !pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('chunk_reload_triggered', 'true')
        window.location.reload()
        // Retornar una promesa pendiente evita que React lance un error no capturado
        // en la UI durante los milisegundos que tarda la ventana en recargarse
        return new Promise(() => {})
      }

      // Si ya se había recargado o el fallo es por otra causa, propagar el error
      throw error
    }
  })

export default lazyWithReload
