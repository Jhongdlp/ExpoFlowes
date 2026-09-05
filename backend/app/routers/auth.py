from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter, login_rate_limit
from app.core.security import AdminUser, CurrentUser, create_access_token
from app.db.session import get_db
from app.domain.exceptions import NotAuthenticatedError
from app.repositories.user import UserRepository
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    PasswordSetupRequest,
    SetPasswordRequest,
    TokenResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("/login", response_model=TokenResponse)
@limiter.limit(login_rate_limit)
def login(request: Request, payload: LoginRequest, db: DbSession) -> TokenResponse:
    """`request` lo exige slowapi para identificar la IP; no se lee nada mas de el."""
    context = auth_service.authenticate(db, str(payload.email), payload.password)
    return TokenResponse(access_token=create_access_token(context))


@router.post("/set-password", status_code=status.HTTP_204_NO_CONTENT)
def set_password(payload: SetPasswordRequest, db: DbSession) -> Response:
    auth_service.consume_password_setup_token(db, payload.token, payload.password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/request-password-setup", status_code=status.HTTP_202_ACCEPTED)
def request_password_setup(
    payload: PasswordSetupRequest, auth: AdminUser, db: DbSession
) -> dict[str, str]:
    """Responde lo mismo exista o no el correo. El evento sale del token del admin."""
    auth_service.request_password_setup(db, auth.event_id, str(payload.email))
    return {"message": "Si el correo corresponde a un representante, se envio el enlace."}


@router.get("/me", response_model=MeResponse)
def me(auth: CurrentUser, db: DbSession) -> MeResponse:
    user = UserRepository(db, auth.event_id).get(auth.user_id)
    if user is None or not user.is_active:
        raise NotAuthenticatedError("La sesion no es valida. Inicie sesion nuevamente.")
    return MeResponse(
        user_id=user.id,
        email=user.email,
        role=auth.role,
        event_id=auth.event_id,
        exhibitor_id=auth.exhibitor_id,
    )
