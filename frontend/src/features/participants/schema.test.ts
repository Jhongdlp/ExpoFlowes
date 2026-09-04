import { describe, expect, it } from 'vitest'

import { EMPTY_PARTICIPANT, participantSchema, type ParticipantFormValues } from './schema'

const base: ParticipantFormValues = {
  ...EMPTY_PARTICIPANT,
  first_name: 'Ana',
  last_name: 'Rueda',
  identification: '1710034065',
  phone: '0991234567',
  position: 'Coordinadora',
}

const errorOn = (values: ParticipantFormValues, field: string): string | undefined => {
  const result = participantSchema.safeParse(values)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

/** R17: el campo condicional de §5.3, en la capa del formulario. */
describe('provider_company es obligatoria si y solo si la categoria es Service', () => {
  it('exige la empresa proveedora en Service', () => {
    expect(errorOn({ ...base, category: 'Service', provider_company: '' }, 'provider_company'))
      .toBeDefined()
  })

  it('acepta Service con empresa proveedora', () => {
    expect(participantSchema.safeParse({ ...base, category: 'Service', provider_company: 'Limpieza SA' }).success)
      .toBe(true)
  })

  it('rechaza una empresa proveedora en una categoria que no es Service', () => {
    // El backend lo rechaza con el mismo criterio y la base con un CHECK. Si el formulario
    // solo se apoyara en limpiar el campo al cambiar de categoria, un cambio de orden en el
    // formulario dejaria pasar la fila hasta el servidor.
    expect(errorOn({ ...base, category: 'Guest', provider_company: 'Limpieza SA' }, 'provider_company'))
      .toBeDefined()
  })

  it('acepta las demas categorias sin empresa proveedora', () => {
    expect(participantSchema.safeParse({ ...base, category: 'Guest' }).success).toBe(true)
    expect(participantSchema.safeParse({ ...base, category: 'Exhibitor' }).success).toBe(true)
  })
})

/** §6.8: sin correo el alta es valida; solo se pierde la notificacion de credencial. */
describe('correo opcional', () => {
  it('acepta el participante sin correo', () => {
    expect(participantSchema.safeParse({ ...base, email: '' }).success).toBe(true)
  })

  it('rechaza un correo mal escrito', () => {
    expect(errorOn({ ...base, email: 'ana@' }, 'email')).toBeDefined()
  })
})

describe('campos obligatorios', () => {
  it('no acepta un nombre en blanco', () => {
    expect(errorOn({ ...base, first_name: '   ' }, 'first_name')).toBeDefined()
  })
})
