import { Meter } from '../../components/ui/Meter'

interface Props {
  categories: string[]
  quota: Record<string, number>
  assigned: Record<string, number>
  available: Record<string, number>
}

/**
 * Cupo por categoria de credencial. Las categorias llegan de las reglas del evento, no de
 * una lista fija en el cliente: si la feria define otra, la tabla la muestra sola.
 */
export function QuotaTable({ categories, quota, assigned, available }: Props) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {categories.map((category) => {
        const total = quota[category] ?? 0
        const used = assigned[category] ?? 0
        return (
          <div key={category} className="py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[13px] font-medium">{category}</p>
              <p className="tnum text-[13px] text-ink-soft">
                {used} <span className="text-ink-faint">de</span> {total}
              </p>
            </div>
            <div className="mt-2">
              <Meter used={used} total={total} label={`Credenciales ${category}`} />
            </div>
            <p className="mt-2 text-[12px] text-ink-faint">
              {total === 0
                ? 'Sin cupo para esta categoría con el metraje actual.'
                : `${available[category] ?? 0} disponibles`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
