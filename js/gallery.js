const backendURL = "https://wedding-website-ib81.onrender.com"; // your backend URL

const uploadForm = document.getElementById("uploadForm");
const statusText = document.getElementById("status");
const photosDiv = document.getElementById("photos");

uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("image");
    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    statusText.textContent = "Uploading...";

    try {
        const res = await fetch(`${backendURL}/upload`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        statusText.textContent = "Uploaded successfully!";
        loadGallery();
    } catch (err) {
        statusText.textContent = "Error uploading image.";
    }
});

// Load all photos
async function loadGallery() {
  photosDiv.innerHTML = "";
  const res = await fetch(`${backendURL}/photos`);
  const images = await res.json();

  // Handle both array or object type responses
  const photoList = Array.isArray(images) ? images : images.photos;

  photoList.forEach((imgPath) => {
    const img = document.createElement("img");
    img.src = `${backendURL}/${imgPath}`;
    img.style.width = "200px";
    img.style.height = "200px";
    img.style.objectFit = "cover";
    img.style.margin = "10px";
    img.style.borderRadius = "10px";
    photosDiv.appendChild(img);
  });
}

window.onload = loadGallery;
