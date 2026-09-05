import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  action?: ReactNode
}

/** Ninguna vista queda en blanco: se dice que no hay datos y que hacer. */
export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="animate-fade rounded-lg border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12px] text-ink-soft">{description}</p>
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  )
}
