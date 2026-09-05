"""Alta y mantenimiento de expositores (corte vertical F4).

Trazabilidad: R2, R12, R13, R16, R18.
Todas las identificaciones son ficticias, validas por algoritmo.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Exhibitor, ExhibitorContact, Participant, PasswordSetupToken, User
from tests.conftest import auth_headers

EXHIBITORS = "/api/v1/exhibitors"


def payload(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "tax_id": "0992345675001",
        "tax_id_type": "RUC",
        "legal_name": "Flores del Valle Cia. Ltda.",
        "stand_name": "Flores del Valle",
        "address": "Av. Los Shyris 220, Quito",
        "requested_m2": 25,
        "representative": {
            "full_name": "Jorge Benitez Salas",
            "identification": "0923456784",
            "identification_type": "CEDULA",
            "email": "jorge.benitez@example.com",
            "phone": "0992000001",
            "position": "Gerente de ventas",
        },
        "contacts": [{"name": "Karla Mena", "phone": "0992000002", "email": "karla@example.com"}],
    }
    data.update(overrides)
    return data


# --- R12: el alta crea el usuario del representante -------------------------------------------


def test_create_exhibitor_creates_user(client: TestClient, db: Session, admin_user: User) -> None:
    response = client.post(EXHIBITORS, json=payload(), headers=auth_headers(admin_user))
    assert response.status_code == 201
    body = response.json()

    user = db.execute(select(User).where(User.email == "jorge.benitez@example.com")).scalar_one()
    assert user.role == "representative"
    assert user.exhibitor_id == body["id"]
    assert user.event_id == admin_user.event_id
    # Nace sin clave: la establece con el token de un solo uso.
    assert user.password_hash is None

    token = db.execute(
        select(PasswordSetupToken).where(PasswordSetupToken.user_id == user.id)
    ).scalar_one()
    assert token.used_at is None
    assert len(token.token_hash) == 64


def test_create_exhibitor_persists_representative_and_contacts(
    client: TestClient, db: Session, admin_user: User
) -> None:
    body = client.post(
        EXHIBITORS,
        json=payload(
            contacts=[
                {"name": "Karla Mena", "phone": "0992000002", "email": "karla@example.com"},
                {"name": "Ruben Salas", "phone": "0992000003", "email": "ruben@example.com"},
            ]
        ),
        headers=auth_headers(admin_user),
    ).json()

    assert body["representative"]["identification"] == "0923456784"
    assert len(body["contacts"]) == 2
    assert db.execute(select(ExhibitorContact)).scalars().all() != []


def test_create_exhibitor_persists_banner_url(
    client: TestClient, db: Session, admin_user: User
) -> None:
    custom_banner = "preset:tropical-orchids"
    response = client.post(
        EXHIBITORS,
        json=payload(banner_url=custom_banner),
        headers=auth_headers(admin_user),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["banner_url"] == custom_banner

    row = db.get(Exhibitor, body["id"])
    assert row is not None
    assert row.banner_url == custom_banner


def test_patch_exhibitor_updates_banner_url(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    new_banner = "preset:lavender-mist"
    response = client.patch(
        f"{EXHIBITORS}/{exhibitor_a.id}",
        json={"banner_url": new_banner},
        headers=auth_headers(admin_user),
    )
    assert response.status_code == 200
    assert response.json()["banner_url"] == new_banner

    db.expire_all()
    assert db.get(Exhibitor, exhibitor_a.id).banner_url == new_banner


# --- R18: minimo un contacto adicional --------------------------------------------------------


def test_at_least_one_contact_required(client: TestClient, admin_user: User) -> None:
    response = client.post(EXHIBITORS, json=payload(contacts=[]), headers=auth_headers(admin_user))
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


# --- R2: metraje fuera de los rangos configurados ---------------------------------------------


@pytest.mark.parametrize("m2", [4, 51])
def test_m2_out_of_range_rejected(client: TestClient, admin_user: User, m2: int) -> None:
    response = client.post(
        EXHIBITORS, json=payload(requested_m2=m2), headers=auth_headers(admin_user)
    )
    assert response.status_code == 422
    assert response.json()["code"] == "STAND_SIZE_OUT_OF_RANGE"
    assert response.json()["details"]["requested_m2"] == m2


# --- R16: identificacion validada con el algoritmo real ---------------------------------------


def test_invalid_tax_id_rejected(client: TestClient, admin_user: User) -> None:
    response = client.post(
        EXHIBITORS, json=payload(tax_id="0992345679001"), headers=auth_headers(admin_user)
    )
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_IDENTIFICATION"


def test_invalid_representative_cedula_rejected(client: TestClient, admin_user: User) -> None:
    rep = payload()["representative"] | {"identification": "0923456780"}
    response = client.post(
        EXHIBITORS, json=payload(representative=rep), headers=auth_headers(admin_user)
    )
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_IDENTIFICATION"


# --- Unicidad y atomicidad --------------------------------------------------------------------


def test_duplicate_tax_id_in_the_same_event_is_rejected(
    client: TestClient, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    response = client.post(
        EXHIBITORS, json=payload(tax_id=exhibitor_a.tax_id), headers=auth_headers(admin_user)
    )
    assert response.status_code == 409
    assert response.json()["code"] == "EXHIBITOR_ALREADY_REGISTERED"


def test_a_failed_creation_leaves_no_orphans(
    client: TestClient, db: Session, admin_user: User, rep_a: User
) -> None:
    """El correo del representante ya tiene usuario: el alta entera se revierte."""
    before = len(db.execute(select(Exhibitor)).scalars().all())
    rep = payload()["representative"] | {"email": rep_a.email}

    response = client.post(
        EXHIBITORS, json=payload(representative=rep), headers=auth_headers(admin_user)
    )
    assert response.status_code == 409
    assert response.json()["code"] == "EMAIL_ALREADY_REGISTERED"

    assert len(db.execute(select(Exhibitor)).scalars().all()) == before
    assert (
        db.execute(
            select(ExhibitorContact).where(ExhibitorContact.email == "karla@example.com")
        ).scalar_one_or_none()
        is None
    )


def test_soft_deleted_tax_id_can_be_registered_again(
    client: TestClient, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    headers = auth_headers(admin_user)
    assert client.delete(f"{EXHIBITORS}/{exhibitor_a.id}", headers=headers).status_code == 204

    response = client.post(EXHIBITORS, json=payload(tax_id=exhibitor_a.tax_id), headers=headers)
    assert response.status_code == 201


# --- R13: corregir el metraje no puede dejar el estado inconsistente --------------------------


def add_participants(db: Session, exhibitor: Exhibitor, count: int, category: str) -> None:
    for i in range(count):
        db.add(
            Participant(
                event_id=exhibitor.event_id,
                exhibitor_id=exhibitor.id,
                first_name="Ana",
                last_name=f"Torres {i}",
                identification=f"PART{i:04d}",
                identification_type="PASSPORT",
                phone="0990000000",
                position="Stand",
                category=category,
            )
        )
    db.flush()


def test_reduce_m2_below_assigned_is_blocked(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    # 25 m² dan cuota Exhibitor 10; con 6 asignadas, bajar a 12 m² (cuota 4) es imposible.
    add_participants(db, exhibitor_a, 6, "Exhibitor")

    response = client.patch(
        f"{EXHIBITORS}/{exhibitor_a.id}",
        json={"requested_m2": 12},
        headers=auth_headers(admin_user),
    )
    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "QUOTA_BELOW_ASSIGNED"
    assert body["details"]["categories"]["Exhibitor"] == {"quota": 4, "assigned": 6}

    db.expire_all()
    assert db.get(Exhibitor, exhibitor_a.id).requested_m2 == 25  # la base queda sin cambios


def test_reduce_m2_within_the_new_quota_is_allowed(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    add_participants(db, exhibitor_a, 3, "Exhibitor")

    response = client.patch(
        f"{EXHIBITORS}/{exhibitor_a.id}",
        json={"requested_m2": 13},
        headers=auth_headers(admin_user),
    )
    assert response.status_code == 200
    assert response.json()["requested_m2"] == 13
    assert response.json()["stand_category"] == "Mediano"


def test_patch_m2_out_of_range_is_rejected(
    client: TestClient, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    response = client.patch(
        f"{EXHIBITORS}/{exhibitor_a.id}",
        json={"requested_m2": 90},
        headers=auth_headers(admin_user),
    )
    assert response.status_code == 422
    assert response.json()["code"] == "STAND_SIZE_OUT_OF_RANGE"


# --- Cuota derivada, no almacenada ------------------------------------------------------------


def test_quota_is_derived_from_m2_and_rules(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    add_participants(db, exhibitor_a, 2, "Guest")

    body = client.get(f"{EXHIBITORS}/{exhibitor_a.id}", headers=auth_headers(admin_user)).json()
    assert body["stand_category"] == "Mediano"  # 25 m²
    assert body["quota"] == {"Exhibitor": 10, "Guest": 4, "Service": 6}
    assert body["assigned"] == {"Exhibitor": 0, "Guest": 2, "Service": 0}
    assert body["available"] == {"Exhibitor": 10, "Guest": 2, "Service": 6}


# --- Soft delete y listado --------------------------------------------------------------------


def test_delete_is_soft_and_hides_the_row_from_the_listing(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    headers = auth_headers(admin_user)
    assert client.delete(f"{EXHIBITORS}/{exhibitor_a.id}", headers=headers).status_code == 204

    listing = client.get(EXHIBITORS, headers=headers).json()
    assert all(item["id"] != exhibitor_a.id for item in listing["items"])
    assert client.get(f"{EXHIBITORS}/{exhibitor_a.id}", headers=headers).status_code == 404

    db.expire_all()
    row = db.get(Exhibitor, exhibitor_a.id)  # sigue en la tabla
    assert row is not None and row.deleted_at is not None


def test_listing_is_paginated(
    client: TestClient, admin_user: User, exhibitor_a: Exhibitor, exhibitor_b: Exhibitor
) -> None:
    headers = auth_headers(admin_user)
    body = client.get(EXHIBITORS, params={"page": 1, "page_size": 1}, headers=headers).json()

    assert set(body) == {"items", "total", "page", "page_size"}
    assert body["total"] == 2
    assert len(body["items"]) == 1
    assert body["page_size"] == 1

    second = client.get(EXHIBITORS, params={"page": 2, "page_size": 1}, headers=headers).json()
    assert second["items"][0]["id"] != body["items"][0]["id"]


def test_page_size_is_capped(client: TestClient, admin_user: User) -> None:
    response = client.get(EXHIBITORS, params={"page_size": 101}, headers=auth_headers(admin_user))
    assert response.status_code == 422


# --- Autorizacion -----------------------------------------------------------------------------


def test_representative_cannot_use_the_admin_routes(client: TestClient, rep_a: User) -> None:
    response = client.get(EXHIBITORS, headers=auth_headers(rep_a))
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_unknown_exhibitor_is_404(client: TestClient, admin_user: User) -> None:
    response = client.get(f"{EXHIBITORS}/999999", headers=auth_headers(admin_user))
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"
