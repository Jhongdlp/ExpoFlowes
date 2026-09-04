import { cn } from '../../lib/cn'

interface Props {
  used: number
  total: number
  label: string
  className?: string
}

/**
 * Barra de progreso sobria y de lectura rapida.
 */
export function Meter({ used, total, label, className }: Props) {
  const ratio = total === 0 ? 0 : Math.min(used / total, 1)

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={used}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuetext={total === 0 ? 'Sin cupo' : `${used} de ${total}`}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <div
        className="h-full bg-ink transition-all duration-200"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}
