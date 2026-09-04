"""Contrato de repositorio (CLAUDE.md §8.1.1).

Un repositorio NO se construye sin `event_id`. No es una comodidad: es la barrera que impide
que exista un metodo de listado sin scope de evento, que es como se cuelan los IDOR y las
fugas entre ferias. El `event_id` llega del claim del JWT, nunca de la peticion.
"""

from sqlalchemy.orm import Session


class EventScopedRepository:
    def __init__(self, db: Session, event_id: int) -> None:
        self.db = db
        self.event_id = event_id
