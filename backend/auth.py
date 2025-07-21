from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import db
import os
import jwt
import datetime

bp = Blueprint('auth', __name__, url_prefix='/api')

SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret')

@bp.route('/create-admin', methods=['POST'])
def create_admin():
    # Check if admin already exists
    if db.users.find_one({'email': 'admin@francisxavier.ac.in'}):
        return jsonify({'error': 'Admin already exists'}), 409
    
    # Create admin user
    hashed_pw = generate_password_hash('admin123')
    admin = {
        'email': 'admin@francisxavier.ac.in',
        'password': hashed_pw,
        'name': 'Admin User',
        'role': 'admin',
        'createdAt': datetime.datetime.utcnow()
    }
    db.users.insert_one(admin)
    return jsonify({'message': 'Admin created successfully', 'credentials': {
        'email': 'admin@francisxavier.ac.in',
        'password': 'admin123'
    }}), 201

@bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    roll_number = data.get('rollNumber')
    course = data.get('course')

    if not email or not password or not name:
        return jsonify({'error': 'Missing required fields'}), 400

    if db.users.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 409

    hashed_pw = generate_password_hash(password)
    user = {
        'email': email,
        'password': hashed_pw,
        'name': name,
        'rollNumber': roll_number,
        'course': course,
        'role': 'student',
        'createdAt': datetime.datetime.utcnow()
    }
    db.users.insert_one(user)
    return jsonify({'message': 'User registered successfully'}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = db.users.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = jwt.encode({
        'user_id': str(user['_id']),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm='HS256')
    return jsonify({'token': token, 'user': {
        'id': str(user['_id']),
        'email': user['email'],
        'name': user['name'],
        'role': user.get('role', 'student'),
        'rollNumber': user.get('rollNumber'),
        'course': user.get('course')
    }}), 200 