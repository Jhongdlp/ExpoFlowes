"""Add badge_art to exhibitors.

La imagen que el representante sube para sus credenciales, junto con su encuadre. Va en
JSONB y no en columnas sueltas porque los tres valores no tienen sentido por separado: un
encuadre sin imagen no encuadra nada, y una imagen sin encuadre se muestra centrada.

Revision ID: 0003
Revises: 0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "exhibitors",
        sa.Column("badge_art", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("exhibitors", "badge_art")
