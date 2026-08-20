"""add error_code to assessments

Stores the structured failure code (e.g. GITHUB_RATE_LIMIT, SEMGREP_FAILED,
PIPELINE_ERROR) alongside error_message so the console can render the exact
failure contract after a failed run.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-08-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "assessments",
        sa.Column("error_code", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("assessments", "error_code")