import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../../api/client'
import type { CredentialRule, MyQuota, Participant } from '../../api/types'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { ParticipantForm } from './ParticipantForm'
import { EMPTY_PARTICIPANT, type ParticipantFormValues } from './schema'
import { useTranslation } from '../i18n/LanguageContext'

/**
 * Edicion de una credencial ya emitida.
 *
 * El id va en la ruta pero no se usa para filtrar: el backend resuelve el participante
 * dentro del `exhibitor_id` del token, asi que una credencial ajena responde 404 (§8.1).
 * Aqui eso se pinta como "no existe", sin distinguir el caso.
 */
export function ParticipantEditPage() {
  const { t, lang } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const participant = useQuery({
    queryKey: ['me', 'participants', 'detail', id],
    queryFn: () => api.get<Participant>(`/me/participants/${id}`),
  })
  const rules = useQuery({
    queryKey: ['rules', 'credentials'],
    queryFn: () => api.get<CredentialRule[]>('/rules/credentials'),
    staleTime: Infinity,
  })
  const quota = useQuery({ queryKey: ['me', 'quota'], queryFn: () => api.get<MyQuota>('/me/quota') })

  const mutation = useMutation({
    mutationFn: (values: ParticipantFormValues) =>
      api.patch<Participant>(`/me/participants/${id}`, {
        ...values,
        provider_company: values.provider_company === '' ? null : values.provider_company,
        email: values.email === '' ? null : values.email,
      }),
    onSuccess: async () => {
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  // `initial` entra en un useEffect de reset dentro del formulario: si cambiara de identidad
  // en cada render lo estaria reseteando mientras se escribe.
  const person = participant.data
  const initial = useMemo<ParticipantFormValues>(
    () =>
      person === undefined
        ? EMPTY_PARTICIPANT
        : {
            first_name: person.first_name,
            last_name: person.last_name,
            identification_type: person.identification_type,
            identification: person.identification,
            phone: person.phone,
            position: person.position,
            category: person.category,
            provider_company: person.provider_company ?? '',
            email: person.email ?? '',
          },
    [person],
  )

  const back = () => navigate('/stand/credenciales')

  if (participant.isPending || rules.isPending || quota.isPending) {
    return <Loading label={lang === 'en' ? 'Loading credential…' : 'Cargando la credencial'} />
  }

  if (participant.isError) {
    return (
      <>
        <PageHeader title={lang === 'en' ? 'Credential' : 'Credencial'} />
        <ServerError error={participant.error} />
        <div className="mt-4">
          <Button variant="secondary" onClick={back}>
            {t.bulk.viewCredentials}
          </Button>
        </div>
      </>
    )
  }

  const fullName = `${participant.data.first_name} ${participant.data.last_name}`

  return (
    <>
      <PageHeader
        title={lang === 'en' ? 'Edit credential' : 'Editar credencial'}
        subtitle={
          lang === 'en'
            ? `${fullName} · changing the category moves the quota it consumes.`
            : `${fullName} · cambiar la categoría mueve el cupo que consume.`
        }
        actions={
          <Link to="/stand/credenciales">
            <Button variant="ghost">{t.bulk.viewCredentials}</Button>
          </Link>
        }
      />

      {saved ? (
        <Notice
          tone="success"
          title={lang === 'en' ? 'Changes saved' : 'Cambios guardados'}
          onDismiss={() => setSaved(false)}
        >
          {participant.data.email === null
            ? lang === 'en'
              ? 'Without an email address this person will not receive their credential confirmation.'
              : 'Sin correo, esta persona no recibirá la confirmación de su credencial.'
            : lang === 'en'
              ? 'The credential is up to date.'
              : 'La credencial quedó actualizada.'}
        </Notice>
      ) : null}

      <div className="mt-6">
        <ParticipantForm
          categories={(rules.data ?? []).map((rule) => rule.category)}
          available={quota.data?.available}
          initial={initial}
          submitLabel={lang === 'en' ? 'Save changes' : 'Guardar cambios'}
          onSubmit={async (values) => {
            setSaved(false)
            await mutation.mutateAsync(values).catch(() => undefined)
          }}
          onCancel={back}
          submitting={mutation.isPending}
          serverError={mutation.error}
          onDismissError={() => mutation.reset()}
          resetSignal={0}
        />
      </div>
    </>
  )
}
