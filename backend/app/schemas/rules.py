"""Lectura de las tablas de reglas (solo lectura, no hay CRUD de reglas).

El frontend las consume para rotular rangos y cuotas sin conocer ningun numero de negocio.
"""

from pydantic import BaseModel, ConfigDict


class StandSizeRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    min_m2: int
    max_m2: int


class CredentialRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    credentials_per_block: int
    block_m2: int
    rounding_mode: str


class QuotaSimulation(BaseModel):
    """Derivacion de un metraje cualquiera con las reglas VIGENTES en la base.

    No persiste nada: es la misma funcion que deriva la cuota de un expositor real
    (`exhibitor_service.quota_view`), expuesta para poder comprobar en pantalla que un UPDATE
    sobre `stand_size_rules` / `credential_rules` cambia el resultado sin tocar codigo (E3).
    """

    requested_m2: int
    stand_category: str
    quota: dict[str, int]
