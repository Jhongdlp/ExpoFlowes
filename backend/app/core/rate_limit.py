"""Rate limiting del login (CLAUDE.md §8.7). Por IP, con el limite en configuracion."""

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.errors import error_response

limiter = Limiter(key_func=get_remote_address)


def login_rate_limit() -> str:
    return get_settings().login_rate_limit


def rate_limit_handler(_: Request, __: Any) -> JSONResponse:
    return error_response(
        429, "RATE_LIMITED", "Demasiados intentos. Espere un momento y vuelva a intentarlo."
    )


__all__ = ["RateLimitExceeded", "limiter", "login_rate_limit", "rate_limit_handler"]
