import { z } from 'zod'

/**
 * zod valida FORMA: requerido, tipo, minimo un contacto.
 *
 * Las reglas de negocio —rangos de metraje, cuotas, algoritmo de cedula y RUC— las valida
 * el servidor y el cliente solo pinta su `code`. Duplicarlas aqui garantizaria que un dia
 * se desincronicen y el frontend rechace un metraje que la feria si acepta.
 */

export const IDENTIFICATION_TYPES = [
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'RUC', label: 'RUC' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'FOREIGN_ID', label: 'Documento extranjero' },
] as const

const identificationType = z.enum(['CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID'])
const required = (message: string) => z.string().trim().min(1, message)

export const contactSchema = z.object({
  name: required('Escriba el nombre del contacto.'),
  phone: required('Escriba un teléfono.'),
  email: z.email('Escriba un correo válido.'),
})

export const standSchema = z.object({
  legal_name: required('Escriba la razón social.'),
  stand_name: required('Escriba el nombre comercial del stand.'),
  address: required('Escriba la dirección.'),
  requested_m2: z
    .number('Indique el metraje en m².')
    .int('Use un número entero de metros.')
    .positive('El metraje debe ser mayor que cero.'),
})

export const exhibitorSchema = standSchema.extend({
  tax_id_type: identificationType,
  tax_id: required('Escriba la identificación tributaria.'),
  representative: z.object({
    full_name: required('Escriba el nombre del representante.'),
    identification_type: identificationType,
    identification: required('Escriba la identificación.'),
    email: z.email('Escriba un correo válido.'),
    phone: required('Escriba un teléfono.'),
    position: required('Escriba el cargo.'),
  }),
  // Minimo un contacto adicional (§5.3). El formulario lo impide antes de llamar a la API.
  contacts: z.array(contactSchema).min(1, 'Agregue al menos un contacto adicional.'),
})

export type ExhibitorFormValues = z.infer<typeof exhibitorSchema>
export type StandFormValues = z.infer<typeof standSchema>

export const EMPTY_EXHIBITOR: ExhibitorFormValues = {
  tax_id_type: 'RUC',
  tax_id: '',
  legal_name: '',
  stand_name: '',
  address: '',
  requested_m2: 0,
  representative: {
    full_name: '',
    identification_type: 'CEDULA',
    identification: '',
    email: '',
    phone: '',
    position: '',
  },
  contacts: [{ name: '', phone: '', email: '' }],
}
