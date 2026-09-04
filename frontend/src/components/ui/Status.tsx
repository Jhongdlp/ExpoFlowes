import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

export type StatusTone = 'ok' | 'error' | 'pending' | 'muted'

const TONES: Record<StatusTone, string> = {
  ok: 'text-ok',
  error: 'text-alert',
  pending: 'text-ink-soft',
  muted: 'text-ink-faint',
}

const DOTS: Record<StatusTone, string> = {
  ok: 'bg-ok',
  error: 'bg-alert',
  pending: 'bg-ink-faint',
  muted: 'border border-line-strong',
}

/**
 * Indicador de estado de una fila o de un dato: punto + palabra. Siempre las dos cosas,
 * nunca solo el punto: el color es refuerzo, el texto es el mensaje.
 */
export function Status({
  tone,
  label,
  className,
}: {
  tone: StatusTone
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[12px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {tone === 'pending' ? (
        <Spinner className="h-3 w-3" />
      ) : (
        <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOTS[tone])} />
      )}
      {label}
    </span>
  )
}
