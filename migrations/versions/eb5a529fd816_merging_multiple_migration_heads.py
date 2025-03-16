"""Merging multiple migration heads

Revision ID: eb5a529fd816
Revises: 53a6414c8e06, e1f9d752b7e8
Create Date: 2025-03-16 03:45:46.917915

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eb5a529fd816'
down_revision = ('53a6414c8e06', 'e1f9d752b7e8')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
