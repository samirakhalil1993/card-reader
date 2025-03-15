# Import SQLAlchemy for database handling
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.hybrid import hybrid_property
from cryptography.fernet import Fernet
import os

# Initialize a SQLAlchemy database instance
db = SQLAlchemy()

# Load the encryption key from an environment variable
key = os.getenv('ENCRYPTION_KEY')
if not key:
    raise ValueError("No encryption key found in environment variables")
cipher_suite = Fernet(key.encode())

# Define the User model (table: users)
class User(db.Model):
    __tablename__ = "users"  # Explicitly set the table name

    # Primary key: Auto-incremented integer ID
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Name: Required field, max 100 characters
    name = db.Column(db.String(100), nullable=False)

    # Email: Must be unique and not null, max 100 characters
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)

    # Encrypted User ID: Stores encrypted Swedish Personnummer (YYYYMMDD-XXXX), unique and required
    _user_id = db.Column("user_id", db.String(256), unique=True, nullable=False, index=True)

    # Program: Stores the BTH program the user is enrolled in
    program = db.Column(db.String(100), nullable=True)  

    # New column to indicate active status
    is_active = db.Column(db.Boolean, default=True)  

    # Convert the User object into a dictionary for easy JSON serialization
    def to_dict(self):
        """Convert model object to dictionary for JSON responses."""
        return {
            "id": self.id,           # Convert 'id' field
            "name": self.name,       # Convert 'name' field
            "email": self.email,     # Convert 'email' field
            "user_id": self.user_id, # Convert 'user_id' field (Personnummer)
            "program": self.program, # Convert 'program' field
            "is_active": self.is_active  # Include is_active in the dictionary
        }

    @hybrid_property
    def user_id(self):
        """Decrypt the user_id when accessed."""
        return cipher_suite.decrypt(self._user_id.encode()).decode()

    @user_id.setter
    def user_id(self, value):
        """Encrypt the user_id when set."""
        self._user_id = cipher_suite.encrypt(value.encode()).decode()
