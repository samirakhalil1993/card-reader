"""Add status2 column to User table"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '<migration_id>'
down_revision = '<previous_revision>'
branch_labels = None
depends_on = None

def upgrade():
    # Add the status2 column to the users table
    op.add_column('users', sa.Column('status2', sa.String(length=100), nullable=True, server_default="N/A"))

def downgrade():
    # Remove the status2 column from the users table
    op.drop_column('users', 'status2')
