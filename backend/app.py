import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

load_dotenv()  # Load secret keys from .env file

app = Flask(__name__)
CORS(app)  # Allow your Netlify frontend

# Configure Cloudinary using your secret keys
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# We no longer need the UPLOAD_FOLDER
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def home():
    return jsonify({"message": "Photo upload API running!"})

@app.route("/upload", methods=["POST"])
def upload_file():
    if "image" not in request.files:
        return jsonify({"error": "No image part"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if file:
        try:
            # Upload the file directly to Cloudinary
            # It will be stored in a folder named 'wedding-gallery'
            upload_result = cloudinary.uploader.upload(
                file,
                folder="wedding-gallery"
            )
            
            # Send back the new secure URL
            return jsonify({
                "message": "Upload successful", 
                "url": upload_result["secure_url"]
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/photos", methods=["GET"])
def list_photos():
    try:
        # Ask Cloudinary for all images with the "wedding-gallery" tag
        # (Cloudinary automatically adds a tag based on the folder name)
        resources = cloudinary.api.resources(
            type="upload",
            prefix="wedding-gallery",  # Get only files from our folder
            max_results=100            # Get up to 100 images
        )
        
        # Extract the secure URLs from the response
        photo_urls = [res["secure_url"] for res in resources["resources"]]
        photo_urls.reverse() # Show newest first
        
        return jsonify(photo_urls)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# We no longer need this route because Cloudinary hosts the images
# @app.route("/uploads/<filename>")
# def get_photo(filename):
#     return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=os.getenv("PORT", 5000))