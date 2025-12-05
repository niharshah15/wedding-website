// --- CONFIGURATION ---
const backendURL = "https://wedding-website-ib81.onrender.com";
const CLOUD_NAME = "djnsb7djw";  // Your Cloudinary Name
const PRESET_NAME = "wedding_unsigned"; // Your Unsigned Preset

const uploadForm = document.getElementById("uploadForm");
const statusText = document.getElementById("status");
const photosDiv = document.getElementById("photos");
const loadMoreBtn = document.getElementById("loadMoreBtn");

let nextCursor = null;

// --- UPLOAD LOGIC (Direct to Cloudinary) ---
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("image");
    const eventSelect = document.getElementById('eventSelect');

    if (!fileInput.files || fileInput.files.length === 0) {
      statusText.textContent = "Please select an image to upload.";
      statusText.style.color = "red";
      return;
    }

    const file = fileInput.files[0];
    const eventTag = eventSelect.value;

    // Show uploading message
    statusText.innerHTML = "Uploading... 💖<br><small>Sending directly to cloud...</small>";
    statusText.style.color = "#b56576";

    // Prepare data for Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET_NAME);
    // We add the event name as a 'tag' so you can still search for it later
    formData.append('tags', eventTag); 

    try {
      // 1. Upload directly to Cloudinary (Bypassing Render)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error.message || "Upload failed");
      }

      const data = await res.json();

      statusText.textContent = "Uploaded successfully! 🎉";
      statusText.style.color = "green";

      // 2. Add the new photo to the gallery immediately
      addPhotoToGallery(data.secure_url, true);

      // Clear the form
      uploadForm.reset();

    } catch (err) {
      console.error(err);
      statusText.textContent = `Error: ${err.message}`;
      statusText.style.color = "red";
    }
  });
}

// --- GALLERY DISPLAY LOGIC ---

function addPhotoToGallery(imageUrl, prepend = false) {
  const guestGalleryContainer = document.getElementById("photos");
  if (!guestGalleryContainer) return;

  const imgLink = document.createElement("a");
  imgLink.href = imageUrl;
  imgLink.setAttribute("data-lightbox", "guest-gallery");

  const img = document.createElement("img");
  img.src = imageUrl;
  
  // Basic styling
  img.style.width = "200px";
  img.style.height = "200px";
  img.style.objectFit = "cover";
  img.style.borderRadius = "10px";
  img.style.margin = "5px"; // Added spacing
  img.style.transition = "transform 0.3s";
  img.style.cursor = "pointer";
  img.onmouseover = () => { img.style.transform = "scale(1.05)"; };
  img.onmouseout = () => { img.style.transform = "scale(1)"; };

  imgLink.appendChild(img);

  if (prepend) {
    guestGalleryContainer.prepend(imgLink);
  } else {
    guestGalleryContainer.appendChild(imgLink);
  }
}

// --- FETCH PHOTOS FROM BACKEND (For loading existing ones) ---
async function fetchPhotos() {
  if (!photosDiv) return;

  let url = `${backendURL}/photos`;
  if (nextCursor) {
    url += `?next_cursor=${nextCursor}`;
  }

  if (loadMoreBtn) {
    loadMoreBtn.textContent = "Loading...";
    loadMoreBtn.disabled = true;
  }

  try {
    const res = await fetch(url);
    const data = await res.json(); 

    // Handle case where server might be waking up
    if (!data.photos) {
        throw new Error("Server waking up...");
    }

    data.photos.forEach(url => {
      addPhotoToGallery(url, false);
    });

    nextCursor = data.next_cursor;

    if (nextCursor) {
      if (loadMoreBtn) {
          loadMoreBtn.style.display = "inline-block";
          loadMoreBtn.textContent = "Load More Photos...";
          loadMoreBtn.disabled = false;
      }
    } else {
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
    }

  } catch (err) {
    console.error("Error loading gallery:", err);
    // Don't show error text to user, just keep button ready to try again
    if (loadMoreBtn) {
        loadMoreBtn.textContent = "Retry Loading";
        loadMoreBtn.disabled = false;
    }
  }
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", fetchPhotos);
}

// Initial load
window.onload = fetchPhotos;
