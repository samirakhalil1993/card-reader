import os
import re
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
from models import db, User #, cipher_suite
from sqlalchemy.exc import IntegrityError
from flask_migrate import Migrate
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone  # Ensure timezone is imported correctly
from pytz import timezone as pytz_timezone  # Alias pytz timezone to avoid conflicts
from apscheduler.schedulers.background import BackgroundScheduler
import atexit

# Load environment variables from .env file.
#load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Database
app.config['SQLALCHEMY_DATABASE_URI'] = 'mssql+pyodbc://sqladmin@admin-panel-server:Card.1111@admin-panel-server.database.windows.net/admin_panel_db?driver=ODBC+Driver+17+for+SQL+Server'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Ensure Database Tables Exist
with app.app_context():
    db.create_all()

def validate_user_id(useridnumber):
    # Validate that the useridnumber is exactly 9 or 10 digits
    return re.match(r'^\d{9,10}$', useridnumber) is not None

def validate_bth_email(email):
    return email.endswith('@student.bth.se')

def archive_expired_users():
    try:
        with app.app_context():
            expired_users = User.query.filter(
                User.expiration_time < datetime.now(timezone.utc),
                User.is_active == True
            ).all()
            for user in expired_users:
                user.is_active = False
            db.session.commit()
    except Exception as e:
        print(f"Error archiving expired users: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(func=archive_expired_users, trigger="interval", hours=24)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/update_code_timestamp', methods=['POST'])
def update_code_timestamp():
    data = request.get_json()
    user_id = data.get('user_id')
    random_code = data.get('random_code')
    
    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Use Stockholm timezone (which covers Karlskrona as well)
    sweden_tz = pytz_timezone('Europe/Stockholm')
    sweden_time = datetime.now(sweden_tz)
    
    user.code_generated_time = sweden_time
    user.random_code = random_code
    db.session.commit()
    
    return jsonify({
        "message": "Code generated successfully!",
        "code_generated_time": sweden_time.strftime('%Y-%m-%d %H:%M:%S')
    }), 200

@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == 'admin' and password == 'password':
            return redirect(url_for('admin_interface'))
        else:
            error = "Invalid credentials. Please try again."
    return render_template('index.html', error=error)

@app.route('/admin_interface')
def admin_interface():
    users = User.query.all()
    return render_template('admin.html', users=users)

@app.route('/add_user', methods=['POST'])
def add_user():
    try:
        data = request.get_json()

        # Check if required fields are present
        if 'user_id' not in data or 'email' not in data or 'name' not in data:
            return jsonify({"error": "Missing required fields: 'user_id', 'email', or 'name'"}), 400

        # Validate User ID Number format (9 or 10 digits)
        if not validate_user_id(data['user_id']):
            return jsonify({"error": "Invalid User ID Number format. It must be exactly 9 or 10 digits."}), 400

        # Validate BTH email
        if not validate_bth_email(data['email']):
            return jsonify({"error": "Invalid email address. Only BTH email addresses are allowed."}), 400

        # Check if a user with the same email or user_id already exists
        existing_user = User.query.filter(
            (User.email == data['email']) | (User.user_id == data['user_id'])
        ).first()
        if existing_user:
            return jsonify({"error": "User with this email or UserID already exists!"}), 400

        # Set expiration date to 1 year from now
        expiration_time = datetime.now(timezone.utc) + timedelta(days=365)

        # Create a new User instance
        new_user = User(
            user_id=data['user_id'],
            email=data['email'],
            name=data['name'],
            program=data.get('program', 'Unknown'),
            expiration_time=expiration_time,
            schedules=data.get('schedules', {}),
            is_super_user=data.get('is_super_user', False)  # Default to False
        )
        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "message": "User added successfully!",
            "expiration_time": new_user.expiration_time.isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/archive_user', methods=['POST'])
def archive_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')  # Use the 10-digit user_id as-is

        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if user:
            was_super_user = user.is_super_user  # Check if the user was a super user
            user.is_active = False  # Set is_active to False
            if was_super_user:
                user.is_super_user = False  # Remove super user status
            cet = pytz_timezone('Europe/Stockholm')  # Use pytz timezone with alias
            user.archived_date = datetime.now(cet)  # Set the archived date in CET
            db.session.commit()
            return jsonify({
                "message": f"User {user.name} archived successfully!"
                           f"{' Super user status removed.' if was_super_user else ''}",
                "archived_date": user.archived_date.isoformat()
            }), 200
        else:
            return jsonify({"error": "User not found."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reactivate_user', methods=['POST'])
def reactivate_user():
    try:
        data = request.get_json()
        #user_id = data.get('user_id').strip().replace("-", "")
        user_id = data.get('user_id')  # No need to normalize or decrypt
        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if user:
            if not user.is_active:
                user.expiration_time = datetime.now(timezone.utc) + timedelta(days=365)  # Use datetime.timezone.utc
            user.is_active = True
            db.session.commit()
            return jsonify({
                "message": f"User {user.name} reactivated successfully! Expiration Time: {user.expiration_time.isoformat()}",
            }), 200
        else:
            return jsonify({"error": "User not found."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/review_users', methods=['GET'])
def review_users():
    name = request.args.get('name')
    user_id = request.args.get('user_id')
    is_active = request.args.get('is_active', type=int)
    is_super_user = request.args.get('is_super_user', type=bool)  # New filter for super users
    query = User.query
    if name:
        query = query.filter(User.name.ilike(f"%{name}%"))
    if user_id:
        all_users = User.query.all()
        query = [u for u in all_users if u.user_id == user_id]
    if is_active is not None:
        query = query.filter(User.is_active == bool(is_active))
        if is_active == 1:  # Exclude super users from active users
            query = query.filter(User.is_super_user == False)
    if is_super_user:  # Filter for super users
        query = query.filter(User.is_super_user == True)
    users = query if isinstance(query, list) else query.all()

    # Dynamically calculate and save temporary_status and status2 for each user
    for user in users:
        user.save_status()  # Recalculate and save status2 and temporary_status

    return jsonify([user.to_dict() for user in users])

@app.route('/update_user_schedule/<user_id>', methods=['POST'])
def update_user_schedule(user_id):
    try:
        data = request.get_json()
        new_schedules = data.get('schedules', {})
        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Update schedules and recalculate temporary_status and status2
        user.update_schedules(new_schedules)

        return jsonify({
            "message": "Schedule updated successfully!",
            "temporary_status": user.temporary_status,  # Return the updated temporary status
            "status2": user.status2  # Return the updated status2
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/update_user', methods=['POST'])
def update_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')  # No need to normalize or decrypt
        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if not user:
            return jsonify({"error": "User not found"}), 404
        if data.get('email') != user.email and not validate_bth_email(data['email']):
            return jsonify({"error": "Invalid email address."}), 400

        # Prevent making an archived user a super user
        if not user.is_active and data.get('is_super_user', user.is_super_user):
            return jsonify({"error": "Cannot make an archived user a super user. Reactivate the user first."}), 400

        user.name = data.get('name', user.name)
        user.email = data.get('email', user.email)
        user.program = data.get('program', user.program)
        user.schedules = data.get('schedules', user.schedules)
        user.is_super_user = data.get('is_super_user', user.is_super_user)  # Update super user status

        # Recalculate and save status2 and temporary_status
        user.save_status()

        return jsonify({"message": "User updated successfully", "user": user.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email already exists for another user"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
    #app.run(debug=True, port=5001)
