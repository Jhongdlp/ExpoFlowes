"""Hashing de contraseñas. El JWT y AuthContext llegan en F3."""

from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return str(_pwd.hash(plain))


def verify_password(plain: str, hashed: str | None) -> bool:
    # Un usuario sin password_hash (aun no establecio clave) nunca autentica (§6.5).
    if not hashed:
        return False
    return bool(_pwd.verify(plain, hashed))
