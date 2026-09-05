/**
 * 0 si el sistema pide menos movimiento: la fila se quita al instante, sin esperar una
 * animación invisible. Revisa tanto la preferencia del SO como el interruptor propio del
 * diálogo de accesibilidad (`html[data-reduced-motion]`).
 */
export function rowExitDelay(): number {
  const osPrefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const appToggle = document.documentElement.dataset.reducedMotion === 'true'
  return osPrefers || appToggle ? 0 : 180
}
