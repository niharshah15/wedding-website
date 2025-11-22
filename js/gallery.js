// This is your CORRECT backend URL
const backendURL = "https://wedding-website-ib81.onrender.com";

const uploadForm = document.getElementById("uploadForm");
const statusText = document.getElementById("status");
const photosDiv = document.getElementById("photos");
const loadMoreBtn = document.getElementById("loadMoreBtn"); // Get the new button

// This variable will keep track of the "next page"
let nextCursor = null;

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

    // Get the selected event from the dropdown
    const eventSelect = document.getElementById('eventSelect');
    const eventTag = eventSelect.value;
    formData.append("event", eventTag);;

    // New polite message
    statusText.innerHTML = "Uploading... 💖<br><small>Our gallery might be waking up! This can take up to 30 seconds for the first photo. Please wait...</small>";
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
      // We use .prepend() to add the *new* upload to the top of the list
      addPhotoToGallery(data.url, true);

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
// We add a 'prepend' flag to control where the image is added
function addPhotoToGallery(imageUrl, prepend = false) {
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

  if (prepend) {
    // Add new uploads to the beginning
    guestGalleryContainer.prepend(imgLink);
  } else {
    // Add 'Load More' photos to the end
    guestGalleryContainer.appendChild(imgLink);
  }
}

// --- NEW "LOAD MORE" LOGIC ---

// This new function fetches a "page" of photos
async function fetchPhotos() {
  if (!photosDiv) return; // Don't run if the photosDiv element doesn't exist

  // Build the URL. If we have a cursor, add it.
  let url = `${backendURL}/photos`;
  if (nextCursor) {
    url += `?next_cursor=${nextCursor}`;
  }

  // Show loading text on the button
  if (loadMoreBtn) {
    loadMoreBtn.textContent = "Loading...";
    loadMoreBtn.disabled = true;
  }

  try {
    const res = await fetch(url);
    const data = await res.json(); // This will be an object: {photos: [], next_cursor: "..."}

    data.photos.forEach(url => {
      addPhotoToGallery(url, false); // Add each photo to the end of the page
    });

    // Update the nextCursor for the *next* time the button is clicked
    nextCursor = data.next_cursor;

    // If there is a next_cursor, show the "Load More" button
    // If not (it's null), we are at the end, so hide the button
    if (nextCursor) {
      loadMoreBtn.style.display = "inline-block";
      loadMoreBtn.textContent = "Load More Photos...";
      loadMoreBtn.disabled = false;
    } else {
      if (loadMoreBtn) {
        loadMoreBtn.style.display = "none";
      }
    }

  } catch (err) {
    console.error("Error loading gallery:", err);
    photosDiv.innerHTML = "<p>Could not load guest photos.</p>";
  }
}

// When the "Load More" button is clicked, fetch more photos
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", fetchPhotos);
}

// Run this ONCE when the page first loads
window.onload = fetchPhotos;