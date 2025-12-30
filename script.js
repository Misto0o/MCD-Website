import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
    getAuth, signInAnonymously, setPersistence, browserLocalPersistence
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
await setPersistence(auth, browserLocalPersistence);
if (!auth.currentUser) await signInAnonymously(auth);

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
        trialMultiplier,
        mobHealthPercent,
        mobDamagePercent,
        playerDamageDecrease,
        playerHealthIncrease,
        armorHealth,
        meleeType,
        meleeDamage
    } = input;

    const mobHealthMultiplier = 1 + (mobHealthPercent / 100);
    const mobDamageMultiplier = 1 + (mobDamagePercent / 100);

    let playerDamageBannerEffect = 1;
    if (playerDamageDecrease !== 0) {
        playerDamageBannerEffect = 1 / (1 + (playerDamageDecrease / 100));
    }

    const playerHealthMultiplier = playerHealthIncrease ? (1 + playerHealthIncrease / 100) : 1;

    const meleeBaseDamage = WEAPON_BASE_DAMAGES[meleeType] || 251;

    const armorRatio = (armorHealth + 100) / (BASE_ARMOR_HEALTH + 100);
    const effectiveMobDamage = (trialMultiplier * mobDamageMultiplier) / (armorRatio * playerHealthMultiplier);

    const weaponRatio = (meleeDamage + 100) / (meleeBaseDamage + 100);
    const effectiveMobHealth = (trialMultiplier * mobHealthMultiplier * playerDamageBannerEffect) / weaponRatio;

    return {
        mobDamage: effectiveMobDamage,
        mobHealth: effectiveMobHealth
    };
}

const form = document.getElementById("uploadForm");
const tableBody = document.getElementById("tableBody");

form.addEventListener("submit", async e => {
    e.preventDefault();

    const name = document.getElementById("nameInput").value.trim();
    const videoUrl = document.getElementById("urlInput").value.trim();
    const platform = document.getElementById("platformSelect").value;

    const armorHealth = document.getElementById("armorHealthInput").value.trim();
    const meleeType = document.getElementById("meleeTypeSelect").value;
    const meleeDamage = document.getElementById("meleeDamageInput").value.trim();
    const trialMultiplier = document.getElementById("trialMultiplierInput").value.trim();
    const playerDamageDecrease = parseInt(document.getElementById("playerDamageDecreaseSelect").value);
    const playerHealthIncrease = document.getElementById("playerHealthIncreaseInput").value.trim();
    const mobHealthPercent = document.getElementById("mobHealthInput").value.trim();
    const mobDamagePercent = document.getElementById("mobDamageInput").value.trim();

    if (!name || !videoUrl || !platform) {
        alert("Please fill out Name, Video URL, and Platform.");
        return;
    }

    const allStatsFilled =
        armorHealth &&
        meleeType &&
        meleeDamage &&
        trialMultiplier &&
        mobHealthPercent !== '' &&
        mobDamagePercent !== '';

    const anyStatsFilled =
        armorHealth ||
        meleeType ||
        meleeDamage ||
        trialMultiplier ||
        playerDamageDecrease !== 0 ||
        playerHealthIncrease ||
        mobHealthPercent !== '' ||
        mobDamagePercent !== '';

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
            playerDamageDecrease: playerDamageDecrease || 0,
            playerHealthIncrease: parseFloat(playerHealthIncrease || 0),
            armorHealth: parseFloat(armorHealth),
            meleeType,
            meleeDamage: parseFloat(meleeDamage)
        });

        mobDamage = results.mobDamage;
        mobHealth = results.mobHealth;
    }

    await addDoc(collection(db, "submissions"), {
        name,
        videoUrl,
        platform,
        armorHealth: armorHealth ? parseFloat(armorHealth) : null,
        meleeType: meleeType || null,
        meleeDamage: meleeDamage ? parseFloat(meleeDamage) : null,
        trialMultiplier: trialMultiplier ? parseFloat(trialMultiplier) : null,
        playerDamageDecrease: playerDamageDecrease || null,
        playerHealthIncrease: playerHealthIncrease ? parseFloat(playerHealthIncrease) : null,
        mobHealthPercent: mobHealthPercent !== '' ? parseFloat(mobHealthPercent) : null,
        mobDamagePercent: mobDamagePercent !== '' ? parseFloat(mobDamagePercent) : null,
        mobDamage,
        mobHealth,
        needsModeration,
        userId: auth.currentUser?.uid,
        createdAt: Date.now()
    });

    alert("✅ Submission successful!");
    form.reset();
});

const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
onSnapshot(q, snapshot => {
    tableBody.innerHTML = "";
    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const row = document.createElement("tr");
        const video = detectEmbed(d.videoUrl);

        let mobDamageDisplay, mobHealthDisplay;

        if (d.needsModeration) {
            mobDamageDisplay = '<span class="tag is-warning">Pending Moderation</span>';
            mobHealthDisplay = '<span class="tag is-warning">Pending Moderation</span>';
        } else {
            const mobDamage = d.mobDamage ?? 0;
            const mobHealth = d.mobHealth ?? 0;
            mobDamageDisplay = `${mobDamage.toFixed(2)}x`;
            mobHealthDisplay = `${mobHealth.toFixed(2)}x`;
        }

        row.innerHTML = `
            <td>${d.name}</td>
            <td>${video}</td>
            <td>${mobDamageDisplay}</td>
            <td>${mobHealthDisplay}</td>
            <td>${d.platform}</td>
            <td>${d.userId === auth.currentUser?.uid ? `<button class="button is-danger is-small delete-btn" data-id="${docSnap.id}">Delete</button>` : ""}</td>
        `;
        tableBody.appendChild(row);
    });
});

function detectEmbed(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = "";

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

    return `<a href="${url}" target="_blank" class="button is-small is-link">Watch Video</a>`;
}

document.addEventListener("click", async e => {
    if (!e.target.matches(".delete-btn")) return;
    await deleteDoc(doc(db, "submissions", e.target.dataset.id));
});