/**
 * Unico sitio donde un `code` del backend se convierte en texto para el usuario.
 *
 * La UI decide SIEMPRE por `code`, nunca por el texto del `message` (CLAUDE.md §13): un
 * mensaje se puede reescribir sin avisar, un codigo es contrato.
 */

export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  NOT_AUTHENTICATED: 'La sesión caducó. Vuelva a iniciar sesión.',
  FORBIDDEN: 'Su cuenta no tiene acceso a esta sección.',
  NOT_FOUND: 'El recurso solicitado no existe.',
  VALIDATION_ERROR: 'Revise los datos marcados del formulario.',
  INVALID_IDENTIFICATION: 'La identificación no es válida.',
  STAND_SIZE_OUT_OF_RANGE: 'El metraje no corresponde a ninguna categoría de stand vigente.',
  QUOTA_EXCEEDED: 'No quedan credenciales disponibles en esa categoría.',
  QUOTA_BELOW_ASSIGNED:
    'El nuevo metraje deja la cuota por debajo de las credenciales ya asignadas.',
  PARTICIPANT_ALREADY_REGISTERED: 'Esa persona ya está acreditada en otro stand de esta feria.',
  EXHIBITOR_ALREADY_REGISTERED: 'Ya existe un expositor con esa identificación tributaria.',
  EMAIL_ALREADY_REGISTERED: 'Ese correo ya tiene una cuenta de acceso en esta feria.',
  BULK_UPLOAD_INVALID_ROWS: 'El archivo contiene filas con errores. Ninguna fila fue importada.',
  TOKEN_INVALID_OR_EXPIRED: 'El enlace ya se usó o caducó. Solicite uno nuevo al organizador.',
  RATE_LIMITED: 'Demasiados intentos. Espere un minuto antes de volver a probar.',
  NETWORK_ERROR: 'No se pudo contactar con el servidor.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado. Inténtelo nuevamente.',
}

export const FALLBACK_MESSAGE = ERROR_MESSAGES.INTERNAL_ERROR as string
