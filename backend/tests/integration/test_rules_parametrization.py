"""R7 / punto extra E3: las reglas vienen DE LA BASE, no del codigo.

Cada test hace un UPDATE sobre las tablas de reglas y vuelve a llamar al mismo endpoint,
en el mismo proceso, sin reiniciar nada. Si algun rango o cuota estuviera quemado en el
codigo, o si las reglas se cachearan al arrancar, estos tests fallarian.

Es la demostracion literal de la frase del enunciado: "Se evaluara si estos rangos son
modificables (parametrizados) o estan quemados en codigo".

Lo parametrizado es la formula: rangos, bloques, credenciales por bloque y redondeo. Las tres
categorias de credencial (Exhibitor, Guest, Service) las fija el enunciado y las sostiene un
CHECK en `credential_rules` y en `participants`; el motor de reglas no las conoce (lo prueba
`tests/unit/test_rules.py::test_quota_breakdown_uses_the_categories_of_the_rules`).
"""

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models import CredentialRule, Exhibitor, StandSizeRule, User
from tests.conftest import auth_headers
from tests.integration.test_exhibitors import EXHIBITORS, payload


def create(client: TestClient, admin: User, **overrides: Any) -> Any:
    return client.post(EXHIBITORS, json=payload(**overrides), headers=auth_headers(admin))


def test_changing_range_changes_classification(
    client: TestClient, db: Session, admin_user: User
) -> None:
    """60 m² pasa de rechazado a "Grande" solo por un UPDATE, sin tocar codigo."""
    rejected = create(client, admin_user, requested_m2=60)
    assert rejected.status_code == 422
    assert rejected.json()["code"] == "STAND_SIZE_OUT_OF_RANGE"

    db.execute(
        update(StandSizeRule)
        .where(StandSizeRule.event_id == admin_user.event_id, StandSizeRule.label == "Grande")
        .values(max_m2=80)
    )
    db.flush()

    accepted = create(client, admin_user, requested_m2=60)
    assert accepted.status_code == 201
    assert accepted.json()["stand_category"] == "Grande"
    assert accepted.json()["requested_m2"] == 60


def test_changing_a_boundary_moves_a_stand_between_categories(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    """El expositor de 25 m² es "Mediano"; se corre el borde y pasa a "Pequeño"."""
    url = f"{EXHIBITORS}/{exhibitor_a.id}"
    headers = auth_headers(admin_user)
    assert client.get(url, headers=headers).json()["stand_category"] == "Mediano"

    db.execute(
        update(StandSizeRule)
        .where(StandSizeRule.event_id == admin_user.event_id, StandSizeRule.label == "Pequeño")
        .values(max_m2=25)
    )
    db.execute(
        update(StandSizeRule)
        .where(StandSizeRule.event_id == admin_user.event_id, StandSizeRule.label == "Mediano")
        .values(min_m2=26)
    )
    db.flush()

    assert client.get(url, headers=headers).json()["stand_category"] == "Pequeño"


def test_changing_the_block_changes_the_quota(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    """25 m²: Exhibitor pasa de 10 credenciales (2 por cada 5 m²) a 25 (5 por cada 5 m²)."""
    url = f"{EXHIBITORS}/{exhibitor_a.id}"
    headers = auth_headers(admin_user)
    assert client.get(url, headers=headers).json()["quota"]["Exhibitor"] == 10

    db.execute(
        update(CredentialRule)
        .where(
            CredentialRule.event_id == admin_user.event_id,
            CredentialRule.category == "Exhibitor",
        )
        .values(credentials_per_block=5)
    )
    db.flush()

    assert client.get(url, headers=headers).json()["quota"]["Exhibitor"] == 25


def test_changing_the_rounding_mode_changes_the_quota(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    """25 m² con Guest (2 por cada 10 m²): floor da 4, ceil da 6 (ADR-0004)."""
    url = f"{EXHIBITORS}/{exhibitor_a.id}"
    headers = auth_headers(admin_user)
    assert client.get(url, headers=headers).json()["quota"]["Guest"] == 4

    db.execute(
        update(CredentialRule)
        .where(CredentialRule.event_id == admin_user.event_id, CredentialRule.category == "Guest")
        .values(rounding_mode="ceil")
    )
    db.flush()

    assert client.get(url, headers=headers).json()["quota"]["Guest"] == 6


def test_quota_simulator_follows_the_rules_in_the_database(
    client: TestClient, db: Session, admin_user: User
) -> None:
    """El simulador de `/rules/quota` deriva con las reglas vigentes, no con constantes.

    Es la version interactiva de R7: la pantalla de reglas consulta este endpoint, asi que un
    UPDATE se ve en pantalla sin redeploy.
    """
    headers = auth_headers(admin_user)

    before = client.get("/api/v1/rules/quota", params={"m2": 25}, headers=headers)
    assert before.status_code == 200
    assert before.json() == {
        "requested_m2": 25,
        "stand_category": "Mediano",
        "quota": {"Exhibitor": 10, "Guest": 4, "Service": 6},
    }

    db.execute(
        update(CredentialRule)
        .where(
            CredentialRule.event_id == admin_user.event_id,
            CredentialRule.category == "Exhibitor",
        )
        .values(credentials_per_block=5)
    )
    db.flush()

    after = client.get("/api/v1/rules/quota", params={"m2": 25}, headers=headers)
    assert after.json()["quota"]["Exhibitor"] == 25


def test_quota_simulator_rejects_a_size_outside_every_range(
    client: TestClient, admin_user: User
) -> None:
    """Fuera de rango responde igual que el alta y devuelve los rangos vigentes."""
    response = client.get(
        "/api/v1/rules/quota", params={"m2": 60}, headers=auth_headers(admin_user)
    )
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "STAND_SIZE_OUT_OF_RANGE"
    assert [r["label"] for r in body["details"]["allowed_ranges"]] == [
        "Pequeño",
        "Mediano",
        "Grande",
    ]
