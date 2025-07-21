from flask import Blueprint, request, jsonify
from db import db
from auth_utils import token_required, get_current_user
import datetime

bp = Blueprint('schedule', __name__, url_prefix='/api')

# Admin: Set today's schedule
@bp.route('/schedule', methods=['POST'])
@token_required
def set_schedule():
    user = get_current_user()
    if user.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json
    date = data.get('date') or datetime.datetime.utcnow().strftime('%Y-%m-%d')
    periods = data.get('periods')
    if not periods or not isinstance(periods, list):
        return jsonify({'error': 'Periods required'}), 400
    db.class_schedules.update_one(
        {'date': date},
        {'$set': {'periods': periods}},
        upsert=True
    )
    return jsonify({'message': 'Schedule set', 'date': date, 'periods': periods}), 200

# Student: Get today's schedule
@bp.route('/schedule', methods=['GET'])
@token_required
def get_schedule():
    date = request.args.get('date') or datetime.datetime.utcnow().strftime('%Y-%m-%d')
    sched = db.class_schedules.find_one({'date': date})
    if not sched:
        return jsonify({'date': date, 'periods': []}), 200
    return jsonify({'date': date, 'periods': sched['periods']}), 200 