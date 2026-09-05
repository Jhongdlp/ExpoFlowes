import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

interface Props {
  label: string
  value: string | number
  note?: string
  className?: string
}

type Tone = 'sage' | 'ink' | 'surface'

/**
 * Cada tono trae fondo de celda, color de rótulo y color de la rejilla de 1px, todo en
 * clases literales porque Tailwind lee el fuente y no resuelve nombres compuestos.
 *
 * El rótulo lleva color propio en lugar de aclararse con `opacity`: sobre un fondo claro
 * la opacidad lo dejaba por debajo del mínimo legible.
 */
const TONES: Record<Tone, string> = {
  sage: 'border-line-strong/55 bg-line-strong/45 text-ink [&>*]:bg-sage [&_.stat-label]:text-ink-soft',
  ink: 'border-ink bg-ink-soft/45 text-white [&>*]:bg-ink [&_.stat-label]:text-white/65',
  surface: 'border-line bg-line text-ink [&>*]:bg-surface [&_.stat-label]:text-ink-soft',
}

/**
 * Métrica. No es una tarjeta: es una celda de una misma banda, separada por una línea.
 * Cuatro tarjetas con sombra compiten entre sí; cuatro celdas alineadas se leen de un vistazo.
 * El color lo pone la banda; la celda solo hereda.
 */
export function Stat({ label, value, note, className }: Props) {
  return (
    <div className={cn('px-4 py-3', className)}>
      <p className="stat-label truncate text-[11px] font-medium tracking-[0.08em] uppercase">
        {label}
      </p>
      {/* La `key` en el valor fuerza a React a remontar el nodo cuando cambia: `animate-fade`
          se vuelve a disparar solo, sin estado ni efecto propio, y el numero avisa que se
          movio en vez de saltar de un valor a otro sin mas. */}
      <p key={value} className="tnum animate-fade mt-1.5 text-[19px] leading-none font-semibold tracking-tight">
        {value}
      </p>
      {note ? <p className="stat-label mt-1.5 truncate text-[11px]">{note}</p> : null}
    </div>
  )
}

/**
 * Banda de métricas: el primer bloque de cada panel.
 *
 * Va en verde salvia, no en tinta. Un rectángulo oscuro de este tamaño manda en la pantalla
 * por área, no por importancia, y deja todo lo demás pareciendo secundario. La salvia da el
 * mismo salto de jerarquía sin pelearse con el contenido, y el número sigue a 10:1.
 *
 * La rejilla se dibuja dejando asomar el fondo del contenedor entre celdas, así cuadra igual
 * con dos columnas en móvil que con cuatro en escritorio, sin líneas colgando.
 */
export function StatRow({
  children,
  tone = 'sage',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4',
        TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  )
}
