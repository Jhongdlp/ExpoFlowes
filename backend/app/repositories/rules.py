"""Lectura de las tablas de reglas.

Sin cache, deliberadamente: las reglas se leen de la base en cada operacion que las necesita.
Cachearlas al arrancar romperia el punto extra E3 —un UPDATE tendria que esperar a un
reinicio— y con el, el test R7.
"""

from sqlalchemy import select

from app.models import CredentialRule, StandSizeRule
from app.repositories.base import EventScopedRepository


class RulesRepository(EventScopedRepository):
    def stand_sizes(self) -> list[StandSizeRule]:
        stmt = (
            select(StandSizeRule)
            .where(StandSizeRule.event_id == self.event_id)
            .order_by(StandSizeRule.min_m2)
        )
        return list(self.db.execute(stmt).scalars())

    def credentials(self) -> list[CredentialRule]:
        stmt = (
            select(CredentialRule)
            .where(CredentialRule.event_id == self.event_id)
            .order_by(CredentialRule.category)
        )
        return list(self.db.execute(stmt).scalars())
