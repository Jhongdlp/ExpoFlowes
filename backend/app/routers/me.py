"""Rutas del representante.

Ningun id de empresa aparece en la ruta: el `exhibitor_id` y el `event_id` salen del token
(§8.1.1). Pedir un recurso ajeno no da 403 sino 404: no se confirma que exista.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import AuthContext, RepresentativeUser
from app.db.session import get_db
from app.domain.exceptions import InvalidPayloadError
from app.integrations.excel import (
    MAX_UPLOAD_BYTES,
    XLSX_MEDIA_TYPE,
    participants_template,
)
from app.schemas.dashboard import BadgeArt, MyQuota
from app.schemas.exhibitor import ExhibitorDetail
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SEARCH_MAX_LENGTH, Page
from app.schemas.participant import (
    BulkUploadReport,
    Category,
    ParticipantIn,
    ParticipantRead,
    ParticipantUpdate,
)
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


@router.put("/badge-art", response_model=BadgeArt)
def set_badge_art(payload: BadgeArt, auth: RepresentativeUser, db: DbSession) -> Any:
    """Imagen de las credenciales del stand, subida por su propio representante.

    Llega ya reescalada y codificada por el navegador: no hay almacenamiento de ficheros
    en el sistema, y una imagen de 90 mm de ancho cabe de sobra en la fila del expositor.
    El tope de tamaño y el tipo los impone el esquema (§8.4, §8.10)."""
    event_id, exhibitor_id = scope(auth)
    return dashboard_service.set_badge_art(db, event_id, exhibitor_id, payload.model_dump())


@router.delete("/badge-art", status_code=status.HTTP_204_NO_CONTENT)
def clear_badge_art(auth: RepresentativeUser, db: DbSession) -> Response:
    """Vuelve al banner del stand como imagen de las credenciales."""
    event_id, exhibitor_id = scope(auth)
    dashboard_service.set_badge_art(db, event_id, exhibitor_id, None)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/participants", response_model=Page[ParticipantRead])
def list_participants(
    auth: RepresentativeUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    category: Category | None = None,
    search: Annotated[str | None, Query(max_length=SEARCH_MAX_LENGTH)] = None,
    without_email: bool = False,
) -> dict[str, Any]:
    event_id, exhibitor_id = scope(auth)
    items, total = participant_service.list_participants(
        db, event_id, exhibitor_id, page, page_size, category, search, without_email
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/participants", response_model=ParticipantRead, status_code=status.HTTP_201_CREATED)
def create_participant(payload: ParticipantIn, auth: RepresentativeUser, db: DbSession) -> Any:
    event_id, exhibitor_id = scope(auth)
    return participant_service.create_participant(db, event_id, exhibitor_id, payload)


@router.get(
    "/participants/template.xlsx",
    response_class=Response,
    responses={200: {"content": {XLSX_MEDIA_TYPE: {}}, "description": "Plantilla de carga"}},
)
def participants_template_xlsx(auth: RepresentativeUser) -> Response:
    """Plantilla generada desde el MISMO diccionario de columnas que valida la carga (§13)."""
    return Response(
        content=participants_template(),
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": 'attachment; filename="plantilla-credenciales.xlsx"'},
    )


@router.post("/participants/bulk", response_model=BulkUploadReport)
def bulk_upload(
    auth: RepresentativeUser,
    db: DbSession,
    file: Annotated[UploadFile, File()],
    dry_run: bool = False,
) -> dict[str, Any]:
    """Un solo endpoint para preview y confirmacion: con `dry_run=true` recorre exactamente
    el mismo codigo de validacion y no inserta nada (§11)."""
    event_id, exhibitor_id = scope(auth)
    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        # Se rechaza por el tamaño declarado, sin llegar a leer el cuerpo (§8.10).
        raise InvalidPayloadError(
            f"El archivo supera el maximo de {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )
    return participant_service.bulk_create_participants(
        db, event_id, exhibitor_id, file.filename, file.file.read(), dry_run
    )


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
