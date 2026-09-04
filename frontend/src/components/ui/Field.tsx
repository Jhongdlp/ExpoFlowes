import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '../../lib/cn'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | undefined
  hint?: ReactNode
}

/**
 * Campo con etiqueta, pista y error enlazados por `aria-describedby` (§13, accesibilidad).
 * El error se anuncia con `role="alert"`: un lector de pantalla no depende del color.
 */
export function Field({ label, error, hint, className, id, ...props }: FieldProps) {
  const generated = useId()
  const inputId = id ?? generated
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        className={cn(
          'block h-9 w-full rounded-sm border bg-surface px-3 text-sm text-ink',
          'placeholder:text-ink-faint focus:outline-none focus:ring-1',
          error
            ? 'border-ink ring-1 ring-ink'
            : 'border-line-strong focus:border-ink focus:ring-ink',
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-[12px] text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[12px] font-medium text-ink">
          {error}
        </p>
      ) : null}
    </div>
  )
}
