import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
from models import db, User

app = Flask(__name__)
CORS(app)  # Enable CORS to allow cross-origin requests

# Configure Database
#app.config['SQLALCHEMY_DATABASE_URI'] = 'mssql+pyodbc://sqladmin:kpmMg!L!jpf5xDn@admin-panel-server.database.windows.net/admin_panel_db?driver=ODBC+Driver+17+for+SQL+Server'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mssql+pyodbc://sqladmin@admin-panel-server:kpmMg!L!jpf5xDn@admin-panel-server.database.windows.net/admin_panel_db?driver=ODBC+Driver+17+for+SQL+Server'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# ✅ Ensure Database Tables Exist
with app.app_context():
    db.create_all()

# ✅ Render Home Page
@app.route('/')
def index():
    return render_template('index.html')

# ✅ Admin Login Route
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

# ✅ Admin Interface - Shows All Users
@app.route('/admin_interface')
def admin_interface():
    users = User.query.all()  # Fetch all users from the database
    return render_template('admin.html', users=users)

# ✅ API: Add User
@app.route('/add_user', methods=['POST'])
def add_user():
    try:
        data = request.get_json()
        new_user = User(name=data['name'], email=data['email'], user_id=data['user_id'], swipe_card=data['swipe_card'])
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User added successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ API: Remove User
@app.route('/remove_user', methods=['POST'])
def remove_user():
    try:
        data = request.get_json()
        user = User.query.filter_by(user_id=data['user_id'], email=data['user_email']).first()
        if user:
            db.session.delete(user)
            db.session.commit()
            return jsonify({"message": "User removed successfully"})
        else:
            return jsonify({"message": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ✅ API: Search User by Name
# Existing imports and setup remain unchanged
@app.route('/review_users', methods=['GET'])
def review_users():
    name = request.args.get('name')  # Get the 'name' query parameter
    if name:
        # Filter users whose name contains the search term (case-insensitive)
        users = User.query.filter(User.name.ilike(f"%{name}%")).all()
    else:
        # If no name is provided, return all users
        users = User.query.all()
    users_list = [user.to_dict() for user in users]
    return jsonify(users_list)
# ✅ Run Flask App
if __name__ == '__main__':
    app.run(debug=True)
