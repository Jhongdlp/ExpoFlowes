"""Seed idempotente (CLAUDE.md §7.3): upsert por clave natural.

Correrlo dos veces no falla ni duplica. Todos los datos son ficticios; las identificaciones
son validas por algoritmo pero generadas, no pertenecen a ninguna persona real.

    python -m app.seed
"""

from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal
from app.models import (
    CredentialRule,
    Event,
    Exhibitor,
    ExhibitorContact,
    Participant,
    Representative,
    StandSizeRule,
    User,
)


def upsert[M: Base](db: Session, model: type[M], key: dict[str, Any], values: dict[str, Any]) -> M:
    """Busca por clave natural; crea o actualiza. Es lo que hace el seed repetible."""
    stmt = select(model).filter_by(**key)
    row = db.execute(stmt).scalar_one_or_none()
    if row is None:
        row = model(**key, **values)
        db.add(row)
    else:
        for field, value in values.items():
            setattr(row, field, value)
    db.flush()
    return row


EVENT = {
    "slug": "expo-flor-ecuador-2026",
    "name": "Expo Flor Ecuador 2026",
    "year": 2026,
    "starts_on": date(2026, 10, 7),
    "ends_on": date(2026, 10, 9),
}

# §5.1 - rangos de metraje, inclusivos en ambos extremos
STAND_SIZE_RULES = [
    {"label": "Pequeño", "min_m2": 5, "max_m2": 12},
    {"label": "Mediano", "min_m2": 13, "max_m2": 30},
    {"label": "Grande", "min_m2": 31, "max_m2": 50},
]

# §5.2 - cuotas por bloque de metraje
CREDENTIAL_RULES = [
    {"category": "Exhibitor", "credentials_per_block": 2, "block_m2": 5, "rounding_mode": "floor"},
    {"category": "Guest", "credentials_per_block": 2, "block_m2": 10, "rounding_mode": "floor"},
    {"category": "Service", "credentials_per_block": 3, "block_m2": 10, "rounding_mode": "floor"},
]

EXHIBITORS: list[dict[str, Any]] = [
    {
        # Unico representante del seed con clave: es la cuenta de demostracion del rol.
        "demo_login": True,
        "tax_id": "1791234561001",
        "tax_id_type": "RUC",
        "legal_name": "Rosas del Cotopaxi S.A.",
        "stand_name": "Rosas del Cotopaxi",
        "address": "Panamericana Norte km 12, Latacunga",
        "requested_m2": 25,
        "banner_url": "unsplash:roses-red",
        "representative": {
            "full_name": "Mariana Cevallos Ponce",
            "identification": "1712345675",
            "identification_type": "CEDULA",
            "email": "mariana.cevallos@rosascotopaxi.demo",
            "phone": "0991000001",
            "position": "Coordinadora comercial",
        },
        "contacts": [
            {"name": "Luis Andrade", "phone": "0991000002", "email": "luis@rosascotopaxi.demo"},
            {"name": "Paula Ruiz", "phone": "0991000003", "email": "paula@rosascotopaxi.demo"},
        ],
        "participants": [
            ("Ana", "Torres", "1710000017", "Exhibitor", None, "ana.torres@rosascotopaxi.demo"),
            ("Diego", "Moreno", "0920000023", "Exhibitor", None, None),
            ("Sofia", "Lopez", "0100000033", "Guest", None, "sofia.lopez@demo.test"),
        ],
    },
    {
        "tax_id": "0992345675001",
        "tax_id_type": "RUC",
        "legal_name": "Flores del Valle Cia. Ltda.",
        "stand_name": "Flores del Valle",
        "address": "Av. Los Shyris 220, Quito",
        "requested_m2": 8,
        "banner_url": "unsplash:roses-pink",
        "representative": {
            "full_name": "Jorge Benitez Salas",
            "identification": "0923456784",
            "identification_type": "CEDULA",
            "email": "jorge.benitez@floresdelvalle.demo",
            "phone": "0992000001",
            "position": "Gerente de ventas",
        },
        "contacts": [
            {"name": "Karla Mena", "phone": "0992000002", "email": "karla@floresdelvalle.demo"},
        ],
        # Stand de 8 m2: cuota Exhibitor 2, Guest 0, Service 0 (consecuencia de floor, §5.2)
        "participants": [
            ("Karla", "Mena", "1800000042", "Exhibitor", None, "karla@floresdelvalle.demo"),
            ("Ivan", "Puma", "1100000056", "Exhibitor", None, None),
        ],
    },
    {
        "tax_id": "0198765430001",
        "tax_id_type": "RUC",
        "legal_name": "Andean Blooms Export S.A.",
        "stand_name": "Andean Blooms",
        "address": "Vía Cayambe - Otavalo km 4, Cayambe",
        "requested_m2": 40,
        "banner_url": "unsplash:tropical-blooms",
        "representative": {
            "full_name": "Elena Vasquez Guerra",
            "identification": "0109876540",
            "identification_type": "CEDULA",
            "email": "elena.vasquez@andeanblooms.demo",
            "phone": "0993000001",
            "position": "Directora de marketing",
        },
        "contacts": [
            {"name": "Ruben Salas", "phone": "0993000002", "email": "ruben@andeanblooms.demo"},
            {"name": "Tania Ortiz", "phone": "0993000003", "email": "tania@andeanblooms.demo"},
        ],
        "participants": [
            ("Ruben", "Salas", "0500000062", "Exhibitor", None, "ruben@andeanblooms.demo"),
            ("Tania", "Ortiz", "1300000070", "Guest", None, None),
            ("Marco", "Chiluisa", "1700000084", "Service", "Montajes Andinos S.A.", None),
        ],
    },
]


def seed(db: Session) -> None:
    settings = get_settings()

    event = upsert(
        db, Event, {"slug": EVENT["slug"]}, {**_without(EVENT, "slug"), "is_active": True}
    )

    for rule in STAND_SIZE_RULES:
        upsert(
            db,
            StandSizeRule,
            {"event_id": event.id, "label": rule["label"]},
            _without(rule, "label"),
        )

    for rule in CREDENTIAL_RULES:
        upsert(
            db,
            CredentialRule,
            {"event_id": event.id, "category": rule["category"]},
            _without(rule, "category"),
        )

    upsert(
        db,
        User,
        {"event_id": event.id, "email": settings.seed_admin_email},
        {
            "password_hash": hash_password(settings.seed_admin_password),
            "role": "admin",
            "exhibitor_id": None,
            "is_active": True,
        },
    )

    for data in EXHIBITORS:
        exhibitor = upsert(
            db,
            Exhibitor,
            {"event_id": event.id, "tax_id": data["tax_id"]},
            {
                "tax_id_type": data["tax_id_type"],
                "legal_name": data["legal_name"],
                "stand_name": data["stand_name"],
                "address": data["address"],
                "requested_m2": data["requested_m2"],
                "banner_url": data.get("banner_url"),
                "deleted_at": None,
            },
        )

        rep = data["representative"]
        upsert(
            db,
            Representative,
            {"exhibitor_id": exhibitor.id},
            {"event_id": event.id, **rep},
        )

        # El usuario del representante nace sin password_hash: establece su clave con el
        # token de un solo uso (§6.5). La unica excepcion es la cuenta de demostracion, y su
        # clave se reescribe solo si el seed la declara: re-sembrar no pisa claves reales.
        user_values: dict[str, Any] = {
            "role": "representative",
            "exhibitor_id": exhibitor.id,
            "is_active": True,
        }
        if data.get("demo_login"):
            user_values["password_hash"] = hash_password(settings.seed_rep_password)
        upsert(db, User, {"event_id": event.id, "email": rep["email"]}, user_values)

        for contact in data["contacts"]:
            upsert(
                db,
                ExhibitorContact,
                {"exhibitor_id": exhibitor.id, "email": contact["email"]},
                {"event_id": event.id, "name": contact["name"], "phone": contact["phone"]},
            )

        for first, last, ident, category, provider, email in data["participants"]:
            upsert(
                db,
                Participant,
                {"event_id": event.id, "identification": ident},
                {
                    "exhibitor_id": exhibitor.id,
                    "first_name": first,
                    "last_name": last,
                    "identification_type": "CEDULA",
                    "phone": "0990000000",
                    "position": "Personal de stand",
                    "category": category,
                    "provider_company": provider,
                    "email": email,
                },
            )

    db.commit()


def _without(data: dict[str, Any], key: str) -> dict[str, Any]:
    return {k: v for k, v in data.items() if k != key}


def main() -> None:
    with SessionLocal() as db:
        seed(db)
    print("seed ok")


if __name__ == "__main__":
    main()
