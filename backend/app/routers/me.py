"""Rutas del representante. Sin id de empresa en la ruta: el scope sale del token (§8.1.1)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import RepresentativeUser
from app.db.session import get_db
from app.domain.exceptions import NotFoundError
from app.repositories.exhibitor import ExhibitorRepository
from app.schemas.exhibitor import ExhibitorRead

router = APIRouter(prefix="/me", tags=["representante"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/exhibitor", response_model=ExhibitorRead)
def my_exhibitor(auth: RepresentativeUser, db: DbSession) -> ExhibitorRead:
    assert auth.exhibitor_id is not None  # garantizado por require_representative
    exhibitor = ExhibitorRepository(db, auth.event_id).get(auth.exhibitor_id)
    if exhibitor is None:
        raise NotFoundError("El recurso solicitado no existe.")
    return ExhibitorRead.model_validate(exhibitor)
