from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, JWTManager

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db'
app.config['JWT_SECRET_KEY'] = 'supersecretkey'  # Byt ut till något säkrare

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Modell för studenter
class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    card_id = db.Column(db.String(255), unique=True, nullable=False)
    access_level = db.Column(db.Integer, default=1)

# Modell för admin
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    hashed_password = db.Column(db.String(255), nullable=False)

# Route för admin-login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    admin = Admin.query.filter_by(username=data['username']).first()
    if admin and bcrypt.check_password_hash(admin.hashed_password, data['password']):
        access_token = create_access_token(identity=admin.username)
        return jsonify(access_token=access_token)
    return jsonify(message="Fel användarnamn eller lösenord"), 401

# Route för att hämta alla studenter
@app.route('/students', methods=['GET'])
@jwt_required()
def get_students():
    students = Student.query.all()
    return jsonify([{'id': s.id, 'name': s.name, 'card_id': s.card_id, 'access_level': s.access_level} for s in students])

# Route för att lägga till en student
@app.route('/students', methods=['POST'])
@jwt_required()
def add_student():
    data = request.json
    new_student = Student(name=data['name'], card_id=data['card_id'], access_level=data.get('access_level', 1))
    db.session.add(new_student)
    db.session.commit()
    return jsonify(message="Student tillagd"), 201

if __name__ == '__main__':
    app.run(debug=True)
