"""Autorizacion a nivel de objeto (trazabilidad R11).

Version F3, a nivel de expositor. F5 la extiende a participantes y cierra #8.
"""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import AuthContext, create_access_token
from app.models import Exhibitor, User
from tests.conftest import auth_headers

MY_EXHIBITOR = "/api/v1/me/exhibitor"


def test_representative_only_sees_their_own_exhibitor(
    client: TestClient, rep_a: User, exhibitor_a: Exhibitor, exhibitor_b: Exhibitor
) -> None:
    response = client.get(MY_EXHIBITOR, headers=auth_headers(rep_a))
    assert response.status_code == 200
    assert response.json()["id"] == exhibitor_a.id
    assert response.json()["legal_name"] == exhibitor_a.legal_name


def test_representative_cannot_read_other_exhibitor(
    client: TestClient, rep_a: User, exhibitor_a: Exhibitor, exhibitor_b: Exhibitor
) -> None:
    """Inyectar el id ajeno por query no cambia nada: el scope sale del token, no de la URL."""
    response = client.get(
        MY_EXHIBITOR,
        params={"exhibitor_id": exhibitor_b.id, "event_id": 999},
        headers=auth_headers(rep_a),
    )
    assert response.status_code == 200
    assert response.json()["id"] == exhibitor_a.id
    assert response.json()["id"] != exhibitor_b.id


def test_a_forged_exhibitor_id_in_the_token_finds_nothing(
    client: TestClient, rep_a: User, exhibitor_b: Exhibitor
) -> None:
    """Aunque el token apunte a una empresa de otro evento, el filtro por event_id no la
    encuentra y la respuesta es 404: no se confirma que exista."""
    context = AuthContext(
        user_id=rep_a.id,
        role="representative",
        event_id=rep_a.event_id + 999,
        exhibitor_id=exhibitor_b.id,
    )
    headers = {"Authorization": f"Bearer {create_access_token(context)}"}

    response = client.get(MY_EXHIBITOR, headers=headers)
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


def test_soft_deleted_exhibitor_is_not_found(
    client: TestClient, db: Session, rep_a: User, exhibitor_a: Exhibitor
) -> None:
    exhibitor_a.deleted_at = datetime.now(UTC)
    db.flush()

    assert client.get(MY_EXHIBITOR, headers=auth_headers(rep_a)).status_code == 404


def test_admin_cannot_use_the_representative_routes(client: TestClient, admin_user: User) -> None:
    response = client.get(MY_EXHIBITOR, headers=auth_headers(admin_user))
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_representative_cannot_use_the_admin_routes(client: TestClient, rep_a: User) -> None:
    response = client.post(
        "/api/v1/auth/request-password-setup",
        json={"email": "cualquiera@example.com"},
        headers=auth_headers(rep_a),
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_expired_token_is_rejected(client: TestClient, rep_a: User, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from app.core import security

    monkeypatch.setattr(
        security,
        "create_access_token",
        lambda ctx: security.jwt.encode(
            {
                "sub": str(ctx.user_id),
                "role": ctx.role,
                "event_id": ctx.event_id,
                "exhibitor_id": ctx.exhibitor_id,
                "exp": datetime.now(UTC) - timedelta(minutes=1),
            },
            security.get_settings().secret_key,
            algorithm=security.ALGORITHM,
        ),
    )
    context = AuthContext(
        user_id=rep_a.id,
        role="representative",
        event_id=rep_a.event_id,
        exhibitor_id=rep_a.exhibitor_id,
    )
    headers = {"Authorization": f"Bearer {security.create_access_token(context)}"}

    response = client.get(MY_EXHIBITOR, headers=headers)
    assert response.status_code == 401
    assert response.json()["code"] == "NOT_AUTHENTICATED"


# --- IDOR sobre participantes (#8, extension de R11 que F5 cierra) ----------------------

PARTICIPANTS = "/api/v1/me/participants"


def _participant_of(client: TestClient, rep: User) -> int:
    body = client.post(
        PARTICIPANTS,
        json={
            "first_name": "Ana",
            "last_name": "Torres",
            "identification": "1710000017",
            "identification_type": "CEDULA",
            "phone": "0990000001",
            "position": "Personal de stand",
            "category": "Exhibitor",
        },
        headers=auth_headers(rep),
    ).json()
    return int(body["id"])


def test_representative_cannot_read_other_participant(
    client: TestClient, rep_a: User, rep_b: User
) -> None:
    """404, no 403: no se confirma que el recurso exista."""
    participant_id = _participant_of(client, rep_a)

    response = client.get(f"{PARTICIPANTS}/{participant_id}", headers=auth_headers(rep_b))
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


def test_representative_cannot_modify_other_participant(
    client: TestClient, rep_a: User, rep_b: User
) -> None:
    participant_id = _participant_of(client, rep_a)
    headers = auth_headers(rep_b)

    assert (
        client.patch(
            f"{PARTICIPANTS}/{participant_id}", json={"position": "Robado"}, headers=headers
        ).status_code
        == 404
    )
    assert client.delete(f"{PARTICIPANTS}/{participant_id}", headers=headers).status_code == 404


def test_the_other_participant_survives_the_attempt(
    client: TestClient, rep_a: User, rep_b: User
) -> None:
    participant_id = _participant_of(client, rep_a)
    client.delete(f"{PARTICIPANTS}/{participant_id}", headers=auth_headers(rep_b))

    still_there = client.get(f"{PARTICIPANTS}/{participant_id}", headers=auth_headers(rep_a))
    assert still_there.status_code == 200
