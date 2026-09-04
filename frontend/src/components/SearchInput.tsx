import { Search, X } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Campo de búsqueda por teclado de alta respuesta con botón de limpieza instantáneo.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative flex-1', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded border border-line bg-surface pl-9 pr-8 text-sm text-ink placeholder:text-ink-faint transition-colors',
          'focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink hover:border-line-strong',
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:bg-fill hover:text-ink transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Normaliza cadenas quitando tildes y diacríticos para búsqueda insensible a acentos y mayúsculas.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
