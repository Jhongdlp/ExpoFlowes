import { useCredentialRules, useStandSizeRules } from '../../hooks/use-rules'
import { cn } from '../../lib/cn'
import { useTranslation } from '../i18n/LanguageContext'

interface Props {
  m2: number
}

/** floor|ceil|round sobre bloques, igual que el motor de reglas del backend. */
function blocksFor(m2: number, blockM2: number, mode: string): number {
  if (mode === 'ceil') return Math.ceil(m2 / blockM2)
  if (mode === 'round') return Math.round(m2 / blockM2)
  return Math.floor(m2 / blockM2)
}

/**
 * Cajitas de tamaño de stand: una por cada rango de `stand_size_rules`, ancho proporcional
 * a su rango de m² y la del valor actual resaltada. Da feedback visual instantáneo mientras
 * se escribe, sin inventar ningún número: rangos y cuota salen de las reglas del evento.
 */
export function StandSizeIndicator({ m2 }: Props) {
  const { t } = useTranslation()
  const standRules = useStandSizeRules()
  const credRules = useCredentialRules()

  if (m2 <= 0 || standRules.data === undefined || standRules.data.length === 0) return null

  const sorted = [...standRules.data].sort((a, b) => a.min_m2 - b.min_m2)
  const active = sorted.find((rule) => m2 >= rule.min_m2 && m2 <= rule.max_m2)
  const standLabels = t.standSizes as Record<string, string>
  const catLabels = t.categories as Record<string, string>

  return (
    <div className="animate-fade space-y-1.5 rounded-lg border border-line bg-surface px-2.5 py-2">
      <div className="flex items-stretch gap-1" aria-hidden="true">
        {sorted.map((rule) => (
          <div
            key={rule.id}
            style={{ flexGrow: rule.max_m2 - rule.min_m2 + 1 }}
            title={`${standLabels[rule.label] ?? rule.label}: ${rule.min_m2}–${rule.max_m2} m²`}
            className={cn(
              'h-5 rounded-md border transition-all duration-300 ease-brand',
              rule.id === active?.id
                ? 'scale-y-125 border-brand bg-brand'
                : 'border-line bg-fill',
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-ink-soft">
        {active === undefined ? (
          <span className="font-semibold text-alert">{t.exhibitors.standSizeOutOfRange}</span>
        ) : (
          <>
            <span className="font-semibold text-ink">
              {standLabels[active.label] ?? active.label} ({m2} m²)
            </span>
            {credRules.data !== undefined && credRules.data.length > 0 && (
              <span className="ml-2 text-ink-faint">
                ·{' '}
                {credRules.data
                  .map((rule) => {
                    const quota = blocksFor(m2, rule.block_m2, rule.rounding_mode) * rule.credentials_per_block
                    return `${quota} ${catLabels[rule.category] ?? rule.category}`
                  })
                  .join(' · ')}
              </span>
            )}
          </>
        )}
      </p>
    </div>
  )
}
