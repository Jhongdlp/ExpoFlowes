"""Esquema inicial: evento, reglas parametrizadas, expositores, usuarios y participantes.

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

TS = sa.DateTime(timezone=True)
NOW = sa.text("now()")


def _stamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", TS, server_default=NOW, nullable=False),
        sa.Column("updated_at", TS, server_default=NOW, nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False, unique=True),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("starts_on", sa.Date, nullable=False),
        sa.Column("ends_on", sa.Date, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        *_stamps(),
    )

    op.create_table(
        "stand_size_rules",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer,
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("label", sa.String(40), nullable=False),
        sa.Column("min_m2", sa.Integer, nullable=False),
        sa.Column("max_m2", sa.Integer, nullable=False),
        *_stamps(),
        sa.UniqueConstraint("event_id", "label", name="uq_stand_size_rules_event_label"),
        sa.CheckConstraint("min_m2 >= 0 AND max_m2 >= min_m2", name="ck_stand_size_rules_range"),
    )

    op.create_table(
        "credential_rules",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer,
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("credentials_per_block", sa.Integer, nullable=False),
        sa.Column("block_m2", sa.Integer, nullable=False),
        sa.Column("rounding_mode", sa.String(10), nullable=False, server_default="floor"),
        *_stamps(),
        sa.UniqueConstraint("event_id", "category", name="uq_credential_rules_event_category"),
        sa.CheckConstraint(
            "category IN ('Exhibitor', 'Guest', 'Service')", name="ck_credential_rules_category"
        ),
        sa.CheckConstraint(
            "rounding_mode IN ('floor', 'ceil', 'round')", name="ck_credential_rules_rounding"
        ),
        sa.CheckConstraint(
            "block_m2 > 0 AND credentials_per_block >= 0", name="ck_credential_rules_positive"
        ),
    )

    op.create_table(
        "exhibitors",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer,
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("tax_id", sa.String(20), nullable=False),
        sa.Column("tax_id_type", sa.String(20), nullable=False),
        sa.Column("legal_name", sa.String(200), nullable=False),
        sa.Column("stand_name", sa.String(160), nullable=False),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("requested_m2", sa.Integer, nullable=False),
        sa.Column("deleted_at", TS, nullable=True),
        *_stamps(),
        sa.CheckConstraint(
            "tax_id_type IN ('CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID')",
            name="ck_exhibitors_tax_id_type",
        ),
        sa.CheckConstraint("requested_m2 > 0", name="ck_exhibitors_requested_m2"),
    )
    # Indice unico PARCIAL escrito a mano: el soft delete debe liberar el tax_id.
    # --autogenerate no lo produce fiable, y un indice total romperia el alta tras borrado.
    op.create_index(
        "uq_exhibitors_event_tax_id",
        "exhibitors",
        ["event_id", "tax_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "representatives",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer,
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "exhibitor_id",
            sa.Integer,
            sa.ForeignKey("exhibitors.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("identification", sa.String(20), nullable=False),
        sa.Column("identification_type", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("position", sa.String(80), nullable=False),
        *_stamps(),
        sa.CheckConstraint(
            "identification_type IN ('CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID')",
            name="ck_representatives_id_type",
        ),
    )

    op.create_table(
        "exhibitor_contacts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer,
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "exhibitor_id",
            sa.Integer,
            sa.ForeignKey("exhibitors.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        *_stamps(),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer,
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "exhibitor_id",
            sa.Integer,
            sa.ForeignKey("exhibitors.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        *_stamps(),
        sa.UniqueConstraint("event_id", "email", name="uq_users_event_email"),
        sa.CheckConstraint("role IN ('admin', 'representative')", name="ck_users_role"),
        sa.CheckConstraint(
            "(role = 'admin' AND exhibitor_id IS NULL) OR "
            "(role = 'representative' AND exhibitor_id IS NOT NULL)",
            name="ck_users_role_exhibitor",
        ),
    )

    op.create_table(
        "password_setup_tokens",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", TS, nullable=False),
        sa.Column("used_at", TS, nullable=True),
        *_stamps(),
    )

    op.create_table(
        "participants",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer,
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "exhibitor_id",
            sa.Integer,
            sa.ForeignKey("exhibitors.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("last_name", sa.String(80), nullable=False),
        sa.Column("identification", sa.String(20), nullable=False),
        sa.Column("identification_type", sa.String(20), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("position", sa.String(80), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("provider_company", sa.String(200), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("credential_notified_at", TS, nullable=True),
        *_stamps(),
        # Validacion critica §5.4, por evento y no global (§6.6).
        sa.UniqueConstraint("event_id", "identification", name="uq_participants_event_id_ident"),
        sa.CheckConstraint(
            "category IN ('Exhibitor', 'Guest', 'Service')", name="ck_participants_category"
        ),
        sa.CheckConstraint(
            "identification_type IN ('CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID')",
            name="ck_participants_id_type",
        ),
        sa.CheckConstraint(
            "(category = 'Service') = (provider_company IS NOT NULL)",
            name="ck_participants_provider_company",
        ),
    )


def downgrade() -> None:
    op.drop_table("participants")
    op.drop_table("password_setup_tokens")
    op.drop_table("users")
    op.drop_table("exhibitor_contacts")
    op.drop_table("representatives")
    op.drop_index("uq_exhibitors_event_tax_id", table_name="exhibitors")
    op.drop_table("exhibitors")
    op.drop_table("credential_rules")
    op.drop_table("stand_size_rules")
    op.drop_table("events")
