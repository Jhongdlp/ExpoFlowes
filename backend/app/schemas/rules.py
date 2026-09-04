"""Lectura de las tablas de reglas (CLAUDE.md §A.11: solo lectura, no hay CRUD de reglas).

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
