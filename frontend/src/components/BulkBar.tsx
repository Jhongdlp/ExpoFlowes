import type { InputHTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/Button'

interface BulkBarProps {
  count: number
  /** Texto del boton destructivo, ya en plural o singular segun `count`. */
  actionLabel: string
  onAction: () => void
  onClear: () => void
  busy?: boolean
}

/**
 * Barra de acciones en lote. Aparece solo cuando hay filas seleccionadas, para que la tabla
 * no cargue con una accion destructiva permanente encima.
 */
export function BulkBar({ count, actionLabel, onAction, onClear, busy = false }: BulkBarProps) {
  if (count === 0) return null

  return (
    <div
      role="status"
      className="animate-rise flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/25 bg-brand-soft px-3 py-2"
    >
      <p className="tnum text-[12px] font-medium text-ink">
        {count} seleccionad{count === 1 ? 'o' : 'os'}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
          Quitar selección
        </Button>
        <Button variant="danger" size="sm" loading={busy} onClick={onAction}>
          {busy ? 'Eliminando…' : actionLabel}
        </Button>
      </div>
    </div>
  )
}

/** Casilla de seleccion de fila o de cabecera. Siempre con `aria-label`: no tiene texto. */
export function SelectCheckbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-3.5 w-3.5 cursor-pointer rounded-sm accent-brand align-middle transition-transform duration-[120ms] active:scale-90',
        className,
      )}
      {...props}
    />
  )
}
