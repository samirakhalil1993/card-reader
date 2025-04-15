from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.hybrid import hybrid_property
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv
from datetime import datetime

#  Load environment variables from .env
#load_dotenv()

# Get encryption key
#key = os.getenv('ENCRYPTION_KEY')

#  Ensure the key exists
#if not key:
#    raise ValueError("No encryption key found in environment variables")

#  Create cipher suite
#cipher_suite = Fernet(key.encode())

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
    #_user_id = db.Column("user_id", db.LargeBinary, unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
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

    # Temporary status column with a default value
    temporary_status = db.Column(db.String(50), nullable=False, default="Unknown")  # Default value is "Unknown"

    # Rename column to status2
    status2 = db.Column(db.String(100), nullable=True, default="N/A")  # Default value is "N/A"

    #code_generated_time = db.Column(db.DateTime, nullable=True)
    code_generated_time = db.Column(db.DateTime, nullable=True)

    random_code = db.Column(db.String(20), nullable=True)

    # New column to indicate if the user is a super user
    is_super_user = db.Column(db.Boolean, default=False)  # Default to False

    def calculate_status(self):
        """Calculate the user's temporary status and update status2."""
        if self.is_super_user:
            self.temporary_status = "Super User - Always Active"
            self.status2 = 1  # Super users are always active
            return

        now = datetime.now()
        current_day = now.strftime("%A")  # Get the current day (e.g., "Monday")
        current_time = now.strftime("%H:%M")  # Get the current time (e.g., "14:30")

        # Check if the user has access during the current period
        if self.is_active and self.schedules and current_day in self.schedules:
            for period in self.schedules[current_day]:
                start_time, end_time = period.split(" - ")
                if start_time <= current_time <= end_time:
                    self.temporary_status = "Can Activate Now"
                    self.status2 = 1  # Set status2 to 1 if active and can activate now
                    return

        self.temporary_status = "Can't Activate Now"
        self.status2 = 0  # Set status2 to 0 if inactive or can't activate now

    def save_status(self):
        """Recalculate and save the status2 and temporary_status to the database."""
        self.calculate_status()
        db.session.add(self)
        db.session.commit()

    def update_schedules(self, new_schedules):
        """Update the user's schedules and recalculate the temporary status."""
        self.schedules = new_schedules
        self.save_status()

    def to_dict(self):
        """Convert model object to dictionary for JSON responses."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "user_id": self.user_id,  
            "program": self.program,
            "is_active": self.is_active,
            "expiration_time": self.expiration_time.strftime('%Y-%m-%d') if self.expiration_time else None,
            "schedules": self.schedules or {},  # Ensure schedules is always a dictionary
            "archived_date": self.archived_date.isoformat() if self.archived_date else None,  # Include archived_date
            "code_generated_time": self.code_generated_time.strftime('%Y-%m-%d %H:%M:%S') if self.code_generated_time else None,
            "random_code": self.random_code,
            "is_super_user": self.is_super_user,  # Include super user status
        }

    # @hybrid_property
    # def user_id(self):
    #     """Decrypt the user_id when accessed."""
    #     if self._user_id:  # Ensure _user_id is not None
    #         try:
    #             decrypted_user_id = cipher_suite.decrypt(self._user_id).decode()
    #             return decrypted_user_id
    #         except Exception as e:
    #             return None
    #     return None  # Return None if _user_id is empty

    # @user_id.setter
    # def user_id(self, value):
    #     """Encrypt and store the user_id."""
    #     value = value.strip().replace("-", "")  # Normalize format
    #     encrypted_user_id = cipher_suite.encrypt(value.encode())  # Encrypt as bytes
    #     self._user_id = encrypted_user_id  # Store encrypted data as bytes
