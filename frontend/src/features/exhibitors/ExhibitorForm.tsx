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

interface Props {
  onSubmit: (values: ExhibitorFormValues) => Promise<void>
  onCancel: () => void
  submitting: boolean
  serverError: unknown
  onDismissError: () => void
}

const TYPES = IDENTIFICATION_TYPES.map((type) => ({ value: type.value, label: type.label }))

export function ExhibitorForm({
  onSubmit,
  onCancel,
  submitting,
  serverError,
  onDismissError,
}: Props) {
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

      <FormSection title="Datos de la empresa">
        <Select
          label="Tipo de identificación"
          options={TYPES}
          error={errors.tax_id_type?.message}
          {...form.register('tax_id_type')}
        />
        <Field
          label="Identificación tributaria"
          hint="RUC o identificación fiscal internacional."
          error={errors.tax_id?.message}
          {...form.register('tax_id')}
        />
        <Field
          label="Razón social"
          className="sm:col-span-2"
          error={errors.legal_name?.message}
          {...form.register('legal_name')}
        />
        <Field
          label="Nombre comercial del stand"
          error={errors.stand_name?.message}
          {...form.register('stand_name')}
        />
        <Field
          label="Metraje solicitado (m²)"
          type="number"
          inputMode="numeric"
          hint="La categoría del stand y el cupo de credenciales se calculan con este valor."
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

      <FormSection
        title="Representante del stand"
        description="Con este correo se crea su acceso: recibirá un enlace para establecer su contraseña."
      >
        <Field
          label="Nombre completo"
          className="sm:col-span-2"
          error={errors.representative?.full_name?.message}
          {...form.register('representative.full_name')}
        />
        <Select
          label="Tipo de identificación"
          options={TYPES}
          error={errors.representative?.identification_type?.message}
          {...form.register('representative.identification_type')}
        />
        <Field
          label="Identificación"
          error={errors.representative?.identification?.message}
          {...form.register('representative.identification')}
        />
        <Field
          label="Correo"
          type="email"
          error={errors.representative?.email?.message}
          {...form.register('representative.email')}
        />
        <Field
          label="Teléfono"
          error={errors.representative?.phone?.message}
          {...form.register('representative.phone')}
        />
        <Field
          label="Cargo"
          className="sm:col-span-2"
          error={errors.representative?.position?.message}
          {...form.register('representative.position')}
        />
      </FormSection>

      <section className="border-t border-line pt-5">
        <h2 className="label-caps">Contactos adicionales</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          Al menos uno. Son los contactos operativos de la empresa durante la feria.
        </p>

        <div className="mt-4 space-y-3">
          {contacts.fields.map((contact, index) => (
            <div key={contact.id} className="surface animate-rise p-3">
              {/* Numero del contacto: en una lista dinamica dice cual se esta editando. */}
              <div className="mb-3 flex items-center justify-between">
                <span className="label-caps">Contacto {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => contacts.remove(index)}
                  // Con un solo contacto no se puede quitar: el minimo es uno (§5.3).
                  disabled={contacts.fields.length === 1}
                  title={
                    contacts.fields.length === 1 ? 'Debe quedar al menos un contacto' : undefined
                  }
                >
                  Quitar
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Nombre"
                  error={errors.contacts?.[index]?.name?.message}
                  {...form.register(`contacts.${index}.name`)}
                />
                <Field
                  label="Teléfono"
                  error={errors.contacts?.[index]?.phone?.message}
                  {...form.register(`contacts.${index}.phone`)}
                />
                <Field
                  label="Correo"
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
          Agregar contacto
        </Button>
      </section>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? 'Creando…' : 'Crear expositor'}
        </Button>
      </div>
    </form>
  )
}
