"""Alta y mantenimiento de credenciales.

Dos invariantes que este modulo protege y que no pueden vivir en el router:

1. **Cupo sin condicion de carrera** (§9.3): la verificacion y el INSERT ocurren en la misma
   transaccion, con `SELECT ... FOR UPDATE` sobre la fila del expositor.
2. **Duplicado en dos capas** (§9.1): se valida en el servicio y se captura el IntegrityError,
   traducido al MISMO error estructurado. El cliente no puede distinguir cual de las dos
   capas disparo.
"""

import logging
from collections import Counter
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.exceptions import (
    BulkUploadValidationError,
    DuplicateParticipantError,
    InvalidIdentificationError,
    InvalidPayloadError,
    NotFoundError,
    QuotaExceededError,
)
from app.domain.identification import validate_identification
from app.domain.rules import quota_breakdown
from app.integrations import mailer
from app.integrations.excel import (
    PARTICIPANT_COLUMNS,
    InvalidWorkbookError,
    ensure_xlsx,
    read_participant_rows,
)
from app.models import Exhibitor, Participant
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


def _notify_credentials(
    db: Session, exhibitor_id: int, participants: Sequence[Participant]
) -> None:
    """Correo 2 (§9.2): DESPUES del commit y fuera de la transaccion.

    `credential_notified_at` marca al que ya recibio el aviso, asi que un alta corregida o un
    segundo intento no reenvian. Sin correo no se envia nada y el alta sigue siendo valida
    (§6.8). Un fallo del mailer no lanza: solo deja la marca sin poner.
    """
    pending = [p for p in participants if p.email and p.credential_notified_at is None]
    if not pending:
        return

    exhibitor = db.get(Exhibitor, exhibitor_id)
    name = exhibitor.legal_name if exhibitor else ""
    now = datetime.now(UTC)
    sent = False
    for participant in pending:
        assert participant.email is not None
        if mailer.notify_credential(
            participant.email,
            f"{participant.first_name} {participant.last_name}",
            name,
            participant.category,
        ):
            participant.credential_notified_at = now
            sent = True
    if sent:
        db.commit()


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
    _notify_credentials(db, exhibitor_id, [participant])
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
    # Si el representante completo el correo despues, la credencial se notifica ahora.
    _notify_credentials(db, exhibitor_id, [participant])
    return participant


def delete_participant(db: Session, event_id: int, exhibitor_id: int, participant_id: int) -> None:
    """Borrado fisico: libera cupo y libera la identificacion para un alta nueva (§7.2)."""
    repo = ParticipantRepository(db, event_id)
    participant = repo.get(exhibitor_id, participant_id)
    if participant is None:
        raise NotFoundError("El participante solicitado no existe.")
    repo.delete(participant)
    db.commit()


def _row_error(row: int, field: str, code: str, message: str) -> dict[str, Any]:
    # Pydantic antepone "Value error, " a los mensajes de sus validadores; el representante
    # ve este texto tal cual sobre su fila.
    return {
        "row": row,
        "field": field,
        "code": code,
        "message": message.removeprefix("Value error, "),
    }


def _field_label(field: str) -> str:
    """Devuelve el encabezado del Excel, no el nombre del campo Python: el usuario corrige
    su archivo mirando la columna, no el modelo."""
    for header, name in PARTICIPANT_COLUMNS.items():
        if name == field:
            return header
    return field


def bulk_create_participants(
    db: Session,
    event_id: int,
    exhibitor_id: int,
    filename: str | None,
    content: bytes,
    dry_run: bool,
) -> dict[str, Any]:
    """Carga masiva todo-o-nada (§11). `dry_run` recorre EXACTAMENTE el mismo codigo de
    validacion; la unica diferencia es que no inserta ni confirma.

    El cupo se verifica contra el lote completo dentro de la transaccion con el mismo
    `FOR UPDATE` del alta manual: fila a fila, cinco altas de una credencial cada una
    pasarian la verificacion y el stand acabaria con cuatro credenciales de mas.
    """
    try:
        ensure_xlsx(filename, content)
        rows = read_participant_rows(content)
    except InvalidWorkbookError as exc:
        raise InvalidPayloadError(str(exc)) from exc

    repo = ParticipantRepository(db, event_id)
    errors: list[dict[str, Any]] = []
    valid: list[ParticipantIn] = []
    seen: dict[str, int] = {}

    for row_number, values in rows:
        try:
            payload = ParticipantIn.model_validate(values)
        except ValidationError as exc:
            errors += [
                _row_error(
                    row_number,
                    # loc vacio = invariante entre campos; el unico que hay es el de
                    # empresa proveedora (§5.3), asi que la columna a corregir es esa.
                    _field_label(str(err["loc"][0]) if err["loc"] else "provider_company"),
                    "VALIDATION_ERROR",
                    err["msg"],
                )
                for err in exc.errors()
            ]
            continue

        try:
            validate_identification(payload.identification, payload.identification_type)
        except InvalidIdentificationError as exc:
            errors.append(_row_error(row_number, "identificacion", exc.code, exc.message))
            continue

        first_seen = seen.get(payload.identification)
        if first_seen is not None:
            errors.append(
                _row_error(
                    row_number,
                    "identificacion",
                    DuplicateParticipantError.code,
                    f"La identificacion {payload.identification} ya aparece en la fila "
                    f"{first_seen} de este mismo archivo.",
                )
            )
            continue

        seen[payload.identification] = row_number
        valid.append(payload)

    # Una sola consulta para todo el lote, no una por fila.
    owners = repo.find_owners(list(seen))
    for payload in valid:
        owner = owners.get(payload.identification)
        if owner is not None:
            errors.append(
                _row_error(
                    seen[payload.identification],
                    "identificacion",
                    DuplicateParticipantError.code,
                    f"{DUPLICATE_MESSAGE} Ya la registro: {owner}.",
                )
            )
    if owners:
        valid = [p for p in valid if p.identification not in owners]

    if errors:
        # Todo o nada: con una sola fila invalida no entra ninguna (§0.12).
        raise BulkUploadValidationError(
            "El archivo tiene filas invalidas. No se importo ninguna credencial.",
            {
                "total_rows": len(rows),
                "valid_rows": len(valid),
                "errors": sorted(errors, key=lambda e: (e["row"], e["field"])),
            },
        )

    report: dict[str, Any] = {
        "total_rows": len(rows),
        "valid_rows": len(valid),
        "inserted": 0 if dry_run else len(valid),
        "dry_run": dry_run,
    }

    try:
        with db.begin_nested():
            for category, requested in Counter(p.category for p in valid).items():
                _check_quota(db, event_id, repo, exhibitor_id, category, requested)
            if dry_run:
                return report
            inserted = [
                Participant(
                    event_id=event_id,
                    exhibitor_id=exhibitor_id,
                    **payload.model_dump(mode="json"),
                )
                for payload in valid
            ]
            for participant in inserted:
                repo.add(participant)
            db.flush()
    except IntegrityError as exc:
        # Otra transaccion registro una de estas identificaciones mientras validabamos.
        taken = repo.find_owners([p.identification for p in valid])
        raise BulkUploadValidationError(
            "El archivo tiene filas invalidas. No se importo ninguna credencial.",
            {
                "total_rows": len(rows),
                "valid_rows": len(valid) - len(taken),
                "errors": [
                    _row_error(
                        seen[identification],
                        "identificacion",
                        DuplicateParticipantError.code,
                        f"{DUPLICATE_MESSAGE} Ya la registro: {owner}.",
                    )
                    for identification, owner in taken.items()
                ],
            },
        ) from exc

    db.commit()
    # Los correos del lote salen tras confirmar la insercion; un fallo individual se registra
    # y no revierte nada (§9.2).
    _notify_credentials(db, exhibitor_id, inserted)
    return report
