from flask import Blueprint, request, jsonify
from db import db
from auth_utils import token_required, get_current_user
import datetime
import face_recognition
import numpy as np
import os
import json
from bson import ObjectId

bp = Blueprint('attendance', __name__, url_prefix='/api')

FACES_DIR = 'faces_data'

def load_all_encodings_and_names():
    encodings = []
    names = []
    if not os.path.exists(FACES_DIR):
        return np.array([]), []
    for folder in os.listdir(FACES_DIR):
        encoding_path = os.path.join(FACES_DIR, folder, 'face_encoding.json')
        if os.path.exists(encoding_path):
            with open(encoding_path, 'r') as f:
                data = json.load(f)
                enc = np.array(data['encoding'])
                if enc.shape == (128,):
                    encodings.append(enc)
                    names.append(data['student_name'])
    if encodings:
        return np.stack(encodings), names
    return np.array([]), []

def to_json_safe(record):
    rec = dict(record)
    for k, v in rec.items():
        if isinstance(v, ObjectId):
            rec[k] = str(v)
    return rec

@bp.route('/attendance/period', methods=['POST'])
@token_required
def mark_period_attendance():
    user = get_current_user()
    period = request.form.get('period')
    if not period:
        return jsonify({'error': 'Period is required'}), 400
    period = int(period)
    # Check if current time is within the period's scheduled time
    today = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    sched = db.class_schedules.find_one({'date': today})
    if not sched or not sched.get('periods'):
        return jsonify({'error': 'No schedule set for today'}), 400
    period_info = next((p for p in sched['periods'] if p['period'] == period), None)
    if not period_info:
        return jsonify({'error': f'Period {period} not found in today\'s schedule'}), 400
    # Parse start and end times
    now = datetime.datetime.utcnow()
    try:
        start_time = datetime.datetime.strptime(f"{today} {period_info['start']}", "%Y-%m-%d %H:%M")
        end_time = datetime.datetime.strptime(f"{today} {period_info['end']}", "%Y-%m-%d %H:%M")
    except Exception as e:
        return jsonify({'error': f'Invalid period time format: {e}'}), 400
    if not (start_time <= now <= end_time):
        return jsonify({'error': f'Attendance for this period can only be marked between {period_info["start"]} and {period_info["end"]} (server UTC time).'}), 400
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    file = request.files['image']
    file.seek(0)
    image = face_recognition.load_image_file(file)
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return jsonify({'error': 'No face found in image'}), 400
    encoding = encodings[0]
    encodings_cache, names_cache = load_all_encodings_and_names()
    if encodings_cache is None or len(encodings_cache) == 0:
        return jsonify({'error': 'No registered faces found'}), 400
    distances = face_recognition.face_distance(encodings_cache, encoding)
    min_idx = int(np.argmin(distances))
    min_dist = float(distances[min_idx])
    threshold = 0.6  # relaxed for easier matching
    if min_dist < threshold:
        matched_name = names_cache[min_idx]
        # Also get roll number from encoding file
        matched_folder = os.listdir(FACES_DIR)[min_idx]
        encoding_path = os.path.join(FACES_DIR, matched_folder, 'face_encoding.json')
        matched_roll = None
        if os.path.exists(encoding_path):
            with open(encoding_path, 'r') as f:
                data = json.load(f)
                matched_roll = data.get('roll_number')
        # Find user in database by name and rollNumber
        query = {'name': matched_name}
        if matched_roll:
            query['rollNumber'] = matched_roll
        matched_user = db.users.find_one(query)
        if not matched_user:
            return jsonify({'error': f'Matched user not found for name: {matched_name}, rollNumber: {matched_roll}'}), 400
        # Check if already marked for this period today
        today = datetime.datetime.utcnow().strftime('%Y-%m-%d')
        already = db.attendance.find_one({
            'studentId': str(matched_user['_id']),
            'date': today,
            'period': int(period)
        })
        if already:
            return jsonify({'message': 'Attendance already marked for this period', 'period': period}), 200
        attendance = {
            'studentId': str(matched_user['_id']),
            'studentName': matched_user['name'],
            'rollNumber': matched_user.get('rollNumber'),
            'date': today,
            'period': int(period),
            'status': 'present',
            'time': datetime.datetime.utcnow().strftime('%H:%M:%S'),
            'recordedAt': datetime.datetime.utcnow()
        }
        db.attendance.insert_one(attendance)
        return jsonify({'message': 'Attendance marked', 'period': period, 'user': matched_user['name']}), 200
    else:
        return jsonify({'error': f'Face not recognized with sufficient confidence. Min distance: {min_dist:.4f} (threshold: {threshold})'}), 400

@bp.route('/attendance/today', methods=['GET'])
@token_required
def get_today_attendance():
    user = get_current_user()
    today = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    records = list(db.attendance.find({'studentId': str(user['_id']), 'date': today}))
    records = [to_json_safe(r) for r in records]
    return jsonify({'attendance': records}), 200

@bp.route('/attendance', methods=['GET'])
@token_required
def get_attendance_for_date():
    user = get_current_user()
    # Only admin can view all attendance
    if user.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    date = request.args.get('date') or datetime.datetime.utcnow().strftime('%Y-%m-%d')
    records = list(db.attendance.find({'date': date}))
    records = [to_json_safe(r) for r in records]
    # Group by studentId
    grouped = {}
    for rec in records:
        sid = rec['studentId']
        if sid not in grouped:
            grouped[sid] = []
        grouped[sid].append(rec)
    return jsonify({'attendance': grouped}), 200 