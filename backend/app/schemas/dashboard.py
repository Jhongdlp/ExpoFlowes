"""Agregados de los dos dashboards.

Ninguna cifra de este modulo se lee de una columna: cuota y disponibilidad se derivan del
metraje y de las reglas vigentes en cada peticion (§6.4).
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Una imagen de 90 mm de ancho no necesita mas: se reescala en el navegador antes de subir,
# y este tope corta de raiz que alguien empuje la foto original del movil a la base.
MAX_BADGE_IMAGE_CHARS = 400_000


class BadgeArt(BaseModel):
    """Imagen de las credenciales del stand y su encuadre.

    El encuadre no recorta la imagen: se guarda el punto de interes y el zoom, y cada
    variante de la credencial (banda apaisada o foto a sangre) la encuadra sola con
    `object-fit: cover`. Recortar a un aspecto fijo obligaria a elegir cual de las dos
    variantes se ve bien y cual se ve mal.
    """

    image: str = Field(max_length=MAX_BADGE_IMAGE_CHARS)
    focus_x: int = Field(default=50, ge=0, le=100)
    focus_y: int = Field(default=50, ge=0, le=100)
    zoom: int = Field(default=100, ge=100, le=300)

    @field_validator("image")
    @classmethod
    def only_embedded_images(cls, value: str) -> str:
        """Solo data URI de imagen.

        Aceptar una URL cualquiera convertiria este campo en un vector para pedir recursos
        a un tercero desde el navegador de quien imprime, y el que la sube es un
        representante, no el administrador de la feria.
        """
        allowed = ("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")
        if not value.startswith(allowed):
            raise ValueError("La imagen debe venir codificada como data URI JPEG, PNG o WEBP.")
        return value


class CategoryTotals(BaseModel):
    quota: int
    assigned: int
    available: int


class StandCategoryCount(BaseModel):
    """Cuantos stands caen en cada rango. La categoria es informativa (§6.7)."""

    label: str
    min_m2: int
    max_m2: int
    exhibitors: int


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    year: int
    starts_on: date
    ends_on: date


class AdminDashboard(BaseModel):
    event: EventRead
    exhibitors_total: int
    total_m2: int
    participants_total: int
    totals: dict[str, CategoryTotals]
    stand_categories: list[StandCategoryCount]


class MyQuota(BaseModel):
    """Cupo del stand propio, desglosado por categoria (§4)."""

    # Rotulo del evento en la credencial impresa; el aislamiento sigue siendo por event_id.
    event_name: str
    exhibitor_id: int
    legal_name: str
    stand_name: str
    requested_m2: int
    banner_url: str | None = None
    badge_art: BadgeArt | None = None
    stand_category: str
    quota: dict[str, int]
    assigned: dict[str, int]
    available: dict[str, int]
    participants_total: int
    # Sin correo no hay notificacion de credencial, pero el alta es valida (§6.8).
    participants_without_email: int
