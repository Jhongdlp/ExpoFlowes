"""Rutas del representante. Sin id de empresa en la ruta: el scope sale del token (§8.1.1)."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import RepresentativeUser
from app.db.session import get_db
from app.schemas.exhibitor import ExhibitorDetail
from app.services import exhibitor_service

router = APIRouter(prefix="/me", tags=["representante"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/exhibitor", response_model=ExhibitorDetail)
def my_exhibitor(auth: RepresentativeUser, db: DbSession) -> dict[str, Any]:
    """`auth.exhibitor_id` viene del token; require_representative garantiza que no es None."""
    assert auth.exhibitor_id is not None
    return exhibitor_service.get_exhibitor(db, auth.event_id, auth.exhibitor_id)
