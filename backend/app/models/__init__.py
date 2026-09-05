"""Modelo de datos. SQLAlchemy 2.0: Mapped[] + mapped_column().

Principios que este modulo hace cumplir:
- toda tabla operativa lleva `event_id` (aislamiento entre ferias)
- las restricciones unicas son compuestas por evento, nunca simples
- no existe columna de cuota ni de categoria de stand: ambas son derivadas
"""

from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

CREDENTIAL_CATEGORIES = ("Exhibitor", "Guest", "Service")
IDENTIFICATION_TYPES = ("CEDULA", "RUC", "PASSPORT", "FOREIGN_ID")
ROUNDING_MODES = ("floor", "ceil", "round")
ROLES = ("admin", "representative")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN (" + ", ".join(f"'{v}'" for v in values) + ")"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    year: Mapped[int] = mapped_column(Integer)
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class StandSizeRule(Base):
    """Rangos de metraje parametrizados. Cambiar una fila cambia la clasificacion."""

    __tablename__ = "stand_size_rules"
    __table_args__ = (
        UniqueConstraint("event_id", "label", name="uq_stand_size_rules_event_label"),
        CheckConstraint("min_m2 >= 0 AND max_m2 >= min_m2", name="ck_stand_size_rules_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(40))
    min_m2: Mapped[int] = mapped_column(Integer)
    max_m2: Mapped[int] = mapped_column(Integer)


class CredentialRule(Base):
    """Cuota de credenciales parametrizada: credentials_per_block por cada block_m2."""

    __tablename__ = "credential_rules"
    __table_args__ = (
        UniqueConstraint("event_id", "category", name="uq_credential_rules_event_category"),
        CheckConstraint(
            _in("category", CREDENTIAL_CATEGORIES), name="ck_credential_rules_category"
        ),
        CheckConstraint(_in("rounding_mode", ROUNDING_MODES), name="ck_credential_rules_rounding"),
        CheckConstraint(
            "block_m2 > 0 AND credentials_per_block >= 0", name="ck_credential_rules_positive"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(20))
    credentials_per_block: Mapped[int] = mapped_column(Integer)
    block_m2: Mapped[int] = mapped_column(Integer)
    rounding_mode: Mapped[str] = mapped_column(String(10), default="floor", server_default="floor")


class Exhibitor(Base):
    __tablename__ = "exhibitors"
    __table_args__ = (
        # Unico por evento solo entre los vivos: el soft delete libera el tax_id
        Index(
            "uq_exhibitors_event_tax_id",
            "event_id",
            "tax_id",
            unique=True,
            postgresql_where="deleted_at IS NULL",
        ),
        CheckConstraint(_in("tax_id_type", IDENTIFICATION_TYPES), name="ck_exhibitors_tax_id_type"),
        CheckConstraint("requested_m2 > 0", name="ck_exhibitors_requested_m2"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    tax_id: Mapped[str] = mapped_column(String(20))
    tax_id_type: Mapped[str] = mapped_column(String(20))
    legal_name: Mapped[str] = mapped_column(String(200))
    stand_name: Mapped[str] = mapped_column(String(160))
    address: Mapped[str] = mapped_column(String(255))
    requested_m2: Mapped[int] = mapped_column(Integer)
    banner_url: Mapped[str | None] = mapped_column(Text, default=None)
    # Imagen de las credenciales del stand, con su encuadre: {image, focus_x, focus_y, zoom}.
    # La sube el representante desde su propia pantalla; el esquema BadgeArt la valida.
    badge_art: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    representative: Mapped["Representative"] = relationship(back_populates="exhibitor")
    contacts: Mapped[list["ExhibitorContact"]] = relationship(back_populates="exhibitor")


class Representative(Base):
    """Coordinador de la empresa: uno por expositor. No consume credencial."""

    __tablename__ = "representatives"
    __table_args__ = (
        CheckConstraint(
            _in("identification_type", IDENTIFICATION_TYPES), name="ck_representatives_id_type"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    exhibitor_id: Mapped[int] = mapped_column(
        ForeignKey("exhibitors.id", ondelete="CASCADE"), unique=True
    )
    full_name: Mapped[str] = mapped_column(String(160))
    identification: Mapped[str] = mapped_column(String(20))
    identification_type: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(30))
    position: Mapped[str] = mapped_column(String(80))

    exhibitor: Mapped["Exhibitor"] = relationship(back_populates="representative")


class ExhibitorContact(Base):
    """Contactos adicionales: minimo uno, sin maximo. El minimo lo valida el servicio."""

    __tablename__ = "exhibitor_contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    exhibitor_id: Mapped[int] = mapped_column(
        ForeignKey("exhibitors.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(30))
    email: Mapped[str] = mapped_column(String(255))

    exhibitor: Mapped["Exhibitor"] = relationship(back_populates="contacts")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("event_id", "email", name="uq_users_event_email"),
        CheckConstraint(_in("role", ROLES), name="ck_users_role"),
        # El admin no pertenece a un expositor; el representante siempre si.
        CheckConstraint(
            "(role = 'admin' AND exhibitor_id IS NULL) OR "
            "(role = 'representative' AND exhibitor_id IS NOT NULL)",
            name="ck_users_role_exhibitor",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    exhibitor_id: Mapped[int | None] = mapped_column(
        ForeignKey("exhibitors.id", ondelete="CASCADE"), default=None
    )
    email: Mapped[str] = mapped_column(String(255))
    # Nulo hasta que el representante establece su clave con el token.
    # Un usuario sin password_hash no puede autenticarse.
    password_hash: Mapped[str | None] = mapped_column(String(255), default=None)
    role: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class PasswordSetupToken(Base):
    """Token de un solo uso, 72 h. Se guarda hasheado, nunca en claro."""

    __tablename__ = "password_setup_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Participant(Base):
    """Una fila = una credencial."""

    __tablename__ = "participants"
    __table_args__ = (
        # Validacion critica: la misma persona no puede estar en dos empresas del mismo
        # evento. Por evento, nunca global.
        UniqueConstraint("event_id", "identification", name="uq_participants_event_id_ident"),
        CheckConstraint(_in("category", CREDENTIAL_CATEGORIES), name="ck_participants_category"),
        CheckConstraint(
            _in("identification_type", IDENTIFICATION_TYPES), name="ck_participants_id_type"
        ),
        CheckConstraint(
            "(category = 'Service') = (provider_company IS NOT NULL)",
            name="ck_participants_provider_company",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    exhibitor_id: Mapped[int] = mapped_column(
        ForeignKey("exhibitors.id", ondelete="CASCADE"), index=True
    )
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    identification: Mapped[str] = mapped_column(String(20))
    identification_type: Mapped[str] = mapped_column(String(20))
    phone: Mapped[str] = mapped_column(String(30))
    position: Mapped[str] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(20))
    provider_company: Mapped[str | None] = mapped_column(String(200), default=None)
    email: Mapped[str | None] = mapped_column(String(255), default=None)  # opcional
    credential_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )


__all__ = [
    "Base",
    "CredentialRule",
    "Event",
    "Exhibitor",
    "ExhibitorContact",
    "Participant",
    "PasswordSetupToken",
    "Representative",
    "StandSizeRule",
    "User",
]
