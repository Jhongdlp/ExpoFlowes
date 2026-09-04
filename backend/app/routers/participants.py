"""Listado global de participantes: solo admin.

Es el unico endpoint donde un `exhibitor_id` llega por query, y solo porque el rol admin ya
alcanza al evento entero. El `event_id` sigue saliendo del token (§8.1).
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import AdminUser
from app.db.session import get_db
from app.repositories.participant import ParticipantRepository
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Page
from app.schemas.participant import Category, ParticipantRead, ParticipantWithExhibitor

router = APIRouter(prefix="/participants", tags=["participantes"])


@router.get("", response_model=Page[ParticipantWithExhibitor])
def list_participants(
    auth: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    exhibitor_id: int | None = None,
    category: Category | None = None,
) -> dict[str, Any]:
    rows, total = ParticipantRepository(db, auth.event_id).list_for_event(
        page, page_size, exhibitor_id, category
    )
    items = [
        ParticipantWithExhibitor(
            **ParticipantRead.model_validate(participant).model_dump(),
            exhibitor_id=participant.exhibitor_id,
            exhibitor_name=exhibitor_name,
        )
        for participant, exhibitor_name in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}
