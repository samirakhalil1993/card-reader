import os
import re
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
from models import db, User, cipher_suite
from sqlalchemy.exc import IntegrityError
from flask_migrate import Migrate
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone  # Ensure timezone is imported correctly
from pytz import timezone as pytz_timezone  # Alias pytz timezone to avoid conflicts
from apscheduler.schedulers.background import BackgroundScheduler
import atexit

# Load environment variables from .env file
load_dotenv()

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

def validate_personnummer(personnummer):
    return re.match(r'^\d{8}[-]?\d{4}$', personnummer) is not None

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
        if not validate_personnummer(data['user_id']):
            return jsonify({"error": "Invalid Personnummer format."}), 400
        if not validate_bth_email(data['email']):
            return jsonify({"error": "Invalid email address."}), 400
        expiration_time = datetime.now(timezone.utc) + timedelta(days=365)
        new_user = User(
            name=data['name'],
            email=data['email'],
            program=data.get('program', 'Unknown'),
            expiration_time=expiration_time
        )
        new_user.user_id = data['user_id']
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User added successfully!", "expiration_time": expiration_time.isoformat()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "User with this email or UserID already exists!"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/archive_user', methods=['POST'])
def archive_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id').strip().replace("-", "")
        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if user:
            user.is_active = False
            cet = pytz_timezone('Europe/Stockholm')  # Use pytz timezone with alias
            user.archived_date = datetime.now(cet)  # Set the archived date in CET
            db.session.commit()
            return jsonify({
                "message": f"User {user.name} archived successfully!",
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
        user_id = data.get('user_id').strip().replace("-", "")
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
    query = User.query
    if name:
        query = query.filter(User.name.ilike(f"%{name}%"))
    if user_id:
        all_users = User.query.all()
        query = [u for u in all_users if u.user_id == user_id]
    if is_active is not None:
        query = query.filter(User.is_active == bool(is_active))
    users = query if isinstance(query, list) else query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/update_user_schedule/<user_id>', methods=['POST'])
def update_user_schedule(user_id):
    try:
        data = request.get_json()
        schedules = data.get('schedules', {})
        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if not user:
            return jsonify({"error": "User not found"}), 404
        user.schedules = schedules
        db.session.commit()
        return jsonify({"message": "Schedule updated successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/update_user', methods=['POST'])
def update_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        all_users = User.query.all()
        user = next((u for u in all_users if u.user_id == user_id), None)
        if not user:
            return jsonify({"error": "User not found"}), 404
        if data.get('email') != user.email and not validate_bth_email(data['email']):
            return jsonify({"error": "Invalid email address."}), 400
        user.name = data.get('name', user.name)
        user.email = data.get('email', user.email)
        user.program = data.get('program', user.program)
        user.schedules = data.get('schedules', user.schedules)
        db.session.commit()
        return jsonify({"message": "User updated successfully", "user": user.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email already exists for another user"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
