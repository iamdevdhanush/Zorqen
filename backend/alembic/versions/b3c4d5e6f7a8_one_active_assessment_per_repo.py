"""one active assessment per repository (partial unique index)

Guarantees at the database level that a repository can have at most one
PENDING or RUNNING assessment. Concurrent POST /assessments requests for the
same repository therefore cannot create duplicate rows, and the second INSERT
is rejected by this partial unique index — the caller returns the existing
active assessment instead of launching a duplicate worker.

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-08-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Step 1: Reconcile pre-existing duplicates ───────────────────────────
    # If earlier bugs already produced multiple PENDING/RUNNING rows for one
    # repository, keep the newest and cancel the rest so the partial unique
    # index can be created. Cancelled rows are no longer "active" and do not
    # block a fresh run.
    op.execute(text("""
        UPDATE assessments SET status = 'cancelled'
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY repository_id ORDER BY created_at DESC
                ) AS rn
                FROM assessments
                WHERE status IN ('pending', 'running')
            ) sub
            WHERE rn > 1
        )
    """))

    # ── Step 2: Create the partial unique index ─────────────────────────────
    # Status values are stored as lowercase strings ('pending' / 'running').
    op.create_index(
        "ix_assessments_one_active_per_repo",
        "assessments",
        ["repository_id"],
        unique=True,
        postgresql_where=text("status IN ('pending', 'running')"),
        sqlite_where=text("status IN ('pending', 'running')"),
    )


def downgrade() -> None:
    op.drop_index("ix_assessments_one_active_per_repo", table_name="assessments")