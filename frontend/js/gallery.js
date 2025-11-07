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
    const data = await res.json();
    const images = data.photos; // extract array

    images.forEach((imgURL) => {
        const img = document.createElement("img");
        img.src = `${backendURL}/${imgURL}`;
        photosDiv.appendChild(img);
    });
}

window.onload = loadGallery;
