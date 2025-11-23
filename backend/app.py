import io
import os
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

load_dotenv()  # Load secret keys

app = Flask(__name__)

# --- SECURITY FIX 1: CORS RESTRICTION ---
# Only allow your specific Netlify URL to talk to this backend
# Replace with your exact Netlify URL
CORS(app, resources={r"/*": {"origins": ["https://dhruhidavivah.netlify.app"]}})

# --- SECURITY FIX 2: MAX FILE SIZE ---
# Reject any file larger than 10 MB immediately
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 

# --- SECURITY FIX 3: ALLOWED EXTENSIONS ---
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'heic'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

@app.route("/")
def home():
    return jsonify({"message": "Secure Photo API is running!"})

@app.route("/upload", methods=["POST"])
def upload_file():
    # Check if file part exists
    if "image" not in request.files:
        return jsonify({"error": "No image part"}), 400

    file = request.files["image"]

    # Check if user selected a file
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Check file extension
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    if file:
        try:
            # 1. Read file to memory
            in_memory_file = io.BytesIO()
            file.save(in_memory_file)
            in_memory_file.seek(0)
            
            # 2. Open with Pillow (This step verifies it's a real image)
            try:
                img = Image.open(in_memory_file)
            except IOError:
                return jsonify({"error": "Invalid image file"}), 400

            # 3. Handle Transparency
            if img.mode in ("RGBA", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, (0, 0), img)
                img = background
            
            # 4. Resize
            img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)

            # 5. Save resized version
            resized_in_memory_file = io.BytesIO()
            img.save(resized_in_memory_file, format='JPEG', quality=90)
            resized_in_memory_file.seek(0)

            # 6. Get Event Tag
            event_tag_raw = request.form.get("event", "other")
            event_tag = "".join(c for c in event_tag_raw if c.isalnum() or c in ('-'))
            folder_name = f"wedding-gallery/{event_tag}"

            # 7. Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                resized_in_memory_file,
                folder=folder_name,
                resource_type="image"
            )
            
            return jsonify({
                "message": "Upload successful", 
                "url": upload_result["secure_url"]
            })
            
        except Exception as e:
            print(f"Error: {str(e)}")
            return jsonify({"error": "Server error during upload"}), 500

@app.route("/photos", methods=["GET"])
def list_photos():
    try:
        next_cursor = request.args.get('next_cursor', None)

        resources = cloudinary.api.resources(
            type="upload",
            prefix="wedding-gallery", 
            max_results=10,            # Load 10 at a time
            next_cursor=next_cursor,
            sort_by=[("created_at", "desc")]
        )
        
        photo_urls = [res["secure_url"] for res in resources["resources"]]
        next_page_cursor = resources.get("next_cursor")
        
        return jsonify({
            "photos": photo_urls,
            "next_cursor": next_page_cursor
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=os.getenv("PORT", 5000))