import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../lib/cn'
import { CategoryBadge } from './CategoryBadge'

interface CategorySelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  categories: string[]
  placeholder?: string
  error?: string
  className?: string
  id?: string
}

/**
 * Desplegable especializado de categorías con píldoras de color reales y accesibilidad.
 */
export function CategorySelect({
  label,
  value,
  onChange,
  categories,
  placeholder,
  error,
  className,
  id,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonId = id ?? 'category-select-btn'

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const selectedCategory = value ? categories.find((c) => c === value) : null

  return (
    <div ref={containerRef} className={cn('relative space-y-1.5', className)}>
      <label htmlFor={buttonId} className="block text-[13px] font-medium text-ink">
        {label}
      </label>

      {/* Botón disparador */}
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded border bg-surface px-3 text-left text-sm text-ink transition-colors',
          'focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none',
          error ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong',
          open ? 'border-ink ring-1 ring-ink' : '',
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedCategory ? (
            <CategoryBadge category={selectedCategory} />
          ) : (
            <span className="text-ink-soft">{placeholder ?? 'Seleccionar categoría'}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-ink-faint transition-transform duration-150 shrink-0 ml-2',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {/* Menú desplegable flotante con píldoras de color */}
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-lg animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Opción vacía / placeholder */}
          {placeholder ? (
            <li
              role="option"
              aria-selected={value === ''}
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-fill',
                value === '' ? 'bg-fill/70 font-medium text-ink' : '',
              )}
            >
              <span>{placeholder}</span>
              {value === '' ? <Check className="h-4 w-4 text-ink" /> : null}
            </li>
          ) : null}

          {/* Opciones con CategoryBadge y sus colores */}
          {categories.map((category) => {
            const isSelected = value === category
            return (
              <li
                key={category}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(category)
                  setOpen(false)
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded px-2.5 py-2 text-sm transition-colors hover:bg-fill',
                  isSelected ? 'bg-fill/70 font-medium' : '',
                )}
              >
                <CategoryBadge category={category} />
                {isSelected ? <Check className="h-4 w-4 text-ink" /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="text-[12px] font-medium text-ink">
          {error}
        </p>
      ) : null}
    </div>
  )
}
