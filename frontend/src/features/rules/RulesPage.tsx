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

/** Traducción del enum de `rounding_mode`, igual que `errors.ts` traduce los códigos. */
const ROUNDING_LABEL: Record<string, string> = {
  floor: 'hacia abajo — solo cuentan los bloques completos',
  ceil: 'hacia arriba — un bloque empezado se paga entero',
  round: 'al bloque más cercano',
}

const MIN_M2 = 1
const MAX_M2 = 10_000

/**
 * Simulador: escribe un metraje y el SERVIDOR deriva categoría y cuota con las reglas que
 * tenga la base en ese instante.
 *
 * La fórmula no se replica aquí a propósito: `/rules/quota` reusa la misma función que deriva
 * la cuota de un expositor real. Un simulador con su propia aritmética acabaría discrepando
 * del alta, que es justo lo que esta pantalla existe para demostrar que no pasa.
 */
function QuotaSimulator({ standSizes }: { standSizes: StandSizeRule[] }) {
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
          label="Metraje del stand"
          type="number"
          inputMode="numeric"
          min={MIN_M2}
          max={MAX_M2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          hint="m² a derivar"
        />

        <div className="min-h-[5.5rem]">
          {!valid ? (
            <p className="text-[12px] text-ink-faint">
              Escriba un metraje entre {MIN_M2} y {MAX_M2} m² para ver su clasificación y su
              cuota.
            </p>
          ) : outOfRange ? (
            <Notice tone="error" title={`${m2} m² no cae en ningún rango configurado`}>
              Los rangos vigentes son{' '}
              {standSizes.map((rule, index) => (
                <span key={rule.id}>
                  {index === 0 ? '' : index === standSizes.length - 1 ? ' y ' : ', '}
                  <span className="tnum font-medium text-ink">
                    {rule.min_m2}–{rule.max_m2} m²
                  </span>{' '}
                  ({rule.label})
                </span>
              ))}
              . El alta de expositor rechaza este metraje con el mismo error, en vez de
              clasificarlo por defecto (decisión §6.2).
            </Notice>
          ) : simulation.isError ? (
            <Notice tone="error" title="No se pudo calcular la cuota.">
              {simulation.error instanceof ApiError ? simulation.error.message : null}
            </Notice>
          ) : simulation.isPending ? (
            <Loading label="Calculando la cuota" />
          ) : (
            <div className="animate-fade">
              <div className="flex items-baseline gap-2">
                <span className="label-caps">Categoría de stand</span>
                <span className="text-[15px] font-semibold text-ink">
                  {simulation.data.stand_category}
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
                      <span className="truncate">{category}</span>
                    </dt>
                    <dd className="tnum mt-1.5 text-[19px] leading-none font-semibold text-ink">
                      {credentials}
                      <span className="ml-1.5 text-[11px] font-normal text-ink-soft">
                        {credentials === 1 ? 'credencial' : 'credenciales'}
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

/**
 * Reglas parametrizadas, en pantalla (punto extra E3).
 *
 * Todo lo que se ve aquí sale de `stand_size_rules` y `credential_rules`. La pantalla no
 * conoce un solo número de negocio: cambie una fila con un UPDATE, recargue, y esto cambia
 * sin recompilar ni reiniciar nada.
 */
export function RulesPage() {
  const standSizes = useStandSizeRules()
  const credentials = useCredentialRules()

  if (standSizes.isPending || credentials.isPending) {
    return <Loading label="Cargando las reglas de la feria" />
  }

  if (standSizes.isError || credentials.isError) {
    const error = standSizes.error ?? credentials.error
    return (
      <Notice
        tone="error"
        title={error instanceof ApiError ? error.message : 'No se pudieron cargar las reglas.'}
      />
    )
  }

  // El ejemplo de SQL se escribe con una fila real, no con un rótulo inventado.
  const example = standSizes.data.at(-1)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reglas y parametrización"
        subtitle="Rangos de metraje y cuotas de credenciales, leídos de la base de datos en cada petición."
      />

      <section>
        <h2 className="label-caps mb-3">Simulador de cuota</h2>
        <QuotaSimulator standSizes={standSizes.data} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="label-caps">Rangos de metraje</h2>
          <code className="font-mono text-[11px] text-ink-faint">stand_size_rules</code>
        </div>
        <Table>
          <thead>
            <tr>
              <TH>Categoría</TH>
              <TH className="text-right">Mínimo</TH>
              <TH className="text-right">Máximo</TH>
            </tr>
          </thead>
          <TBody>
            {standSizes.data.map((rule) => (
              <TR key={rule.id}>
                <TD className="font-medium">{rule.label}</TD>
                <TD label="Mínimo" className="tnum text-right">
                  {rule.min_m2} m²
                </TD>
                <TD label="Máximo" className="tnum text-right">
                  {rule.max_m2} m²
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="mt-2 text-[11px] text-ink-faint">
          Un metraje fuera de todos los rangos se rechaza con{' '}
          <code className="font-mono">STAND_SIZE_OUT_OF_RANGE</code>; nunca se clasifica por
          defecto. La categoría es informativa: no interviene en el cálculo de la cuota
          (decisión §6.7).
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="label-caps">Cuota de credenciales</h2>
          <code className="font-mono text-[11px] text-ink-faint">credential_rules</code>
        </div>
        <Table>
          <thead>
            <tr>
              <TH>Categoría</TH>
              <TH>Fórmula</TH>
              <TH>Redondeo</TH>
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
                    {rule.category}
                  </span>
                </TD>
                <TD label="Fórmula" className="tnum">
                  {ruleLabel(rule)}
                </TD>
                <TD label="Redondeo" className="text-ink-soft">
                  <Status
                    tone="muted"
                    label={ROUNDING_LABEL[rule.rounding_mode] ?? rule.rounding_mode}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>

      <section>
        <h2 className="label-caps mb-3">Cambiar una regla sin tocar código</h2>
        <div className="surface p-4">
          <p className="text-[12px] text-ink-soft">
            Las reglas se leen de la base en cada operación: no hay caché ni constantes en el
            código. Un <code className="font-mono">UPDATE</code> surte efecto en la siguiente
            petición, sin recompilar ni reiniciar.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-fill px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink max-sm:whitespace-pre-wrap">
            {example === undefined
              ? '-- No hay rangos configurados para esta feria.'
              : `-- Ampliar "${example.label}" hasta ${example.max_m2 + 30} m²\nUPDATE stand_size_rules SET max_m2 = ${example.max_m2 + 30}\n WHERE label = '${example.label}';`}
          </pre>
          <p className="mt-3 text-[11px] text-ink-faint">
            Vuelva a este simulador después del UPDATE: la clasificación y la cuota cambian
            solas.
          </p>
        </div>
      </section>
    </div>
  )
}
