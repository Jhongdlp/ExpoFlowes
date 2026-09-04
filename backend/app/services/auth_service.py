"""Autenticacion y establecimiento de contraseña (CLAUDE.md §6.5, §8.8, §8.11)."""

import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import AuthContext, Role, hash_password, verify_password
from app.domain.exceptions import InvalidCredentialsError, InvalidOrExpiredTokenError
from app.models import Event, PasswordSetupToken, User
from app.repositories.user import UserRepository

logger = logging.getLogger(__name__)

TOKEN_TTL = timedelta(hours=72)

# Mensaje unico para usuario inexistente, contraseña incorrecta y usuario sin clave (§8.8).
INVALID_CREDENTIALS_MESSAGE = "Credenciales invalidas."


def get_active_event(db: Session) -> Event:
    """El MVP opera sobre el unico evento activo (§A.6). El esquema ya soporta varios."""
    event = db.execute(select(Event).where(Event.is_active.is_(True))).scalars().first()
    if event is None:
        raise InvalidCredentialsError(INVALID_CREDENTIALS_MESSAGE)
    return event


def authenticate(db: Session, email: str, password: str) -> AuthContext:
    event = get_active_event(db)
    user = UserRepository(db, event.id).get_by_email(email)

    # Se verifica siempre, exista o no el usuario: mismo mensaje y mismo tiempo en los 3 casos.
    password_ok = verify_password(password, user.password_hash if user else None)
    if user is None or not user.is_active or not password_ok:
        raise InvalidCredentialsError(INVALID_CREDENTIALS_MESSAGE)

    role: Role = "admin" if user.role == "admin" else "representative"
    return AuthContext(
        user_id=user.id, role=role, event_id=user.event_id, exhibitor_id=user.exhibitor_id
    )


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_password_setup_token(db: Session, user: User) -> str:
    """Devuelve el token en claro UNA vez. En base solo queda su hash (§8.11).

    El llamador lo usa para armar el enlace y lo descarta; nunca se persiste ni se registra.
    """
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordSetupToken(
            user_id=user.id,
            token_hash=_digest(token),
            expires_at=datetime.now(UTC) + TOKEN_TTL,
        )
    )
    db.flush()
    return token


def setup_password_link(token: str) -> str:
    return f"{get_settings().app_base_url}/establecer-clave?token={token}"


def request_password_setup(db: Session, event_id: int, email: str) -> None:
    """Reenvia el enlace. Responde igual exista o no el correo (§8.12): el efecto visible
    para el llamador es siempre el mismo, y el detalle solo va al log."""
    user = UserRepository(db, event_id).get_by_email(email)
    if user is None or user.role != "representative":
        logger.info("password_setup_requested_for_unknown_email")
        return

    token = issue_password_setup_token(db, user)
    db.commit()
    # F13 sustituye este log por el envio real con Mailtrap.
    logger.info(
        "password_setup_link_issued user_id=%s link=%s", user.id, setup_password_link(token)
    )


def consume_password_setup_token(db: Session, token: str, new_password: str) -> User:
    """Un solo uso y 72 h. Consumirlo marca `used_at` en la misma transaccion."""
    now = datetime.now(UTC)
    stmt = select(PasswordSetupToken).where(PasswordSetupToken.token_hash == _digest(token))
    row = db.execute(stmt).scalar_one_or_none()
    if row is None or row.used_at is not None or row.expires_at <= now:
        raise InvalidOrExpiredTokenError(
            "El enlace no es valido o ya expiro. Solicite uno nuevo al organizador."
        )

    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise InvalidOrExpiredTokenError(
            "El enlace no es valido o ya expiro. Solicite uno nuevo al organizador."
        )

    user.password_hash = hash_password(new_password)
    row.used_at = now
    db.commit()
    return user
