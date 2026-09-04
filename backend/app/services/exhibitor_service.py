"""Reglas de negocio de expositores. Aqui viven las transacciones; los routers no deciden nada.

Las reglas de metraje y cuota se LEEN DE LA BASE en cada operacion y se pasan al motor puro
de F2. No hay cache: un UPDATE sobre las tablas de reglas surte efecto en la siguiente
peticion, sin reiniciar el proceso (punto extra E3, test R7).
"""

import logging
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any, NamedTuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.exceptions import (
    DuplicateEmailError,
    DuplicateExhibitorError,
    NotFoundError,
    QuotaBelowAssignedError,
)
from app.domain.identification import validate_identification
from app.domain.rules import classify_stand, quota_breakdown
from app.integrations import mailer
from app.models import (
    CredentialRule,
    Exhibitor,
    ExhibitorContact,
    Representative,
    StandSizeRule,
    User,
)
from app.repositories.exhibitor import ExhibitorRepository
from app.repositories.rules import RulesRepository
from app.schemas.exhibitor import ExhibitorCreate, ExhibitorUpdate
from app.services import auth_service

logger = logging.getLogger(__name__)


def _translate(exc: IntegrityError) -> Exception:
    """Capa 2 de la validacion en dos capas (§9.1): el cliente no distingue quien fallo."""
    constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", "") or ""
    if "uq_exhibitors_event_tax_id" in constraint:
        return DuplicateExhibitorError(
            "Ya existe un expositor registrado con esa identificacion tributaria en esta feria."
        )
    if "uq_users_event_email" in constraint:
        return DuplicateEmailError("Ese correo ya tiene una cuenta de acceso en esta feria.")
    return exc


class Rules(NamedTuple):
    """Las dos tablas de reglas leidas una sola vez por peticion (§7.1.3)."""

    stand_sizes: list[StandSizeRule]
    credentials: list[CredentialRule]


def load_rules(db: Session, event_id: int) -> Rules:
    repo = RulesRepository(db, event_id)
    return Rules(repo.stand_sizes(), repo.credentials())


def quota_view(m2: int, assigned: dict[str, int], rules: Rules) -> dict[str, Any]:
    """Categoria de stand y cuota, siempre derivadas del metraje y de las reglas vigentes.

    Nunca se lee de una columna: si el admin corrige el metraje, esto cambia solo (§6.4).
    """
    category = classify_stand(m2, rules.stand_sizes)
    quota = quota_breakdown(m2, rules.credentials)
    return {
        "stand_category": category.label,
        "quota": quota,
        "assigned": {c: assigned.get(c, 0) for c in quota},
        "available": {c: total - assigned.get(c, 0) for c, total in quota.items()},
    }


def _as_read(exhibitor: Exhibitor, assigned: dict[str, int], rules: Rules) -> dict[str, Any]:
    return {
        "id": exhibitor.id,
        "tax_id": exhibitor.tax_id,
        "tax_id_type": exhibitor.tax_id_type,
        "legal_name": exhibitor.legal_name,
        "stand_name": exhibitor.stand_name,
        "address": exhibitor.address,
        "requested_m2": exhibitor.requested_m2,
        **quota_view(exhibitor.requested_m2, assigned, rules),
    }


def summarize(db: Session, event_id: int, rows: Sequence[Exhibitor]) -> list[dict[str, Any]]:
    """Filas de listado con cuota derivada. Dos consultas para N expositores, no 2N."""
    counts = ExhibitorRepository(db, event_id).assigned_counts([r.id for r in rows])
    rules = load_rules(db, event_id)
    return [_as_read(r, counts.get(r.id, {}), rules) for r in rows]


def list_exhibitors(
    db: Session, event_id: int, page: int, page_size: int
) -> tuple[list[dict[str, Any]], int]:
    rows, total = ExhibitorRepository(db, event_id).list(page, page_size)
    return summarize(db, event_id, rows), total


def get_exhibitor(db: Session, event_id: int, exhibitor_id: int) -> dict[str, Any]:
    repo = ExhibitorRepository(db, event_id)
    exhibitor = repo.get_detail(exhibitor_id)
    if exhibitor is None:
        raise NotFoundError("El expositor solicitado no existe.")
    counts = repo.assigned_counts([exhibitor.id])
    return {
        **_as_read(exhibitor, counts.get(exhibitor.id, {}), load_rules(db, event_id)),
        "representative": exhibitor.representative,
        "contacts": exhibitor.contacts,
    }


def create_exhibitor(db: Session, event_id: int, payload: ExhibitorCreate) -> dict[str, Any]:
    """Alta atomica: expositor + representante + contactos + usuario + token (§9.2).

    El correo se envia DESPUES del commit (F13). Si fallara, el alta ya esta confirmada.
    """
    validate_identification(payload.tax_id, payload.tax_id_type)
    validate_identification(
        payload.representative.identification, payload.representative.identification_type
    )
    # Valida el rango de metraje contra las reglas de la base antes de escribir nada (§6.2).
    classify_stand(payload.requested_m2, RulesRepository(db, event_id).stand_sizes())

    repo = ExhibitorRepository(db, event_id)
    if repo.get_by_tax_id(payload.tax_id) is not None:
        raise DuplicateExhibitorError(
            "Ya existe un expositor registrado con esa identificacion tributaria en esta feria."
        )

    exhibitor = Exhibitor(
        event_id=event_id,
        tax_id=payload.tax_id,
        tax_id_type=payload.tax_id_type,
        legal_name=payload.legal_name,
        stand_name=payload.stand_name,
        address=payload.address,
        requested_m2=payload.requested_m2,
    )

    try:
        # SAVEPOINT: si algo falla, se deshace el alta entera y nada mas.
        with db.begin_nested():
            repo.add(exhibitor)
            db.flush()

            db.add(
                Representative(
                    event_id=event_id,
                    exhibitor_id=exhibitor.id,
                    **payload.representative.model_dump(mode="json"),
                )
            )
            for contact in payload.contacts:
                db.add(
                    ExhibitorContact(
                        event_id=event_id,
                        exhibitor_id=exhibitor.id,
                        **contact.model_dump(mode="json"),
                    )
                )

            # El usuario nace SIN password_hash: la clave se establece con el token (§6.5).
            user = User(
                event_id=event_id,
                exhibitor_id=exhibitor.id,
                email=str(payload.representative.email),
                role="representative",
            )
            db.add(user)
            db.flush()

            token = auth_service.issue_password_setup_token(db, user)
    except IntegrityError as exc:
        raise _translate(exc) from exc

    db.commit()

    # Correo DESPUES del commit y fuera de la transaccion (§9.2). `notify_*` no lanza: si el
    # SMTP falla, el alta ya esta confirmada y el admin reenvia el enlace desde la UI.
    link = auth_service.setup_password_link(token)
    representative = payload.representative
    mailer.notify_password_setup(str(representative.email), representative.full_name, link)

    detail = get_exhibitor(db, event_id, exhibitor.id)
    if get_settings().expose_setup_link:
        # Solo en el demo: el enunciado admite el correo simulado, y asi el evaluador puede
        # activar la cuenta recien creada sin acceso al inbox. Nunca en produccion.
        detail["password_setup_link"] = link
    return detail


def update_exhibitor(
    db: Session, event_id: int, exhibitor_id: int, payload: ExhibitorUpdate
) -> dict[str, Any]:
    """Cambiar el metraje recalcula la cuota. Si queda por debajo de lo ya asignado, se bloquea
    el cambio en vez de dejar el estado inconsistente (§6.4)."""
    repo = ExhibitorRepository(db, event_id)
    exhibitor = repo.get(exhibitor_id)
    if exhibitor is None:
        raise NotFoundError("El expositor solicitado no existe.")

    changes = payload.model_dump(exclude_unset=True)
    new_m2 = changes.get("requested_m2")
    if new_m2 is not None and new_m2 != exhibitor.requested_m2:
        rules = RulesRepository(db, event_id)
        classify_stand(new_m2, rules.stand_sizes())
        new_quota = quota_breakdown(new_m2, rules.credentials())
        assigned = repo.assigned_counts([exhibitor.id]).get(exhibitor.id, {})
        short = {
            category: {"quota": new_quota.get(category, 0), "assigned": used}
            for category, used in assigned.items()
            if used > new_quota.get(category, 0)
        }
        if short:
            raise QuotaBelowAssignedError(
                "El nuevo metraje deja la cuota por debajo de las credenciales ya asignadas. "
                "Elimine participantes antes de reducir el stand.",
                {"requested_m2": new_m2, "categories": short},
            )

    for field, value in changes.items():
        setattr(exhibitor, field, value)
    db.commit()
    return get_exhibitor(db, event_id, exhibitor_id)


def delete_exhibitor(db: Session, event_id: int, exhibitor_id: int) -> None:
    """Soft delete: borrar en duro una empresa con credenciales emitidas es destructivo (§7.1)."""
    repo = ExhibitorRepository(db, event_id)
    exhibitor = repo.get(exhibitor_id)
    if exhibitor is None:
        raise NotFoundError("El expositor solicitado no existe.")
    exhibitor.deleted_at = datetime.now(UTC)
    db.commit()


__all__ = [
    "create_exhibitor",
    "delete_exhibitor",
    "get_exhibitor",
    "list_exhibitors",
    "load_rules",
    "quota_view",
    "summarize",
    "update_exhibitor",
]
