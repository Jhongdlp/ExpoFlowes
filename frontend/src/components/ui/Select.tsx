import type { SelectHTMLAttributes } from 'react'
import { useId } from 'react'

import { cn } from '../../lib/cn'
import { CONTROL, CONTROL_TONE, LABEL } from './control'
import { FieldError } from './FieldError'

export interface Option {
  value: string
  label: string
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
      <label htmlFor={selectId} className={LABEL}>
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(CONTROL, CONTROL_TONE(error !== undefined), 'cursor-pointer pr-8', className)}
        {...props}
      >
        {placeholder === undefined ? null : <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  )
}
