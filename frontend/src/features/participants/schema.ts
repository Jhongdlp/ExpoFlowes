import { z } from 'zod'

import { identificationError } from '../../lib/identification'
import { IDENTIFICATION_TYPES } from '../exhibitors/schema'

export { IDENTIFICATION_TYPES }

/**
 * El campo condicional de: `provider_company` es obligatoria si y solo si la categoria
 * es Service. El discriminante es la categoria y vive en tres sitios, a proposito:
 *
 *   1. aqui, para que el formulario no deje enviar una fila invalida
 *   2. en el esquema Pydantic del backend, que es la validacion autoritativa
 *   3. en un CHECK de la base, que la garantiza ante cualquier ruta de escritura
 *
 * Cupo y duplicados no se replican: dependen de estado que el navegador no tiene, y los
 * valida el servidor. El digito verificador si, porque lo fija el registro civil y no puede
 * desincronizarse de ninguna tabla de configuracion (ver `lib/identification.ts`).
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
    // Opcional: sin correo no hay notificacion, pero el alta es valida.
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
    // "Si y solo si": el backend rechaza igual una proveedora en otra categoria. El formulario
    // limpia el campo al cambiar de categoria, pero eso es comodidad de la UI, no la regla.
    if (values.category !== SERVICE_CATEGORY && values.provider_company) {
      ctx.addIssue({
        code: 'custom',
        path: ['provider_company'],
        message: 'La empresa proveedora solo aplica a la categoría Service.',
      })
    }
    // El digito verificador se comprueba con el tipo elegido: cambiar de CEDULA a PASSPORT
    // tiene que revalidar el mismo numero contra otra regla.
    const failure = identificationError(values.identification, values.identification_type)
    if (failure !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['identification'], message: failure })
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
