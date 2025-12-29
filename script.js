import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
    getAuth, signInAnonymously, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Firebase setup
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
await setPersistence(auth, browserLocalPersistence);
if (!auth.currentUser) await signInAnonymously(auth);
// ------------------ CALCULATIONS ------------------
// Base armor health at power level 251 (exact value from chart)
const BASE_ARMOR_HEALTH = 1917047; // From Buster's chart (251 PL armor)

// Weapon base damages at power level 251 (exact values from chart)
const WEAPON_BASE_DAMAGES = {
    fighters_bindings: 191710,
    daggers: 268394, // Using lower value from range may change to higher vaule if wrong
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
        trialMultiplier,
        mobHealthPercent,
        armorHealth,
        meleeType,
        meleeDamage
    } = input;

    // Convert percentages to multipliers
    const mobHealthMultiplier = 1 + (mobHealthPercent / 100);

    // Get base damage for weapon
    const meleeBaseDamage = WEAPON_BASE_DAMAGES[meleeType] || 251;

    // MOB DAMAGE CALCULATION
    // Based on Buster's example: "divide by 1,917,147 = 1.56904139328 so you divide the final mob damage amount by 1.569"
    // Formula: (trialMultiplier × mobHealthMultiplier) / armorRatio
    // armorRatio = (playerArmor + 100) / (baseArmor + 100)
    const armorRatio = (armorHealth + 100) / (BASE_ARMOR_HEALTH + 100);
    const effectiveMobDamage = (trialMultiplier * mobHealthMultiplier) / armorRatio;

    // MOB HEALTH CALCULATION
    // Same logic as mob damage but for weapons
    // Formula: (trialMultiplier × mobHealthMultiplier) / weaponRatio
    // weaponRatio = (playerWeapon + 100) / (baseWeapon + 100)
    const weaponRatio = (meleeDamage + 100) / (meleeBaseDamage + 100);
    const effectiveMobHealth = (trialMultiplier * mobHealthMultiplier) / weaponRatio;

    return {
        mobDamage: effectiveMobDamage,
        mobHealth: effectiveMobHealth
    };
}

// ------------------ DOM ------------------
const form = document.getElementById("uploadForm");
const tableBody = document.getElementById("tableBody");

form.addEventListener("submit", async e => {
    e.preventDefault();

    const name = document.getElementById("nameInput").value.trim();
    const videoUrl = document.getElementById("urlInput").value.trim();
    const armorHealth = parseFloat(document.getElementById("armorHealthInput").value);
    const meleeType = document.getElementById("meleeTypeSelect").value;
    const meleeDamage = parseFloat(document.getElementById("meleeDamageInput").value);
    const trialMultiplier = parseFloat(document.getElementById("trialMultiplierInput").value);
    const mobHealthPercent = parseFloat(document.getElementById("mobHealthInput").value || 0);
    const mobDamagePercent = parseFloat(document.getElementById("mobDamageInput").value || 0);
    const platform = document.getElementById("platformSelect").value;

    if (!name || !videoUrl || !trialMultiplier || !armorHealth || !meleeDamage || !meleeType) {
        alert("Fill out all required fields.");
        return;
    }

    const results = calculateEffectiveMob({
        trialMultiplier,
        mobHealthPercent,
        armorHealth,
        meleeType,
        meleeDamage
    });

    await addDoc(collection(db, "submissions"), {
        name,
        videoUrl,
        platform,
        armorHealth,
        meleeType,
        meleeDamage,
        trialMultiplier,
        mobHealthPercent,
        mobDamagePercent,
        mobDamage: results.mobDamage,
        mobHealth: results.mobHealth,
        userId: auth.currentUser?.uid,
        createdAt: Date.now()
    });

    form.reset();
});

// ------------------ LISTEN + DISPLAY ------------------
const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
onSnapshot(q, snapshot => {
    tableBody.innerHTML = "";
    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const row = document.createElement("tr");
        const video = detectEmbed(d.videoUrl);
        const mobDamage = d.mobDamage ?? 0;
        const mobHealth = d.mobHealth ?? 0;

        row.innerHTML = `
            <td>${d.name}</td>
            <td>${video}</td>
            <td>${mobDamage.toFixed(2)}x</td>
            <td>${mobHealth.toFixed(2)}x</td>
            <td>${d.platform}</td>
            <td>${d.userId === auth.currentUser?.uid ? `<button class="button is-danger is-small delete-btn" data-id="${docSnap.id}">Delete</button>` : ""}</td>
        `;
        tableBody.appendChild(row);
    });
});

// ------------------ HELPERS ------------------
function detectEmbed(url) {
    // YouTube handling
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = "";

        // Handle different YouTube URL formats
        if (url.includes("watch?v=")) {
            videoId = url.split("watch?v=")[1].split("&")[0];
        } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        } else if (url.includes("embed/")) {
            videoId = url.split("embed/")[1].split("?")[0];
        }

        if (videoId) {
            return `<iframe width="300" height="200" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
    }

    // For other video URLs, just show a link
    return `<a href="${url}" target="_blank" class="button is-small is-link">Watch Video</a>`;
}

document.addEventListener("click", async e => {
    if (!e.target.matches(".delete-btn")) return;
    await deleteDoc(doc(db, "submissions", e.target.dataset.id));
});