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

interface Props {
  categories: string[]
  onSubmit: (values: ParticipantFormValues) => Promise<void>
  onCancel: () => void
  submitting: boolean
  serverError: unknown
  onDismissError: () => void
  /** Se llama tras un alta correcta para dejar el formulario listo para la siguiente. */
  resetSignal: number
}

const TYPES = IDENTIFICATION_TYPES.map((type) => ({ value: type.value, label: type.label }))

export function ParticipantForm({
  categories,
  onSubmit,
  onCancel,
  submitting,
  serverError,
  onDismissError,
  resetSignal,
}: Props) {
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: EMPTY_PARTICIPANT,
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
    if (resetSignal > 0) form.reset(EMPTY_PARTICIPANT)
  }, [resetSignal, form])

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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-3xl space-y-8">
      <div ref={alertRef}>
        {duplicate !== null ? (
          <DuplicateAlert error={duplicate} onDismiss={onDismissError} />
        ) : serverError === null || serverError === undefined ? null : (
          <ServerError error={serverError} onDismiss={onDismissError} />
        )}
      </div>

      <FormSection title="Persona">
        <Field
          label="Nombre"
          error={errors.first_name?.message}
          {...form.register('first_name')}
        />
        <Field
          label="Apellido"
          error={errors.last_name?.message}
          {...form.register('last_name')}
        />
        <Select
          label="Tipo de identificación"
          options={TYPES}
          error={errors.identification_type?.message}
          {...form.register('identification_type')}
        />
        <Field
          label="Identificación"
          hint="Es la clave que impide acreditar a la misma persona en dos stands."
          error={errors.identification?.message}
          {...form.register('identification')}
        />
        <Field label="Celular" error={errors.phone?.message} {...form.register('phone')} />
        <Field label="Cargo" error={errors.position?.message} {...form.register('position')} />
        <Field
          label="Correo (opcional)"
          type="email"
          className="sm:col-span-2"
          hint="Si lo indica, la persona recibirá la confirmación de su credencial."
          error={errors.email?.message}
          {...form.register('email')}
        />
      </FormSection>

      <FormSection title="Credencial">
        <Select
          label="Categoría"
          options={categories.map((item) => ({ value: item, label: item }))}
          error={errors.category?.message}
          {...form.register('category')}
        />
        {isService ? (
          <Field
            label="Empresa proveedora"
            hint="Obligatoria para la categoría Service."
            error={errors.provider_company?.message}
            {...form.register('provider_company')}
          />
        ) : null}
      </FormSection>

      <div className="flex justify-end gap-2 border-t border-line pt-6">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar credencial'}
        </Button>
      </div>
    </form>
  )
}
