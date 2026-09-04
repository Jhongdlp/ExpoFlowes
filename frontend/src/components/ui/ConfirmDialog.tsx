import { useEffect, useRef } from 'react'

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
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-sm border border-line bg-surface p-6 text-ink backdrop:bg-ink/40"
    >
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="mt-2 text-[13px] text-ink-soft">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? 'Eliminando…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
