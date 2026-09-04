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
      className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-fill/40"
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

  const textSizes: { value: TextSize; label: string; sub: string }[] = [
    { value: 'normal', label: t.a11y.normal, sub: '100%' },
    { value: 'large', label: t.a11y.large, sub: '115%' },
    { value: 'xlarge', label: t.a11y.xlarge, sub: '130%' },
  ]

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (isDialogOpen && !dialog.open) {
      dialog.showModal()
    }
    if (!isDialogOpen && dialog.open) {
      dialog.close()
    }
  }, [isDialogOpen])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        closeDialog()
      }}
      className="animate-rise m-auto max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl backdrop:bg-ink/40"
      aria-labelledby="accessibility-dialog-title"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3.5">
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
          className="rounded-md p-1 text-ink-soft hover:bg-fill hover:text-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Controles de Configuración */}
      <div className="mt-4 space-y-3">
        {/* Tamaño del texto */}
        <div className="rounded-lg border border-line bg-surface p-3">
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
                  'flex flex-col items-center justify-center rounded-md py-1.5 text-center transition-all',
                  settings.textSize === opt.value
                    ? 'bg-surface font-semibold text-ink shadow-sm ring-1 ring-line-strong/40'
                    : 'text-ink-soft hover:bg-surface/60 hover:text-ink',
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
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-line pt-3.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetDefaults}
          className="text-[12px]"
        >
          {t.a11y.resetDefaults}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={closeDialog}
          className="text-[12px]"
        >
          {t.a11y.done}
        </Button>
      </div>
    </dialog>
  )
}
