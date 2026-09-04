import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

/**
 * El color del botón dice qué hace la acción, no cuánto importa:
 *
 *   primary   verde  → crear, guardar, importar, confirmar. Añade algo al sistema.
 *   danger    rojo   → eliminar. Quita algo, y no se puede deshacer.
 *   secondary borde  → acciones laterales (volver, descargar, navegar).
 *   ghost     texto  → cancelar, limpiar, cerrar. Sale sin consecuencia.
 *
 * Verde y rojo son los mismos del lenguaje de estado, así que un botón verde y un
 * "listo" verde significan lo mismo en toda la aplicación. Los dos tonos sólidos pasan
 * 4.5:1 contra el blanco de su texto.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ok text-white hover:bg-ok-strong',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-fill hover:border-ink-faint',
  ghost: 'text-ink-soft hover:bg-fill hover:text-ink',
  danger: 'bg-alert text-white hover:bg-alert-strong',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  // Por defecto NO envia el formulario: un <button> sin type dentro de un <form> es submit,
  // y eso convierte cualquier boton auxiliar (cerrar un aviso, quitar una fila) en un envio.
  type = 'button',
  disabled,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap',
        'transition-[background-color,border-color,color,transform] duration-[120ms] ease-brand',
        // Micro-respuesta al clic: 1px de hundimiento. Se siente, no se ve.
        'active:translate-y-px',
        'disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'h-8 px-3 text-[12px]' : 'h-9 px-3.5 text-[13px]',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}
