"""Agregados de los dos dashboards y del reporte.

No calcula nada por su cuenta: reutiliza `exhibitor_service.summarize`, que ya deriva cuota
y disponibilidad del motor de reglas. Duplicar aqui la formula seria la forma mas facil de
que el dashboard y el listado dejaran de cuadrar.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.domain.exceptions import NotFoundError
from app.models import Event
from app.repositories.exhibitor import ExhibitorRepository
from app.repositories.participant import ParticipantRepository
from app.services import exhibitor_service


def event_summaries(db: Session, event_id: int) -> list[dict[str, Any]]:
    """Todos los expositores vivos del evento, ya con su cuota derivada."""
    rows = ExhibitorRepository(db, event_id).all()
    return exhibitor_service.summarize(db, event_id, rows)


def admin_dashboard(db: Session, event_id: int) -> dict[str, Any]:
    event = db.get(Event, event_id)
    if event is None:
        raise NotFoundError("La feria del token ya no existe.")

    summaries = event_summaries(db, event_id)
    rules = exhibitor_service.load_rules(db, event_id)

    totals = {
        rule.category: {
            "quota": sum(s["quota"].get(rule.category, 0) for s in summaries),
            "assigned": sum(s["assigned"].get(rule.category, 0) for s in summaries),
            "available": sum(s["available"].get(rule.category, 0) for s in summaries),
        }
        for rule in rules.credentials
    }
    return {
        "event": event,
        "exhibitors_total": len(summaries),
        "total_m2": sum(s["requested_m2"] for s in summaries),
        "participants_total": sum(t["assigned"] for t in totals.values()),
        "totals": totals,
        "stand_categories": [
            {
                "label": rule.label,
                "min_m2": rule.min_m2,
                "max_m2": rule.max_m2,
                "exhibitors": sum(1 for s in summaries if s["stand_category"] == rule.label),
            }
            for rule in rules.stand_sizes
        ],
    }


def my_quota(db: Session, event_id: int, exhibitor_id: int) -> dict[str, Any]:
    """Cupo del stand propio. El `exhibitor_id` viene del token, nunca de la peticion (§8.1)."""
    exhibitor = ExhibitorRepository(db, event_id).get(exhibitor_id)
    if exhibitor is None:
        raise NotFoundError("El expositor solicitado no existe.")

    summary = exhibitor_service.summarize(db, event_id, [exhibitor])[0]
    participants = ParticipantRepository(db, event_id)
    return {
        "exhibitor_id": exhibitor.id,
        "legal_name": exhibitor.legal_name,
        "stand_name": exhibitor.stand_name,
        "requested_m2": exhibitor.requested_m2,
        "stand_category": summary["stand_category"],
        "quota": summary["quota"],
        "assigned": summary["assigned"],
        "available": summary["available"],
        "participants_total": sum(summary["assigned"].values()),
        "participants_without_email": participants.count_without_email(exhibitor_id),
    }
