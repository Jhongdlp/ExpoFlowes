import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  children: ReactNode
}

export function FormSection({ title, description, children }: Props) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h2 className="label-caps">{title}</h2>
      {description ? <p className="mt-1 text-[12px] text-ink-soft">{description}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}
