"""Autorizacion a nivel de objeto (CLAUDE.md §8.1, trazabilidad R11).

Version F3, a nivel de expositor. F5 la extiende a participantes y cierra §12.1 #8.
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
    encuentra y la respuesta es 404: no se confirma que exista (§8.1)."""
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
