import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged
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

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";

        initAdmin();
    } else {
        document.getElementById("loginScreen").style.display = "block";
        document.getElementById("adminPanel").style.display = "none";
    }
});

document.getElementById("loginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        alert("Login failed: " + err.message);
    }
});

// ─────────────────────────────────────────────
// CONSTANTS These never change and can be safely hardcoded without worrying about players modifying them to cheat, since all calculations are done server-side by admins who approve runs.
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// CALCULATIONS 
// ─────────────────────────────────────────────

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

    const playerHealthMultiplier = playerHealthIncrease
        ? (playerHealthIncrease > 0
            ? (1 + playerHealthIncrease / 100)
            : (1 + playerHealthIncrease / 100))
        : 1;

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

// ─────────────────────────────────────────────
// PENDING MODERATION LIST
// ─────────────────────────────────────────────

function initAdmin() {

    const allSubmissionsDiv = document.getElementById("allSubmissions");

    onSnapshot(collection(db, "submissions"), snapshot => {
        allSubmissionsDiv.innerHTML = "";

        snapshot.forEach(submission => {
            const data = submission.data();

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
            <h3>${data.name}</h3>

            <p><strong>Platform:</strong> ${data.platform}</p>
            <p><strong>Mob Damage:</strong> ${data.mobDamage ?? "Pending"}</p>
            <p><strong>Mob Health:</strong> ${data.mobHealth ?? "Pending"}</p>

            <a href="${data.videoUrl}" target="_blank">
                View Video
            </a>

<div class="admin-actions">

    <input
        type="number"
        step="0.01"
        placeholder="Mob Damage"
        id="editDamage-${submission.id}"
        value="${data.mobDamage ?? ""}"
    >

    <input
        type="number"
        step="0.01"
        placeholder="Mob Health"
        id="editHealth-${submission.id}"
        value="${data.mobHealth ?? ""}"
    >

    <button class="save-btn" data-id="${submission.id}">
        Save
    </button>

    <button class="delete-btn" data-id="${submission.id}">
        Delete
    </button>

</div>
        `;

            allSubmissionsDiv.appendChild(card);
        });
    });

    const pendingDiv = document.getElementById("pendingList");

    const q = query(
        collection(db, "submissions"),
        where("needsModeration", "==", true)
    );

    onSnapshot(q, snapshot => {
        pendingDiv.innerHTML = "";

        if (snapshot.empty) {
            pendingDiv.innerHTML = `<p style="color:#888;padding:16px;">No pending submissions.</p>`;
            return;
        }

        snapshot.forEach(submission => {
            const data = submission.data();

            const card = document.createElement("div");
            card.className = "card";

            // Show stored gear stats if the player provided them (they just didn't fill
            // ALL required fields, so it still needs manual review)
            const statsHtml = [
                data.armorHealth != null ? `<p><strong>Armor +Health:</strong> ${data.armorHealth.toLocaleString()}</p>` : "",
                data.meleeType ? `<p><strong>Weapon type:</strong> ${data.meleeType}</p>` : "",
                data.meleeDamage != null ? `<p><strong>Weapon damage:</strong> ${data.meleeDamage.toLocaleString()}</p>` : "",
                data.trialMultiplier != null ? `<p><strong>Trial multiplier:</strong> ${data.trialMultiplier}</p>` : "",
                data.playerDamageDecrease != null ? `<p><strong>Player damage mod %:</strong> ${data.playerDamageDecrease}</p>` : "",
                data.playerHealthIncrease != null ? `<p><strong>Player health mod %:</strong> ${data.playerHealthIncrease}</p>` : "",
                data.mobHealthPercent != null ? `<p><strong>Mob health %:</strong> ${data.mobHealthPercent}</p>` : "",
                data.mobDamagePercent != null ? `<p><strong>Mob damage %:</strong> ${data.mobDamagePercent}</p>` : "",
            ].join("");

            card.innerHTML = `
            <h3>${data.name}</h3>
            <p><strong>Platform:</strong> ${data.platform}</p>
            <a href="${data.videoUrl}" target="_blank">View Video</a>
            ${statsHtml ? `<div class="stored-stats">${statsHtml}</div>` : ""}
            <div class="approve-row">
                <input type="number" step="0.01" placeholder="Mob Damage (e.g. 10.10)"
                       id="damage-${submission.id}">
                <input type="number" step="0.01" placeholder="Mob Health (e.g. 9.53)"
                       id="health-${submission.id}">
                <button class="approve-btn" data-id="${submission.id}">Approve</button>
            </div>
        `;

            pendingDiv.appendChild(card);
        });
    });

    // Approve button handler
    document.addEventListener("click", async e => {
        if (!e.target.matches(".approve-btn")) return;

        const id = e.target.dataset.id;
        const damage = parseFloat(document.getElementById(`damage-${id}`)?.value);
        const health = parseFloat(document.getElementById(`health-${id}`)?.value);

        if (isNaN(damage) || isNaN(health)) {
            alert("Enter both Mob Damage and Mob Health values before approving.");
            return;
        }

        await updateDoc(doc(db, "submissions", id), {
            mobDamage: damage,
            mobHealth: health,
            needsModeration: false
        });

        alert("✅ Run approved!");
    });

    // ─────────────────────────────────────────────
    // ADMIN CALCULATOR
    // ─────────────────────────────────────────────

    // Wait for DOM to be fully ready before attaching the button listener.
    // Using DOMContentLoaded is not needed inside a module (modules are deferred),
    // but getElementById can still be null if the script tag is in <head> without defer.
    // Guard defensively with a null check.

    const calcBtn = document.getElementById("calcBtn");

    if (calcBtn) {
        calcBtn.addEventListener("click", () => {
            const get = id => document.getElementById(id)?.value?.trim() ?? "";

            const armorHealth = parseFloat(get("armorHealth"));
            const weaponType = get("weaponType");
            const weaponDamage = parseFloat(get("weaponDamage"));
            const trialMultiplier = parseFloat(get("trialMultiplier"));
            const playerDamageMod = parseFloat(get("playerDamage") || "0");
            const playerHealthMod = parseFloat(get("playerHealth") || "0");
            const mobHealthPct = parseFloat(get("mobHealth") || "0");
            const mobDamagePct = parseFloat(get("mobDamage") || "0");

            if ([armorHealth, weaponDamage, trialMultiplier].some(isNaN)) {
                document.getElementById("results").innerHTML =
                    `<span style="color:red;">Please fill in Armor Health, Weapon Damage, and Trial Multiplier.</span>`;
                return;
            }

            const results = calculateEffectiveMob({
                trialMultiplier,
                mobHealthPercent: mobHealthPct,
                mobDamagePercent: mobDamagePct,
                playerDamageDecrease: playerDamageMod,
                playerHealthIncrease: playerHealthMod,
                armorHealth,
                meleeType: weaponType,
                meleeDamage: weaponDamage
            });

            document.getElementById("results").innerHTML = `
            <strong>Mob Damage:</strong> ${results.mobDamage.toFixed(2)}x<br>
            <strong>Mob Health:</strong> ${results.mobHealth.toFixed(2)}x
        `;
        });
    } else {
        console.warn("admin.js: #calcBtn not found in DOM. Calculator won't work.");
    }
    document.addEventListener("click", async e => {
        if (!e.target.matches(".delete-btn")) return;

        const id = e.target.dataset.id;

        if (!confirm("Delete this submission?")) return;

        await deleteDoc(doc(db, "submissions", id));

        alert("Deleted.");
    });

    document.addEventListener("click", async e => {
        if (!e.target.matches(".save-btn")) return;

        const id = e.target.dataset.id;

        const damage = parseFloat(
            document.getElementById(`editDamage-${id}`).value
        );

        const health = parseFloat(
            document.getElementById(`editHealth-${id}`).value
        );

        if (isNaN(damage) || isNaN(health)) {
            alert("Enter both values.");
            return;
        }

        await updateDoc(doc(db, "submissions", id), {
            mobDamage: damage,
            mobHealth: health
        });

        alert("Saved!");
    });

}