# Import SQLAlchemy for database handling
from flask_sqlalchemy import SQLAlchemy  

# Initialize a SQLAlchemy database instance
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

    # User ID: Stores Swedish Personnummer (YYYYMMDD-XXXX), unique and required
    user_id = db.Column(db.String(12), unique=True, nullable=False, index=True)  

    # Program: Stores the BTH program the user is enrolled in
    program = db.Column(db.String(100), nullable=True)  # Make non-nullable

    # Convert the User object into a dictionary for easy JSON serialization
    def to_dict(self):  
        """Convert model object to dictionary for JSON responses."""
        return {
            "id": self.id,           # Convert 'id' field
            "name": self.name,       # Convert 'name' field
            "email": self.email,     # Convert 'email' field
            "user_id": self.user_id, # Convert 'user_id' field (Personnummer)
            "program": self.program  # Convert 'program' field
        }
