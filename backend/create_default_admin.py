import os
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
import datetime

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/attendance_db')
client = MongoClient(MONGO_URI)
db = client.get_database()

ADMIN_EMAIL = 'admin@francisxavier.ac.in'
DEFAULT_PASSWORD = 'admin123'

hashed = generate_password_hash(DEFAULT_PASSWORD)
user = {
    'name': 'Admin',
    'email': ADMIN_EMAIL,
    'password': hashed,
    'role': 'admin',
    'course': 'Admin',
    'rollNumber': 'ADMIN001',
    'createdAt': datetime.datetime.utcnow()
}
db.users.update_one({'email': ADMIN_EMAIL}, {'$set': user}, upsert=True)
print('Default admin user set:')
print(f"Email: {ADMIN_EMAIL}\nPassword: {DEFAULT_PASSWORD}") 