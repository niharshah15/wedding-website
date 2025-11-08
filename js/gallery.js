// This is your CORRECT backend URL
const backendURL = "https://wedding-website-ib81.onrender.com";

const uploadForm = document.getElementById("uploadForm");
const statusText = document.getElementById("status");
const photosDiv = document.getElementById("photos");

// Add event listener to the form
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("image");
    
    if (!fileInput.files || fileInput.files.length === 0) {
        statusText.textContent = "Please select an image to upload.";
        statusText.style.color = "red";
        return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    statusText.textContent = "Uploading... 💖";
    statusText.style.color = "#b56576";

    try {
      const res = await fetch(`${backendURL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await res.json();
      
      statusText.textContent = "Uploaded successfully! 🎉";
      statusText.style.color = "green";
      
      // Add the new photo to the top of the gallery
      addPhotoToGallery(data.url);
      
      // Clear the file input
      uploadForm.reset();
      
    } catch (err) {
      console.error(err);
      statusText.textContent = `Error: ${err.message}`;
      statusText.style.color = "red";
    }
  });
}

// Function to add a single photo to the gallery
function addPhotoToGallery(imageUrl) {
    // This is the container for all guest photos
    const guestGalleryContainer = document.getElementById("photos");
    if (!guestGalleryContainer) return; // Exit if the container isn't on the page

    const imgLink = document.createElement("a");
    imgLink.href = imageUrl;
    // We add this to make it part of a NEW lightbox gallery
    imgLink.setAttribute("data-lightbox", "guest-gallery"); 
    
    const img = document.createElement("img");
    img.src = imageUrl;
    
    // Add styling (you can move this to your CSS)
    img.style.width = "200px";
    img.style.height = "200px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "10px";
    img.style.transition = "transform 0.3s";
    img.style.cursor = "pointer";
    img.onmouseover = () => { img.style.transform = "scale(1.05)"; };
    img.onmouseout = () => { img.style.transform = "scale(1)"; };
    
    imgLink.appendChild(img);
    // prepend() adds the new image at the *beginning* of the gallery
    guestGalleryContainer.prepend(imgLink); 
}

// Load all existing photos when the page loads
async function loadGallery() {
  if (!photosDiv) return; // Don't run if the photosDiv element doesn't exist

  try {
    const res = await fetch(`${backendURL}/photos`);
    const imageUrls = await res.json(); // This will be an array of full URLs

    photosDiv.innerHTML = ""; // Clear any placeholders
    imageUrls.forEach(url => {
      addPhotoToGallery(url); // Add each photo to the page
    });
    
  } catch (err) {
    console.error("Error loading gallery:", err);
    photosDiv.innerHTML = "<p>Could not load guest photos.</p>";
  }
}

// Run loadGallery when the window loads
window.onload = loadGallery;