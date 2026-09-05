import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId, useState } from 'react'

import { cn } from '../../lib/cn'
import { CONTROL, CONTROL_TONE, LABEL } from './control'
import { FieldError } from './FieldError'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | undefined
  hint?: ReactNode
}

/** Ojo/ojo-tachado para el botón de mostrar contraseña, mismo trazo que el resto de iconos del sistema. */
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {open ? null : <path d="M3 3l18 18" />}
    </svg>
  )
}

/**
 * Campo con etiqueta, pista y error enlazados por `aria-describedby` (§13, accesibilidad).
 * El error se anuncia con `role="alert"`: un lector de pantalla no depende del color.
 * `type="password"` gana un botón para mostrar/ocultar en texto plano.
 */
export function Field({ label, error, hint, className, id, type, ...props }: FieldProps) {
  const generated = useId()
  const inputId = id ?? generated
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className={LABEL}>
        {label}
      </label>
      <div className={isPassword ? 'relative' : undefined}>
        <input
          id={inputId}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          className={cn(CONTROL, CONTROL_TONE(error !== undefined), isPassword && 'pr-9', className)}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-faint transition-colors duration-[120ms] hover:text-ink"
          >
            <EyeIcon open={visible} />
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-[12px] text-ink-faint">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
