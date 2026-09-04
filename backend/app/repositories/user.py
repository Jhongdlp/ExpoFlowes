from sqlalchemy import select

from app.models import User
from app.repositories.base import EventScopedRepository


class UserRepository(EventScopedRepository):
    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.event_id == self.event_id, User.email == email)
        return self.db.execute(stmt).scalar_one_or_none()

    def get(self, user_id: int) -> User | None:
        stmt = select(User).where(User.event_id == self.event_id, User.id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()
