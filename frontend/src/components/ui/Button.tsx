import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft disabled:bg-line-strong',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-fill',
  ghost: 'text-ink-soft hover:text-ink hover:bg-fill',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  // Por defecto NO envia el formulario: un <button> sin type dentro de un <form> es submit,
  // y eso convierte cualquier boton auxiliar (cerrar un aviso, quitar una fila) en un envio.
  type = 'button',
  className,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
