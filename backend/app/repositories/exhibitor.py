from collections.abc import Sequence

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import selectinload

from app.models import Exhibitor, Participant
from app.repositories.base import EventScopedRepository
from app.repositories.search import matches


class ExhibitorRepository(EventScopedRepository):
    """Todo metodo filtra por `self.event_id`; no existe forma de listar sin scope."""

    def _alive(self) -> tuple[ColumnElement[bool], ColumnElement[bool]]:
        """Scope obligatorio: evento del token y expositor no borrado."""
        return (Exhibitor.event_id == self.event_id, Exhibitor.deleted_at.is_(None))

    def get(self, exhibitor_id: int) -> Exhibitor | None:
        """Un expositor de otro evento o borrado no se encuentra: el router responde 404."""
        stmt = select(Exhibitor).where(*self._alive(), Exhibitor.id == exhibitor_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_detail(self, exhibitor_id: int) -> Exhibitor | None:
        stmt = (
            select(Exhibitor)
            .where(*self._alive(), Exhibitor.id == exhibitor_id)
            .options(selectinload(Exhibitor.representative), selectinload(Exhibitor.contacts))
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_tax_id(self, tax_id: str) -> Exhibitor | None:
        stmt = select(Exhibitor).where(*self._alive(), Exhibitor.tax_id == tax_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def all(self) -> list[Exhibitor]:
        """Todos los vivos del evento. Solo para agregados y reportes, nunca para un listado
        de API: los listados paginan."""
        stmt = select(Exhibitor).where(*self._alive()).order_by(Exhibitor.legal_name)
        return list(self.db.execute(stmt).scalars())

    def list(
        self, page: int, page_size: int, search: str | None = None
    ) -> tuple[list[Exhibitor], int]:
        filters = [
            *self._alive(),
            *matches(
                search,
                Exhibitor.legal_name,
                Exhibitor.stand_name,
                Exhibitor.tax_id,
                Exhibitor.address,
            ),
        ]
        total = self.db.execute(
            select(func.count()).select_from(Exhibitor).where(*filters)
        ).scalar_one()
        stmt = (
            select(Exhibitor)
            .where(*filters)
            .order_by(Exhibitor.legal_name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.execute(stmt).scalars()), total

    def assigned_counts(self, exhibitor_ids: Sequence[int]) -> dict[int, dict[str, int]]:
        """Credenciales ya asignadas por expositor y categoria. En una consulta, sin N+1."""
        if not exhibitor_ids:
            return {}
        stmt = (
            select(Participant.exhibitor_id, Participant.category, func.count())
            .where(
                Participant.event_id == self.event_id,
                Participant.exhibitor_id.in_(exhibitor_ids),
            )
            .group_by(Participant.exhibitor_id, Participant.category)
        )
        counts: dict[int, dict[str, int]] = {i: {} for i in exhibitor_ids}
        for exhibitor_id, category, total in self.db.execute(stmt):
            counts[exhibitor_id][category] = total
        return counts

    def add(self, exhibitor: Exhibitor) -> None:
        self.db.add(exhibitor)
