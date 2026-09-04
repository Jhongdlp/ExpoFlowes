"""Capa 1 de la validacion de dos capas (CLAUDE.md §9.1): lo que garantiza la base.

La capa 2 (servicio, con el mensaje amigable) llega en F5. Aqui se prueba que aunque el
servicio fallara, la base no deja pasar el dato malo.
"""

from datetime import UTC, date, datetime
from typing import Any

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Event, Exhibitor, Participant, User


def make_event(db: Session, slug: str) -> Event:
    event = Event(
        name=f"Feria {slug}",
        slug=slug,
        year=2026,
        starts_on=date(2026, 10, 7),
        ends_on=date(2026, 10, 9),
    )
    db.add(event)
    db.flush()
    return event


def make_exhibitor(db: Session, event: Event, tax_id: str, **kwargs: Any) -> Exhibitor:
    exhibitor = Exhibitor(
        event_id=event.id,
        tax_id=tax_id,
        tax_id_type="RUC",
        legal_name=f"Empresa {tax_id}",
        stand_name=f"Stand {tax_id}",
        address="Av. Demo 100",
        requested_m2=20,
        **kwargs,
    )
    db.add(exhibitor)
    db.flush()
    return exhibitor


def make_participant(
    db: Session, event: Event, exhibitor: Exhibitor, identification: str, **kwargs: Any
) -> Participant:
    data: dict[str, Any] = {
        "first_name": "Ana",
        "last_name": "Torres",
        "identification_type": "CEDULA",
        "phone": "0990000000",
        "position": "Stand",
        "category": "Exhibitor",
    } | kwargs
    participant = Participant(
        event_id=event.id, exhibitor_id=exhibitor.id, identification=identification, **data
    )
    db.add(participant)
    db.flush()
    return participant


def test_same_identification_twice_in_one_event_is_rejected(db: Session) -> None:
    """§5.4: una persona no puede estar en dos empresas del mismo evento."""
    event = make_event(db, "feria-2026")
    a = make_exhibitor(db, event, "1791234561001")
    b = make_exhibitor(db, event, "0992345675001")
    make_participant(db, event, a, "1710000017")

    with pytest.raises(IntegrityError):
        make_participant(db, event, b, "1710000017")


def test_same_identification_in_two_events_is_allowed(db: Session) -> None:
    """§6.6: las ferias son ediciones independientes; la restriccion es por evento."""
    e2026 = make_event(db, "feria-2026")
    e2027 = make_event(db, "feria-2027")
    a = make_exhibitor(db, e2026, "1791234561001")
    b = make_exhibitor(db, e2027, "1791234561001")

    make_participant(db, e2026, a, "1710000017")
    make_participant(db, e2027, b, "1710000017")  # no debe lanzar


def test_provider_company_only_for_service_category(db: Session) -> None:
    event = make_event(db, "feria-2026")
    exhibitor = make_exhibitor(db, event, "1791234561001")

    with pytest.raises(IntegrityError):
        make_participant(
            db,
            event,
            exhibitor,
            "1710000017",
            category="Exhibitor",
            provider_company="Montajes Andinos S.A.",
        )


def test_service_category_requires_provider_company(db: Session) -> None:
    event = make_event(db, "feria-2026")
    exhibitor = make_exhibitor(db, event, "1791234561001")

    with pytest.raises(IntegrityError):
        make_participant(db, event, exhibitor, "1710000017", category="Service")


def test_duplicate_tax_id_in_same_event_is_rejected(db: Session) -> None:
    event = make_event(db, "feria-2026")
    make_exhibitor(db, event, "1791234561001")

    with pytest.raises(IntegrityError):
        make_exhibitor(db, event, "1791234561001")


def test_soft_deleted_exhibitor_frees_its_tax_id(db: Session) -> None:
    """El indice unico es parcial: solo aplica a los expositores vivos (§7.2)."""
    event = make_event(db, "feria-2026")
    make_exhibitor(db, event, "1791234561001", deleted_at=datetime.now(UTC))

    make_exhibitor(db, event, "1791234561001")  # no debe lanzar


def test_duplicate_user_email_in_same_event_is_rejected(db: Session) -> None:
    event = make_event(db, "feria-2026")
    db.add(User(event_id=event.id, email="admin@demo.test", role="admin"))
    db.flush()

    db.add(User(event_id=event.id, email="admin@demo.test", role="admin"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_representative_user_requires_an_exhibitor(db: Session) -> None:
    event = make_event(db, "feria-2026")
    db.add(User(event_id=event.id, email="rep@demo.test", role="representative"))
    with pytest.raises(IntegrityError):
        db.flush()
