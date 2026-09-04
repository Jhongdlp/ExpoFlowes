"""La condicion de carrera del cupo (CLAUDE.md §9.3).

Este test NO usa el fixture `db`: necesita dos conexiones reales con COMMIT de verdad, en
hilos distintos, peleando por la ultima credencial disponible. Sin el `SELECT ... FOR UPDATE`
sobre la fila del expositor, ambas transacciones leen "usadas = 1, cuota = 2", ambas pasan la
verificacion y el stand acaba con una credencial de mas.

Para que la carrera ocurra de verdad y no dependa del azar del planificador, el test ensancha
la ventana peligrosa: una barrera arranca los dos hilos a la vez y el conteo de usadas tarda
`WINDOW` segundos a proposito. Con el bloqueo, el segundo hilo ni siquiera llega a contar
hasta que el primero confirma. Sin el, ambos cuentan lo mismo y ambos insertan.

Comprobado quitando `.with_for_update()`: el test falla. Un test de concurrencia que pasa en
los dos casos no prueba nada.
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from typing import Any

from sqlalchemy import delete
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.domain.exceptions import QuotaExceededError
from app.models import CredentialRule, Event, Exhibitor, Participant, StandSizeRule
from app.repositories.participant import ParticipantRepository
from app.schemas.participant import ParticipantIn
from app.services import participant_service

CEDULA_A = "1710000017"
CEDULA_B = "0920000023"


def _payload(identification: str) -> ParticipantIn:
    return ParticipantIn(
        first_name="Ana",
        last_name="Torres",
        identification=identification,
        identification_type="CEDULA",
        phone="0990000001",
        position="Personal de stand",
        category="Exhibitor",
    )


def _setup(engine: Engine) -> tuple[int, int]:
    """Un stand de 5 m²: cuota Exhibitor = 2. Se deja una sola credencial libre."""
    with Session(engine) as session:
        event = Event(
            name="Feria concurrencia",
            slug="feria-concurrencia",
            year=2026,
            starts_on=date(2026, 10, 7),
            ends_on=date(2026, 10, 9),
            is_active=False,
        )
        session.add(event)
        session.flush()
        session.add(StandSizeRule(event_id=event.id, label="Pequeño", min_m2=5, max_m2=12))
        session.add(
            CredentialRule(
                event_id=event.id,
                category="Exhibitor",
                credentials_per_block=2,
                block_m2=5,
                rounding_mode="floor",
            )
        )
        exhibitor = Exhibitor(
            event_id=event.id,
            tax_id="1791234561001",
            tax_id_type="RUC",
            legal_name="Rosas del Cotopaxi S.A.",
            stand_name="Rosas",
            address="Av. Demo 100",
            requested_m2=5,
        )
        session.add(exhibitor)
        session.flush()
        session.add(
            Participant(
                event_id=event.id,
                exhibitor_id=exhibitor.id,
                first_name="Ya",
                last_name="Registrado",
                identification="0100000033",
                identification_type="CEDULA",
                phone="0990000000",
                position="Stand",
                category="Exhibitor",
            )
        )
        session.commit()
        return event.id, exhibitor.id


def _teardown(engine: Engine, event_id: int) -> None:
    with Session(engine) as session:
        session.execute(delete(Participant).where(Participant.event_id == event_id))
        session.execute(delete(Exhibitor).where(Exhibitor.event_id == event_id))
        session.execute(delete(CredentialRule).where(CredentialRule.event_id == event_id))
        session.execute(delete(StandSizeRule).where(StandSizeRule.event_id == event_id))
        session.execute(delete(Event).where(Event.id == event_id))
        session.commit()


WINDOW = 0.5  # segundos que se mantiene abierta la ventana entre leer el cupo e insertar


def test_only_one_of_two_concurrent_inserts_gets_the_last_credential(
    engine: Engine, monkeypatch: Any
) -> None:
    event_id, exhibitor_id = _setup(engine)
    start = threading.Barrier(2)

    original_count = ParticipantRepository.count_by_category

    def slow_count(self: ParticipantRepository, exhibitor_id: int) -> dict[str, int]:
        result = original_count(self, exhibitor_id)
        time.sleep(WINDOW)
        return result

    monkeypatch.setattr(ParticipantRepository, "count_by_category", slow_count)

    def attempt(identification: str) -> Any:
        with Session(engine) as session:
            start.wait(timeout=10)
            try:
                participant_service.create_participant(
                    session, event_id, exhibitor_id, _payload(identification)
                )
                return "created"
            except QuotaExceededError as exc:
                return exc.details

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt, [CEDULA_A, CEDULA_B]))

        created = [r for r in results if r == "created"]
        rejected = [r for r in results if r != "created"]

        assert len(created) == 1, f"exactamente una debe ganar, resultados: {results}"
        assert len(rejected) == 1
        assert rejected[0] == {"category": "Exhibitor", "quota": 2, "used": 2, "requested": 1}

        with Session(engine) as session:
            total = len(
                session.execute(
                    Participant.__table__.select().where(Participant.event_id == event_id)
                ).all()
            )
        assert total == 2, "el cupo de 2 no puede quedar en 3"
    finally:
        _teardown(engine, event_id)
