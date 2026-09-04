import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

interface Props {
  title: string
  children?: ReactNode
  /** Persistente: solo se cierra si el usuario lo cierra (§13, error de duplicado). */
  onDismiss?: () => void
  className?: string
}

/**
 * Bloque de aviso. Sin color semantico: en un sistema monocromo el peso lo da la regla
 * vertical y la tipografia, no un fondo rojo.
 */
export function Notice({ title, children, onDismiss, className }: Props) {
  return (
    <div
      role="alert"
      className={cn('border border-line border-l-2 border-l-ink bg-fill px-4 py-3', className)}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar aviso"
            className="-mt-0.5 text-lg leading-none text-ink-faint hover:text-ink"
          >
            &times;
          </button>
        ) : null}
      </div>
      {children ? <div className="mt-1 text-[13px] text-ink-soft">{children}</div> : null}
    </div>
  )
}
