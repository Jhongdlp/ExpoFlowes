from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.errors import error_response
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Annotated[Session, Depends(get_db)]) -> Any:
    """Verifica conectividad real con la base, no solo que el proceso viva."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return error_response(503, "DATABASE_UNAVAILABLE", "La base de datos no responde.")
    return {"status": "ok", "database": "ok"}
