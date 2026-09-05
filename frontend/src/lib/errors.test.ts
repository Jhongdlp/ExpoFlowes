import { describe, expect, it } from 'vitest'

import { ERROR_MESSAGES, FALLBACK_MESSAGE } from './errors'

/**: la UI decide por `code`, nunca por el texto del servidor. */
describe('mapa de errores', () => {
  it('traduce por codigo cada error de dominio del backend', () => {
    // Los codigos de Si el backend añade uno y aqui no se traduce, el usuario ve el
    // mensaje generico en lugar de saber que hacer.
    const domainCodes = [
      'PARTICIPANT_ALREADY_REGISTERED',
      'QUOTA_EXCEEDED',
      'STAND_SIZE_OUT_OF_RANGE',
      'QUOTA_BELOW_ASSIGNED',
      'INVALID_IDENTIFICATION',
      'BULK_UPLOAD_INVALID_ROWS',
      'TOKEN_INVALID_OR_EXPIRED',
      'INVALID_CREDENTIALS',
      'NOT_FOUND',
      'VALIDATION_ERROR',
    ]

    for (const code of domainCodes) {
      expect(ERROR_MESSAGES[code], code).toBeDefined()
    }
  })

  it('un codigo desconocido cae en el mensaje generico', () => {
    expect(ERROR_MESSAGES['CODIGO_QUE_NO_EXISTE'] ?? FALLBACK_MESSAGE).toBe(FALLBACK_MESSAGE)
  })

  it('ningun mensaje filtra detalle interno', () => {
    //: nada de SQL, nombres de constraint ni rutas en lo que lee el usuario.
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      expect(message, code).not.toMatch(/select |uq_|traceback|sqlalchemy|\.py/i)
    }
  })
})
