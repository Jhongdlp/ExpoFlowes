"""Autenticacion: hashing, JWT y el contexto de autorizacion.

Regla rectora: `event_id` y `exhibitor_id` salen SIEMPRE del token, nunca de la URL, la query
ni el body. Las dependencias de este modulo son el unico sitio del sistema que los produce.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.domain.exceptions import ForbiddenError, NotAuthenticatedError

ALGORITHM = "HS256"

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash de descarte: se verifica contra el cuando el usuario no existe o no tiene clave, para
# que el login tarde lo mismo en los tres casos y no filtre por tiempo.
_DUMMY_HASH = _pwd.hash("tiempo-constante-no-es-una-clave-real")

_bearer = HTTPBearer(auto_error=False)

Role = Literal["admin", "representative"]


def hash_password(plain: str) -> str:
    return str(_pwd.hash(plain))


def verify_password(plain: str, hashed: str | None) -> bool:
    """Un usuario sin `password_hash` (aun no establecio clave) nunca autentica."""
    if not hashed:
        _pwd.verify(plain, _DUMMY_HASH)  # gasta el mismo tiempo que una verificacion real
        return False
    return bool(_pwd.verify(plain, hashed))


@dataclass(frozen=True)
class AuthContext:
    """Scope de autorizacion. `exhibitor_id` es None solo para el admin."""

    user_id: int
    role: Role
    event_id: int
    exhibitor_id: int | None


def create_access_token(context: AuthContext) -> str:
    settings = get_settings()
    expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    claims: dict[str, Any] = {
        "sub": str(context.user_id),
        "role": context.role,
        "event_id": context.event_id,
        "exhibitor_id": context.exhibitor_id,
        "exp": expires,
    }
    return str(jwt.encode(claims, settings.secret_key, algorithm=ALGORITHM))


def decode_access_token(token: str) -> AuthContext:
    try:
        claims = jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
        role = claims["role"]
        if role not in ("admin", "representative"):
            raise NotAuthenticatedError("La sesion no es valida. Inicie sesion nuevamente.")
        return AuthContext(
            user_id=int(claims["sub"]),
            role=role,
            event_id=int(claims["event_id"]),
            exhibitor_id=claims["exhibitor_id"],
        )
    except (JWTError, KeyError, TypeError, ValueError) as exc:
        raise NotAuthenticatedError("La sesion no es valida. Inicie sesion nuevamente.") from exc


def get_auth_context(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AuthContext:
    if credentials is None:
        raise NotAuthenticatedError("Debe iniciar sesion para acceder a este recurso.")
    return decode_access_token(credentials.credentials)


CurrentUser = Annotated[AuthContext, Depends(get_auth_context)]


def require_admin(auth: CurrentUser) -> AuthContext:
    if auth.role != "admin":
        raise ForbiddenError("Esta operacion es exclusiva del administrador de la feria.")
    return auth


def require_representative(auth: CurrentUser) -> AuthContext:
    """Garantiza ademas que `exhibitor_id` no es None, para que el resto no tenga que dudarlo."""
    if auth.role != "representative" or auth.exhibitor_id is None:
        raise ForbiddenError("Esta operacion es exclusiva del representante de un stand.")
    return auth


AdminUser = Annotated[AuthContext, Depends(require_admin)]
RepresentativeUser = Annotated[AuthContext, Depends(require_representative)]
