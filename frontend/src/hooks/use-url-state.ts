import { useSearchParams } from 'react-router-dom'

/**
 * Estado de una tabla —pagina, busqueda, filtros— guardado en la URL.
 *
 * Con `useState` el filtro se pierde al recargar, el boton "atras" del navegador se sale
 * de la lista en vez de deshacer el ultimo filtro, y no hay forma de compartir un
 * resultado concreto. Nada de eso es una funcion nueva que haya que construir: es lo que
 * el navegador ya hace con una URL, en cuanto el estado vive ahi.
 *
 * La busqueda escribe con `replace` para que teclear no deje una entrada de historial por
 * letra; cualquier otro filtro sí apila, que es lo que hace util el "atras".
 */
export function useUrlState(searchKey = 'q') {
  const [params, setParams] = useSearchParams()

  const get = (key: string, fallback = '') => params.get(key) ?? fallback

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '') next.delete(key)
    else next.set(key, value)
    // Cambiar un filtro vuelve a la primera pagina: la pagina 4 de un resultado no tiene
    // nada que ver con la pagina 4 del siguiente.
    if (key !== 'pagina') next.delete('pagina')
    setParams(next, { replace: key === searchKey })
  }

  return {
    get,
    set,
    page: Math.max(1, Number(params.get('pagina') ?? 1) || 1),
    setPage: (value: number) => set('pagina', String(value)),
    clear: () => setParams(new URLSearchParams()),
  }
}
