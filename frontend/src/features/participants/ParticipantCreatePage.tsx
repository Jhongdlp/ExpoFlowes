import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../../api/client'
import type { CredentialRule, MyQuota, Participant } from '../../api/types'
import { CATEGORY_BAR } from '../../components/CategoryBadge'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Status } from '../../components/ui/Status'
import { ParticipantForm } from './ParticipantForm'
import type { ParticipantFormValues } from './schema'

export function ParticipantCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [lastCreated, setLastCreated] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)

  const rules = useQuery({
    queryKey: ['rules', 'credentials'],
    queryFn: () => api.get<CredentialRule[]>('/rules/credentials'),
    staleTime: Infinity,
  })
  const quota = useQuery({ queryKey: ['me', 'quota'], queryFn: () => api.get<MyQuota>('/me/quota') })

  const mutation = useMutation({
    mutationFn: (values: ParticipantFormValues) =>
      api.post<Participant>('/me/participants', {
        ...values,
        // El backend exige null, no "", cuando la categoria no admite proveedora.
        provider_company: values.provider_company === '' ? null : values.provider_company,
        email: values.email === '' ? null : values.email,
      }),
    onSuccess: async (created) => {
      setLastCreated(`${created.first_name} ${created.last_name}`)
      setResetSignal((value) => value + 1)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  if (rules.isPending || quota.isPending) return <Loading label="Cargando el formulario" />

  const available = quota.data === undefined ? {} : quota.data.available
  const categories = (rules.data ?? []).map((rule) => rule.category)

  return (
    <>
      <PageHeader
        title="Nueva credencial"
        subtitle="Cada credencial consume cupo de su categoría. El cupo se calcula con el metraje de su stand."
        actions={
          <>
            <Link to="/stand/credenciales/carga">
              <Button variant="secondary">Carga masiva</Button>
            </Link>
            <Link to="/stand/credenciales">
              <Button variant="ghost">Ver credenciales</Button>
            </Link>
          </>
        }
      />

      {/* Cupo restante a la vista mientras se escribe: evita descubrir el tope al guardar. */}
      <div className="mb-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {categories.map((category) => {
          const free = available[category] ?? 0
          return (
            <div key={category} className="bg-surface px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_BAR[category] ?? 'bg-ink-faint'}`}
                />
                <p className="label-caps truncate">{category}</p>
              </div>
              <div className="mt-1">
                <Status
                  tone={free === 0 ? 'error' : 'ok'}
                  label={free === 0 ? 'Sin cupo' : `${free} disponibles`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {lastCreated === null ? null : (
        <Notice
          tone="success"
          title={`Credencial registrada para ${lastCreated}`}
          onDismiss={() => setLastCreated(null)}
        >
          Puede registrar a la siguiente persona; el formulario ya está limpio.
        </Notice>
      )}

      <div className="mt-6">
        <ParticipantForm
          categories={categories}
          onSubmit={async (values) => {
            setLastCreated(null)
            await mutation.mutateAsync(values).catch(() => undefined)
          }}
          onCancel={() => navigate('/stand/credenciales')}
          submitting={mutation.isPending}
          serverError={mutation.error}
          onDismissError={() => mutation.reset()}
          resetSignal={resetSignal}
        />
      </div>
    </>
  )
}
