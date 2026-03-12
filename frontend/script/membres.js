// ─────────────────────────────────────────
// CONFIG API
// ─────────────────────────────────────────
const API = "http://localhost:4000";

// ─────────────────────────────────────────
// GARDE D'AUTHENTIFICATION
// ─────────────────────────────────────────
(function authGuard() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "connexion.html";
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("token");
      window.location.href = "connexion.html";
      return;
    }
    const nameEl = document.getElementById("user-display-name");
    if (nameEl) nameEl.textContent = payload.display_name || payload.email || "";
  } catch {
    localStorage.removeItem("token");
    window.location.href = "connexion.html";
  }
})();

// ─────────────────────────────────────────
// TABLEAU DES SORTIES (dynamique BDD)
// ─────────────────────────────────────────
let allRides = [];

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR");
}

function getRideDisplay(ride) {
  const statusMap = {
    upcoming: { label: "Inscriptions ouvertes", badgeClass: "badge badge-open", actionType: "register", actionLabel: "S'inscrire" },
    planned:  { label: "Prévue",               badgeClass: "badge badge-open", actionType: "disabled", actionLabel: "À venir" },
    past:     { label: "Terminé",              badgeClass: "badge badge-done", actionType: "report",   actionLabel: "Compte rendu" }
  };
  return statusMap[ride.status] || { label: ride.status, badgeClass: "", actionType: "disabled", actionLabel: "–" };
}

function renderRidesTable(filter = "all") {
  const container = document.getElementById("rides-body");
  if (!container) return;
  container.innerHTML = "";

  const filtered = allRides.filter(ride => {
    if (filter === "all") return true;
    if (filter === "upcoming") return ride.status === "upcoming" || ride.status === "planned";
    if (filter === "past") return ride.status === "past";
    if (filter === "roadtrip") return ride.type.toLowerCase().includes("road");
    if (filter === "caritatif") return ride.type.toLowerCase().includes("caritatif");
    return true;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "rides-row rides-empty";
    empty.textContent = "Aucune sortie dans cette catégorie.";
    container.appendChild(empty);
    return;
  }

  filtered.forEach(ride => {
    const display = getRideDisplay(ride);
    const row = document.createElement("div");
    row.className = "rides-row";

    let btnClass = "ride-btn";
    if (display.actionType === "disabled") btnClass += " ride-btn--disabled";
    if (display.actionType === "register") btnClass += " ride-btn--primary";

    row.innerHTML = `
      <span>${formatDate(ride.start_date)}</span>
      <span>${ride.title}</span>
      <span>${ride.type}</span>
      <span>${ride.level}</span>
      <span class="${display.badgeClass}">${display.label}</span>
      <span>
        <button class="${btnClass}" data-ride-id="${ride.id}" data-action="${display.actionType}">
          ${display.actionLabel}
        </button>
      </span>
    `;
    container.appendChild(row);
  });

  initRideButtons();
}

function initRideButtons() {
  const buttons = document.querySelectorAll(".ride-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", function () {
      const action = btn.dataset.action;
      const id = btn.dataset.rideId;
      if (action === "disabled") {
        alert("Les inscriptions ou le compte rendu ne sont pas encore disponibles.");
        return;
      }
      window.location.href = "ride.html?id=" + id;
    });
  });
}

async function initRideFilters() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("rides-body");

  // Chargement depuis l'API
  try {
    const res = await fetch(`${API}/api/member/all-rides`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      allRides = await res.json();
    } else {
      if (container) container.textContent = "Impossible de charger les sorties.";
      return;
    }
  } catch {
    if (container) container.textContent = "Erreur réseau.";
    return;
  }

  // Filtres
  const filterButtons = document.querySelectorAll(".rides-filter");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter || "all";
      filterButtons.forEach(b => b.classList.remove("rides-filter--active"));
      btn.classList.add("rides-filter--active");
      renderRidesTable(filter);
    });
  });

  renderRidesTable("all");
}

// ─────────────────────────────────────────
// GALERIES
// ─────────────────────────────────────────
function renderMembersGalleries(filter) {
  const grid = document.getElementById("members-gallery-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const albums = [];
  for (let i = 0; i < allRides.length; i++) {
    const ride = allRides[i];
    if (!ride.gallery || ride.gallery.length === 0) continue;
    let keep = true;
    if (filter === "balade" && ride.category !== "balade") keep = false;
    if (filter === "roadtrip" && ride.category !== "roadtrip") keep = false;
    if (filter === "caritatif" && ride.category !== "caritatif") keep = false;
    if (keep) albums.push(ride);
  }
  if (albums.length === 0) {
    const p = document.createElement("p");
    p.style.fontSize = "0.85rem";
    p.style.color = "var(--text-muted)";
    p.textContent = "Aucune galerie ne correspond encore à ce filtre.";
    grid.appendChild(p);
    return;
  }
  for (let i = 0; i < albums.length; i++) {
    const ride = albums[i];
    const card = document.createElement("article");
    card.className = "members-gallery-card";
    const hasPhotos = Array.isArray(ride.gallery) && ride.gallery.length > 0;
    const coverUrl = hasPhotos ? ride.gallery[0] : "https://via.placeholder.com/400x250?text=Aucune+photo";
    const btnLabel = hasPhotos ? "Voir la galerie" : "Pas encore de photos";
    const btnClasses = hasPhotos ? "members-gallery-btn" : "members-gallery-btn members-gallery-btn--disabled";
    card.innerHTML =
      '<div class="members-gallery-cover">' +
      '<img src="' + coverUrl + '" alt="Photo de la sortie" />' +
      "</div>" +
      '<div class="members-gallery-body">' +
      '<div class="members-gallery-title">' + ride.title + "</div>" +
      '<div class="members-gallery-meta">' + ride.date + " • " + ride.type + "</div>" +
      "</div>" +
      '<div class="members-gallery-actions">' +
      '<button class="' + btnClasses + '" data-gallery-id="' + ride.id + '">' +
      btnLabel +
      "</button>" +
      "</div>";
    grid.appendChild(card);
  }
  initMembersGalleryButtons();
}

function initMembersGalleryButtons() {
  const buttons = document.querySelectorAll(".members-gallery-btn");
  if (!buttons.length) return;
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    btn.addEventListener("click", function () {
      const id = parseInt(btn.dataset.galleryId, 10);
      const ride = allRides.find(r => r.id === id);
      if (!ride) return;
      const hasPhotos = Array.isArray(ride.gallery) && ride.gallery.length > 0;
      if (!hasPhotos || btn.classList.contains("members-gallery-btn--disabled")) {
        alert("Aucune photo n'a encore été ajoutée pour cette sortie.");
        return;
      }
      window.location.href = "ride.html?id=" + ride.id;
    });
  }
}

function initMembersGalleryFilters() {
  const filterButtons = document.querySelectorAll(".gallery-filter");
  if (!filterButtons.length) return;
  function setGalleryFilter(filter) {
    for (let i = 0; i < filterButtons.length; i++) {
      const btn = filterButtons[i];
      const btnFilter = btn.dataset.galleryFilter || "all";
      if (btnFilter === filter) btn.classList.add("gallery-filter--active");
      else btn.classList.remove("gallery-filter--active");
    }
    renderMembersGalleries(filter);
  }
  for (let i = 0; i < filterButtons.length; i++) {
    filterButtons[i].addEventListener("click", function () {
      setGalleryFilter(filterButtons[i].dataset.galleryFilter || "all");
    });
  }
  setGalleryFilter("all");
}

// ─────────────────────────────────────────
// SECTION ADMIN — CRÉATION DE MEMBRE
// ─────────────────────────────────────────
function initAdminSection() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role === "admin" || payload.role === "bureau") {
      document.getElementById("member-blocks").style.display = "none";
      document.getElementById("admin-block").style.display = "block";
    }
  } catch (e) {
    return;
  }

  document.getElementById("create-user-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const email = document.getElementById("new-email").value;
    const display_name = document.getElementById("new-name").value;
    const role = document.getElementById("new-role").value;
    const msg = document.getElementById("create-user-msg");

    try {
      const res = await fetch(`${API}/api/admin/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email, display_name, role })
      });
      const data = await res.json();
      msg.style.display = "block";
      if (res.ok) {
        msg.style.color = "green";
        msg.textContent = "✅ " + data.message;
        document.getElementById("create-user-form").reset();
      } else {
        msg.style.color = "red";
        msg.textContent = "❌ " + data.error;
      }
    } catch {
      msg.style.display = "block";
      msg.style.color = "red";
      msg.textContent = "❌ Impossible de contacter le serveur.";
    }
  });
}

// ─────────────────────────────────────────
// DÉCONNEXION
// ─────────────────────────────────────────
function initLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("token");
    window.location.href = "connexion.html";
  });
}

// ─────────────────────────────────────────
// BOÎTE À IDÉES
// ─────────────────────────────────────────
function initIdeaForm() {
  const form = document.getElementById("idea-form");
  if (!form) return;

  const msgEl = document.getElementById("idea-msg");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const title = document.getElementById("idea-title").value.trim();
    const content = document.getElementById("idea-content").value.trim();

    if (!title || !content) {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "red";
        msgEl.textContent = "❌ Titre et description requis.";
      }
      return;
    }

    try {
      const res = await fetch(`${API}/api/member/idea`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, content })
      });

      const data = await res.json();

      if (msgEl) {
        msgEl.style.display = "block";
        if (res.ok) {
          msgEl.style.color = "green";
          msgEl.textContent = "✅ " + data.message;
          form.reset();
        } else {
          msgEl.style.color = "red";
          msgEl.textContent = "❌ " + (data.error || "Erreur inconnue.");
        }
      }
    } catch {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "red";
        msgEl.textContent = "❌ Impossible de contacter le serveur.";
      }
    }
  });
}

// ─────────────────────────────────────────
// AVIS SUR LES SORTIES
// ─────────────────────────────────────────
async function initFeedbackForm() {
  const form = document.getElementById("feedback-form");
  if (!form) return;

  const token = localStorage.getItem("token");
  const select = document.getElementById("event-select");
  const msgEl = document.getElementById("feedback-msg");

  // Charger les sorties depuis l'API pour peupler le <select>
  try {
    const res = await fetch(`${API}/api/member/rides`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      const ridesData = await res.json();
      select.innerHTML = '<option value="">Choisir une sortie…</option>';

      ridesData.forEach(function (ride) {
        const option = document.createElement("option");
        option.value = ride.id;
        option.textContent = ride.title + " – " + ride.start_date;
        select.appendChild(option);
      });
    }
  } catch {
    // En cas d'erreur réseau, on laisse le select vide
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const ride_id = select.value;
    const rating = document.getElementById("feedback-rating").value;
    const comment = document.getElementById("feedback-comment").value.trim();

    if (!ride_id || !rating || !comment) {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "red";
        msgEl.textContent = "❌ Sortie, note et commentaire requis.";
      }
      return;
    }

    try {
      const res = await fetch(`${API}/api/member/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ ride_id, rating, comment })
      });

      const data = await res.json();

      if (msgEl) {
        msgEl.style.display = "block";
        if (res.ok) {
          msgEl.style.color = "green";
          msgEl.textContent = "✅ " + data.message;
          form.reset();
        } else {
          msgEl.style.color = "red";
          msgEl.textContent = "❌ " + (data.error || "Erreur inconnue.");
        }
      }
    } catch {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "red";
        msgEl.textContent = "❌ Impossible de contacter le serveur.";
      }
    }
  });
}


// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  initLogout();
  initRideFilters();
  initMembersGalleryFilters();
  initAdminSection();
  initIdeaForm();
  initFeedbackForm();
});
