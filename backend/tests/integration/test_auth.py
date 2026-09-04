"""Login, token de un solo uso y rate limit. Trazabilidad: R15, §8.7, §8.11, §8.12."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PasswordSetupToken, User
from app.services import auth_service
from tests.conftest import ADMIN_PASSWORD, REP_PASSWORD, auth_headers

LOGIN = "/api/v1/auth/login"


def login(client: TestClient, email: str, password: str) -> object:
    return client.post(LOGIN, json={"email": email, "password": password})


def test_login_returns_a_token_with_the_scope_claims(client: TestClient, rep_a: User) -> None:
    from app.core.security import decode_access_token

    response = login(client, rep_a.email, REP_PASSWORD)
    assert response.status_code == 200

    context = decode_access_token(response.json()["access_token"])
    assert context.user_id == rep_a.id
    assert context.role == "representative"
    assert context.event_id == rep_a.event_id
    assert context.exhibitor_id == rep_a.exhibitor_id


def test_admin_token_has_no_exhibitor(client: TestClient, admin_user: User) -> None:
    from app.core.security import decode_access_token

    token = login(client, admin_user.email, ADMIN_PASSWORD).json()["access_token"]
    context = decode_access_token(token)
    assert context.role == "admin"
    assert context.exhibitor_id is None


# --- R15: el error de login no filtra informacion --------------------------------------------


def test_login_generic_error(client: TestClient, rep_a: User, rep_without_password: User) -> None:
    """Usuario inexistente, contraseña incorrecta y usuario sin clave: el MISMO cuerpo."""
    unknown = login(client, "nadie@example.com", "loquesea123")
    wrong = login(client, rep_a.email, "contraseña-incorrecta")
    no_password = login(client, rep_without_password.email, "loquesea123")

    for response in (unknown, wrong, no_password):
        assert response.status_code == 401
        assert response.json() == {
            "code": "INVALID_CREDENTIALS",
            "message": "Credenciales invalidas.",
            "details": {},
        }

    assert unknown.json() == wrong.json() == no_password.json()


def test_inactive_user_cannot_login(client: TestClient, db: Session, rep_a: User) -> None:
    rep_a.is_active = False
    db.flush()
    assert login(client, rep_a.email, REP_PASSWORD).status_code == 401


# --- §8.7: rate limit ------------------------------------------------------------------------


def test_sixth_login_attempt_in_a_minute_is_rate_limited(client: TestClient) -> None:
    for _ in range(5):
        assert login(client, "nadie@example.com", "loquesea123").status_code == 401

    response = login(client, "nadie@example.com", "loquesea123")
    assert response.status_code == 429
    assert response.json()["code"] == "RATE_LIMITED"


# --- §8.11: token de un solo uso -------------------------------------------------------------


def test_setup_token_is_stored_hashed_never_in_clear(
    db: Session, rep_without_password: User
) -> None:
    token = auth_service.issue_password_setup_token(db, rep_without_password)
    row = db.execute(select(PasswordSetupToken)).scalar_one()

    assert row.token_hash != token
    assert len(row.token_hash) == 64
    assert token not in row.token_hash


def test_setup_token_single_use_and_expiry(
    client: TestClient, db: Session, rep_without_password: User
) -> None:
    token = auth_service.issue_password_setup_token(db, rep_without_password)

    first = client.post(
        "/api/v1/auth/set-password", json={"token": token, "password": "ClaveNueva123"}
    )
    assert first.status_code == 204
    assert login(client, rep_without_password.email, "ClaveNueva123").status_code == 200

    second = client.post(
        "/api/v1/auth/set-password", json={"token": token, "password": "OtraClave123"}
    )
    assert second.status_code == 400
    assert second.json()["code"] == "TOKEN_INVALID_OR_EXPIRED"


def test_expired_setup_token_is_rejected(
    client: TestClient, db: Session, rep_without_password: User
) -> None:
    token = auth_service.issue_password_setup_token(db, rep_without_password)
    row = db.execute(select(PasswordSetupToken)).scalar_one()
    row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.flush()

    response = client.post(
        "/api/v1/auth/set-password", json={"token": token, "password": "ClaveNueva123"}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "TOKEN_INVALID_OR_EXPIRED"


def test_unknown_setup_token_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/set-password", json={"token": "inventado", "password": "ClaveNueva123"}
    )
    assert response.json()["code"] == "TOKEN_INVALID_OR_EXPIRED"


def test_short_password_is_rejected(
    client: TestClient, db: Session, rep_without_password: User
) -> None:
    token = auth_service.issue_password_setup_token(db, rep_without_password)
    response = client.post("/api/v1/auth/set-password", json={"token": token, "password": "corta"})
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


# --- §8.12: la solicitud de enlace responde igual exista o no el correo -----------------------


def test_password_setup_request_does_not_reveal_whether_the_email_exists(
    client: TestClient, admin_user: User, rep_a: User
) -> None:
    headers = auth_headers(admin_user)
    existing = client.post(
        "/api/v1/auth/request-password-setup", json={"email": rep_a.email}, headers=headers
    )
    unknown = client.post(
        "/api/v1/auth/request-password-setup", json={"email": "nadie@example.com"}, headers=headers
    )

    assert existing.status_code == unknown.status_code == 202
    assert existing.json() == unknown.json()


# --- /auth/me --------------------------------------------------------------------------------


def test_me_returns_the_context_of_the_token(client: TestClient, rep_a: User) -> None:
    response = client.get("/api/v1/auth/me", headers=auth_headers(rep_a))
    assert response.status_code == 200
    assert response.json() == {
        "user_id": rep_a.id,
        "email": rep_a.email,
        "role": "representative",
        "event_id": rep_a.event_id,
        "exhibitor_id": rep_a.exhibitor_id,
    }


def test_me_without_token_is_401(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "NOT_AUTHENTICATED"


def test_me_with_a_garbage_token_is_401(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer no-es-un-jwt"})
    assert response.status_code == 401
    assert response.json()["code"] == "NOT_AUTHENTICATED"
