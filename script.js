import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
    getAuth,
    signInAnonymously,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDp5NaCOo0I9DssodNecAilqCfSQsQV8hc",
    authDomain: "mcd-website-1a892.firebaseapp.com",
    projectId: "mcd-website-1a892",
    storageBucket: "mcd-website-1a892.firebasestorage.app",
    messagingSenderId: "474870909946",
    appId: "1:474870909946:web:cf82ec254915b5129db243",
    measurementId: "G-3X422L9DKJ"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Persist auth state in localStorage
await setPersistence(auth, browserLocalPersistence);

// Sign in anonymously if no user exists
if (!auth.currentUser) {
    signInAnonymously(auth)
        .then(() => console.log("Signed in anonymously with UID:", auth.currentUser.uid))
        .catch(err => console.error("Anonymous auth failed:", err));
} else {
    console.log("Already signed in with UID:", auth.currentUser.uid);
}

// DOM elements
const form = document.getElementById("uploadForm");
const nameInput = document.getElementById("nameInput");
const urlInput = document.getElementById("urlInput");
const descriptionInput = document.getElementById("descriptionInput");
const platformSelect = document.getElementById("platformSelect");
const mobHealthInput = document.getElementById("mobHealthInput");
const tableBody = document.getElementById("tableBody");

// Submit form
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const videoUrl = urlInput.value.trim();

    if (!name || !videoUrl) return;

    try {
        await addDoc(collection(db, "submissions"), {
            name,
            videoUrl,
            description: descriptionInput.value.trim(),
            platform: platformSelect.value,
            mobHealth: parseFloat(mobHealthInput.value),
            userId: auth.currentUser?.uid,
            createdAt: Date.now()
        });

        form.reset();
    } catch (err) {
        console.error(err);
        alert("Something went wrong saving the video 😭");
    }
});

// Load submissions
const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = "";
    snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const row = document.createElement("tr");
        const videoEmbed = detectEmbed(d.videoUrl);

        row.innerHTML = `
            <td>${d.name}</td>
            <td>${videoEmbed}</td>
            <td>${d.description || ""}</td>
            <td>${d.platform || ""}</td>
            <td>${d.mobHealth ?? ""}</td>
            <td>
                ${d.userId === auth.currentUser?.uid
                ? `<button class="delete-btn button is-small is-danger" data-id="${docSnap.id}">Delete</button>`
                : ""}
            </td>
        `;

        tableBody.appendChild(row);
    });
});

// Detect video type (YouTube or mp4)
function detectEmbed(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const embed = url
            .replace("watch?v=", "embed/")
            .replace("youtu.be/", "youtube.com/embed/");
        return `<iframe src="${embed}" height="200" frameborder="0" allowfullscreen></iframe>`;
    }
    return `<video controls src="${url}" height="200"></video>`;
}

// Delete submissions
document.addEventListener("click", async (e) => {
    if (!e.target.matches(".delete-btn")) return;

    const id = e.target.dataset.id;

    try {
        await deleteDoc(doc(db, "submissions", id));
        alert("Deleted!");
    } catch (err) {
        console.error(err);
        alert("Could not delete — permissions?");
    }
});
