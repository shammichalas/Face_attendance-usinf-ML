from flask import Blueprint, request, jsonify
from db import db
from bson import ObjectId
import datetime
from auth_utils import token_required, get_current_user

bp = Blueprint('students', __name__, url_prefix='/api')

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

@bp.route('/students', methods=['GET'])
@token_required
@admin_required
def get_students():
    students = list(db.users.find({'role': 'student'}))
    for s in students:
        s['id'] = str(s['_id'])
        del s['_id']
        del s['password']
    return jsonify(students), 200

@bp.route('/students', methods=['POST'])
@token_required
@admin_required
def add_student():
    data = request.json
    required = ['email', 'name', 'rollNumber', 'course']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields'}), 400
    if db.users.find_one({'email': data['email']}):
        return jsonify({'error': 'Email already exists'}), 409
    student = {
        'email': data['email'],
        'name': data['name'],
        'rollNumber': data['rollNumber'],
        'course': data['course'],
        'role': 'student',
        'createdAt': datetime.datetime.utcnow()
    }
    db.users.insert_one(student)
    return jsonify({'message': 'Student added'}), 201

@bp.route('/students/<id>', methods=['GET'])
@token_required
@admin_required
def get_student(id):
    student = db.users.find_one({'_id': ObjectId(id), 'role': 'student'})
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    student['id'] = str(student['_id'])
    del student['_id']
    del student['password']
    return jsonify(student), 200

@bp.route('/students/<id>', methods=['PUT'])
@token_required
@admin_required
def update_student(id):
    data = request.json
    update = {k: v for k, v in data.items() if k in ['name', 'rollNumber', 'course', 'email']}
    if update:
        db.users.update_one({'_id': ObjectId(id), 'role': 'student'}, {'$set': update})
    return jsonify({'message': 'Student updated'}), 200

@bp.route('/students/<id>', methods=['DELETE'])
@token_required
@admin_required
def delete_student(id):
    db.users.delete_one({'_id': ObjectId(id), 'role': 'student'})
    return jsonify({'message': 'Student deleted'}), 200 