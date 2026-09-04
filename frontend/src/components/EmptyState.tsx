import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  action?: ReactNode
}

/** Ninguna vista queda en blanco: se dice que no hay datos y que hacer (§13). */
export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-soft">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
