import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/attendance_db')

client = MongoClient(MONGO_URI)
db = client.get_database()  # This will use the database from the URI

# If you want to specify a specific database name:
# db = client['attendance_db'] 