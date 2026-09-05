import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'

import { ApiError } from '../../api/client'
import { FormSection } from '../../components/FormSection'
import { ServerError, fieldErrors } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { DuplicateAlert } from './DuplicateAlert'
import {
  EMPTY_PARTICIPANT,
  IDENTIFICATION_TYPES,
  SERVICE_CATEGORY,
  participantSchema,
  type ParticipantFormValues,
} from './schema'
import { useTranslation } from '../i18n/LanguageContext'

interface Props {
  categories: string[]
  onSubmit: (values: ParticipantFormValues) => Promise<void>
  onCancel: () => void
  submitting: boolean
  serverError: unknown
  onDismissError: () => void
  /** Se llama tras un alta correcta para dejar el formulario listo para la siguiente. */
  resetSignal: number
  /** Valores de partida. Sin ellos el formulario es un alta; con ellos, una edicion. */
  initial?: ParticipantFormValues
  /** Cupo libre por categoria. Una categoria agotada no se puede elegir (§9.3). */
  available?: Record<string, number>
  submitLabel?: string
}

export function ParticipantForm({
  categories,
  onSubmit,
  onCancel,
  submitting,
  serverError,
  onDismissError,
  resetSignal,
  initial = EMPTY_PARTICIPANT,
  available,
  submitLabel,
}: Props) {
  const { t, lang } = useTranslation()
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: initial,
  })
  const errors = form.formState.errors
  const alertRef = useRef<HTMLDivElement>(null)

  const category = form.watch('category')
  const isService = category === SERVICE_CATEGORY

  // Al salir de Service el campo desaparece Y se limpia: dejar el valor escondido enviaria
  // una empresa proveedora en una categoria que no la admite, y la base lo rechazaria.
  useEffect(() => {
    if (!isService) form.setValue('provider_company', '')
  }, [isService, form])

  useEffect(() => {
    if (resetSignal > 0) form.reset(initial)
  }, [resetSignal, form, initial])

  useEffect(() => {
    for (const item of fieldErrors(serverError)) {
      form.setError(item.field as FieldPath<ParticipantFormValues>, { message: item.message })
    }
    if (serverError !== null && serverError !== undefined) {
      alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [serverError, form])

  const duplicate =
    serverError instanceof ApiError && serverError.code === 'PARTICIPANT_ALREADY_REGISTERED'
      ? serverError
      : null

  const idTypes = IDENTIFICATION_TYPES.map((type) => ({
    value: type.value,
    label: (t.idTypes as Record<string, string>)[type.value] ?? type.label,
  }))

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-3xl space-y-6">
      <div ref={alertRef}>
        {duplicate !== null ? (
          <DuplicateAlert error={duplicate} onDismiss={onDismissError} />
        ) : serverError === null || serverError === undefined ? null : (
          <ServerError error={serverError} onDismiss={onDismissError} />
        )}
      </div>

      <FormSection title={t.tables.person}>
        <Field
          label={t.common.name}
          error={errors.first_name?.message}
          {...form.register('first_name')}
        />
        <Field
          label={t.common.lastName}
          error={errors.last_name?.message}
          {...form.register('last_name')}
        />
        <Select
          label={t.common.identificationType}
          options={idTypes}
          error={errors.identification_type?.message}
          {...form.register('identification_type')}
        />
        <Field
          label={t.tables.identification}
          hint={
            lang === 'en'
              ? 'The key that prevents registering the same person in multiple stands.'
              : 'Es la clave que impide acreditar a la misma persona en dos stands.'
          }
          error={errors.identification?.message}
          {...form.register('identification', {
            // El digito verificador se comprueba al salir del campo, no al guardar: es el
            // unico dato del formulario que se puede teclear mal sin notarlo.
            onBlur: () => void form.trigger('identification'),
          })}
        />
        <Field
          label={lang === 'en' ? 'Mobile / Phone' : 'Celular'}
          error={errors.phone?.message}
          {...form.register('phone')}
        />
        <Field
          label={t.tables.position}
          error={errors.position?.message}
          {...form.register('position')}
        />
        <Field
          label={lang === 'en' ? 'Email (optional)' : 'Correo (opcional)'}
          type="email"
          className="sm:col-span-2"
          hint={
            lang === 'en'
              ? 'If provided, the person will receive their credential confirmation.'
              : 'Si lo indica, la persona recibirá la confirmación de su credencial.'
          }
          error={errors.email?.message}
          {...form.register('email')}
        />
      </FormSection>

      <FormSection title={t.participants.title}>
        {/*
          El cupo se muestra en la propia opcion y la categoria sin cupo no se puede elegir:
          el tope se descubre antes de escribir la ficha, no al recibir el QUOTA_EXCEEDED.
          La categoria que la persona ya tiene nunca se bloquea —su credencial ya ocupa ese
          cupo—, y la validacion autoritativa sigue siendo la del servidor.
        */}
        <Select
          label={t.tables.category}
          placeholder={lang === 'en' ? 'Select category' : 'Seleccionar categoría'}
          options={categories.map((item) => {
            const name = (t.categories as Record<string, string>)[item] ?? item
            const free = available?.[item]
            const isCurrent = item === initial.category
            const exhausted = free === 0 && !isCurrent
            return {
              value: item,
              label:
                free === undefined
                  ? name
                  : exhausted
                    ? `${name} — ${lang === 'en' ? 'no quota left' : 'sin cupo'}`
                    : `${name} — ${free} ${lang === 'en' ? 'available' : 'disponibles'}`,
              disabled: exhausted,
            }
          })}
          error={errors.category?.message}
          {...form.register('category')}
        />
        {/* Campo condicional (§13): aparece con la categoria Service y se anuncia al llegar. */}
        {isService ? (
          <div className="animate-rise">
            <Field
              label={lang === 'en' ? 'Service provider company' : 'Empresa proveedora'}
              hint={lang === 'en' ? 'Required for Service category.' : 'Obligatoria para la categoría Service.'}
              error={errors.provider_company?.message}
              {...form.register('provider_company')}
            />
          </div>
        ) : null}
      </FormSection>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t.common.cancel}
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? t.common.saving : (submitLabel ?? t.participants.newCredential)}
        </Button>
      </div>
    </form>
  )
}
