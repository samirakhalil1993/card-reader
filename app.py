import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from models import db, User

app = Flask(__name__)

# Ensure the database is stored in the instance folder
app.config['SQLALCHEMY_DATABASE_URI'] = 'mssql+pyodbc://sqladmin:kpmMg!L!jpf5xDn@admin-panel-server.database.windows.net/admin_panel_db?driver=ODBC+Driver+17+for+SQL+Server'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# ✅ CREATE DATABASE TABLES (Only if they don't exist)
with app.app_context():
    db.create_all()  # This will create tables if they do not exist

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        # Add your authentication logic here
        if username == 'admin' and password == 'password':  # Example check
            return redirect(url_for('admin_interface'))
        else:
            error = "Invalid credentials. Please try again."
    return render_template('index.html', error=error)

@app.route('/admin_interface')
def admin_interface():
    return render_template('admin.html')

@app.route('/add_user', methods=['POST'])
def add_user():
    data = request.get_json()
    new_user = User(name=data['name'], email=data['email'], user_id=data['user_id'], swipe_card=data['swipe_card'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User added successfully"})

@app.route('/remove_user', methods=['POST'])
def remove_user():
    data = request.get_json()
    user = User.query.filter_by(user_id=data['user_id'], email=data['user_email']).first()
    
    if user:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User removed successfully"})
    else:
        return jsonify({"message": "User not found"}), 404
@app.route('/review_users', methods=['GET'])
def review_users():
    users = User.query.all()
    users_list = [user.to_dict() for user in users]
    return jsonify(users_list)
   
if __name__ == '__main__':
    app.run(debug=True)

    