import os
import re
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
from models import db, User, UserLogins
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
    usernames = 'admin'
    passwords = 'password'
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == usernames and password == passwords:
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
        expiration_time = (datetime.now(timezone.utc) + timedelta(days=365)).date()

        # Create a new User instance
        new_user = User(
            user_id=data['user_id'],
            email=data['email'],
            name=data['name'],
            program=data.get('program', 'Unknown'),
            expiration_time=expiration_time,
            schedules=data.get('schedules', {}),
            is_super_user=data.get('is_super_user', False),  # Default to False
            temporary_status="Active"  # Set a default value for temporary_status
        )
        
        # Add the new user to the session
        db.session.add(new_user)
        
        # Commit to get the ID assigned
        db.session.commit()
        
        # Calculate and save the status
        new_user.calculate_status()
        db.session.commit()

        return jsonify({
            "message": "User added successfully!",
            "expiration_time": new_user.expiration_time.isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/add_admin', methods=['POST'])
def add_admin():
    try:
        data = request.get_json()

        # Check if required fields are present
        if 'user_id' not in data or 'email' not in data or 'name' not in data:
            return jsonify({"error": "Missing required fields: 'user_id', 'email', or 'name'"}), 400

        # Validate User ID Number format (9 or 10 digits)
        if not validate_user_id(data['user_id']):
            return jsonify({"error": "Invalid User ID Number format. It must be exactly 9 or 10 digits."}), 400

        # For admin users, we don't validate the email format
        
        # First, check if there's an existing admin
        existing_admin = User.query.filter_by(is_admin=True).first()
        
        # If we found an existing admin
        if existing_admin:
            # If this is updating the same admin (same user_id), just update their details
            if existing_admin.user_id == data['user_id']:
                existing_admin.name = data['name']
                existing_admin.email = data['email']
                db.session.commit()
                return jsonify({
                    "message": "Admin information updated successfully!"
                }), 200
            else:
                # Delete the existing admin from the database
                deleted_name = existing_admin.name  # Store name for confirmation message
                db.session.delete(existing_admin)
                db.session.commit()
        
        # Check if a user with this user_id already exists
        existing_user = User.query.filter_by(user_id=data['user_id']).first()
        
        if existing_user:
            # Update the existing user to be an admin
            existing_user.name = data['name']
            existing_user.email = data['email']
            existing_user.is_admin = True
            existing_user.is_super_user = True
            existing_user.is_active = True
            existing_user.temporary_status = "Super User - Always Active"  # Set a non-null value here
            existing_user.status2 = 1  # Set status2 to 1 for superusers
            
            # Set expiration date to 10 years from now (admins don't expire)
            existing_user.expiration_time = (datetime.now(timezone.utc) + timedelta(days=3650)).date()
            
            db.session.commit()
            
            msg = "User updated to admin status successfully!"
            if 'deleted_name' in locals():
                msg = f"Previous admin '{deleted_name}' was removed. {msg}"
                
            return jsonify({
                "message": msg
            }), 200
        else:
            # Create a new user with admin privileges
            new_admin = User(
                user_id=data['user_id'],
                email=data['email'],
                name=data['name'],
                program="Administrator",  # Set a default program for admins
                expiration_time=(datetime.now(timezone.utc) + timedelta(days=3650)).date(),  # 10 years from now
                schedules={},
                temporary_status="Super User - Always Active",  # Set a non-null value here
                status2=1,  # Set status2 to 1 for superusers
                is_admin=True,
                is_super_user=True  # Admins are always super users
            )
            db.session.add(new_admin)
            db.session.commit()
            
            msg = "Admin added successfully!"
            if 'deleted_name' in locals():
                msg = f"Previous admin '{deleted_name}' was removed. {msg}"
                
            return jsonify({
                "message": msg
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
            user.status2 = 0  # Set status2 to 0
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
        user_id = data.get('user_id')  # No need to normalize or decrypt
        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if user:
            if not user.is_active:
                user.expiration_time = (datetime.now(timezone.utc) + timedelta(days=365)).date()
            user.is_active = True
            
            # Calculate status based on current time and schedule
            user.calculate_status()
            
            db.session.commit()
            return jsonify({
                "message": f"User {user.name} reactivated successfully! Expiration Time: {user.expiration_time.isoformat()}",
                "status2": user.status2,
                "temporary_status": user.temporary_status
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
    is_super_user = request.args.get('is_super_user', type=bool)
    is_admin = request.args.get('is_admin', type=bool)

    query = User.query

    if name:
        query = query.filter(User.name.ilike(f"%{name}%"))
    if user_id:
        query = query.filter(User.user_id == user_id)
    if is_active is not None:
        query = query.filter(User.is_active == bool(is_active))
    if is_super_user:
        query = query.filter(User.is_super_user == True)
    if is_admin:
        query = query.filter(User.is_admin == True)

    users = query.all()

    # Automatically assign all periods to superusers
    all_periods = ["08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00"]
    all_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for user in users:
        if user.is_super_user:
            user.schedules = {day: all_periods for day in all_days}

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

@app.route('/UserLogins', methods=['GET'])
def get_user_logins():
    page = request.args.get('page', 1, type=int)  # Get the current page, default to 1
    per_page = request.args.get('per_page', 10, type=int)  # Get the number of items per page, default to 10
    search_query = request.args.get('search', '').strip()  # Get the search query, default to an empty string

    logs_query = db.session.query(
        UserLogins.id,
        UserLogins.user_id,
        UserLogins.name,
        UserLogins.timestamp,
        UserLogins.status,
        UserLogins.method,
        UserLogins.message,
    ).outerjoin(User, UserLogins.user_id == User.user_id)

    # Apply search filter if a search query is provided
    if search_query:
        logs_query = logs_query.filter(
            UserLogins.user_id.ilike(f"%{search_query}%") |  # Search by user ID
            UserLogins.name.ilike(f"%{search_query}%") |    # Search by name
            UserLogins.message.ilike(f"%{search_query}%")   # Search by message
        )

    # Apply pagination
    paginated_logs = logs_query.order_by(UserLogins.timestamp.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "name": log.name if log.name else "Unknown",  # Default to "Unknown" if no match
                "timestamp": log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else "N/A",
                "status": log.status,
                "method": log.method,
                "message": log.message
            }
            for log in paginated_logs.items
        ],
        "total": paginated_logs.total,  # Total number of logs
        "pages": paginated_logs.pages,  # Total number of pages
        "current_page": paginated_logs.page,  # Current page
        "per_page": paginated_logs.per_page  # Items per page
    })

if __name__ == '__main__':
    app.run(debug=True)
    #app.run(debug=True, port=5001)