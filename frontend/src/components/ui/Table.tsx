import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, TableHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode
  className?: string
}

/**
 * Tabla de datos de alta legibilidad: contenedor con borde sutil,
 * encabezado destacado y filas con separacion clara.
 */
export function Table({ children, className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className={cn('w-full text-left text-[13px]', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TH({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'label-caps border-b border-line bg-fill/40 px-4 py-3 font-semibold text-ink-faint',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TD({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3.5 align-middle text-ink', className)} {...props}>
      {children}
    </td>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}
