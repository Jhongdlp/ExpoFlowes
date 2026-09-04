"""Rutas del administrador. El `event_id` sale del token; el `{id}` de la ruta solo se usa
para buscar DENTRO de ese evento, nunca para filtrar por si mismo (§8.1.1)."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import AdminUser
from app.db.session import get_db
from app.schemas.exhibitor import (
    ExhibitorCreate,
    ExhibitorDetail,
    ExhibitorRead,
    ExhibitorUpdate,
)
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SEARCH_MAX_LENGTH, Page
from app.services import exhibitor_service

router = APIRouter(prefix="/exhibitors", tags=["expositores"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=Page[ExhibitorRead])
def list_exhibitors(
    auth: AdminUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    search: Annotated[str | None, Query(max_length=SEARCH_MAX_LENGTH)] = None,
) -> dict[str, Any]:
    items, total = exhibitor_service.list_exhibitors(db, auth.event_id, page, page_size, search)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=ExhibitorDetail, status_code=status.HTTP_201_CREATED)
def create_exhibitor(payload: ExhibitorCreate, auth: AdminUser, db: DbSession) -> dict[str, Any]:
    return exhibitor_service.create_exhibitor(db, auth.event_id, payload)


@router.get("/{exhibitor_id}", response_model=ExhibitorDetail)
def get_exhibitor(exhibitor_id: int, auth: AdminUser, db: DbSession) -> dict[str, Any]:
    return exhibitor_service.get_exhibitor(db, auth.event_id, exhibitor_id)


@router.patch("/{exhibitor_id}", response_model=ExhibitorDetail)
def update_exhibitor(
    exhibitor_id: int, payload: ExhibitorUpdate, auth: AdminUser, db: DbSession
) -> dict[str, Any]:
    return exhibitor_service.update_exhibitor(db, auth.event_id, exhibitor_id, payload)


@router.delete("/{exhibitor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exhibitor(exhibitor_id: int, auth: AdminUser, db: DbSession) -> Response:
    exhibitor_service.delete_exhibitor(db, auth.event_id, exhibitor_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
