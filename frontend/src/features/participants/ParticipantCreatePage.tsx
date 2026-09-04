import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../../api/client'
import type { CredentialRule, MyQuota, Participant } from '../../api/types'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
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

      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-3 text-[13px]">
        {categories.map((category) => (
          <p key={category}>
            <span className="label-caps">{category}</span>{' '}
            <span className="tnum ml-1">{available[category] ?? 0} disponibles</span>
          </p>
        ))}
      </div>

      {lastCreated === null ? null : (
        <Notice title={`Credencial registrada para ${lastCreated}`} onDismiss={() => setLastCreated(null)}>
          Puede registrar a la siguiente persona; el formulario ya está limpio.
        </Notice>
      )}

      <div className="mt-8">
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
