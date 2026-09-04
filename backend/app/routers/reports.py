from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.security import AdminUser
from app.db.session import get_db
from app.integrations.excel import XLSX_MEDIA_TYPE, exhibitors_report
from app.models import Event
from app.services import dashboard_service, exhibitor_service

router = APIRouter(prefix="/reports", tags=["reportes"])


@router.get(
    "/exhibitors.xlsx",
    response_class=Response,
    responses={200: {"content": {XLSX_MEDIA_TYPE: {}}, "description": "Libro de Excel"}},
)
def exhibitors_xlsx(auth: AdminUser, db: Annotated[Session, Depends(get_db)]) -> Response:
    """Reporte accionable para el organizador: un stand por fila con su cupo real."""
    event = db.get(Event, auth.event_id)
    categories = [r.category for r in exhibitor_service.load_rules(db, auth.event_id).credentials]
    content = exhibitors_report(
        dashboard_service.event_summaries(db, auth.event_id),
        categories,
        event.name if event else "Feria",
    )
    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": 'attachment; filename="expositores.xlsx"'},
    )
