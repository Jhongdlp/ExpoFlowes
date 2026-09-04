import type { SelectHTMLAttributes } from 'react'
import { useId } from 'react'

import { cn } from '../../lib/cn'

export interface Option {
  value: string
  label: string
  className?: string
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Option[]
  /** Texto de la opcion vacia. Si falta, el campo es obligatorio. */
  placeholder?: string
  error?: string | undefined
}

/**
 * `<select>` nativo: teclado, busqueda por letra y accesibilidad los da el navegador
 * mejor que cualquier lista propia.
 */
export function Select({ label, options, placeholder, error, className, id, ...props }: Props) {
  const generated = useId()
  const selectId = id ?? generated
  const errorId = `${selectId}-error`

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'block h-9 w-full rounded border bg-surface px-3 text-sm text-ink transition-colors',
          'focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none',
          error ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong',
          className,
        )}
        {...props}
      >
        {placeholder === undefined ? null : <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} className={option.className}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="text-[12px] font-medium text-ink">
          {error}
        </p>
      ) : null}
    </div>
  )
}
