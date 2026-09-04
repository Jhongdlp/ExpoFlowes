interface Props {
  used: number
  total: number
  label: string
}

/**
 * Barra de cupo. Un stand pequeño puede tener cuota 0 (consecuencia de `floor`, §5.2): se
 * dibuja la pista vacia y se dice "sin cupo", en vez de dividir por cero.
 */
export function Meter({ used, total, label }: Props) {
  const ratio = total === 0 ? 0 : Math.min(used / total, 1)

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={used}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuetext={total === 0 ? 'Sin cupo asignable' : `${used} de ${total}`}
      className="h-[3px] w-full bg-fill"
    >
      <div className="h-full bg-ink" style={{ width: `${ratio * 100}%` }} />
    </div>
  )
}
