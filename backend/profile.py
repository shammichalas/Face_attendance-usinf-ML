from flask import Blueprint, request, jsonify
from auth_utils import token_required, get_current_user
from db import db
from werkzeug.security import generate_password_hash

bp = Blueprint('profile', __name__, url_prefix='/api')

@bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    user = get_current_user()
    user_data = {
        'id': str(user['_id']),
        'email': user['email'],
        'name': user['name'],
        'role': user.get('role', 'student'),
        'rollNumber': user.get('rollNumber'),
        'course': user.get('course')
    }
    return jsonify(user_data), 200

@bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    user = get_current_user()
    data = request.json
    update = {}
    for field in ['name', 'rollNumber', 'course']:
        if field in data:
            update[field] = data[field]
    if 'password' in data and data['password']:
        update['password'] = generate_password_hash(data['password'])
    if update:
        db.users.update_one({'_id': user['_id']}, {'$set': update})
    return jsonify({'message': 'Profile updated'}), 200 