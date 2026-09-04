import { Meter } from '../../components/ui/Meter'
import { cn } from '../../lib/cn'

interface Props {
  categories: string[]
  quota: Record<string, number>
  assigned: Record<string, number>
  available: Record<string, number>
  className?: string
}

const CATEGORY_RULES: Record<string, string> = {
  Exhibitor: '2 por cada 5 m²',
  Guest: '2 por cada 10 m²',
  Service: '3 por cada 10 m²',
}

/**
 * Visualizador sobrio de cupos por categoria: lectura directa, cifras tabulares y progreso limpio.
 */
export function QuotaTable({ categories, quota, assigned, available, className }: Props) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      {categories.map((category) => {
        const total = quota[category] ?? 0
        const used = assigned[category] ?? 0
        const free = available[category] ?? 0
        const rule = CATEGORY_RULES[category] ?? ''
        const percentage = total === 0 ? 0 : Math.round((used / total) * 100)

        return (
          <div
            key={category}
            className="flex flex-col justify-between rounded-lg border border-line bg-surface p-4"
          >
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{category}</span>
                {rule ? <span className="text-[11px] text-ink-faint">{rule}</span> : null}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="tnum text-2xl font-semibold text-ink">{used}</span>
                  <span className="text-[13px] text-ink-faint">/ {total}</span>
                </div>
                <span className="tnum text-[12px] font-medium text-ink-soft">
                  {total === 0 ? 'Sin cupo' : `${free} disponibles`}
                </span>
              </div>

              <div className="mt-2.5">
                <Meter used={used} total={total} label={`Credenciales ${category}`} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-faint">
              <span>{percentage}% asignado</span>
              {total === 0 ? <span>Metraje menor al bloque</span> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
