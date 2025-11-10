import io
from PIL import Image
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
            # --- START OF RESIZE CHANGES ---

            # 1. Read the uploaded file into an in-memory buffer
            in_memory_file = io.BytesIO()
            file.save(in_memory_file)
            in_memory_file.seek(0)

            # 2. Open the image using Pillow
            img = Image.open(in_memory_file)

            # 3. Handle images with transparency (like PNGs)
            if img.mode in ("RGBA", "LA"):
                # Create a white background
                background = Image.new("RGB", img.size, (255, 255, 255))
                # Paste the image onto the background, using its alpha channel as a mask
                background.paste(img, (0, 0), img)
                img = background

            # 4. Resize the image.
            # .thumbnail() keeps the aspect ratio.
            # We set a max width/height of 1920px.
            img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)

            # 5. Create a *new* in-memory buffer to save the resized image
            resized_in_memory_file = io.BytesIO()

            # 6. Save the resized image to the buffer as a high-quality JPEG
            img.save(resized_in_memory_file, format='JPEG', quality=90)
            resized_in_memory_file.seek(0)

            # --- END OF RESIZE CHANGES ---

            # Get the event tag from the form data
            event_tag_raw = request.form.get("event", "other")
            event_tag = "".join(c for c in event_tag_raw if c.isalnum() or c in ('-'))
            folder_name = f"wedding-gallery/{event_tag}"

            # 7. Upload the RESIZED file (from memory) to Cloudinary
            upload_result = cloudinary.uploader.upload(
                resized_in_memory_file,  # <-- We are uploading the resized file now
                folder=folder_name,
                resource_type="image"
            )

            return jsonify({
                "message": "Upload successful", 
                "url": upload_result["secure_url"]
            })

        except Exception as e:
            # Log the error to Render so you can see what went wrong
            print(f"Error during upload: {str(e)}")
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/photos", methods=["GET"])
def list_photos():
    try:
        # Get the 'next_cursor' from the query (e.g., /photos?next_cursor=abcde)
        # This tells Cloudinary which 'page' of results to get
        next_cursor = request.args.get('next_cursor', None)

        resources = cloudinary.api.resources(
            type="upload",
            prefix="wedding-gallery",  # Get only files from our folder
            max_results=30,            # <-- We will load only 30 at a time
            next_cursor=next_cursor,   # <-- Start from this 'page'
            sort_by=[("created_at", "desc")] # <-- Get newest photos first
        )

        # Extract the secure URLs from the response
        photo_urls = [res["secure_url"] for res in resources["resources"]]

        # Get the cursor for the *next* page. 
        # It will be 'None' if there are no more photos.
        next_page_cursor = resources.get("next_cursor")

        # Send back BOTH the photos AND the cursor for the next page
        return jsonify({
            "photos": photo_urls,
            "next_cursor": next_page_cursor
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# We no longer need this route because Cloudinary hosts the images
# @app.route("/uploads/<filename>")
# def get_photo(filename):
#     return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=os.getenv("PORT", 5000))