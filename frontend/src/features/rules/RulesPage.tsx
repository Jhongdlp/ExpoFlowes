import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api, ApiError } from '../../api/client'
import type { QuotaSimulation, StandSizeRule } from '../../api/types'
import { CATEGORY_BAR } from '../../components/CategoryBadge'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Field } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { Status } from '../../components/ui/Status'
import { Table, TBody, TD, TH, TR } from '../../components/ui/Table'
import { useDebounced } from '../../hooks/use-debounced'
import { cn } from '../../lib/cn'
import { ruleLabel, useCredentialRules, useStandSizeRules } from '../../hooks/use-rules'
import { useTranslation } from '../i18n/LanguageContext'

const MIN_M2 = 1
const MAX_M2 = 10_000

/**
 * Simulador: escribe un metraje y el SERVIDOR deriva categoría y cuota con las reglas que
 * tenga la base en ese instante.
 */
function QuotaSimulator({ standSizes }: { standSizes: StandSizeRule[] }) {
  const { t, lang } = useTranslation()
  const [input, setInput] = useState('25')
  const settled = useDebounced(input)
  const m2 = Number(settled)
  const valid = settled.trim() !== '' && Number.isInteger(m2) && m2 >= MIN_M2 && m2 <= MAX_M2

  const simulation = useQuery({
    queryKey: ['rules', 'quota', m2],
    queryFn: () => api.get<QuotaSimulation>(`/rules/quota?m2=${m2}`),
    enabled: valid,
    retry: false,
  })

  const outOfRange =
    simulation.error instanceof ApiError &&
    simulation.error.code === 'STAND_SIZE_OUT_OF_RANGE'

  return (
    <section className="surface p-4">
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
        <Field
          label={t.rules.standSizeLabel}
          type="number"
          inputMode="numeric"
          min={MIN_M2}
          max={MAX_M2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          hint={t.rules.standSizeHint}
        />

        <div className="min-h-[5.5rem]">
          {!valid ? (
            <p className="text-[12px] text-ink-faint">
              {t.rules.simulatorPrompt
                .replace('{min}', String(MIN_M2))
                .replace('{max}', String(MAX_M2))}
            </p>
          ) : outOfRange ? (
            <Notice
              tone="error"
              title={
                lang === 'en'
                  ? `${m2} m² does not match any configured range`
                  : `${m2} m² no cae en ningún rango configurado`
              }
            >
              {lang === 'en' ? 'Active ranges are ' : 'Los rangos vigentes son '}
              {standSizes.map((rule, index) => (
                <span key={rule.id}>
                  {index === 0 ? '' : index === standSizes.length - 1 ? (lang === 'en' ? ' and ' : ' y ') : ', '}
                  <span className="tnum font-medium text-ink">
                    {rule.min_m2}–{rule.max_m2} m²
                  </span>{' '}
                  ({(t.standSizes as Record<string, string>)[rule.label] ?? rule.label})
                </span>
              ))}
              .
            </Notice>
          ) : simulation.isError ? (
            <Notice tone="error" title={lang === 'en' ? 'Could not calculate quota.' : 'No se pudo calcular la cuota.'}>
              {simulation.error instanceof ApiError ? simulation.error.message : null}
            </Notice>
          ) : simulation.isPending ? (
            <Loading label={t.rules.calculating} />
          ) : (
            <div className="animate-fade">
              <div className="flex items-baseline gap-2">
                <span className="label-caps">{t.rules.standCategory}</span>
                <span className="text-[15px] font-semibold text-ink">
                  {(t.standSizes as Record<string, string>)[simulation.data.stand_category] ?? simulation.data.stand_category}
                </span>
              </div>

              {/* El resultado destaca en salvia, la misma superficie que la banda de métricas. */}
              <dl className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line-strong/55 bg-line-strong/45 sm:grid-cols-3">
                {Object.entries(simulation.data.quota).map(([category, credentials]) => (
                  <div key={category} className="bg-sage px-3 py-2.5 text-ink">
                    <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          CATEGORY_BAR[category] ?? 'bg-ink-faint',
                        )}
                      />
                      <span className="truncate">{t.categories[category as keyof typeof t.categories] ?? category}</span>
                    </dt>
                    <dd className="tnum mt-1.5 text-[19px] leading-none font-semibold text-ink">
                      {credentials}
                      <span className="ml-1.5 text-[11px] font-normal text-ink-soft">
                        {credentials === 1 ? t.rules.credentialUnit : t.rules.credentialsUnit}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function RulesPage() {
  const { t, lang } = useTranslation()
  const standSizes = useStandSizeRules()
  const credentials = useCredentialRules()

  if (standSizes.isPending || credentials.isPending) {
    return <Loading label={lang === 'en' ? 'Loading expo rules…' : 'Cargando las reglas de la feria'} />
  }

  if (standSizes.isError || credentials.isError) {
    const error = standSizes.error ?? credentials.error
    return (
      <Notice
        tone="error"
        title={error instanceof ApiError ? error.message : t.common.tryAgain}
      />
    )
  }

  const example = standSizes.data.at(-1)

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.rules.title}
        subtitle={t.rules.subtitle}
      />

      <section>
        <h2 className="label-caps mb-3">{t.rules.simulatorTitle}</h2>
        <QuotaSimulator standSizes={standSizes.data} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="label-caps">{t.rules.standSizeRanges}</h2>
          <code className="font-mono text-[11px] text-ink-faint">stand_size_rules</code>
        </div>
        <Table>
          <thead>
            <tr>
              <TH>{t.tables.category}</TH>
              <TH className="text-right">{t.tables.min}</TH>
              <TH className="text-right">{t.tables.max}</TH>
            </tr>
          </thead>
          <TBody>
            {standSizes.data.map((rule) => (
              <TR key={rule.id}>
                <TD className="font-medium">{(t.standSizes as Record<string, string>)[rule.label] ?? rule.label}</TD>
                <TD label={t.tables.min} className="tnum text-right">
                  {rule.min_m2} m²
                </TD>
                <TD label={t.tables.max} className="tnum text-right">
                  {rule.max_m2} m²
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="mt-2 text-[11px] text-ink-faint">
          {t.rules.standSizesFootnote}
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="label-caps">{t.rules.credentialQuotas}</h2>
          <code className="font-mono text-[11px] text-ink-faint">credential_rules</code>
        </div>
        <Table>
          <thead>
            <tr>
              <TH>{t.tables.category}</TH>
              <TH>{t.tables.formula}</TH>
              <TH>{t.tables.rounding}</TH>
            </tr>
          </thead>
          <TBody>
            {credentials.data.map((rule) => (
              <TR key={rule.id}>
                <TD className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        CATEGORY_BAR[rule.category] ?? 'bg-ink-faint',
                      )}
                    />
                    {t.categories[rule.category as keyof typeof t.categories] ?? rule.category}
                  </span>
                </TD>
                <TD label={t.tables.formula} className="tnum">
                  {ruleLabel(rule, lang)}
                </TD>
                <TD label={t.tables.rounding} className="text-ink-soft">
                  <Status
                    tone="muted"
                    label={t.rules.roundingModes[rule.rounding_mode as keyof typeof t.rules.roundingModes] ?? rule.rounding_mode}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>

      <section>
        <h2 className="label-caps mb-3">{t.rules.liveChangeTitle}</h2>
        <div className="surface p-4">
          <p className="text-[12px] text-ink-soft">
            {t.rules.liveChangeDesc}
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-fill px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink max-sm:whitespace-pre-wrap">
            {example === undefined
              ? (lang === 'en' ? '-- No ranges configured for this expo.' : '-- No hay rangos configurados para esta feria.')
              : `-- ${lang === 'en' ? `Expand "${example.label}" up to` : `Ampliar "${example.label}" hasta`} ${example.max_m2 + 30} m²\nUPDATE stand_size_rules SET max_m2 = ${example.max_m2 + 30}\n WHERE label = '${example.label}';`}
          </pre>
          <p className="mt-3 text-[11px] text-ink-faint">
            {t.rules.liveChangeFootnote}
          </p>
        </div>
      </section>
    </div>
  )
}
