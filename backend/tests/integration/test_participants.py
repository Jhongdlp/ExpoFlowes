"""Participantes y credenciales (corte vertical F5).

Trazabilidad CLAUDE.md §12.2: R8, R9, R10, R17.
Identificaciones ficticias, validas por algoritmo.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Event, Exhibitor, Participant, User
from tests.conftest import auth_headers

PARTICIPANTS = "/api/v1/me/participants"

CEDULAS = [
    "1710000017",
    "0920000023",
    "0100000033",
    "1800000042",
    "1100000056",
    "0500000062",
    "1300000070",
    "1700000084",
    "0900000092",
    "0100000108",
    "1711000115",
    "0922000120",
]


def payload(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "first_name": "Ana",
        "last_name": "Torres",
        "identification": CEDULAS[0],
        "identification_type": "CEDULA",
        "phone": "0990000001",
        "position": "Personal de stand",
        "category": "Exhibitor",
    }
    data.update(overrides)
    return data


def create(client: TestClient, rep: User, **overrides: Any) -> Any:
    return client.post(PARTICIPANTS, json=payload(**overrides), headers=auth_headers(rep))


# --- Alta basica ------------------------------------------------------------------------------


def test_create_participant(client: TestClient, db: Session, rep_a: User) -> None:
    response = create(client, rep_a)
    assert response.status_code == 201

    row = db.execute(select(Participant)).scalar_one()
    assert row.exhibitor_id == rep_a.exhibitor_id
    assert row.event_id == rep_a.event_id
    assert row.credential_notified_at is None  # el correo llega en F13


def test_email_is_optional(client: TestClient, rep_a: User) -> None:
    """§6.8: el enunciado no lo pide entre los datos requeridos; sin correo el alta funciona."""
    assert create(client, rep_a).json()["email"] is None
    assert (
        create(client, rep_a, identification=CEDULAS[1], email="ana@example.com").json()["email"]
        == "ana@example.com"
    )


def test_invalid_identification_is_rejected(client: TestClient, rep_a: User) -> None:
    response = create(client, rep_a, identification="1710000010")
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_IDENTIFICATION"


# --- R17: campo condicional empresa proveedora ------------------------------------------------


def test_provider_company_required_for_service(client: TestClient, rep_a: User) -> None:
    missing = create(client, rep_a, category="Service")
    assert missing.status_code == 422
    assert missing.json()["code"] == "VALIDATION_ERROR"

    ok = create(client, rep_a, category="Service", provider_company="Montajes Andinos S.A.")
    assert ok.status_code == 201
    assert ok.json()["provider_company"] == "Montajes Andinos S.A."


@pytest.mark.parametrize("category", ["Exhibitor", "Guest"])
def test_provider_company_forbidden_outside_service(
    client: TestClient, rep_a: User, category: str
) -> None:
    response = create(client, rep_a, category=category, provider_company="Montajes Andinos S.A.")
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


# --- R8 / R9: unicidad de identificacion, por evento ------------------------------------------


def test_duplicate_identification_same_event(
    client: TestClient, rep_a: User, rep_b: User, exhibitor_a: Exhibitor
) -> None:
    assert create(client, rep_a).status_code == 201

    response = create(client, rep_b)
    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "PARTICIPANT_ALREADY_REGISTERED"
    assert body["details"] == {
        "identification": CEDULAS[0],
        "registered_in": exhibitor_a.legal_name,
        "category": "Exhibitor",
    }


def test_duplicate_within_the_same_company_is_also_rejected(
    client: TestClient, rep_a: User
) -> None:
    assert create(client, rep_a).status_code == 201
    assert create(client, rep_a).status_code == 409


def test_same_identification_different_events_allowed(
    client: TestClient, db: Session, rep_a: User, event: Event
) -> None:
    """§6.6: las ferias son ediciones independientes."""
    assert create(client, rep_a).status_code == 201

    other = Event(
        name="Expo Flor Ecuador 2027",
        slug="expo-flor-ecuador-2027",
        year=2027,
        starts_on=event.starts_on,
        ends_on=event.ends_on,
        is_active=False,
    )
    db.add(other)
    db.flush()
    other_exhibitor = Exhibitor(
        event_id=other.id,
        tax_id="1791234561001",
        tax_id_type="RUC",
        legal_name="Rosas del Cotopaxi S.A.",
        stand_name="Rosas",
        address="Av. Demo 100",
        requested_m2=25,
    )
    db.add(other_exhibitor)
    db.flush()
    db.add(
        Participant(
            event_id=other.id,
            exhibitor_id=other_exhibitor.id,
            first_name="Ana",
            last_name="Torres",
            identification=CEDULAS[0],
            identification_type="CEDULA",
            phone="0990000001",
            position="Stand",
            category="Exhibitor",
        )
    )
    db.flush()  # no debe lanzar


def test_the_database_layer_produces_the_same_error(
    client: TestClient, db: Session, rep_a: User, rep_b: User, exhibitor_a: Exhibitor
) -> None:
    """Capa 2 de §9.1: si el duplicado se cuela hasta el INSERT, el JSON de error es
    EXACTAMENTE el mismo que produce la validacion previa del servicio."""
    from app.services import participant_service

    assert create(client, rep_a).status_code == 201
    from_service = create(client, rep_b).json()

    # Se anula la comprobacion previa: el unico guardian que queda es el constraint.
    original = participant_service.ParticipantRepository.find_owner
    participant_service.ParticipantRepository.find_owner = lambda self, ident: None  # type: ignore[method-assign]
    try:
        from_database = create(client, rep_b).json()
    finally:
        participant_service.ParticipantRepository.find_owner = original  # type: ignore[method-assign]

    assert from_database["code"] == from_service["code"] == "PARTICIPANT_ALREADY_REGISTERED"
    assert from_database["details"]["identification"] == CEDULAS[0]


# --- R10: cupo --------------------------------------------------------------------------------


def test_quota_exceeded(client: TestClient, db: Session, rep_b: User) -> None:
    """El expositor B tiene 25 m²; se le baja a 8 m²: cuota Exhibitor 2, Guest 0, Service 0."""
    exhibitor = db.get(Exhibitor, rep_b.exhibitor_id)
    assert exhibitor is not None
    exhibitor.requested_m2 = 8
    db.flush()

    assert create(client, rep_b, identification=CEDULAS[0]).status_code == 201
    assert create(client, rep_b, identification=CEDULAS[1]).status_code == 201

    response = create(client, rep_b, identification=CEDULAS[2])
    assert response.status_code == 409
    assert response.json()["code"] == "QUOTA_EXCEEDED"
    assert response.json()["details"] == {
        "category": "Exhibitor",
        "quota": 2,
        "used": 2,
        "requested": 1,
    }


def test_small_stand_has_zero_guest_and_service_quota(
    client: TestClient, db: Session, rep_b: User
) -> None:
    """§5.2, consecuencia de floor: 5-9 m² dan 0 Guest y 0 Service, y nada se rompe."""
    exhibitor = db.get(Exhibitor, rep_b.exhibitor_id)
    assert exhibitor is not None
    exhibitor.requested_m2 = 8
    db.flush()

    quota = client.get("/api/v1/me/exhibitor", headers=auth_headers(rep_b)).json()
    assert quota["quota"] == {"Exhibitor": 2, "Guest": 0, "Service": 0}
    assert quota["available"] == {"Exhibitor": 2, "Guest": 0, "Service": 0}

    response = create(client, rep_b, category="Guest")
    assert response.status_code == 409
    assert response.json()["details"]["quota"] == 0


def test_deleting_a_participant_frees_quota_and_identification(
    client: TestClient, db: Session, rep_b: User
) -> None:
    exhibitor = db.get(Exhibitor, rep_b.exhibitor_id)
    assert exhibitor is not None
    exhibitor.requested_m2 = 8
    db.flush()
    headers = auth_headers(rep_b)

    first = create(client, rep_b, identification=CEDULAS[0]).json()
    create(client, rep_b, identification=CEDULAS[1])
    assert create(client, rep_b, identification=CEDULAS[2]).status_code == 409

    assert client.delete(f"{PARTICIPANTS}/{first['id']}", headers=headers).status_code == 204

    # Cupo liberado...
    assert create(client, rep_b, identification=CEDULAS[2]).status_code == 201
    # ...y la identificacion tambien: se puede volver a registrar tras liberar otro hueco.
    assert client.delete(f"{PARTICIPANTS}/{first['id']}", headers=headers).status_code == 404


def test_freed_identification_can_be_registered_again(client: TestClient, rep_a: User) -> None:
    created = create(client, rep_a).json()
    assert (
        client.delete(f"{PARTICIPANTS}/{created['id']}", headers=auth_headers(rep_a)).status_code
        == 204
    )
    assert create(client, rep_a).status_code == 201


# --- Edicion ----------------------------------------------------------------------------------


def test_update_changes_the_fields(client: TestClient, rep_a: User) -> None:
    created = create(client, rep_a).json()
    response = client.patch(
        f"{PARTICIPANTS}/{created['id']}",
        json={"position": "Jefe de stand"},
        headers=auth_headers(rep_a),
    )
    assert response.status_code == 200
    assert response.json()["position"] == "Jefe de stand"


def test_update_to_service_requires_provider_company(client: TestClient, rep_a: User) -> None:
    created = create(client, rep_a).json()
    response = client.patch(
        f"{PARTICIPANTS}/{created['id']}",
        json={"category": "Service"},
        headers=auth_headers(rep_a),
    )
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"

    ok = client.patch(
        f"{PARTICIPANTS}/{created['id']}",
        json={"category": "Service", "provider_company": "Montajes Andinos S.A."},
        headers=auth_headers(rep_a),
    )
    assert ok.status_code == 200


def test_update_to_a_taken_identification_is_rejected(client: TestClient, rep_a: User) -> None:
    first = create(client, rep_a).json()
    create(client, rep_a, identification=CEDULAS[1])

    response = client.patch(
        f"{PARTICIPANTS}/{first['id']}",
        json={"identification": CEDULAS[1]},
        headers=auth_headers(rep_a),
    )
    assert response.status_code == 409
    assert response.json()["code"] == "PARTICIPANT_ALREADY_REGISTERED"


# --- Listado ----------------------------------------------------------------------------------


def test_listing_is_scoped_paginated_and_filterable(
    client: TestClient, rep_a: User, rep_b: User
) -> None:
    create(client, rep_a, identification=CEDULAS[0])
    create(client, rep_a, identification=CEDULAS[1], category="Guest")
    create(client, rep_b, identification=CEDULAS[2])

    body = client.get(PARTICIPANTS, headers=auth_headers(rep_a)).json()
    assert set(body) == {"items", "total", "page", "page_size"}
    assert body["total"] == 2  # solo los de su empresa

    filtered = client.get(
        PARTICIPANTS, params={"category": "Guest"}, headers=auth_headers(rep_a)
    ).json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["category"] == "Guest"


def test_listing_can_isolate_participants_without_email(client: TestClient, rep_a: User) -> None:
    """El aviso del panel cuenta las credenciales sin correo y el enlace lleva a este
    filtro: los dos numeros tienen que salir del mismo criterio o el enlace desemboca en
    una lista que no cuadra con el aviso que la abrio (§6.8)."""
    create(client, rep_a, identification=CEDULAS[0], email="ana@ejemplo.demo")
    create(client, rep_a, identification=CEDULAS[1])
    create(client, rep_a, identification=CEDULAS[2], category="Guest")

    listed = client.get(
        PARTICIPANTS, params={"without_email": "true"}, headers=auth_headers(rep_a)
    ).json()
    assert listed["total"] == 2
    assert all(person["email"] is None for person in listed["items"])

    quota = client.get("/api/v1/me/quota", headers=auth_headers(rep_a)).json()
    assert quota["participants_without_email"] == listed["total"]

    # Se combina con el resto de filtros, no los sustituye.
    both = client.get(
        PARTICIPANTS,
        params={"without_email": "true", "category": "Guest"},
        headers=auth_headers(rep_a),
    ).json()
    assert both["total"] == 1
