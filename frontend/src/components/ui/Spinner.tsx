import { cn } from '../../lib/cn'

/**
 * Indicador de trabajo en curso: un arco que gira. Hereda el color del texto, así que
 * no introduce un color propio en ninguna parte donde se use.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full',
        'border-[1.5px] border-current border-r-transparent opacity-70',
        className,
      )}
    />
  )
}
