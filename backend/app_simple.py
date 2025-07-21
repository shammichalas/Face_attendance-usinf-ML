from flask import Flask, jsonify
from flask_cors import CORS
from auth import bp as auth_bp
from face_recognition_quality import bp as face_bp
from students import bp as students_bp
from attendance import bp as attendance_bp
from analytics import bp as analytics_bp
from profile import bp as profile_bp
from schedule import bp as schedule_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_bp)
app.register_blueprint(face_bp)
app.register_blueprint(students_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(schedule_bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 