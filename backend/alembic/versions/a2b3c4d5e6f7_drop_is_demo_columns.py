"""drop is_demo columns

The initial schema created `is_demo` on users/repositories/assessments as
NOT NULL with no server default, but the application models never had that
column and no code path writes it. A database built via `alembic upgrade`
therefore rejects every INSERT on those tables. The column is dead — drop it.

Revision ID: a2b3c4d5e6f7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('assessments', 'is_demo')
    op.drop_column('repositories', 'is_demo')
    op.drop_column('users', 'is_demo')


def downgrade() -> None:
    import sqlalchemy as sa
    op.add_column('users', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('repositories', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('assessments', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column('users', 'is_demo', server_default=None)
    op.alter_column('repositories', 'is_demo', server_default=None)
    op.alter_column('assessments', 'is_demo', server_default=None)
