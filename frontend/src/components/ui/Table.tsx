import type { CSSProperties, ReactNode, ThHTMLAttributes, TdHTMLAttributes, TableHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode
  /**
   * En móvil, cada fila se convierte en una ficha y cada celda muestra el nombre de su
   * columna (el `label` del `TD`). Se apaga solo cuando la tabla es una hoja de cálculo de
   * columnas arbitrarias, donde apilar no ayuda y lo correcto es desplazar.
   */
  stack?: boolean
  className?: string
}

/**
 * Tabla de datos. Sin cebra ni bordes verticales: la cuadrícula la dibuja la alineación,
 * y una línea de más por columna es ruido en una pantalla que se lee todo el día.
 * Altura de fila fija (48px) para que el esqueleto de carga ocupe exactamente su sitio.
 */
export function Table({ children, stack = true, className, ...props }: TableProps) {
  return (
    <div className="surface overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-left text-[13px]',
          stack ? 'table-stack' : '',
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export function TH({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'label-caps h-9 border-b border-line bg-fill px-3 font-medium whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /**
   * Nombre de la columna. En móvil se antepone al dato; sin él, la celda ocupa el ancho
   * completo de la ficha (útil para la celda principal y para las casillas de selección).
   */
  label?: string
}

export function TD({ label, className, children, ...props }: TDProps) {
  return (
    <td
      data-label={label}
      className={cn('h-12 px-3 align-middle text-ink', className)}
      {...props}
    >
      {label === undefined ? (
        children
      ) : (
        <>
          {/* El rotulo solo existe en la ficha de movil; en la tabla lo dice la cabecera,
              asi que para el lector de pantalla es ruido repetido. El dato va envuelto
              porque una celda puede tener varios hijos ("1" + "/ 16") y la ficha necesita
              tratarlos como un solo bloque; fuera de la ficha el envoltorio es
              `display: contents` y no dibuja caja ninguna. */}
          <span className="cell-label" aria-hidden="true">
            {label}
          </span>
          <span className="cell-value">{children}</span>
        </>
      )}
    </td>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}

/** Fila con su realce de selección y de hover ya resueltos, iguales en todos los listados. */
export function TR({
  selected = false,
  className,
  style,
  children,
}: {
  selected?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <tr
      data-selected={selected || undefined}
      style={style}
      className={cn(
        'transition-colors duration-[120ms]',
        // Seleccionada lleva el rosa de marca; el gris es solo el paso del ratón. Así
        // "esto está marcado" y "estoy encima de esto" no se dicen con el mismo color.
        selected ? 'bg-brand-soft' : 'hover:bg-fill/70',
        className,
      )}
    >
      {children}
    </tr>
  )
}
