import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDp5NaCOo0I9DssodNecAilqCfSQsQV8hc",
    authDomain: "mcd-website-1a892.firebaseapp.com",
    projectId: "mcd-website-1a892",
    storageBucket: "mcd-website-1a892.firebasestorage.app",
    messagingSenderId: "474870909946",
    appId: "1:474870909946:web:cf82ec254915b5129db243"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ── Auth UI ──────────────────────────────────────────────────────────────────

const signInBtn = document.getElementById("signInBtn");
const userAvatar = document.getElementById("userAvatar");
const userMenu = document.getElementById("userMenu");
const signOutBtn = document.getElementById("signOutBtn");
const submitSection = document.getElementById("submitSection");

signInBtn.addEventListener("click", () => signInWithPopup(auth, provider));
signOutBtn.addEventListener("click", () => signOut(auth));

// Toggle dropdown on avatar click
userAvatar.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.classList.toggle("open");
});
document.addEventListener("click", () => userMenu.classList.remove("open"));

onAuthStateChanged(auth, user => {
    if (user) {
        // Show avatar, hide sign-in button
        signInBtn.style.display = "none";
        userAvatar.style.display = "flex";
        userAvatar.querySelector("img").src = user.photoURL || "";
        userAvatar.querySelector("img").alt = user.displayName || "User";
        document.getElementById("menuName").textContent = user.displayName || "User";
        document.getElementById("menuEmail").textContent = user.email || "";
        // Show submit form
        submitSection.style.display = "block";
        document.getElementById("signInPrompt").style.display = "none";
    } else {
        // Show sign-in button, hide avatar
        signInBtn.style.display = "flex";
        userAvatar.style.display = "none";
        userMenu.classList.remove("open");
        // Hide submit form, show prompt
        submitSection.style.display = "none";
        document.getElementById("signInPrompt").style.display = "block";
    }
});

// ── Calculation ───────────────────────────────────────────────────────────────

const BASE_ARMOR_HEALTH = 1917047;

const WEAPON_BASE_DAMAGES = {
    fighters_bindings: 191710,
    daggers: 268394,
    coral_blade: 145699,
    gauntlets: 191710,
    sawblade: 322072,
    dancers_sword: 383419,
    freezing_foil: 92021,
    rapier: 99689,
    sickles: 230052,
    tempest_knife: 368083,
    cutlass: 601607,
    sword: 383419,
    soul_scythe: 613471,
    backstabber: 460193,
    void_touched: 460103,
    spear: 460103,
    axe: 498445,
    hammer: 766839,
    cursed_axe: 766839,
    whip: 766839,
    glaive: 575129,
    katana: 651813,
    pickaxe: 996891,
    soul_knife: 1073575,
    claymore: 690155,
    mace: 621140,
    staff: 498445,
    bone_club: 1242279,
    anchor: 1825077,
    obsidian_sword: 1150258
};

function calculateEffectiveMob(input) {
    const {
        trialMultiplier, mobHealthPercent, mobDamagePercent,
        playerDamageDecrease, playerHealthIncrease,
        armorHealth, meleeType, meleeDamage
    } = input;

    const mobHealthMultiplier = 1 + (mobHealthPercent / 100);
    const mobDamageMultiplier = 1 + (mobDamagePercent / 100);

    let playerDamageBannerEffect = 1;
    if (playerDamageDecrease !== 0) {
        playerDamageBannerEffect = 1 / (1 + (playerDamageDecrease / 100));
    }

    const playerHealthMultiplier = playerHealthIncrease
        ? (1 + playerHealthIncrease / 100)
        : 1;

    const meleeBaseDamage = WEAPON_BASE_DAMAGES[meleeType] || 251;
    const armorRatio = (armorHealth + 100) / (BASE_ARMOR_HEALTH + 100);
    const effectiveMobDamage = (trialMultiplier * mobDamageMultiplier) / (armorRatio * playerHealthMultiplier);

    const weaponRatio = (meleeDamage + 100) / (meleeBaseDamage + 100);
    const effectiveMobHealth = (trialMultiplier * mobHealthMultiplier * playerDamageBannerEffect) / weaponRatio;

    return { mobDamage: effectiveMobDamage, mobHealth: effectiveMobHealth };
}

// ── Form submit ───────────────────────────────────────────────────────────────

const form = document.getElementById("uploadForm");

form.addEventListener("submit", async e => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("Please sign in to submit a run.");
        return;
    }

    const name = document.getElementById("nameInput").value.trim();
    const videoUrl = document.getElementById("urlInput").value.trim();
    const platform = document.getElementById("platformSelect").value;
    const fileInput = document.getElementById("fileRunInput");

    if (!name || (!videoUrl && (!fileInput || fileInput.files.length === 0)) || !platform) {
        alert("Please fill out your Name, Platform, and provide either a Video URL or upload a file.");
        return;
    }

    let cleanVideoUrl = videoUrl;
    if (fileInput && fileInput.files.length > 0) {
        const uploadedFile = fileInput.files[0];
        cleanVideoUrl = `localfile://${uploadedFile.name}#${URL.createObjectURL(uploadedFile)}`;
    }

    const armorHealth = document.getElementById("armorHealthInput").value.trim();
    const meleeType = document.getElementById("meleeTypeSelect").value;
    const meleeDamage = document.getElementById("meleeDamageInput").value.trim();
    const trialMultiplier = document.getElementById("trialMultiplierInput").value.trim();
    const playerDamageMod = document.getElementById("playerDamageModInput").value.trim();
    const playerHealthMod = document.getElementById("playerHealthModInput").value.trim();
    const mobHealthPercent = document.getElementById("mobHealthInput").value.trim();
    const mobDamagePercent = document.getElementById("mobDamageInput").value.trim();

    const allStatsFilled = armorHealth && meleeType && meleeDamage && trialMultiplier &&
        playerDamageMod && playerHealthMod && mobHealthPercent !== '' && mobDamagePercent !== '';

    const anyStatsFilled = armorHealth || meleeType || meleeDamage || trialMultiplier ||
        playerDamageMod || playerHealthMod || mobHealthPercent !== '' || mobDamagePercent !== '';

    if (anyStatsFilled && !allStatsFilled) {
        alert("⚠️ If you enter stats, you must complete ALL stat fields — or leave them all blank.");
        return;
    }

    let mobDamage = null;
    let mobHealth = null;
    let needsModeration = !allStatsFilled;

    if (allStatsFilled) {
        const results = calculateEffectiveMob({
            trialMultiplier: parseFloat(trialMultiplier),
            mobHealthPercent: parseFloat(mobHealthPercent || 0),
            mobDamagePercent: parseFloat(mobDamagePercent || 0),
            playerDamageDecrease: parseFloat(playerDamageMod || 0),
            playerHealthIncrease: parseFloat(playerHealthMod || 0),
            armorHealth: parseFloat(armorHealth),
            meleeType,
            meleeDamage: parseFloat(meleeDamage)
        });
        mobDamage = results.mobDamage;
        mobHealth = results.mobHealth;
    }

    await addDoc(collection(db, "submissions"), {
        name,
        videoUrl: cleanVideoUrl,
        platform,
        armorHealth: armorHealth ? parseFloat(armorHealth) : null,
        meleeType: meleeType || null,
        meleeDamage: meleeDamage ? parseFloat(meleeDamage) : null,
        trialMultiplier: trialMultiplier ? parseFloat(trialMultiplier) : null,
        playerDamageDecrease: playerDamageMod ? parseFloat(playerDamageMod) : null,
        playerHealthIncrease: playerHealthMod ? parseFloat(playerHealthMod) : null,
        mobHealthPercent: mobHealthPercent !== '' ? parseFloat(mobHealthPercent) : null,
        mobDamagePercent: mobDamagePercent !== '' ? parseFloat(mobDamagePercent) : null,
        mobDamage,
        mobHealth,
        needsModeration,
        userId: user.uid,
        userName: user.displayName || "Unknown",
        userPhoto: user.photoURL || "",
        createdAt: Date.now()
    });

    alert("✅ Submission successful!");
    form.reset();
    const fileLabelName = document.getElementById("fileRunName");
    if (fileLabelName) fileLabelName.textContent = "No file uploaded";
});

// ── Leaderboard ───────────────────────────────────────────────────────────────

const tableBody = document.getElementById("tableBody");

const q = query(collection(db, "submissions"));
onSnapshot(q, snapshot => {
    tableBody.innerHTML = "";

    const submissions = [];
    snapshot.forEach(docSnap => submissions.push({ id: docSnap.id, data: docSnap.data() }));

    submissions.sort((a, b) => {
        if (a.data.needsModeration && !b.data.needsModeration) return 1;
        if (!a.data.needsModeration && b.data.needsModeration) return -1;
        if (a.data.needsModeration && b.data.needsModeration) return b.data.createdAt - a.data.createdAt;

        const damageA = a.data.mobDamage ?? 0;
        const damageB = b.data.mobDamage ?? 0;
        if (damageB !== damageA) return damageB - damageA;

        return (b.data.mobHealth ?? 0) - (a.data.mobHealth ?? 0);
    });

    submissions.forEach(item => {
        const d = item.data;
        const row = document.createElement("tr");
        const video = detectEmbed(d.videoUrl);
        const currentUid = auth.currentUser?.uid;

        let mobDamageDisplay, mobHealthDisplay;
        if (d.needsModeration) {
            mobDamageDisplay = '<span class="tag is-warning custom-warning-tag">Pending</span>';
            mobHealthDisplay = '<span class="tag is-warning custom-warning-tag">Pending</span>';
        } else {
            mobDamageDisplay = `${(d.mobDamage ?? 0).toFixed(2)}x`;
            mobHealthDisplay = `${(d.mobHealth ?? 0).toFixed(2)}x`;
        }

        const canDelete = currentUid && currentUid === d.userId;

        row.innerHTML = `
            <td data-label="Player">${d.name}</td>
            <td data-label="Video">${video}</td>
            <td data-label="Mob Damage">${mobDamageDisplay}</td>
            <td data-label="Mob Health">${mobHealthDisplay}</td>
            <td data-label="Platform">${d.platform}</td>
            <td data-label="">${canDelete ? `<button class="button is-danger is-small custom-delete-btn" data-id="${item.id}">Delete</button>` : ""}</td>
        `;
        tableBody.appendChild(row);
    });
});

function detectEmbed(url) {
    if (!url) return `<span>No video</span>`;
    if (url.startsWith("localfile://")) {
        const blobUrl = url.split("#")[1];
        if (blobUrl) return `<video width="260" height="160" controls><source src="${blobUrl}" type="video/mp4"></video>`;
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = "";
        if (url.includes("watch?v=")) videoId = url.split("watch?v=")[1].split("&")[0];
        else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1].split("?")[0];
        else if (url.includes("embed/")) videoId = url.split("embed/")[1].split("?")[0];
        if (videoId) return `<iframe width="260" height="160" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }
    return `<a href="${url}" target="_blank" class="button is-small is-link">Watch Video</a>`;
}

document.addEventListener("click", async e => {
    if (!e.target.matches(".custom-delete-btn")) return;
    await deleteDoc(doc(db, "submissions", e.target.dataset.id));
});