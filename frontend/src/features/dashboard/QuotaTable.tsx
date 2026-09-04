import { CATEGORY_BAR } from '../../components/CategoryBadge'
import { Meter } from '../../components/ui/Meter'
import { Status } from '../../components/ui/Status'
import { ruleLabel, useCredentialRules } from '../../hooks/use-rules'
import { cn } from '../../lib/cn'

interface Props {
  categories: string[]
  quota: Record<string, number>
  assigned: Record<string, number>
  available: Record<string, number>
  className?: string
}

/**
 * Cupo por categoria: una fila por categoria dentro de una sola superficie, no tres tarjetas.
 * La regla que genera cada cuota se lee de `credential_rules` (§7.1): ningun numero de
 * negocio se escribe aqui, ni siquiera como texto de ayuda.
 */
export function QuotaTable({ categories, quota, assigned, available, className }: Props) {
  const rules = useCredentialRules()

  const ruleText = (category: string): string => {
    const rule = rules.data?.find((item) => item.category === category)
    return rule === undefined ? '' : ruleLabel(rule)
  }

  return (
    <div className={cn('surface divide-y divide-line', className)}>
      {categories.map((category) => {
        const total = quota[category] ?? 0
        const used = assigned[category] ?? 0
        const free = available[category] ?? 0
        const full = total > 0 && free === 0

        return (
          <div
            key={category}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,14rem)]"
          >
            <div className="flex min-w-0 items-baseline gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 shrink-0 translate-y-px rounded-full',
                  CATEGORY_BAR[category] ?? 'bg-ink-faint',
                )}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">{category}</p>
                <p className="text-[11px] text-ink-faint">{ruleText(category)}</p>
              </div>
            </div>

            <p className="tnum text-right text-[15px] leading-none font-semibold text-ink sm:text-left">
              {used}
              <span className="text-[12px] font-normal text-ink-faint"> / {total}</span>
            </p>

            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Meter
                used={used}
                total={total}
                label={`Credenciales ${category}`}
                barClassName={CATEGORY_BAR[category]}
              />
              <div className="flex items-center justify-between text-[11px]">
                {total === 0 ? (
                  <Status tone="muted" label="Sin cupo para este metraje" />
                ) : full ? (
                  <Status tone="error" label="Cupo agotado" />
                ) : (
                  <Status tone="ok" label={`${free} disponibles`} />
                )}
                <span className="tnum text-ink-faint">
                  {total === 0 ? '—' : `${Math.round((used / total) * 100)}%`}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
