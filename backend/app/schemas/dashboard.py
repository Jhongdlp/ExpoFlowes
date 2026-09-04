"""Agregados de los dos dashboards.

Ninguna cifra de este modulo se lee de una columna: cuota y disponibilidad se derivan del
metraje y de las reglas vigentes en cada peticion (§6.4).
"""

from datetime import date

from pydantic import BaseModel, ConfigDict


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

    exhibitor_id: int
    legal_name: str
    stand_name: str
    requested_m2: int
    stand_category: str
    quota: dict[str, int]
    assigned: dict[str, int]
    available: dict[str, int]
    participants_total: int
    # Sin correo no hay notificacion de credencial, pero el alta es valida (§6.8).
    participants_without_email: int
