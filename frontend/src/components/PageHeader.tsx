import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

/**
 * Cabecera de página. 19px es el tamaño más grande del producto: el titular no compite
 * con el dato, solo dice dónde está uno.
 */
export function PageHeader({ title, subtitle, actions, className }: Props) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[19px] leading-tight font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-[12px] text-ink-soft">{subtitle}</p> : null}
      </div>
      {actions ? (
        /* En móvil las acciones se reparten el ancho a partes iguales en vez de encogerse
           contra el borde; a partir de sm vuelven a medir lo que dice su texto. */
        <div
          className={cn(
            'flex shrink-0 flex-wrap items-center gap-2',
            '[&>*]:flex-1 sm:[&>*]:flex-none',
            '[&_button]:w-full sm:[&_button]:w-auto',
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  )
}
