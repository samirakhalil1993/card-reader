import os
import re
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
from models import db, User, cipher_suite
from sqlalchemy.exc import IntegrityError
from flask_migrate import Migrate
from dotenv import load_dotenv

# Load environment variables from .env file....
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS to allow cross-origin requests

# Configure Database
app.config['SQLALCHEMY_DATABASE_URI'] = 'mssql+pyodbc://sqladmin@admin-panel-server:Card.1111@admin-panel-server.database.windows.net/admin_panel_db?driver=ODBC+Driver+17+for+SQL+Server'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Ensure Database Tables Exist
with app.app_context():
    db.create_all()

# Function to validate Swedish Personnummer
def validate_personnummer(personnummer):
    """Ensure Personnummer is in YYYYMMDDXXXX or YYYYMMDD-XXXX format."""
    return re.match(r'^\d{8}[-]?\d{4}$', personnummer) is not None

# Function to validate BTH email
def validate_bth_email(email):
    """Ensure email is a BTH email address."""
    return email.endswith('@student.bth.se')

# Render Home Page
@app.route('/')
def index():
    return render_template('index.html')

# Admin Login Route
@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == 'admin' and password == 'password':  # Replace with actual authentication logic
            return redirect(url_for('admin_interface'))
        else:
            error = "Invalid credentials. Please try again."
    return render_template('index.html', error=error)

# Admin Interface - Shows All Users
@app.route('/admin_interface')
def admin_interface():
    users = User.query.all()  # Fetch all users from the database
    return render_template('admin.html', users=users)

# API: Add User
@app.route('/add_user', methods=['POST'])
def add_user():
    try:
        # Get user data from the request
        data = request.get_json()

        # Validate Personnummer format
        if not validate_personnummer(data['user_id']):
            return jsonify({"error": "Invalid Personnummer format. Use YYYYMMDDXXXX or YYYYMMDD-XXXX."}), 400

        # Validate BTH email
        if not validate_bth_email(data['email']):
            return jsonify({"error": "Invalid email address. Only BTH email addresses are allowed."}), 400

        # Set default program if not provided
        program = data.get('program', 'Unknown')

        # Create a new user
        new_user = User(
            name=data['name'],
            email=data['email'],
            program=program   # Store the BTH program
        )
        new_user.user_id = data['user_id']  # Set the user_id using the hybrid property

        # Add and commit to the database
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "User added successfully!"}), 201  # 201 = Created

    except IntegrityError:
        db.session.rollback()  # Rollback if there is a duplicate entry
        return jsonify({"error": "User with this email or UserID already exists!"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500  # Always return a valid JSON response

# API: Remove User
@app.route('/remove_user', methods=['POST'])
def remove_user():
    try:
        data = request.get_json()
        user_id = data['user_id']

        # Encrypt the user_id to match the stored encrypted_user_id
        encrypted_user_id = cipher_suite.encrypt(user_id.encode()).decode()

        # Find the user by encrypted_user_id
        user = User.query.filter_by(_user_id=encrypted_user_id).first()

        if user:
            db.session.delete(user)
            db.session.commit()
            return jsonify({"message": f"User {user.name} ({user.user_id}) removed successfully!"}), 200
        else:
            return jsonify({"error": "User not found. It may have already been deleted."}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API: Search User by Name
@app.route('/review_users', methods=['GET'])
def review_users():
    name = request.args.get('name')
    is_active = request.args.get('is_active', type=int)  # Get the 'is_active' query parameter

    query = User.query
    if name:
        query = query.filter(User.name.ilike(f"%{name}%"))
    if is_active is not None:
        query = query.filter_by(is_active=bool(is_active))

    users = query.all()
    users_list = [{"name": user.name, "email": user.email, "user_id": user.user_id, "program": user.program, "is_active": user.is_active} for user in users]
    return jsonify(users_list)

# Add this new route after your existing routes
@app.route('/update_user', methods=['POST'])
def update_user():
    try:
        # Get user data from request
        data = request.get_json()
        user_id = data.get('user_id')
        
        # Find the user
        user = User.query.filter_by(user_id=user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Validate BTH email if email is being changed
        if data.get('email') != user.email and not validate_bth_email(data['email']):
            return jsonify({"error": "Invalid email address. Only BTH email addresses are allowed."}), 400
            
        # Update user information
        user.name = data.get('name', user.name)
        user.email = data.get('email', user.email)
        user.program = data.get('program', user.program)
        
        # Commit changes to database
        db.session.commit()
        
        return jsonify({
            "message": "User updated successfully",
            "user": {
                "name": user.name,
                "email": user.email,
                "user_id": user.user_id,
                "program": user.program
            }
        }), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email already exists for another user"}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Add this new route after your existing routes
@app.route('/archive_user', methods=['POST'])
def archive_user():
    try:
        data = request.get_json()
        user = User.query.filter_by(user_id=data['user_id'], email=data['user_email']).first()

        if user:
            user.is_active = False
            db.session.commit()
            return jsonify({"message": f"User {user.name} ({user.user_id}) archived successfully!"}), 200
        else:
            return jsonify({"error": "User not found. It may have already been archived."}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/archived_users', methods=['GET'])
def archived_users():
    users = User.query.filter_by(is_active=False).all()
    users_list = [{"name": user.name, "email": user.email, "user_id": user.user_id, "program": user.program} for user in users]
    return jsonify(users_list)

@app.route('/reactivate_user', methods=['POST'])
def reactivate_user():
    try:
        data = request.get_json()
        user = User.query.filter_by(user_id=data['user_id'], email=data['user_email']).first()

        if user:
            user.is_active = True
            db.session.commit()
            return jsonify({"message": f"User {user.name} ({user.user_id}) reactivated successfully!"}), 200
        else:
            return jsonify({"error": "User not found. It may have already been reactivated."}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run Flask App
if __name__ == '__main__':
    app.run(debug=True)
