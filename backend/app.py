import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Security: Only allow your Netlify URL
# Ensure this matches your live URL exactly
CORS(app, resources={r"/*": {"origins": ["https://dhruhidavivah.netlify.app"]}})

# Security: Max file size 10MB to prevent overload
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'heic'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

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

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    if file:
        try:
            # Get the event tag from the dropdown
            event_tag_raw = request.form.get("event", "other")
            # Sanitize the tag
            event_tag = "".join(c for c in event_tag_raw if c.isalnum() or c in ('-'))
            
            # Create dynamic folder path
            folder_name = f"wedding-gallery/{event_tag}"

            # Upload DIRECTLY to Cloudinary
            # We removed the resizing logic here to save Server RAM
            upload_result = cloudinary.uploader.upload(
                file,
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
            max_results=10, 
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
