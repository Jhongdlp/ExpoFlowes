/** Estado de carga: una regla que late. Sin spinners de colores ni saltos de layout. */
export function Loading({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="flex flex-col items-start gap-2 py-10" aria-live="polite" aria-busy="true">
      <span className="label-caps">{label}</span>
      <span className="h-px w-24 animate-pulse bg-ink-faint" />
    </div>
  )
}

export function FullPageLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <Loading />
    </div>
  )
}
