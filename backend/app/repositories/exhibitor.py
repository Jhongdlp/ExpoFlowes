from sqlalchemy import select

from app.models import Exhibitor
from app.repositories.base import EventScopedRepository


class ExhibitorRepository(EventScopedRepository):
    def get(self, exhibitor_id: int) -> Exhibitor | None:
        """Un expositor de otro evento o borrado no se encuentra: el router responde 404."""
        stmt = select(Exhibitor).where(
            Exhibitor.event_id == self.event_id,
            Exhibitor.id == exhibitor_id,
            Exhibitor.deleted_at.is_(None),
        )
        return self.db.execute(stmt).scalar_one_or_none()
