import { cn } from '../lib/cn'

/**
 * Esqueleto: ocupa el sitio del contenido que viene. No es adorno, es lo que evita que la
 * página salte cuando llega el dato; el salto es lo que se percibe como lentitud.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('skeleton block h-3 w-full', className)} />
}

/** Esqueleto de un listado: la misma altura de fila que la tabla real (48px). */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="surface overflow-hidden" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando datos</span>
      <div className="flex h-9 items-center gap-3 border-b border-line px-3 max-sm:hidden">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-2 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex h-12 items-center gap-3 border-b border-line px-3 last:border-0 max-sm:h-auto max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:py-3"
        >
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton
              key={column}
              className={cn('h-3 flex-1', column === 0 ? 'max-w-[40%]' : 'max-w-[70%]')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Carga de un bloque que no es una tabla (panel, detalle). */
export function Loading({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="space-y-3 py-2" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-2 w-24" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full opacity-60" />
    </div>
  )
}

export function FullPageLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <div className="w-64 space-y-3" role="status" aria-busy="true">
        <span className="sr-only">Cargando</span>
        <Skeleton className="h-2 w-20" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}
