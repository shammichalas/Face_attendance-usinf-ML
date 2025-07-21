from functools import wraps
from flask import request, jsonify, g
import jwt
import os
from db import db
from bson import ObjectId

SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        print('DEBUG: Headers:', dict(request.headers))
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            print('DEBUG: Authorization header:', auth_header)
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        if not token:
            print('DEBUG: Token is missing!')
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            print('DEBUG: Decoded JWT:', data)
            user = db.users.find_one({'_id': ObjectId(data['user_id'])})
            if not user:
                print('DEBUG: User not found for user_id:', data['user_id'])
                return jsonify({'error': 'User not found!'}), 401
            g.current_user = user
        except Exception as e:
            print('DEBUG: Token is invalid! Exception:', e)
            return jsonify({'error': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated

def get_current_user():
    return g.get('current_user') 