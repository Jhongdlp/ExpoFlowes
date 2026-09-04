from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import AdminUser
from app.db.session import get_db
from app.schemas.dashboard import AdminDashboard
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboards"])


@router.get("/admin", response_model=AdminDashboard)
def admin_dashboard(auth: AdminUser, db: Annotated[Session, Depends(get_db)]) -> dict[str, Any]:
    """Stands con credenciales asignadas vs. disponibles, agregado para toda la feria."""
    return dashboard_service.admin_dashboard(db, auth.event_id)
