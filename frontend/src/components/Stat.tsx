import type { ComponentType, ReactNode, SVGProps } from 'react'
import { cn } from '../lib/cn'

interface Props {
  label: string
  value: string | number
  note?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  className?: string
}

export function Stat({ label, value, note, icon: Icon, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-ink-faint" /> : null}
      </div>

      <div className="mt-2">
        <span className="tnum text-2xl font-semibold tracking-tight text-ink">
          {value}
        </span>
        {note ? <p className="mt-1 text-[12px] text-ink-faint">{note}</p> : null}
      </div>
    </div>
  )
}

export function StatRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {children}
    </div>
  )
}
