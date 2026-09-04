import { cn } from '../../lib/cn'

interface Props {
  indeterminate?: boolean
  progress?: number
  label?: string
  sublabel?: string
  className?: string
}

/**
 * Progreso de una operación en curso. Indeterminado por defecto: el servidor no informa
 * de avance parcial, y fingir un porcentaje es mentirle al usuario.
 */
export function ProgressBar({
  indeterminate = true,
  progress = 0,
  label,
  sublabel,
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <div className={cn('w-full space-y-1.5', className)} aria-busy="true" aria-live="polite">
      {label || sublabel ? (
        <div className="flex items-baseline justify-between gap-3 text-[12px]">
          {label ? <span className="font-medium text-ink">{label}</span> : null}
          {sublabel ? <span className="truncate text-[11px] text-ink-faint">{sublabel}</span> : null}
        </div>
      ) : null}
      <div
        className="relative h-[3px] w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          <div className="animate-progress absolute inset-y-0 w-1/4 rounded-full bg-ink" />
        ) : (
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-300 ease-brand"
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  )
}
