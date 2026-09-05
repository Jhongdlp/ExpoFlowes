"""Esquema unico de participante.

La carga masiva de F11 valida cada fila del Excel con ESTE mismo esquema: un solo sitio donde
cambiar las reglas de forma del dato, y el alta manual y la masiva no pueden divergir.
"""

from datetime import datetime
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

Category = Literal["Exhibitor", "Guest", "Service"]
IdentificationType = Literal["CEDULA", "RUC", "PASSPORT", "FOREIGN_ID"]


def check_provider_company(category: str | None, provider_company: str | None) -> None:
    """Campo condicional: obligatorio si y solo si la categoria es Service.

    El mismo invariante vive como CHECK en la base; esta es la capa que da el mensaje.
    """
    if category == "Service" and not provider_company:
        raise ValueError("La empresa proveedora es obligatoria para la categoria Service.")
    if category != "Service" and provider_company:
        raise ValueError("La empresa proveedora solo aplica a la categoria Service.")


class ParticipantIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    identification: str = Field(min_length=1, max_length=20)
    identification_type: IdentificationType
    phone: str = Field(min_length=1, max_length=30)
    position: str = Field(min_length=1, max_length=80)
    category: Category
    provider_company: str | None = Field(default=None, max_length=200)
    # Opcional: sin correo no hay notificacion, pero el alta no falla.
    email: EmailStr | None = None

    @model_validator(mode="after")
    def check_provider_company(self) -> Self:
        check_provider_company(self.category, self.provider_company)
        return self


class ParticipantUpdate(BaseModel):
    """PATCH: el invariante de `provider_company` se revalida en el servicio sobre el
    resultado de la mezcla, porque aqui no se conoce la categoria que ya tiene la fila."""

    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    identification: str | None = Field(default=None, min_length=1, max_length=20)
    identification_type: IdentificationType | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=30)
    position: str | None = Field(default=None, min_length=1, max_length=80)
    category: Category | None = None
    provider_company: str | None = Field(default=None, max_length=200)
    email: EmailStr | None = None


class ParticipantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    identification: str
    # Mismos tipos cerrados que en la escritura: ParticipantIn ya solo admite estos valores,
    # asi que devolverlos como `str` solo servia para que el cliente los recibiera sin tipar.
    identification_type: IdentificationType
    phone: str
    position: str
    category: Category
    provider_company: str | None
    email: str | None
    credential_notified_at: datetime | None = None


class ParticipantWithExhibitor(ParticipantRead):
    """Fila del listado global del admin: la misma credencial, mas de que stand es."""

    exhibitor_id: int
    exhibitor_name: str


class BulkUploadReport(BaseModel):
    """Informe de la carga masiva. Con `dry_run` es identico salvo `inserted`."""

    total_rows: int
    valid_rows: int
    inserted: int
    dry_run: bool
