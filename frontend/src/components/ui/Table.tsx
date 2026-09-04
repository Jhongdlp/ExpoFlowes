import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

/** Tabla de datos: reglas finas, sin cebra y sin bordes verticales. La lee la tipografia. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-y border-line text-[13px]">{children}</table>
    </div>
  )
}

export function TH({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('label-caps border-b border-line px-3 py-2 text-left font-medium first:pl-0 last:pr-0', className)}
      {...props}
    >
      {children}
    </th>
  )
}

export function TD({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-3 py-3 align-top first:pl-0 last:pr-0', className)} {...props}>
      {children}
    </td>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}
