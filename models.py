from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"  # Explicitly setting table name

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(db.String(50), unique=True, nullable=False)
    swipe_card = db.Column(db.String(100), nullable=False)  # Removed unique=True

    def to_dict(self):
        """Convert model object to dictionary for JSON responses."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "user_id": self.user_id,
            "swipe_card": self.swipe_card
        }
