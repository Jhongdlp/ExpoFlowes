import { useEffect, useRef } from 'react'

import { useTranslation } from '../../features/i18n/LanguageContext'
import { Button } from './Button'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * `<dialog>` nativo: el navegador ya trae la trampa de foco, el cierre con Escape y el
 * fondo inerte. Reimplementarlo con divs seria mas codigo y peor accesibilidad.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="animate-rise m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-5 text-ink backdrop:bg-ink/35"
    >
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{description}</p>
      {/* En móvil la confirmación va primero y ambos botones son del ancho del diálogo:
          un botón de 90px en la esquina de una pantalla táctil se falla. */}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          {t.common.cancel}
        </Button>
        {/* La acción destructiva se marca en el texto, no con un botón rojo entero. */}
        <Button variant="danger" size="sm" loading={busy} onClick={onConfirm}>
          {busy ? t.common.deleting : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
