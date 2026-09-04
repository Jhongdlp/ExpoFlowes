import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

export type Tone = 'neutral' | 'error' | 'success'

/**
 * Un aviso se distingue por la regla vertical de la izquierda y por su marca, no por un
 * fondo de color a pantalla completa. El fondo teñido, cuando lo hay, es casi blanco.
 */
const TONES: Record<Tone, { box: string; mark: string }> = {
  neutral: { box: 'border-l-ink bg-fill/60', mark: 'text-ink-faint' },
  error: { box: 'border-l-alert bg-alert-soft', mark: 'text-alert' },
  success: { box: 'border-l-ok bg-ok-soft', mark: 'text-ok' },
}

const GLYPH: Record<Tone, string> = { neutral: '·', error: '!', success: '✓' }

interface Props {
  title: string
  tone?: Tone
  children?: ReactNode
  /** Persistente: solo se cierra si el usuario lo cierra (§13, error de duplicado). */
  onDismiss?: () => void
  className?: string
}

export function Notice({ title, tone = 'neutral', children, onDismiss, className }: Props) {
  const style = TONES[tone]

  return (
    <div
      role="alert"
      className={cn(
        'animate-rise rounded-lg border border-line border-l-2 px-4 py-3',
        style.box,
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            'mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border border-current text-[10px] leading-none font-bold',
            style.mark,
          )}
        >
          {GLYPH[tone]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">{title}</p>
          {children ? <div className="mt-1 text-[12px] text-ink-soft">{children}</div> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar aviso"
            className="-mt-0.5 -mr-1 shrink-0 rounded-sm px-1 text-[15px] leading-none text-ink-faint transition-colors duration-[120ms] hover:bg-ink/5 hover:text-ink"
          >
            &times;
          </button>
        ) : null}
      </div>
    </div>
  )
}
