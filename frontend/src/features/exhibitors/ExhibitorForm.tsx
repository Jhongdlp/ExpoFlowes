import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form'

import { FormSection } from '../../components/FormSection'
import { ServerError, fieldErrors } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { FieldError } from '../../components/ui/FieldError'
import { Select } from '../../components/ui/Select'
import {
  EMPTY_EXHIBITOR,
  IDENTIFICATION_TYPES,
  exhibitorSchema,
  type ExhibitorFormValues,
} from './schema'
import { useTranslation } from '../i18n/LanguageContext'

interface Props {
  onSubmit: (values: ExhibitorFormValues) => Promise<void>
  onCancel: () => void
  submitting: boolean
  serverError: unknown
  onDismissError: () => void
}

export function ExhibitorForm({
  onSubmit,
  onCancel,
  submitting,
  serverError,
  onDismissError,
}: Props) {
  const { t, lang } = useTranslation()
  const form = useForm<ExhibitorFormValues>({
    resolver: zodResolver(exhibitorSchema),
    defaultValues: EMPTY_EXHIBITOR,
  })
  const contacts = useFieldArray({ control: form.control, name: 'contacts' })
  const errors = form.formState.errors
  const errorRef = useRef<HTMLDivElement>(null)

  // El formulario es largo y el boton esta al final: sin esto, un error del servidor se
  // renderiza arriba y el usuario cree que no paso nada.
  useEffect(() => {
    if (serverError !== null && serverError !== undefined) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [serverError])

  // El backend tambien valida forma; si algo se le escapa a zod, el error aterriza en su
  // campo en vez de en un aviso generico arriba del todo.
  useEffect(() => {
    for (const item of fieldErrors(serverError)) {
      form.setError(item.field as FieldPath<ExhibitorFormValues>, { message: item.message })
    }
  }, [serverError, form])

  const idTypes = IDENTIFICATION_TYPES.map((type) => ({
    value: type.value,
    label: (t.idTypes as Record<string, string>)[type.value] ?? type.label,
  }))

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="max-w-3xl space-y-6 pb-4"
    >
      <div ref={errorRef}>
        {serverError === null || serverError === undefined ? null : (
          <ServerError error={serverError} onDismiss={onDismissError} />
        )}
      </div>

      <FormSection title={lang === 'en' ? 'Company Information' : 'Datos de la empresa'}>
        <Select
          label={t.common.identificationType}
          options={idTypes}
          error={errors.tax_id_type?.message}
          {...form.register('tax_id_type')}
        />
        <Field
          label={lang === 'en' ? 'Tax Identification' : 'Identificación tributaria'}
          hint={lang === 'en' ? 'Tax ID / RUC or international tax identification.' : 'RUC o identificación fiscal internacional.'}
          error={errors.tax_id?.message}
          {...form.register('tax_id')}
        />
        <Field
          label={lang === 'en' ? 'Legal Name' : 'Razón social'}
          className="sm:col-span-2"
          error={errors.legal_name?.message}
          {...form.register('legal_name')}
        />
        <Field
          label={lang === 'en' ? 'Stand Trade Name' : 'Nombre comercial del stand'}
          error={errors.stand_name?.message}
          {...form.register('stand_name')}
        />
        <Field
          label={lang === 'en' ? 'Requested Stand Size (m²)' : 'Metraje solicitado (m²)'}
          type="number"
          inputMode="numeric"
          hint={lang === 'en' ? 'Stand category and credential quotas are calculated with this value.' : 'La categoría del stand y el cupo de credenciales se calculan con este valor.'}
          error={errors.requested_m2?.message}
          {...form.register('requested_m2', { valueAsNumber: true })}
        />
        <Field
          label={lang === 'en' ? 'Address' : 'Dirección'}
          className="sm:col-span-2"
          error={errors.address?.message}
          {...form.register('address')}
        />
      </FormSection>

      <FormSection
        title={t.exhibitors.representative}
        description={lang === 'en' ? 'Access account will be created with this email.' : 'Con este correo se crea su acceso: recibirá un enlace para establecer su contraseña.'}
      >
        <Field
          label={lang === 'en' ? 'Full name' : 'Nombre completo'}
          className="sm:col-span-2"
          error={errors.representative?.full_name?.message}
          {...form.register('representative.full_name')}
        />
        <Select
          label={t.common.identificationType}
          options={idTypes}
          error={errors.representative?.identification_type?.message}
          {...form.register('representative.identification_type')}
        />
        <Field
          label={t.tables.identification}
          error={errors.representative?.identification?.message}
          {...form.register('representative.identification')}
        />
        <Field
          label={t.tables.email}
          type="email"
          error={errors.representative?.email?.message}
          {...form.register('representative.email')}
        />
        <Field
          label={t.common.phone}
          error={errors.representative?.phone?.message}
          {...form.register('representative.phone')}
        />
        <Field
          label={t.tables.position}
          className="sm:col-span-2"
          error={errors.representative?.position?.message}
          {...form.register('representative.position')}
        />
      </FormSection>

      <section className="border-t border-line pt-5">
        <h2 className="label-caps">{t.exhibitors.additionalContacts}</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          {lang === 'en' ? 'At least one contact. Operational contacts for the company during the expo.' : 'Al menos uno. Son los contactos operativos de la empresa durante la feria.'}
        </p>

        <div className="mt-4 space-y-3">
          {contacts.fields.map((contact, index) => (
            <div key={contact.id} className="surface animate-rise p-3">
              {/* Numero del contacto: en una lista dinamica dice cual se esta editando. */}
              <div className="mb-3 flex items-center justify-between">
                <span className="label-caps">{lang === 'en' ? `Contact ${index + 1}` : `Contacto ${index + 1}`}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => contacts.remove(index)}
                  // Con un solo contacto no se puede quitar: el minimo es uno (§5.3).
                  disabled={contacts.fields.length === 1}
                  title={
                    contacts.fields.length === 1 ? (lang === 'en' ? 'At least one contact must remain' : 'Debe quedar al menos un contacto') : undefined
                  }
                >
                  {lang === 'en' ? 'Remove' : 'Quitar'}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label={t.common.name}
                  error={errors.contacts?.[index]?.name?.message}
                  {...form.register(`contacts.${index}.name`)}
                />
                <Field
                  label={t.common.phone}
                  error={errors.contacts?.[index]?.phone?.message}
                  {...form.register(`contacts.${index}.phone`)}
                />
                <Field
                  label={t.tables.email}
                  type="email"
                  error={errors.contacts?.[index]?.email?.message}
                  {...form.register(`contacts.${index}.email`)}
                />
              </div>
            </div>
          ))}
        </div>

        <FieldError message={errors.contacts?.root?.message} />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => contacts.append({ name: '', phone: '', email: '' })}
        >
          {lang === 'en' ? 'Add contact' : 'Agregar contacto'}
        </Button>
      </section>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t.common.cancel}
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? t.common.saving : t.dashboard.newExhibitor}
        </Button>
      </div>
    </form>
  )
}
