from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
from tensorflow.keras.models import load_model
import os
from PIL import Image
from io import BytesIO

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


@app.route('/')
def home():
    return "✅ Flask Server is Running. Model is Loaded."


base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, "public", "models", "B1tryL19CNN1.keras")
model = load_model(model_path)
haar_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

label_map = {
    0: "Dominguezz",
    1: "Johan",
    2: "Rayleen",
    3: "Rhys",

}

@app.route('/verify-face', methods=['POST'])
def verify_face():
    try:
        data = request.get_json()
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        image_data = data['image'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        image_np = np.array(image)

        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)

        faces = haar_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

        if len(faces) == 0:
            return jsonify({'verified': False, 'message': 'No face detected'})

        (x, y, w, h) = faces[0]
        face_img = gray[y:y+h, x:x+w]

        face_img = cv2.resize(face_img, (100, 100))
        face_img = face_img.astype('float32') / 255.0
        face_img = np.expand_dims(face_img, axis=-1) 
        face_img = np.expand_dims(face_img, axis=0)  

        preds = model.predict(face_img)
        pred_idx = np.argmax(preds)
        confidence = preds[0][pred_idx]

        if confidence > 0.7:  
            name = label_map.get(pred_idx, "Unknown")
            return jsonify({'verified': True, 'name': name, 'confidence': float(confidence)})
        else:
            return jsonify({'verified': False, 'message': 'Face not recognized'})

    except Exception as e:
        print("🔥 ERROR in /verify-face:", str(e))
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)