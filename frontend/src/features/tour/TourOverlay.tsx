import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { useTranslation } from '../i18n/LanguageContext'
import type { TourStep } from './tourSteps'

const PAD = 8
const MARGIN = 12
const MOBILE_BREAKPOINT = 640

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function measure(selector: string): Rect | null {
  const el = document.querySelector(selector)
  if (el === null) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

interface Props {
  steps: TourStep[]
  stepIndex: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

/**
 * Recorrido de bienvenida: resalta un elemento real de la interfaz por paso (spotlight con
 * `box-shadow`, sin librería) y oscurece el resto. Si el elemento del paso actual no existe
 * en la pantalla en la que arrancó el tour, ese paso se salta solo en vez de quedar colgado.
 */
export function TourOverlay({ steps, stepIndex, onNext, onPrev, onSkip }: Props) {
  const { t } = useTranslation()
  const step = steps[stepIndex]
  const [target, setTarget] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardSize, setCardSize] = useState({ width: 288, height: 160 })

  useEffect(() => {
    if (step === undefined) return
    const el = document.querySelector(step.selector)
    if (el === null) {
      onNext()
      return
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })

    const recompute = () => setTarget(measure(step.selector))
    recompute()
    const id = window.setTimeout(recompute, 260) // tras el scroll suave

    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, step?.selector])

  useLayoutEffect(() => {
    if (cardRef.current === null) return
    const el = cardRef.current
    const update = () => setCardSize({ width: el.offsetWidth, height: el.offsetHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [step?.title, step?.body])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSkip()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSkip])

  if (step === undefined || target === null) return null

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT
  const vw = window.innerWidth
  const vh = window.innerHeight

  const spotlightStyle = {
    top: target.top - PAD,
    left: target.left - PAD,
    width: target.width + PAD * 2,
    height: target.height + PAD * 2,
  }

  const cardStyle: { top?: number; left?: number; bottom?: number; right?: number; width?: number } = isMobile
    ? { left: MARGIN, right: MARGIN, bottom: MARGIN }
    : (() => {
        const fitsRight = target.left + target.width + MARGIN * 2 + cardSize.width < vw
        const fitsBelow = target.top + target.height + MARGIN * 2 + cardSize.height < vh
        if (fitsRight) {
          return {
            left: target.left + target.width + MARGIN + PAD,
            top: clamp(target.top, MARGIN, vh - cardSize.height - MARGIN),
          }
        }
        if (fitsBelow) {
          return {
            top: target.top + target.height + MARGIN + PAD,
            left: clamp(target.left, MARGIN, vw - cardSize.width - MARGIN),
          }
        }
        return {
          top: Math.max(MARGIN, target.top - MARGIN - PAD - cardSize.height),
          left: clamp(target.left, MARGIN, vw - cardSize.width - MARGIN),
        }
      })()

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Bloquea la interacción con el resto de la app mientras dura el tour. */}
      <div className="absolute inset-0" />

      {/* Recorte iluminado: un solo div con box-shadow doble (anillo + oscurecido). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed rounded-lg transition-all duration-300 ease-out"
        style={{
          ...spotlightStyle,
          boxShadow: '0 0 0 3px rgba(255,255,255,0.95), 0 0 0 9999px rgba(15,23,20,0.72)',
        }}
      />

      <div
        ref={cardRef}
        className={cn(
          'fixed w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-line-strong bg-surface p-4 text-ink shadow-[0_16px_40px_-10px_rgba(0,0,0,0.35)]',
          isMobile ? 'w-auto' : undefined,
        )}
        style={cardStyle}
      >
        <p className="text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
          {t.tour.stepCount.replace('{current}', String(stepIndex + 1)).replace('{total}', String(steps.length))}
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-ink">{step.title}</h2>
        <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">{step.body}</p>

        <div className="mt-3.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-[12px] font-medium text-ink-faint underline underline-offset-2 hover:text-ink-soft"
          >
            {t.tour.skip}
          </button>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 ? (
              <Button variant="secondary" size="sm" onClick={onPrev}>
                {t.tour.prev}
              </Button>
            ) : null}
            <Button size="sm" onClick={onNext}>
              {stepIndex + 1 >= steps.length ? t.tour.done : t.tour.next}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
