import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from models import db, User

app = Flask(__name__)

# Ensure the database is stored in the instance folder
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# DELETE & RECREATE DATABASE ON STARTUP 
with app.app_context():
    db_path = os.path.join(app.instance_path, "site.db")  # Get the correct path
    if os.path.exists(db_path):
        os.remove(db_path)  # Delete old database
    db.create_all()  # Recreate database with updated schema


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
    
if __name__ == '__main__':
    app.run(debug=True)