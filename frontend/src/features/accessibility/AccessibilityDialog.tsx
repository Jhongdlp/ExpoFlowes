import { useEffect, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { useTranslation } from '../i18n/LanguageContext'
import {
  useAccessibility,
  type TextSize,
} from './AccessibilityContext'

function SwitchControl({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-line bg-surface p-3.5 sm:p-3 transition-colors hover:border-line-strong hover:bg-fill/40 active:bg-fill/60"
    >
      <div className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
            {description}
          </span>
        )}
      </div>
      <div className="relative inline-flex shrink-0 items-center pt-0.5">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={cn(
            'h-5 w-9 rounded-full transition-colors duration-200 ease-brand',
            checked ? 'bg-ok' : 'bg-line-strong/40',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ink',
          )}
        >
          <div
            className={cn(
              'h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-brand mt-0.5 ml-0.5',
              checked ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </div>
      </div>
    </label>
  )
}

export function AccessibilityDialog() {
  const {
    settings,
    updateSetting,
    resetDefaults,
    isDialogOpen,
    closeDialog,
  } = useAccessibility()

  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Control de arrastre táctil (swipe down to dismiss) en móvil
  const dragStartY = useRef<number | null>(null)
  const isDragging = useRef<boolean>(false)
  const currentDeltaY = useRef<number>(0)

  const textSizes: { value: TextSize; label: string; sub: string }[] = [
    { value: 'normal', label: t.a11y.normal, sub: '100%' },
    { value: 'large', label: t.a11y.large, sub: '115%' },
    { value: 'xlarge', label: t.a11y.xlarge, sub: '130%' },
  ]

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (isDialogOpen && !dialog.open) {
      dialog.style.transform = ''
      dialog.style.opacity = ''
      dialog.style.transition = ''
      dialog.showModal()
    }
    if (!isDialogOpen && dialog.open) {
      dialog.close()
    }
  }, [isDialogOpen])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    const isClickOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom

    if (isClickOutside) {
      closeDialog()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    const scrollContainer = contentRef.current
    const isScrolledToTop = !scrollContainer || scrollContainer.scrollTop <= 0

    if (isScrolledToTop) {
      dragStartY.current = touch.clientY
      isDragging.current = true
      currentDeltaY.current = 0
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch || !isDragging.current || dragStartY.current === null) return
    const dialog = dialogRef.current
    if (!dialog) return

    const deltaY = touch.clientY - dragStartY.current
    if (deltaY > 0) {
      currentDeltaY.current = deltaY
      dialog.style.transform = `translateY(${deltaY}px)`
      dialog.style.transition = 'none'
    } else {
      currentDeltaY.current = 0
      dialog.style.transform = ''
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false
    dragStartY.current = null
    const dialog = dialogRef.current
    if (!dialog) return

    if (currentDeltaY.current > 70) {
      dialog.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out'
      dialog.style.transform = 'translateY(100%)'
      dialog.style.opacity = '0'
      setTimeout(() => {
        if (dialog) {
          dialog.style.transform = ''
          dialog.style.opacity = ''
          dialog.style.transition = ''
        }
        closeDialog()
      }, 180)
    } else {
      dialog.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      dialog.style.transform = 'translateY(0)'
      setTimeout(() => {
        if (dialog) {
          dialog.style.transform = ''
          dialog.style.transition = ''
        }
      }, 200)
    }
    currentDeltaY.current = 0
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault()
        closeDialog()
      }}
      className={cn(
        // Asegurar que el diálogo esté completamente oculto cuando está cerrado
        '[&:not([open])]:hidden open:flex open:flex-col',
        // Móvil: Modal nativo bottom-sheet emergente desde abajo
        'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:m-0 max-sm:w-full max-sm:max-w-none',
        'max-sm:max-h-[88dvh] max-sm:rounded-t-[22px] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:border-t max-sm:border-line',
        'max-sm:p-4 max-sm:pt-2 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom,0.75rem))] max-sm:shadow-[0_-12px_40px_rgba(0,0,0,0.28)] max-sm:animate-sheet-up',
        // Escritorio y tableta: Modal centrado
        'sm:m-auto sm:max-h-[90vh] sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-xl sm:border sm:border-line sm:p-5 sm:shadow-2xl sm:animate-rise',
        // Estilos base compartidos
        'bg-surface text-ink backdrop:bg-ink/45 backdrop:backdrop-blur-[2px] overscroll-contain outline-none',
      )}
      aria-labelledby="accessibility-dialog-title"
    >
      {/* Pestaña / Handle táctil superior para móvil */}
      <div
        className="flex shrink-0 cursor-grab items-center justify-center py-1 sm:hidden touch-none select-none active:cursor-grabbing"
        aria-hidden="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="h-1.5 w-11 rounded-full bg-line-strong/40 active:bg-line-strong/70 transition-colors" />
      </div>

      {/* Cabecera */}
      <div
        className="flex shrink-0 items-start justify-between gap-3 border-b border-line pb-3 max-sm:pt-1 sm:pb-3.5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-ink">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <circle cx="12" cy="4.5" r="2" />
                <path d="M5 9.5l7 1.5 7-1.5" />
                <path d="M12 11v5" />
                <path d="M8 21l4-5 4 5" />
              </svg>
            </span>
            <h2 id="accessibility-dialog-title" className="text-[16px] font-semibold tracking-tight text-ink">
              {t.a11y.title}
            </h2>
          </div>
          <p className="mt-1 text-[12px] text-ink-soft">
            {t.a11y.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={closeDialog}
          aria-label={t.a11y.close}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-fill hover:text-ink active:bg-fill/80"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Controles de Configuración con scroll independiente */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto min-h-0 space-y-3 py-3 pr-0.5 sm:pr-1"
      >
        {/* Tamaño del texto */}
        <div className="rounded-lg border border-line bg-surface p-3 sm:p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">{t.a11y.textSize}</span>
            <span className="text-[11px] font-semibold text-ink-faint">
              {settings.textSize === 'normal'
                ? '100%'
                : settings.textSize === 'large'
                  ? '115%'
                  : '130%'}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
            {t.a11y.textSizeDesc}
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-lg border border-line bg-fill/50 p-1">
            {textSizes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSetting('textSize', opt.value)}
                className={cn(
                  'flex min-h-[44px] flex-col items-center justify-center rounded-md py-1.5 px-1 text-center transition-all',
                  settings.textSize === opt.value
                    ? 'bg-surface font-semibold text-ink shadow-sm ring-1 ring-line-strong/40'
                    : 'text-ink-soft hover:bg-surface/60 hover:text-ink active:bg-surface/80',
                )}
              >
                <span className="text-[12px]">{opt.label}</span>
                <span className="text-[10px] text-ink-faint">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alto Contraste */}
        <SwitchControl
          id="acc-high-contrast"
          label={t.a11y.highContrast}
          description={t.a11y.highContrastDesc}
          checked={settings.highContrast}
          onChange={(checked) => updateSetting('highContrast', checked)}
        />

        {/* Reducción de Movimiento */}
        <SwitchControl
          id="acc-reduced-motion"
          label={t.a11y.reducedMotion}
          description={t.a11y.reducedMotionDesc}
          checked={settings.reducedMotion}
          onChange={(checked) => updateSetting('reducedMotion', checked)}
        />

        {/* Resaltado de Foco */}
        <SwitchControl
          id="acc-enhanced-focus"
          label={t.a11y.enhancedFocus}
          description={t.a11y.enhancedFocusDesc}
          checked={settings.enhancedFocus}
          onChange={(checked) => updateSetting('enhancedFocus', checked)}
        />

        {/* Espaciado de Lectura */}
        <SwitchControl
          id="acc-wide-spacing"
          label={t.a11y.wideSpacing}
          description={t.a11y.wideSpacingDesc}
          checked={settings.wideSpacing}
          onChange={(checked) => updateSetting('wideSpacing', checked)}
        />

        {/* Tipografía de Máxima Legibilidad */}
        <SwitchControl
          id="acc-readable-font"
          label={t.a11y.readableFont}
          description={t.a11y.readableFontDesc}
          checked={settings.readableFont}
          onChange={(checked) => updateSetting('readableFont', checked)}
        />
      </div>

      {/* Pie de Acciones */}
      <div className="mt-2 flex shrink-0 flex-col-reverse gap-2 border-t border-line pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-3.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetDefaults}
          className="text-[12px] max-sm:w-full max-sm:py-2.5"
        >
          {t.a11y.resetDefaults}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={closeDialog}
          className="text-[12px] max-sm:w-full max-sm:py-2.5"
        >
          {t.a11y.done}
        </Button>
      </div>
    </dialog>
  )
}
