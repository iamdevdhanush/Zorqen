"""assessment run_number unique constraint

Revision ID: a1b2c3d4e5f6
Revises: 595dd11e90f8
Create Date: 2026-08-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '595dd11e90f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Step 1: Deduplicate run_number values ──────────────────────────────
    # When multiple assessments share the same run_number, keep only the
    # most recent (highest created_at) and delete the rest.  This is safe
    # because the resolver already uses ORDER BY created_at DESC LIMIT 1.
    conn = op.get_bind()
    conn.execute(sa.text("""
        DELETE FROM assessments
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY run_number ORDER BY created_at DESC
                ) AS rn
                FROM assessments
            ) sub
            WHERE rn = 1
        )
        AND run_number IN (
            SELECT run_number FROM assessments
            GROUP BY run_number HAVING COUNT(*) > 1
        )
    """))

    # ── Step 2: Drop the non-unique index ─────────────────────────────────
    dialect = conn.dialect.name
    if dialect == "sqlite":
        op.drop_index("ix_assessments_run_number", table_name="assessments")
    else:
        op.drop_index("ix_assessments_run_number", table_name="assessments")

    # ── Step 3: Create unique index on run_number ─────────────────────────
    op.create_index(
        "ix_assessments_run_number_unique",
        "assessments",
        ["run_number"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_assessments_run_number_unique", table_name="assessments")
    op.create_index("ix_assessments_run_number", "assessments", ["run_number"], unique=False)
