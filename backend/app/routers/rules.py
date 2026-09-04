"""Lectura de las reglas parametrizadas. Ambos roles leen; nadie escribe por API (§A.11):
los rangos se cambian con un UPDATE, sin redeploy, y el test R7 lo demuestra."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models import CredentialRule, StandSizeRule
from app.repositories.rules import RulesRepository
from app.schemas.rules import CredentialRuleRead, StandSizeRuleRead

router = APIRouter(prefix="/rules", tags=["reglas"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/stand-sizes", response_model=list[StandSizeRuleRead])
def stand_sizes(auth: CurrentUser, db: DbSession) -> list[StandSizeRule]:
    return RulesRepository(db, auth.event_id).stand_sizes()


@router.get("/credentials", response_model=list[CredentialRuleRead])
def credentials(auth: CurrentUser, db: DbSession) -> list[CredentialRule]:
    return RulesRepository(db, auth.event_id).credentials()
