from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.hybrid import hybrid_property
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

#  Load environment variables from .env
load_dotenv()

# Get encryption key
key = os.getenv('ENCRYPTION_KEY')

#  Ensure the key exists
if not key:
    raise ValueError("No encryption key found in environment variables")

#  Create cipher suite
cipher_suite = Fernet(key.encode())

#  Initialize a SQLAlchemy database instance
db = SQLAlchemy()

# Define the User model (table: users)
class User(db.Model):
    __tablename__ = "users"  # Explicitly set the table name

    # Primary key: Auto-incremented integer ID
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Name: Required field, max 100 characters
    name = db.Column(db.String(100), nullable=False)

    # Email: Must be unique and not null, max 100 characters
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)

    #  FIX: Use LargeBinary for encrypted data storage
    _user_id = db.Column("user_id", db.LargeBinary, unique=True, nullable=False, index=True)

    # Program: Stores the BTH program the user is enrolled in
    program = db.Column(db.String(100), nullable=True)

    # New column to indicate active status
    is_active = db.Column(db.Boolean, default=True)

    # Ensure expiration_time is defined as DateTime
    expiration_time = db.Column(db.DateTime, nullable=True)  # Use db.DateTime for date and time storage

    # Add a JSON column to store schedules
    schedules = db.Column(db.JSON, nullable=True, default=dict)  # Default to an empty dictionary

    # New column to store the date when the user was archived
    archived_date = db.Column(db.DateTime, nullable=True)
    # Convert the User object into a dictionary for easy JSON serialization
    def to_dict(self):
        """Convert model object to dictionary for JSON responses."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "user_id": self.user_id,  # Decrypted before returning
            "program": self.program,
            "is_active": self.is_active,
            "expiration_time": self.expiration_time.isoformat() if self.expiration_time else None,  # Ensure ISO format
            "schedules": self.schedules or {},  # Ensure schedules is always a dictionary
            "archived_date": self.archived_date.isoformat() if self.archived_date else None,  # Include archived_date
        }

    @hybrid_property
    def user_id(self):
        """Decrypt the user_id when accessed."""
        if self._user_id:  # Ensure _user_id is not None
            try:
                decrypted_user_id = cipher_suite.decrypt(self._user_id).decode()
                return decrypted_user_id
            except Exception as e:
                return None
        return None  # Return None if _user_id is empty

    @user_id.setter
    def user_id(self, value):
        """Encrypt and store the user_id."""
        value = value.strip().replace("-", "")  # Normalize format
        encrypted_user_id = cipher_suite.encrypt(value.encode())  # Encrypt as bytes
        self._user_id = encrypted_user_id  # Store encrypted data as bytes
