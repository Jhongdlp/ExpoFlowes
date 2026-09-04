import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '../../lib/cn'
import { CONTROL, CONTROL_TONE, LABEL } from './control'
import { FieldError } from './FieldError'

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
      <label htmlFor={inputId} className={LABEL}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        className={cn(CONTROL, CONTROL_TONE(error !== undefined), className)}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-[12px] text-ink-faint">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
