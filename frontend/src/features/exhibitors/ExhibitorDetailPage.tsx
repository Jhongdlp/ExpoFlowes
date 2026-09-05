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
import { Status } from '../../components/ui/Status'
import { QuotaTable } from '../dashboard/QuotaTable'
import { DEFAULT_BANNER_ID } from './bannerPresets'
import { standSchema, type StandFormValues } from './schema'
import { StandSizeIndicator } from './StandSizeIndicator'
import { BannerSelector } from './BannerSelector'
import { useTranslation } from '../i18n/LanguageContext'

function StandEditForm({ exhibitor }: { exhibitor: ExhibitorDetail }) {
  const { t, lang } = useTranslation()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const form = useForm<StandFormValues>({
    resolver: zodResolver(standSchema),
    defaultValues: {
      legal_name: exhibitor.legal_name,
      stand_name: exhibitor.stand_name,
      address: exhibitor.address,
      requested_m2: exhibitor.requested_m2,
      banner_url: exhibitor.banner_url || DEFAULT_BANNER_ID,
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
        banner_url: updated.banner_url || DEFAULT_BANNER_ID,
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
        <Notice
          tone="success"
          title={lang === 'en' ? 'Changes saved' : 'Cambios guardados'}
          onDismiss={() => setSaved(false)}
        >
          {lang === 'en'
            ? 'The quota and stand details were updated.'
            : 'La cuota y datos del stand se actualizaron correctamente.'}
        </Notice>
      ) : null}

      <FormSection title={lang === 'en' ? 'Stand Information' : 'Datos del stand'}>
        <Field
          label={lang === 'en' ? 'Legal name' : 'Razón social'}
          className="sm:col-span-2"
          error={errors.legal_name?.message}
          {...form.register('legal_name')}
        />
        <Field
          label={lang === 'en' ? 'Trade name' : 'Nombre comercial'}
          error={errors.stand_name?.message}
          {...form.register('stand_name')}
        />
        <div className="space-y-1.5">
          <Field
            label={lang === 'en' ? 'Stand size (m²)' : 'Metraje (m²)'}
            type="number"
            inputMode="numeric"
            hint={lang === 'en' ? 'Changing it recalculates quotas.' : 'Cambiarlo recalcula el cupo. No se permite dejarlo por debajo de lo ya asignado.'}
            error={errors.requested_m2?.message}
            {...form.register('requested_m2', { valueAsNumber: true })}
          />
          <StandSizeIndicator m2={form.watch('requested_m2') || 0} />
        </div>
        <Field
          label={lang === 'en' ? 'Address' : 'Dirección'}
          className="sm:col-span-2"
          error={errors.address?.message}
          {...form.register('address')}
        />
      </FormSection>

      <FormSection
        title={lang === 'en' ? 'Stand Banner' : 'Banner del stand'}
        description={
          lang === 'en'
            ? 'Custom banner displayed on the exhibitor dashboard.'
            : 'Banner personalizado que se muestra en el panel del expositor.'
        }
      >
        <div className="sm:col-span-2">
          <BannerSelector
            value={form.watch('banner_url')}
            onChange={(newBanner) => form.setValue('banner_url', newBanner, { shouldDirty: true })}
            standName={form.watch('stand_name')}
            legalName={form.watch('legal_name')}
            taxId={exhibitor.tax_id}
            requestedM2={form.watch('requested_m2') || 0}
            standCategory={exhibitor.stand_category}
          />
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
        {/* Estado del formulario, siempre visible: se sabe si hay algo pendiente de guardar. */}
        {form.formState.isDirty && !mutation.isPending ? (
          <Status tone="pending" label={t.exhibitors.unsavedChanges} />
        ) : null}
        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={!form.formState.isDirty}
        >
          {mutation.isPending ? t.exhibitors.savingChanges : t.exhibitors.saveChanges}
        </Button>
      </div>
    </form>
  )
}

function ResendAccessButton({ email }: { email: string }) {
  const { t } = useTranslation()
  const mutation = useMutation({
    mutationFn: () => api.post('/auth/request-password-setup', { email }),
  })

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        loading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? t.exhibitors.resending : t.exhibitors.resendAccess}
      </Button>
      {mutation.isSuccess ? (
        <Status
          tone="ok"
          label={t.exhibitors.resendSuccess}
          className="animate-fade"
        />
      ) : null}
      {mutation.isError ? (
        <Status tone="error" label={t.exhibitors.resendError} />
      ) : null}
    </div>
  )
}

export function ExhibitorDetailPage() {
  const { t, lang } = useTranslation()
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

  if (isPending) {
    return (
      <>
        <PageHeader title={t.exhibitors.detailTitle} />
        <Loading label={lang === 'en' ? 'Loading exhibitor…' : 'Cargando el expositor'} />
      </>
    )
  }
  if (isError) {
    return (
      <>
        <PageHeader title={t.exhibitors.detailTitle} />
        <ServerError error={error} />
        <div className="mt-4">
          <Link to="/admin/expositores">
            <Button variant="secondary">{t.common.backToList}</Button>
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
              <Button variant="secondary">{t.common.back}</Button>
            </Link>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              {t.common.delete}
            </Button>
          </>
        }
      />

      {remove.error === null ? null : (
        <div className="mb-4">
          <ServerError error={remove.error} onDismiss={() => remove.reset()} />
        </div>
      )}

      <StatRow>
        <Stat
          label={t.tables.standSize}
          value={`${data.requested_m2} m²`}
          note={(t.standSizes as Record<string, string>)[data.stand_category] ?? data.stand_category}
        />
        <Stat label={t.common.totalQuota} value={quota} />
        <Stat label={t.common.assigned} value={assigned} />
        <Stat label={t.common.available} value={quota - assigned} />
      </StatRow>

      <section className="mt-7">
        <h2 className="label-caps">{t.exhibitors.quotaByCategory}</h2>
        <div className="mt-2.5">
          <QuotaTable
            categories={Object.keys(data.quota)}
            quota={data.quota}
            assigned={data.assigned}
            available={data.available}
          />
        </div>
      </section>

      <div className="mt-7">
        <StandEditForm key={data.id} exhibitor={data} />
      </div>

      <section className="mt-7 border-t border-line pt-5">
        <h2 className="label-caps">{t.exhibitors.representative}</h2>
        <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2 lg:max-w-3xl">
          <div>
            <dt className="label-caps">{t.common.name}</dt>
            <dd className="font-medium">{data.representative.full_name}</dd>
          </div>
          <div>
            <dt className="label-caps">{t.tables.position}</dt>
            <dd>{data.representative.position}</dd>
          </div>
          <div>
            <dt className="label-caps">{t.tables.identification}</dt>
            <dd className="tnum">
              {data.representative.identification}{' '}
              <span className="text-ink-faint">({data.representative.identification_type})</span>
            </dd>
          </div>
          <div>
            <dt className="label-caps">{t.common.phone}</dt>
            <dd className="tnum">{data.representative.phone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="label-caps">{t.exhibitors.accessEmail}</dt>
            <dd>{data.representative.email}</dd>
          </div>
        </dl>
        <ResendAccessButton email={data.representative.email} />
      </section>

      <section className="mt-7 border-t border-line pt-5">
        <h2 className="label-caps">{t.exhibitors.additionalContacts}</h2>
        <ul className="surface mt-3 divide-y divide-line">
          {data.contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-[13px]"
            >
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
        title={t.exhibitors.deleteSingleTitle}
        description={t.exhibitors.deleteSingleDesc}
        confirmLabel={t.exhibitors.deleteSingleButton}
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
