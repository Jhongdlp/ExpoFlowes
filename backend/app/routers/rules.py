"""Lectura de las reglas parametrizadas. Ambos roles leen; nadie escribe por API:
los rangos se cambian con un UPDATE, sin redeploy, y el test R7 lo demuestra."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models import CredentialRule, StandSizeRule
from app.repositories.rules import RulesRepository
from app.schemas.rules import CredentialRuleRead, QuotaSimulation, StandSizeRuleRead
from app.services import exhibitor_service

router = APIRouter(prefix="/rules", tags=["reglas"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/stand-sizes", response_model=list[StandSizeRuleRead])
def stand_sizes(auth: CurrentUser, db: DbSession) -> list[StandSizeRule]:
    return RulesRepository(db, auth.event_id).stand_sizes()


@router.get("/credentials", response_model=list[CredentialRuleRead])
def credentials(auth: CurrentUser, db: DbSession) -> list[CredentialRule]:
    return RulesRepository(db, auth.event_id).credentials()


@router.get("/quota", response_model=QuotaSimulation)
def simulate_quota(
    auth: CurrentUser,
    db: DbSession,
    m2: Annotated[int, Query(ge=1, le=10_000, description="Metraje a derivar")],
) -> dict[str, Any]:
    """Deriva categoria y cuota de un metraje sin crear nada.

    Reusa `quota_view`, la MISMA funcion que deriva la cuota de un expositor real: si divergiera
    de ella, el simulador mentiria. Un metraje fuera de todo rango devuelve 422
    STAND_SIZE_OUT_OF_RANGE con los rangos vigentes en `details`, que es exactamente lo
    que el alta de expositor responde.
    """
    rules = exhibitor_service.load_rules(db, auth.event_id)
    return {"requested_m2": m2, **exhibitor_service.quota_view(m2, {}, rules)}
