"""Excepciones de dominio. Sin dependencias de framework."""

from typing import Any


class DomainError(Exception):
    """Base. `code` es estable y viaja al cliente; `message` es texto para el usuario final."""

    code: str = "DOMAIN_ERROR"
    status_code: int = 400

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details: dict[str, Any] = details or {}


class DuplicateParticipantError(DomainError):
    code = "PARTICIPANT_ALREADY_REGISTERED"
    status_code = 409


class QuotaExceededError(DomainError):
    code = "QUOTA_EXCEEDED"
    status_code = 409


class StandSizeOutOfRangeError(DomainError):
    code = "STAND_SIZE_OUT_OF_RANGE"
    status_code = 422


class QuotaBelowAssignedError(DomainError):
    code = "QUOTA_BELOW_ASSIGNED"
    status_code = 409


class InvalidIdentificationError(DomainError):
    code = "INVALID_IDENTIFICATION"
    status_code = 422


class BulkUploadValidationError(DomainError):
    code = "BULK_UPLOAD_INVALID_ROWS"
    status_code = 422


class InvalidOrExpiredTokenError(DomainError):
    code = "TOKEN_INVALID_OR_EXPIRED"
    status_code = 400


class InvalidCredentialsError(DomainError):
    code = "INVALID_CREDENTIALS"
    status_code = 401


class NotFoundError(DomainError):
    code = "NOT_FOUND"
    status_code = 404


class NotAuthenticatedError(DomainError):
    """Token ausente, mal formado o expirado. Distinto de un login fallido: el frontend
    reacciona limpiando la sesion, no mostrando 'contraseña incorrecta'."""

    code = "NOT_AUTHENTICATED"
    status_code = 401


class ForbiddenError(DomainError):
    """El rol no alcanza para la operacion. Nunca se usa para un recurso ajeno: eso es 404."""

    code = "FORBIDDEN"
    status_code = 403


class DuplicateExhibitorError(DomainError):
    """Ya existe un expositor vivo con ese RUC/ID en el evento."""

    code = "EXHIBITOR_ALREADY_REGISTERED"
    status_code = 409


class DuplicateEmailError(DomainError):
    """El correo del representante ya tiene usuario en el evento."""

    code = "EMAIL_ALREADY_REGISTERED"
    status_code = 409


class InvalidPayloadError(DomainError):
    """Invariante de forma detectado en el servicio, no por Pydantic (p. ej. un PATCH parcial
    que solo es invalido al mezclarlo con la fila existente). Usa el MISMO code que la
    validacion de Pydantic: al cliente no le importa que capa lo detecto."""

    code = "VALIDATION_ERROR"
    status_code = 422
