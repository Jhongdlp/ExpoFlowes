"""Alta y mantenimiento de credenciales.

Dos invariantes que este modulo protege y que no pueden vivir en el router:

1. **Cupo sin condicion de carrera** (§9.3): la verificacion y el INSERT ocurren en la misma
   transaccion, con `SELECT ... FOR UPDATE` sobre la fila del expositor.
2. **Duplicado en dos capas** (§9.1): se valida en el servicio y se captura el IntegrityError,
   traducido al MISMO error estructurado. El cliente no puede distinguir cual de las dos
   capas disparo.
"""

import logging
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.exceptions import (
    DuplicateParticipantError,
    InvalidPayloadError,
    NotFoundError,
    QuotaExceededError,
)
from app.domain.identification import validate_identification
from app.domain.rules import quota_breakdown
from app.models import Participant
from app.repositories.participant import ParticipantRepository
from app.repositories.rules import RulesRepository
from app.schemas.participant import ParticipantIn, ParticipantUpdate, check_provider_company

logger = logging.getLogger(__name__)

DUPLICATE_MESSAGE = (
    "Esa identificacion ya esta registrada en esta feria por otra empresa. "
    "Una misma persona no puede acreditarse en dos stands del mismo evento."
)


def _duplicate_error(repo: ParticipantRepository, identification: str) -> DuplicateParticipantError:
    """Construye el error con la forma exacta de §9.4, venga de la capa que venga."""
    owner = repo.find_owner(identification)
    details: dict[str, Any] = {"identification": identification}
    if owner is not None:
        participant, exhibitor = owner
        details["registered_in"] = exhibitor.legal_name
        details["category"] = participant.category
    return DuplicateParticipantError(DUPLICATE_MESSAGE, details)


def _check_quota(
    db: Session,
    event_id: int,
    repo: ParticipantRepository,
    exhibitor_id: int,
    category: str,
    requested: int,
) -> None:
    """Exige que la fila del expositor ya este bloqueada por el llamador."""
    exhibitor = repo.lock_exhibitor(exhibitor_id)
    if exhibitor is None:
        raise NotFoundError("El expositor solicitado no existe.")

    quota = quota_breakdown(
        exhibitor.requested_m2, RulesRepository(db, event_id).credentials()
    ).get(category, 0)
    used = repo.count_by_category(exhibitor_id).get(category, 0)

    if used + requested > quota:
        raise QuotaExceededError(
            f"No quedan credenciales disponibles en la categoria {category}.",
            {"category": category, "quota": quota, "used": used, "requested": requested},
        )


def list_participants(
    db: Session,
    event_id: int,
    exhibitor_id: int,
    page: int,
    page_size: int,
    category: str | None = None,
) -> tuple[list[Participant], int]:
    return ParticipantRepository(db, event_id).list(exhibitor_id, page, page_size, category)


def get_participant(
    db: Session, event_id: int, exhibitor_id: int, participant_id: int
) -> Participant:
    participant = ParticipantRepository(db, event_id).get(exhibitor_id, participant_id)
    if participant is None:
        raise NotFoundError("El participante solicitado no existe.")
    return participant


def create_participant(
    db: Session, event_id: int, exhibitor_id: int, payload: ParticipantIn
) -> Participant:
    validate_identification(payload.identification, payload.identification_type)
    repo = ParticipantRepository(db, event_id)

    try:
        with db.begin_nested():
            # El bloqueo, la verificacion de cupo y el INSERT, en la misma transaccion.
            _check_quota(db, event_id, repo, exhibitor_id, payload.category, requested=1)

            if repo.find_owner(payload.identification) is not None:
                raise _duplicate_error(repo, payload.identification)

            participant = Participant(
                event_id=event_id, exhibitor_id=exhibitor_id, **payload.model_dump(mode="json")
            )
            repo.add(participant)
            db.flush()
    except IntegrityError as exc:
        # Capa 2: otra transaccion se adelanto entre la verificacion y el INSERT.
        raise _duplicate_error(repo, payload.identification) from exc

    db.commit()
    return participant


def update_participant(
    db: Session, event_id: int, exhibitor_id: int, participant_id: int, payload: ParticipantUpdate
) -> Participant:
    repo = ParticipantRepository(db, event_id)
    participant = repo.get(exhibitor_id, participant_id)
    if participant is None:
        raise NotFoundError("El participante solicitado no existe.")

    changes = payload.model_dump(exclude_unset=True)
    category = changes.get("category", participant.category)
    provider_company = changes.get("provider_company", participant.provider_company)
    try:
        check_provider_company(category, provider_company)
    except ValueError as exc:
        raise InvalidPayloadError(
            str(exc), {"fields": [{"field": "provider_company", "message": str(exc)}]}
        ) from exc

    identification = changes.get("identification", participant.identification)
    identification_type = changes.get("identification_type", participant.identification_type)
    if "identification" in changes or "identification_type" in changes:
        validate_identification(identification, identification_type)

    try:
        with db.begin_nested():
            if category != participant.category:
                _check_quota(db, event_id, repo, exhibitor_id, category, requested=1)

            if identification != participant.identification:
                owner = repo.find_owner(identification)
                if owner is not None:
                    raise _duplicate_error(repo, identification)

            for field, value in changes.items():
                setattr(participant, field, value)
            participant.provider_company = provider_company
            db.flush()
    except IntegrityError as exc:
        raise _duplicate_error(repo, identification) from exc

    db.commit()
    return participant


def delete_participant(db: Session, event_id: int, exhibitor_id: int, participant_id: int) -> None:
    """Borrado fisico: libera cupo y libera la identificacion para un alta nueva (§7.2)."""
    repo = ParticipantRepository(db, event_id)
    participant = repo.get(exhibitor_id, participant_id)
    if participant is None:
        raise NotFoundError("El participante solicitado no existe.")
    repo.delete(participant)
    db.commit()
