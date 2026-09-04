import type { InputHTMLAttributes } from 'react'

import { useTranslation } from '../features/i18n/LanguageContext'
import { cn } from '../lib/cn'
import { CONTROL, CONTROL_TONE } from './ui/control'
import { Spinner } from './ui/Spinner'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Consulta en vuelo: la lupa se convierte en indicador de actividad, sin mover nada. */
  busy?: boolean
  className?: string
}

/** Búsqueda del servidor. Misma geometría que cualquier otro control del sistema. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  busy = false,
  className,
  ...props
}: SearchInputProps) {
  const { t } = useTranslation()
  return (
    <div className={cn('relative flex-1', className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint">
        {busy ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            aria-hidden="true"
            className="h-3.5 w-3.5"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
        )}
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t.common.search}
        className={cn(CONTROL, CONTROL_TONE(false), 'pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden')}
        {...props}
      />
      {value === '' ? null : (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="animate-fade absolute top-1/2 right-2 -translate-y-1/2 rounded-sm px-1.5 py-0.5 text-[15px] leading-none text-ink-faint transition-colors duration-[120ms] hover:bg-fill hover:text-ink"
        >
          &times;
        </button>
      )}
    </div>
  )
}

/** Barra de filtros: la misma caja en todos los listados, para que el ojo no la busque. */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'surface-muted flex flex-col gap-3 p-3 sm:flex-row sm:items-end',
        // En móvil los controles ocupan el ancho completo; apretarlos en fila no es
        // adaptarse, es encogerlos hasta que dejan de poder usarse con el pulgar.
        '[&_button]:w-full sm:[&_button]:w-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}
