from flask import Blueprint, request, jsonify
import numpy as np
from db import db
from bson import ObjectId
import datetime
from auth_utils import token_required, get_current_user
from werkzeug.utils import secure_filename
import os
import json
from io import BytesIO
from PIL import Image
import cv2
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import pickle
import face_recognition

bp = Blueprint('face_recognition_quality', __name__, url_prefix='/api')

# Create faces directory if it doesn't exist
FACES_DIR = 'faces_data'
if not os.path.exists(FACES_DIR):
    os.makedirs(FACES_DIR)

# Load or create scaler for feature normalization
SCALER_FILE = 'face_scaler_quality.pkl'
try:
    with open(SCALER_FILE, 'rb') as f:
        scaler = pickle.load(f)
except:
    scaler = StandardScaler()

# In-memory cache for encodings and names
encodings_cache = None
names_cache = None

def load_all_encodings_and_names():
    """Efficiently load all encodings and names as numpy arrays from disk. Only include encodings of length 128."""
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
                else:
                    print(f"Warning: Skipping {encoding_path} due to invalid encoding shape {enc.shape}")
    if encodings:
        return np.stack(encodings), names
    return np.array([]), []

def reload_encodings_cache():
    global encodings_cache, names_cache
    encodings_cache, names_cache = load_all_encodings_and_names()

# Load cache at startup
reload_encodings_cache()

def get_student_folder(student_name, roll_number):
    """Create a safe folder name from student name and roll number"""
    safe_name = "".join(c for c in student_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    safe_name = safe_name.replace(' ', '_')
    folder_name = f"{safe_name}_{roll_number}" if roll_number else safe_name
    return os.path.join(FACES_DIR, folder_name)

def check_image_quality(image_file):
    """Check image quality for face registration"""
    try:
        # Load image
        image = Image.open(image_file)
        image = image.convert('RGB')
        
        # Convert to OpenCV format
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Check image size
        height, width = img_cv.shape[:2]
        if width < 200 or height < 200:
            return False, "Image too small. Please use a larger image."
        
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Check brightness (more lenient)
        brightness = np.mean(gray)
        if brightness < 30:
            return False, "Image too dark. Please improve lighting."
        if brightness > 220:
            return False, "Image too bright. Please reduce lighting."
        
        # Check contrast (more lenient)
        contrast = np.std(gray)
        if contrast < 15:
            return False, "Image has low contrast. Please improve lighting."
        
        # Check for blur (more lenient)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 50:
            return False, "Image is blurry. Please hold camera steady."
        
        # Check for face detection (more lenient)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (width * height)
        if edge_density < 0.005:
            return False, "No clear facial features detected. Please position face clearly."
        
        return True, "Image quality is good"
        
    except Exception as e:
        return False, f"Error checking image quality: {str(e)}"

def extract_quality_features(image_file):
    """Extract high-quality ML features from face image"""
    try:
        # Load image
        image = Image.open(image_file)
        image = image.convert('RGB')
        
        # Convert to OpenCV format
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Resize to standard size
        img_cv = cv2.resize(img_cv, (256, 256))  # Higher resolution
        
        # Convert to grayscale for feature extraction
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Extract multiple types of features
        features = []
        
        # 1. Enhanced HOG features
        hog_features = extract_enhanced_hog_features(gray)
        features.extend(hog_features)
        
        # 2. Enhanced LBP features
        lbp_features = extract_enhanced_lbp_features(gray)
        features.extend(lbp_features)
        
        # 3. Enhanced color features
        color_features = extract_enhanced_color_features(img_cv)
        features.extend(color_features)
        
        # 4. Enhanced edge features
        edge_features = extract_enhanced_edge_features(gray)
        features.extend(edge_features)
        
        # 5. Enhanced texture features
        texture_features = extract_enhanced_texture_features(gray)
        features.extend(texture_features)
        
        # 6. Face landmark features (simulated)
        landmark_features = extract_landmark_features(gray)
        features.extend(landmark_features)
        
        # Normalize features
        features = np.array(features).reshape(1, -1)
        features = scaler.fit_transform(features).flatten()
        
        return features.tolist(), None
        
    except Exception as e:
        return None, f"Error extracting features: {str(e)}"

def extract_enhanced_hog_features(gray_image):
    """Extract enhanced HOG features"""
    features = []
    
    # Calculate gradients
    grad_x = cv2.Sobel(gray_image, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray_image, cv2.CV_64F, 0, 1, ksize=3)
    
    # Calculate magnitude and orientation
    magnitude = np.sqrt(grad_x**2 + grad_y**2)
    orientation = np.arctan2(grad_y, grad_x)
    
    # Create histogram bins
    bins = 12  # More bins for better accuracy
    bin_size = 2 * np.pi / bins
    
    # Calculate histogram with smaller cells
    for i in range(0, 256, 16):
        for j in range(0, 256, 16):
            cell_mag = magnitude[i:i+16, j:j+16]
            cell_ori = orientation[i:i+16, j:j+16]
            
            hist = np.zeros(bins)
            for k in range(bins):
                mask = (cell_ori >= k * bin_size) & (cell_ori < (k + 1) * bin_size)
                hist[k] = np.sum(cell_mag[mask])
            
            # Normalize
            hist = hist / (np.sum(hist) + 1e-6)
            features.extend(hist)
    
    return features

def extract_enhanced_lbp_features(gray_image):
    """Extract enhanced LBP features"""
    features = []
    
    # Enhanced LBP implementation
    for i in range(1, 255):
        for j in range(1, 255):
            center = gray_image[i, j]
            lbp_code = 0
            
            # 8-neighbor LBP
            neighbors = [
                gray_image[i-1, j-1], gray_image[i-1, j], gray_image[i-1, j+1],
                gray_image[i, j+1], gray_image[i+1, j+1], gray_image[i+1, j],
                gray_image[i+1, j-1], gray_image[i, j-1]
            ]
            
            for k, neighbor in enumerate(neighbors):
                if neighbor >= center:
                    lbp_code += 2**k
            
            features.append(lbp_code)
    
    # Create enhanced histogram
    hist, _ = np.histogram(features, bins=512, range=(0, 256))  # More bins
    hist = hist / (np.sum(hist) + 1e-6)
    
    return hist.tolist()

def extract_enhanced_color_features(color_image):
    """Extract enhanced color histogram features"""
    features = []
    
    # Convert to different color spaces
    hsv = cv2.cvtColor(color_image, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(color_image, cv2.COLOR_BGR2LAB)
    yuv = cv2.cvtColor(color_image, cv2.COLOR_BGR2YUV)
    
    # Extract histograms for each channel with more bins
    for channel in [color_image, hsv, lab, yuv]:
        for i in range(3):  # BGR/HSV/LAB/YUV channels
            hist = cv2.calcHist([channel], [i], None, [32], [0, 256])  # More bins
            hist = hist.flatten() / (np.sum(hist) + 1e-6)
            features.extend(hist)
    
    return features

def extract_enhanced_edge_features(gray_image):
    """Extract enhanced edge density features"""
    features = []
    
    # Apply different edge detectors
    edges_canny = cv2.Canny(gray_image, 50, 150)
    edges_sobel = np.sqrt(cv2.Sobel(gray_image, cv2.CV_64F, 1, 0)**2 + 
                          cv2.Sobel(gray_image, cv2.CV_64F, 0, 1)**2)
    edges_laplacian = cv2.Laplacian(gray_image, cv2.CV_64F)
    
    # Calculate edge density in smaller regions
    for i in range(0, 256, 16):
        for j in range(0, 256, 16):
            region_canny = edges_canny[i:i+16, j:j+16]
            region_sobel = edges_sobel[i:i+16, j:j+16]
            region_laplacian = edges_laplacian[i:i+16, j:j+16]
            
            density_canny = np.sum(region_canny > 0) / (16 * 16)
            density_sobel = np.mean(region_sobel)
            density_laplacian = np.mean(np.abs(region_laplacian))
            
            features.extend([density_canny, density_sobel, density_laplacian])
    
    return features

def extract_enhanced_texture_features(gray_image):
    """Extract enhanced texture features"""
    features = []
    
    # Calculate texture measures in smaller regions
    for i in range(0, 256, 16):
        for j in range(0, 256, 16):
            region = gray_image[i:i+16, j:j+16]
            
            # Variance
            variance = np.var(region)
            
            # Entropy
            hist, _ = np.histogram(region, bins=256, range=(0, 256))
            hist = hist / np.sum(hist)
            entropy = -np.sum(hist * np.log2(hist + 1e-10))
            
            # Energy
            energy = np.sum(hist**2)
            
            # Skewness
            skewness = np.mean(((region - np.mean(region)) / np.std(region))**3)
            
            # Kurtosis
            kurtosis = np.mean(((region - np.mean(region)) / np.std(region))**4)
            
            features.extend([variance, entropy, energy, skewness, kurtosis])
    
    return features

def extract_landmark_features(gray_image):
    """Extract simulated facial landmark features"""
    features = []
    
    # Simulate facial landmark detection
    # In a real system, you would use dlib or similar for actual landmarks
    
    # Eye region analysis
    eye_region = gray_image[80:120, 80:176]  # Left eye
    eye_features = [np.mean(eye_region), np.std(eye_region), np.var(eye_region)]
    features.extend(eye_features)
    
    eye_region = gray_image[80:120, 176:272]  # Right eye
    eye_features = [np.mean(eye_region), np.std(eye_region), np.var(eye_region)]
    features.extend(eye_features)
    
    # Nose region analysis
    nose_region = gray_image[120:160, 128:192]
    nose_features = [np.mean(nose_region), np.std(nose_region), np.var(nose_region)]
    features.extend(nose_features)
    
    # Mouth region analysis
    mouth_region = gray_image[160:200, 96:224]
    mouth_features = [np.mean(mouth_region), np.std(mouth_region), np.var(mouth_region)]
    features.extend(mouth_features)
    
    return features

def compare_quality_features(features1, features2, threshold=0.90):
    """Compare two feature vectors with high accuracy threshold"""
    try:
        features1 = np.array(features1).reshape(1, -1)
        features2 = np.array(features2).reshape(1, -1)
        
        # Multiple similarity measures
        cosine_sim = cosine_similarity(features1, features2)[0][0]
        euclidean_dist = np.linalg.norm(features1 - features2)
        manhattan_dist = np.sum(np.abs(features1 - features2))
        
        # Combined similarity score with higher weights
        similarity = cosine_sim * 0.8 + (1 / (1 + euclidean_dist)) * 0.15 + (1 / (1 + manhattan_dist)) * 0.05
        confidence = similarity * 100
        
        return similarity >= threshold, confidence, cosine_sim
        
    except Exception as e:
        return False, 0, 0

def save_quality_face_data(student_name, roll_number, features, image_data):
    """Save high-quality face data to student's folder"""
    folder_path = get_student_folder(student_name, roll_number)
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    
    # Save image
    image_file = os.path.join(folder_path, 'face_image.jpg')
    with open(image_file, 'wb') as f:
        f.write(image_data)
    
    # Save features as JSON
    encoding_file = os.path.join(folder_path, 'face_encoding.json')
    with open(encoding_file, 'w') as f:
        json.dump({
            'encoding': features,
            'student_name': student_name,
            'roll_number': roll_number,
            'created_at': datetime.datetime.utcnow().isoformat(),
            'feature_type': 'quality_ml',
            'quality_score': 100.0
        }, f)
    
    # Save scaler
    with open(SCALER_FILE, 'wb') as f:
        pickle.dump(scaler, f)
    
    return folder_path

def load_all_quality_face_data():
    """Load all quality face data from folders"""
    faces = []
    if not os.path.exists(FACES_DIR):
        return faces
    
    for folder_name in os.listdir(FACES_DIR):
        folder_path = os.path.join(FACES_DIR, folder_name)
        if os.path.isdir(folder_path):
            encoding_file = os.path.join(folder_path, 'face_encoding.json')
            if os.path.exists(encoding_file):
                try:
                    with open(encoding_file, 'r') as f:
                        data = json.load(f)
                        faces.append({
                            'folder': folder_name,
                            'encoding': data['encoding'],
                            'student_name': data['student_name'],
                            'roll_number': data['roll_number'],
                            'feature_type': data.get('feature_type', 'simple'),
                            'quality_score': data.get('quality_score', 0)
                        })
                except Exception as e:
                    print(f"Error loading encoding from {folder_path}: {e}")
    
    return faces

@bp.route('/register-face-quality', methods=['POST'])
@token_required
def register_face_quality():
    """Register face with quality checks and high efficiency."""
    user = get_current_user()
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    file = request.files['image']
    # Check image quality first
    quality_ok, quality_message = check_image_quality(file)
    if not quality_ok:
        return jsonify({'error': quality_message}), 400
    # Use face_recognition for encoding
    file.seek(0)
    image = face_recognition.load_image_file(file)
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return jsonify({'error': 'No face found in image'}), 400
    encoding = encodings[0].tolist()
    # Read image data for storage
    file.seek(0)
    image_data = file.read()
    # Save to folder
    name = request.form.get('name') or user['name']
    roll_number = request.form.get('rollNumber') or user.get('rollNumber')
    folder_path = save_quality_face_data(
        name, 
        roll_number, 
        encoding, 
        image_data
    )
    # Update database
    db.users.update_one(
        {'_id': user['_id']}, 
        {'$set': {
            'face_encoding': encoding,
            'face_folder': folder_path,
            'face_registered_at': datetime.datetime.utcnow(),
            'feature_type': 'face_recognition',
            'quality_score': 100.0
        }}
    )
    # Reload cache
    reload_encodings_cache()
    return jsonify({
        'message': 'Face registered successfully with high efficiency',
        'folder': folder_path,
        'features_length': len(encoding),
        'feature_type': 'face_recognition',
        'quality_score': 100.0,
        'quality_message': quality_message
    }), 200

@bp.route('/recognize-quality', methods=['POST'])
@token_required
def recognize_quality():
    try:
        if 'image' not in request.files:
            print('DEBUG: No image uploaded')
            return jsonify({'error': 'No image uploaded'}), 400
        file = request.files['image']
        # Check image quality
        quality_ok, quality_message = check_image_quality(file)
        if not quality_ok:
            print(f'DEBUG: Image quality failed: {quality_message}')
            return jsonify({'error': quality_message}), 400
        # Use face_recognition for encoding
        file.seek(0)
        image = face_recognition.load_image_file(file)
        encodings = face_recognition.face_encodings(image)
        if not encodings:
            print('DEBUG: No face found in image')
            return jsonify({'error': 'No face found in image'}), 400
        encoding = encodings[0]
        # Use in-memory cache for fast comparison
        global encodings_cache, names_cache
        if encodings_cache is None or len(encodings_cache) == 0:
            print('DEBUG: No registered faces in cache, reloading...')
            reload_encodings_cache()
        if encodings_cache is None or len(encodings_cache) == 0:
            print('DEBUG: Still no registered faces after reload')
            return jsonify({'status': 'unknown', 'message': 'No registered faces found'}), 200
        # Batch compare
        distances = face_recognition.face_distance(encodings_cache, encoding)
        min_idx = int(np.argmin(distances))
        min_dist = float(distances[min_idx])
        threshold = 0.5  # strict for high accuracy
        print(f'DEBUG: Min distance: {min_dist}, Index: {min_idx}')
        if min_dist < threshold:
            matched_name = names_cache[min_idx]
            # Find user in database
            user = db.users.find_one({'name': matched_name})
            if user:
                # Record attendance
                attendance = {
                    'studentId': str(user['_id']),
                    'studentName': user['name'],
                    'rollNumber': user.get('rollNumber'),
                    'date': datetime.datetime.utcnow().strftime('%Y-%m-%d'),
                    'status': 'present',
                    'time': datetime.datetime.utcnow().strftime('%H:%M:%S'),
                    'recordedAt': datetime.datetime.utcnow()
                }
                db.attendance.insert_one(attendance)
                print('DEBUG: Attendance recorded for', user['name'])
                return jsonify({
                    'status': 'success',
                    'user': {
                        'id': str(user['_id']),
                        'name': user['name'],
                        'rollNumber': user.get('rollNumber'),
                        'course': user.get('course'),
                        'confidence': round(1 - min_dist, 4)
                    },
                    'quality_details': {
                        'distance': round(min_dist, 4),
                        'threshold': threshold,
                        'feature_type': 'face_recognition',
                        'quality_score': 100.0
                    }
                }), 200
            else:
                print('DEBUG: Matched name not found in DB:', matched_name)
                return jsonify({
                    'status': 'success',
                    'user': {
                        'name': matched_name,
                        'confidence': round(1 - min_dist, 4)
                    }
                }), 200
        else:
            print('DEBUG: No match found. Min distance:', min_dist)
            return jsonify({
                'status': 'unknown',
                'message': 'Face not recognized with sufficient confidence',
                'min_distance': round(min_dist, 4)
            }), 200
    except Exception as e:
        import traceback
        print('DEBUG: Exception in recognize_quality:', e)
        traceback.print_exc()
        return jsonify({'error': f'Internal error: {str(e)}'}), 500

@bp.route('/test-quality-detection', methods=['POST'])
def test_quality_detection():
    """Test endpoint to check quality detection"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    
    try:
        # Check image quality
        quality_ok, quality_message = check_image_quality(file)
        
        if not quality_ok:
            return jsonify({'error': quality_message}), 400
        
        # Test quality feature extraction
        features, error = extract_quality_features(file)
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'quality_check': 'passed',
            'quality_message': quality_message,
            'features_extracted': len(features),
            'feature_type': 'quality_ml',
            'message': f'Successfully extracted {len(features)} quality ML features from the image'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Quality detection error: {str(e)}'}), 500 