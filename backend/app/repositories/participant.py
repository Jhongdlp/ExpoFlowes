from collections.abc import Sequence

from sqlalchemy import ColumnElement, func, select

from app.models import Exhibitor, Participant
from app.repositories.base import EventScopedRepository
from app.repositories.search import matches


class ParticipantRepository(EventScopedRepository):
    """Scope doble: evento y expositor, ambos del token. Un participante ajeno no se
    encuentra, y el router responde 404 sin confirmar que exista."""

    def _scope(self, exhibitor_id: int) -> tuple[ColumnElement[bool], ColumnElement[bool]]:
        return (
            Participant.event_id == self.event_id,
            Participant.exhibitor_id == exhibitor_id,
        )

    def get(self, exhibitor_id: int, participant_id: int) -> Participant | None:
        stmt = select(Participant).where(
            *self._scope(exhibitor_id), Participant.id == participant_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_for_event(
        self,
        page: int,
        page_size: int,
        exhibitor_id: int | None = None,
        category: str | None = None,
        search: str | None = None,
    ) -> tuple[list[tuple[Participant, str]], int]:
        """Listado del admin: todo el evento, opcionalmente acotado a un expositor.

        Es el unico listado que acepta un `exhibitor_id` de la query, y solo porque el admin
        ya tiene alcance sobre el evento entero. El `event_id` sigue saliendo del token.
        """
        filters = [Participant.event_id == self.event_id, Exhibitor.deleted_at.is_(None)]
        if exhibitor_id is not None:
            filters.append(Participant.exhibitor_id == exhibitor_id)
        if category is not None:
            filters.append(Participant.category == category)
        filters.extend(
            matches(
                search,
                Participant.first_name,
                Participant.last_name,
                Participant.identification,
                Participant.position,
                Participant.category,
                Participant.email,
                Participant.provider_company,
                Exhibitor.legal_name,
                Exhibitor.stand_name,
            )
        )

        join = select(Participant, Exhibitor.legal_name).join(
            Exhibitor, Exhibitor.id == Participant.exhibitor_id
        )
        total = self.db.execute(
            select(func.count())
            .select_from(Participant)
            .join(Exhibitor, Exhibitor.id == Participant.exhibitor_id)
            .where(*filters)
        ).scalar_one()
        stmt = (
            join.where(*filters)
            .order_by(Exhibitor.legal_name, Participant.last_name, Participant.first_name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return [(row[0], row[1]) for row in self.db.execute(stmt)], total

    def list(
        self,
        exhibitor_id: int,
        page: int,
        page_size: int,
        category: str | None = None,
        search: str | None = None,
        without_email: bool = False,
    ) -> tuple[list[Participant], int]:
        filters = list(self._scope(exhibitor_id))
        if category is not None:
            filters.append(Participant.category == category)
        if without_email:
            # Mismo criterio que count_without_email: el aviso del dashboard y este filtro
            # tienen que contar lo mismo o el enlace lleva a una lista que no cuadra.
            filters.append(Participant.email.is_(None))
        filters.extend(
            matches(
                search,
                Participant.first_name,
                Participant.last_name,
                Participant.identification,
                Participant.position,
                Participant.category,
                Participant.email,
                Participant.provider_company,
            )
        )

        total = self.db.execute(
            select(func.count()).select_from(Participant).where(*filters)
        ).scalar_one()
        stmt = (
            select(Participant)
            .where(*filters)
            .order_by(Participant.last_name, Participant.first_name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.execute(stmt).scalars()), total

    def count_by_category(self, exhibitor_id: int) -> dict[str, int]:
        stmt = (
            select(Participant.category, func.count())
            .where(*self._scope(exhibitor_id))
            .group_by(Participant.category)
        )
        return {category: total for category, total in self.db.execute(stmt)}

    def count_without_email(self, exhibitor_id: int) -> int:
        """Participantes que no recibiran la notificacion de credencial por no tener correo
        . El dashboard del representante lo muestra para que pueda completarlos."""
        stmt = (
            select(func.count())
            .select_from(Participant)
            .where(*self._scope(exhibitor_id), Participant.email.is_(None))
        )
        return int(self.db.execute(stmt).scalar_one())

    def find_owner(self, identification: str) -> tuple[Participant, Exhibitor] | None:
        """Quien ya registro esa identificacion en este evento. Da el `registered_in` del
        error de duplicado."""
        stmt = (
            select(Participant, Exhibitor)
            .join(Exhibitor, Exhibitor.id == Participant.exhibitor_id)
            .where(
                Participant.event_id == self.event_id,
                Participant.identification == identification,
            )
        )
        row = self.db.execute(stmt).first()
        return (row[0], row[1]) if row else None

    def find_owners(self, identifications: Sequence[str]) -> dict[str, str]:
        """Version por lote de `find_owner`: identificacion -> razon social de quien la tiene.

        La carga masiva puede traer 500 filas; una consulta por fila serian 500 viajes.
        """
        if not identifications:
            return {}
        stmt = (
            select(Participant.identification, Exhibitor.legal_name)
            .join(Exhibitor, Exhibitor.id == Participant.exhibitor_id)
            .where(
                Participant.event_id == self.event_id,
                Participant.identification.in_(identifications),
            )
        )
        return {identification: name for identification, name in self.db.execute(stmt)}

    def lock_exhibitor(self, exhibitor_id: int) -> Exhibitor | None:
        """SELECT... FOR UPDATE sobre la fila del expositor.

        Sin este bloqueo, dos altas simultaneas sobre la ultima credencial disponible pasan
        ambas la verificacion de cupo y el stand acaba con una credencial de mas.
        """
        stmt = (
            select(Exhibitor)
            .where(
                Exhibitor.event_id == self.event_id,
                Exhibitor.id == exhibitor_id,
                Exhibitor.deleted_at.is_(None),
            )
            .with_for_update()
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def add(self, participant: Participant) -> None:
        self.db.add(participant)

    def delete(self, participant: Participant) -> None:
        """Borrado fisico: libera cupo y libera la identificacion en el evento."""
        self.db.delete(participant)
