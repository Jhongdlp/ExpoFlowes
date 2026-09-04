import { useTranslation } from '../features/i18n/LanguageContext'
import { cn } from '../lib/cn'

/**
 * Etiqueta de categoría de credencial.
 *
 * El color aquí sí paga su sitio: la categoría es lo que más se escanea en un listado de
 * credenciales, y tres tonos distintos se leen antes que tres palabras. Son tonos
 * desaturados y ninguno es rojo ni verde, que están reservados para estado; el nombre de
 * la categoría va siempre escrito, así que en blanco y negro o sin distinguir colores la
 * información no se pierde.
 *
 * Las categorías vienen de `credential_rules`, no del código: una categoría nueva no
 * rompe nada, sale con la marca neutra.
 */
const TONES: Record<string, string> = {
  Exhibitor: 'border-cat-exhibitor/25 bg-cat-exhibitor-soft text-cat-exhibitor',
  Guest: 'border-cat-guest/25 bg-cat-guest-soft text-cat-guest',
  Service: 'border-cat-service/25 bg-cat-service-soft text-cat-service',
}

const FALLBACK = 'border-line bg-fill text-ink-soft'

/** Color de la marca de una categoría, para barras y puntos fuera de la píldora. */
export const CATEGORY_BAR: Record<string, string> = {
  Exhibitor: 'bg-cat-exhibitor',
  Guest: 'bg-cat-guest',
  Service: 'bg-cat-service',
}

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const { t } = useTranslation()
  const displayLabel = (t.categories as Record<string, string>)[category] ?? category

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border py-0.5 pr-2 pl-1.5 text-[11px] font-medium whitespace-nowrap',
        TONES[category] ?? FALLBACK,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', CATEGORY_BAR[category] ?? 'bg-ink-faint')}
      />
      {displayLabel}
    </span>
  )
}
