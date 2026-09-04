import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../../api/client'
import type { ExhibitorDetail } from '../../api/types'
import { FormSection } from '../../components/FormSection'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { ServerError } from '../../components/ServerError'
import { Stat, StatRow } from '../../components/Stat'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { QuotaTable } from '../dashboard/QuotaTable'
import { standSchema, type StandFormValues } from './schema'

function StandEditForm({ exhibitor }: { exhibitor: ExhibitorDetail }) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const form = useForm<StandFormValues>({
    resolver: zodResolver(standSchema),
    defaultValues: {
      legal_name: exhibitor.legal_name,
      stand_name: exhibitor.stand_name,
      address: exhibitor.address,
      requested_m2: exhibitor.requested_m2,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: StandFormValues) =>
      api.patch<ExhibitorDetail>(`/exhibitors/${exhibitor.id}`, values),
    onSuccess: async (updated) => {
      setSaved(true)
      form.reset({
        legal_name: updated.legal_name,
        stand_name: updated.stand_name,
        address: updated.address,
        requested_m2: updated.requested_m2,
      })
      await queryClient.invalidateQueries({ queryKey: ['exhibitors'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const errors = form.formState.errors

  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        setSaved(false)
        await mutation.mutateAsync(values).catch(() => undefined)
      })}
      noValidate
      className="max-w-3xl space-y-6"
    >
      {mutation.error === null ? null : (
        <ServerError error={mutation.error} onDismiss={() => mutation.reset()} />
      )}
      {saved ? (
        <Notice title="Cambios guardados" onDismiss={() => setSaved(false)}>
          La cuota se recalculó con el metraje nuevo.
        </Notice>
      ) : null}

      <FormSection title="Datos del stand">
        <Field
          label="Razón social"
          className="sm:col-span-2"
          error={errors.legal_name?.message}
          {...form.register('legal_name')}
        />
        <Field
          label="Nombre comercial"
          error={errors.stand_name?.message}
          {...form.register('stand_name')}
        />
        <Field
          label="Metraje (m²)"
          type="number"
          inputMode="numeric"
          hint="Cambiarlo recalcula el cupo. No se permite dejarlo por debajo de lo ya asignado."
          error={errors.requested_m2?.message}
          {...form.register('requested_m2', { valueAsNumber: true })}
        />
        <Field
          label="Dirección"
          className="sm:col-span-2"
          error={errors.address?.message}
          {...form.register('address')}
        />
      </FormSection>

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
          {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}

function ResendAccessButton({ email }: { email: string }) {
  const mutation = useMutation({
    mutationFn: () => api.post('/auth/request-password-setup', { email }),
  })

  return (
    <div className="mt-4">
      <Button variant="secondary" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Enviando…' : 'Reenviar enlace de acceso'}
      </Button>
      {mutation.isSuccess ? (
        <p className="mt-2 text-[12px] text-ink-soft">
          Si el correo corresponde a un representante, se le envió un enlace nuevo.
        </p>
      ) : null}
      {mutation.isError ? (
        <p role="alert" className="mt-2 text-[12px] font-medium text-ink">
          No se pudo enviar el enlace. Inténtelo nuevamente.
        </p>
      ) : null}
    </div>
  )
}

export function ExhibitorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['exhibitors', 'detail', id],
    queryFn: () => api.get<ExhibitorDetail>(`/exhibitors/${id}`),
  })

  const remove = useMutation({
    mutationFn: () => api.delete<void>(`/exhibitors/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exhibitors'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/admin/expositores', { replace: true })
    },
  })

  if (isPending) return <Loading label="Cargando el expositor" />
  if (isError) {
    return (
      <>
        <PageHeader title="Expositor" />
        <ServerError error={error} />
        <div className="mt-4">
          <Link to="/admin/expositores">
            <Button variant="secondary">Volver al listado</Button>
          </Link>
        </div>
      </>
    )
  }

  const assigned = Object.values(data.assigned).reduce((a, b) => a + b, 0)
  const quota = Object.values(data.quota).reduce((a, b) => a + b, 0)

  return (
    <>
      <PageHeader
        title={data.legal_name}
        subtitle={`${data.stand_name} · ${data.tax_id_type} ${data.tax_id}`}
        actions={
          <>
            <Link to="/admin/expositores">
              <Button variant="secondary">Volver</Button>
            </Link>
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              Eliminar
            </Button>
          </>
        }
      />

      {remove.error === null ? null : (
        <div className="mb-6">
          <ServerError error={remove.error} onDismiss={() => remove.reset()} />
        </div>
      )}

      <StatRow>
        <Stat label="Metraje" value={`${data.requested_m2} m²`} note={data.stand_category} />
        <Stat label="Cupo total" value={quota} />
        <Stat label="Asignadas" value={assigned} />
        <Stat label="Disponibles" value={quota - assigned} />
      </StatRow>

      <section className="mt-10">
        <h2 className="label-caps">Cupo por categoría</h2>
        <div className="mt-3">
          <QuotaTable
            categories={Object.keys(data.quota)}
            quota={data.quota}
            assigned={data.assigned}
            available={data.available}
          />
        </div>
      </section>

      <div className="mt-10">
        <StandEditForm key={data.id} exhibitor={data} />
      </div>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="label-caps">Representante</h2>
        <dl className="mt-4 grid gap-4 text-[13px] sm:grid-cols-2 lg:max-w-3xl">
          <div>
            <dt className="text-ink-faint">Nombre</dt>
            <dd className="font-medium">{data.representative.full_name}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Cargo</dt>
            <dd>{data.representative.position}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Identificación</dt>
            <dd className="tnum">
              {data.representative.identification}{' '}
              <span className="text-ink-faint">({data.representative.identification_type})</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Teléfono</dt>
            <dd className="tnum">{data.representative.phone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-faint">Correo de acceso</dt>
            <dd>{data.representative.email}</dd>
          </div>
        </dl>
        <ResendAccessButton email={data.representative.email} />
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="label-caps">Contactos adicionales</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {data.contacts.map((contact) => (
            <li key={contact.id} className="flex flex-wrap justify-between gap-2 py-3 text-[13px]">
              <span className="font-medium">{contact.name}</span>
              <span className="text-ink-soft">
                {contact.email} · <span className="tnum">{contact.phone}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Eliminar este expositor"
        description="El stand deja de aparecer en los listados y en el reporte. Sus credenciales ya emitidas se conservan, así que las identificaciones siguen reservadas en esta feria."
        confirmLabel="Eliminar expositor"
        busy={remove.isPending}
        onConfirm={() => {
          setConfirming(false)
          remove.mutate()
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
