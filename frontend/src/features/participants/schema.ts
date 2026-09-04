import { z } from 'zod'

import { IDENTIFICATION_TYPES } from '../exhibitors/schema'

export { IDENTIFICATION_TYPES }

/**
 * El campo condicional de §5.3: `provider_company` es obligatoria si y solo si la categoria
 * es Service. El discriminante es la categoria y vive en tres sitios, a proposito:
 *
 *   1. aqui, para que el formulario no deje enviar una fila invalida
 *   2. en el esquema Pydantic del backend, que es la validacion autoritativa
 *   3. en un CHECK de la base, que la garantiza ante cualquier ruta de escritura
 *
 * El resto de reglas —cupo, duplicados, algoritmo de cedula— no se replican: las valida el
 * servidor y el cliente solo pinta su `code`.
 */

const required = (message: string) => z.string().trim().min(1, message)

export const SERVICE_CATEGORY = 'Service'

export const participantSchema = z
  .object({
    first_name: required('Escriba el nombre.'),
    last_name: required('Escriba el apellido.'),
    identification_type: z.enum(['CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID']),
    identification: required('Escriba la identificación.'),
    phone: required('Escriba un celular.'),
    position: required('Escriba el cargo.'),
    category: z.enum(['Exhibitor', 'Guest', 'Service']),
    provider_company: z.string().trim().optional(),
    // Opcional (§6.8): sin correo no hay notificacion, pero el alta es valida.
    email: z.union([z.literal(''), z.email('Escriba un correo válido.')]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.category === SERVICE_CATEGORY && !values.provider_company) {
      ctx.addIssue({
        code: 'custom',
        path: ['provider_company'],
        message: 'La empresa proveedora es obligatoria para la categoría Service.',
      })
    }
  })

export type ParticipantFormValues = z.infer<typeof participantSchema>

export const EMPTY_PARTICIPANT: ParticipantFormValues = {
  first_name: '',
  last_name: '',
  identification_type: 'CEDULA',
  identification: '',
  phone: '',
  position: '',
  category: 'Exhibitor',
  provider_company: '',
  email: '',
}
