import { cn } from '../../lib/cn'

interface Props {
  used: number
  total: number
  label: string
  /** Color de la barra. Por defecto tinta; una categoría pasa aquí el suyo. */
  barClassName?: string
  className?: string
}

/**
 * Barra de cupo. Se pinta en tinta hasta que se agota: al 100% pasa a la marca de alerta,
 * que es el único momento en que el color aporta información.
 */
export function Meter({ used, total, label, barClassName, className }: Props) {
  const ratio = total === 0 ? 0 : Math.min(used / total, 1)
  const full = total > 0 && used >= total

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={used}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuetext={total === 0 ? 'Sin cupo' : `${used} de ${total}`}
      className={cn('h-1 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width,background-color] duration-300 ease-brand',
          full ? 'bg-alert' : (barClassName ?? 'bg-ink'),
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}
