"""Rutas del representante.

Ningun id de empresa aparece en la ruta: el `exhibitor_id` y el `event_id` salen del token
(§8.1.1). Pedir un recurso ajeno no da 403 sino 404: no se confirma que exista.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import AuthContext, RepresentativeUser
from app.db.session import get_db
from app.schemas.dashboard import MyQuota
from app.schemas.exhibitor import ExhibitorDetail
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Page
from app.schemas.participant import Category, ParticipantIn, ParticipantRead, ParticipantUpdate
from app.services import dashboard_service, exhibitor_service, participant_service

router = APIRouter(prefix="/me", tags=["representante"])

DbSession = Annotated[Session, Depends(get_db)]


def scope(auth: AuthContext) -> tuple[int, int]:
    """(event_id, exhibitor_id) del token. require_representative garantiza que no es None."""
    assert auth.exhibitor_id is not None
    return auth.event_id, auth.exhibitor_id


@router.get("/exhibitor", response_model=ExhibitorDetail)
def my_exhibitor(auth: RepresentativeUser, db: DbSession) -> dict[str, Any]:
    event_id, exhibitor_id = scope(auth)
    return exhibitor_service.get_exhibitor(db, event_id, exhibitor_id)


@router.get("/quota", response_model=MyQuota)
def my_quota(auth: RepresentativeUser, db: DbSession) -> dict[str, Any]:
    """Cupo total vs. usado, desglosado por categoria. Calculado, nunca leido de una columna."""
    event_id, exhibitor_id = scope(auth)
    return dashboard_service.my_quota(db, event_id, exhibitor_id)


@router.get("/participants", response_model=Page[ParticipantRead])
def list_participants(
    auth: RepresentativeUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    category: Category | None = None,
) -> dict[str, Any]:
    event_id, exhibitor_id = scope(auth)
    items, total = participant_service.list_participants(
        db, event_id, exhibitor_id, page, page_size, category
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/participants", response_model=ParticipantRead, status_code=status.HTTP_201_CREATED)
def create_participant(payload: ParticipantIn, auth: RepresentativeUser, db: DbSession) -> Any:
    event_id, exhibitor_id = scope(auth)
    return participant_service.create_participant(db, event_id, exhibitor_id, payload)


@router.get("/participants/{participant_id}", response_model=ParticipantRead)
def get_participant(participant_id: int, auth: RepresentativeUser, db: DbSession) -> Any:
    event_id, exhibitor_id = scope(auth)
    return participant_service.get_participant(db, event_id, exhibitor_id, participant_id)


@router.patch("/participants/{participant_id}", response_model=ParticipantRead)
def update_participant(
    participant_id: int, payload: ParticipantUpdate, auth: RepresentativeUser, db: DbSession
) -> Any:
    event_id, exhibitor_id = scope(auth)
    return participant_service.update_participant(
        db, event_id, exhibitor_id, participant_id, payload
    )


@router.delete("/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(participant_id: int, auth: RepresentativeUser, db: DbSession) -> Response:
    event_id, exhibitor_id = scope(auth)
    participant_service.delete_participant(db, event_id, exhibitor_id, participant_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
