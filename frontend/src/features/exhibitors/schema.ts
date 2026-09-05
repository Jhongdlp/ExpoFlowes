import { z } from 'zod'

import { identificationError } from '../../lib/identification'
import { DEFAULT_BANNER_ID } from './bannerPresets'

/**
 * zod valida FORMA: requerido, tipo, minimo un contacto.
 *
 * Los rangos de metraje y las cuotas NO se validan aqui: viven en tablas parametrizadas
 * (§7.1) y pueden cambiar sin redeploy, asi que una copia en el cliente acabaria rechazando
 * un metraje que la feria si acepta. El digito verificador de cedula y RUC es lo contrario
 * —algoritmo fijo del registro civil, igual en todos los eventos— y por eso si se comprueba
 * antes de enviar (`lib/identification.ts`).
 */

/** Comprueba el digito verificador de un par (tipo, numero) dentro de un objeto zod. */
const checkIdentification =
  <T extends { identification_type: 'CEDULA' | 'RUC' | 'PASSPORT' | 'FOREIGN_ID' }>(
    field: keyof T & string,
  ) =>
  (values: T, ctx: z.RefinementCtx) => {
    const failure = identificationError(String(values[field]), values.identification_type)
    if (failure !== undefined) {
      ctx.addIssue({ code: 'custom', path: [field], message: failure })
    }
  }

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
  banner_url: z.string().nullable().optional(),
})

export const exhibitorSchema = standSchema.extend({
  tax_id_type: identificationType,
  tax_id: required('Escriba la identificación tributaria.'),
  representative: z
    .object({
      full_name: required('Escriba el nombre del representante.'),
      identification_type: identificationType,
      identification: required('Escriba la identificación.'),
      email: z.email('Escriba un correo válido.'),
      phone: required('Escriba un teléfono.'),
      position: required('Escriba el cargo.'),
    })
    .superRefine(checkIdentification('identification')),
  // Minimo un contacto adicional (§5.3). El formulario lo impide antes de llamar a la API.
  contacts: z.array(contactSchema).min(1, 'Agregue al menos un contacto adicional.'),
}).superRefine((values, ctx) => {
  const failure = identificationError(values.tax_id, values.tax_id_type)
  if (failure !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['tax_id'], message: failure })
  }
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
  banner_url: DEFAULT_BANNER_ID,
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
