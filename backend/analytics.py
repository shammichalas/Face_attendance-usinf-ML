from flask import Blueprint, jsonify

bp = Blueprint('analytics', __name__, url_prefix='/api')

@bp.route('/analytics', methods=['GET'])
def get_analytics():
    # TODO: Replace with real DB queries
    stats = {
        'totalStudents': 100,
        'presentToday': 80,
        'attendanceRate': '91%',
        'activeClasses': 5,
        'recognitionAccuracy': '98%'
    }
    return jsonify(stats), 200 