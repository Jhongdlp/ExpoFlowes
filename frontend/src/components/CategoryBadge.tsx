import { cn } from '../lib/cn'

export const CATEGORY_COLORS: Record<string, { pill: string; option: string }> = {
  Exhibitor: {
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-800 font-medium',
    option: 'text-emerald-800 bg-emerald-50',
  },
  Guest: {
    pill: 'border-amber-200 bg-amber-50 text-amber-800 font-medium',
    option: 'text-amber-800 bg-amber-50',
  },
  Service: {
    pill: 'border-purple-200 bg-purple-50 text-purple-800 font-medium',
    option: 'text-purple-800 bg-purple-50',
  },
}

const FALLBACK_COLOR = {
  pill: 'border-slate-200 bg-slate-100 text-slate-800 font-medium',
  option: 'text-slate-800',
}

export function getCategoryPillStyle(category: string): string {
  return (CATEGORY_COLORS[category] ?? FALLBACK_COLOR).pill
}

export function getCategoryOptionStyle(category: string): string {
  return (CATEGORY_COLORS[category] ?? FALLBACK_COLOR).option
}

interface Props {
  category: string
  className?: string
}

/**
 * Píldora sobria con color diferenciador por categoría (sin brillos ni exageraciones).
 */
export function CategoryBadge({ category, className }: Props) {
  const pillStyle = getCategoryPillStyle(category)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-[11px] leading-tight',
        pillStyle,
        className,
      )}
    >
      {category}
    </span>
  )
}
