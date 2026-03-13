// ─────────────────────────────────────────
// CONFIG API
// ─────────────────────────────────────────
const API = "http://localhost:4000";

// ─────────────────────────────────────────
// GARDE D'AUTHENTIFICATION
// ─────────────────────────────────────────
(function authGuard() {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "connexion.html"; return; }
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("token");
      window.location.href = "connexion.html";
    }
  } catch {
    localStorage.removeItem("token");
    window.location.href = "connexion.html";
  }
})();

// ─────────────────────────────────────────
// DÉCONNEXION
// ─────────────────────────────────────────
function initLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    localStorage.removeItem("token");
    window.location.href = "connexion.html";
  });
}

// ─────────────────────────────────────────
// GALERIE
// ─────────────────────────────────────────
let allPhotos = [];

async function loadGalerie(rideId = "") {
  const token = localStorage.getItem("token");
  const grid = document.getElementById("galerie-grid");
  grid.innerHTML = '<p style="color:var(--text-muted);">Chargement…</p>';

  try {
    const url = rideId
      ? `${API}/api/member/photos?ride_id=${rideId}`
      : `${API}/api/member/photos`;

    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      grid.innerHTML = '<p class="galerie-empty">Impossible de charger les photos.</p>';
      return;
    }

    allPhotos = await res.json();
    renderGalerie();

  } catch {
    grid.innerHTML = '<p class="galerie-empty">Erreur réseau.</p>';
  }
}

function renderGalerie() {
  const grid = document.getElementById("galerie-grid");
  grid.innerHTML = "";

  if (allPhotos.length === 0) {
    grid.innerHTML = '<p class="galerie-empty">Aucune photo disponible.</p>';
    return;
  }

  // Vérifier si admin/bureau
  let isAdmin = false;
  try {
    const payload = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
    isAdmin = payload.role === "admin" || payload.role === "bureau";
  } catch {}

  allPhotos.forEach(function (photo) {
    const item = document.createElement("div");
    item.className = "galerie-item";
    item.innerHTML =
      '<img src="' + API + photo.url + '" alt="' + (photo.caption || "Photo de sortie") + '" />' +
      (photo.caption ? '<div class="galerie-item-caption">' + photo.caption + '</div>' : '') +
      (isAdmin ? '<button class="galerie-delete-btn" data-photo-id="' + photo.id + '">🗑 Supprimer</button>' : '');
    grid.appendChild(item);
  });

  initLightbox();
  if (isAdmin) initDeleteButtons();
}

function initDeleteButtons() {
  const buttons = document.querySelectorAll(".galerie-delete-btn");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", async function (e) {
      e.stopPropagation();
      const id = btn.dataset.photoId;
      if (!confirm("Supprimer cette photo définitivement ?")) return;

      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API}/api/admin/photo/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          btn.closest(".galerie-item").remove();
        } else {
          alert("❌ " + (data.error || "Erreur inconnue."));
        }
      } catch {
        alert("❌ Impossible de contacter le serveur.");
      }
    });
  });
}


function initLightbox() {
  const lightbox = document.getElementById("galerie-lightbox");
  const lightboxImg = document.getElementById("galerie-lightbox-img");
  if (!lightbox || !lightboxImg) return;

  const imgs = document.querySelectorAll(".galerie-item img");
  imgs.forEach(function (img) {
    img.addEventListener("click", function () {
      lightboxImg.src = img.src;
      lightbox.classList.add("ride-lightbox--open");
    });
  });

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target === lightboxImg.parentElement) {
      lightbox.classList.remove("ride-lightbox--open");
      lightboxImg.src = "";
    }
  });
}

async function initSelect() {
  const token = localStorage.getItem("token");
  const select = document.getElementById("galerie-ride-select");

  try {
    const res = await fetch(`${API}/api/member/all-rides`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const rides = await res.json();
      rides.forEach(function (ride) {
        const opt = document.createElement("option");
        opt.value = ride.id;
        opt.textContent = ride.title + " – " + new Date(ride.start_date).toLocaleDateString("fr-FR");
        select.appendChild(opt);
      });
    }
  } catch {}

  select.addEventListener("change", function () {
    loadGalerie(select.value);
  });
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  initLogout();
  initSelect();
  loadGalerie();
  initDeleteButtons()
});
