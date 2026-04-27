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
// PAGE COMPTE RENDU DE SORTIE
// ─────────────────────────────────────────
async function initRidePage() {
  if (!document.body.classList.contains("ride-page")) return;

  const params = new URLSearchParams(window.location.search);
  const idParam = params.get("id");
  const id = idParam ? parseInt(idParam, 10) : NaN;

  const titleEl   = document.getElementById("ride-title");
  const metaEl    = document.getElementById("ride-meta");
  const dateEl    = document.getElementById("ride-date");
  const typeEl    = document.getElementById("ride-type");
  const levelEl   = document.getElementById("ride-level");
  const statusEl  = document.getElementById("ride-status");
  const descEl    = document.getElementById("ride-description");
  const galleryEl = document.getElementById("ride-gallery");

  if (!idParam || isNaN(id)) {
    if (titleEl) titleEl.textContent = "Sortie introuvable";
    if (descEl)  descEl.textContent  = "Aucune sortie n'est associée à cet identifiant.";
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/api/member/ride/${id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      if (titleEl) titleEl.textContent = "Sortie introuvable";
      if (descEl)  descEl.textContent  = "Cette sortie n'existe pas ou a été supprimée.";
      return;
    }

    const ride = await res.json();

    // Remplissage
    if (titleEl) titleEl.textContent = ride.title;
    if (dateEl)  dateEl.textContent  = ride.start_date ? new Date(ride.start_date).toLocaleDateString("fr-FR") : "–";
    if (typeEl)  typeEl.textContent  = ride.type;
    if (levelEl) levelEl.textContent = ride.level;

    const statusLabels = { upcoming: "Inscriptions ouvertes", planned: "Prévue", past: "Terminé" };
    if (statusEl) statusEl.textContent = statusLabels[ride.status] || ride.status;

    if (metaEl) metaEl.textContent = [
      ride.start_date ? new Date(ride.start_date).toLocaleDateString("fr-FR") : null,
      ride.type,
      ride.level
    ].filter(Boolean).join(" • ");

    // Description
    if (descEl) {
      if (ride.full_description) {
        descEl.innerHTML = "<p>" + ride.full_description.replace(/\n/g, "</p><p>") + "</p>";
      } else if (ride.short_description) {
        descEl.innerHTML = "<p>" + ride.short_description + "</p>";
      } else {
        descEl.textContent = "Aucun compte rendu disponible pour cette sortie.";
      }
    }

    // Galerie photos
    if (galleryEl) {
      galleryEl.innerHTML = "";
      if (Array.isArray(ride.photos) && ride.photos.length > 0) {
        ride.photos.forEach(photo => {
          const item = document.createElement("div");
          item.className = "ride-gallery-item";
          item.innerHTML = '<img src="' + API + photo.url + '" alt="' + (photo.caption || "Photo de la sortie") + '" />';
          galleryEl.appendChild(item);
        });
      } else {
        const placeholder = document.createElement("p");
        placeholder.className = "loading-text";
        placeholder.textContent = "Pas encore de photos pour cette sortie.";
        galleryEl.appendChild(placeholder);
      }
    }

    initRideLightbox();
    initRideFeedback(id);
    initRideRegistration(id, ride.status);

  } catch {
    if (titleEl) titleEl.textContent = "Erreur de chargement";
    if (descEl)  descEl.textContent  = "Impossible de contacter le serveur.";
  }
}


// ─────────────────────────────────────────
// LIGHTBOX
// ─────────────────────────────────────────
function initRideLightbox() {
  const lightbox    = document.getElementById("ride-lightbox");
  const lightboxImg = document.getElementById("ride-lightbox-img");
  if (!lightbox || !lightboxImg) return;

  const thumbs = document.querySelectorAll(".ride-gallery-item img");
  for (let i = 0; i < thumbs.length; i++) {
    const img = thumbs[i];
    img.addEventListener("click", function () {
      lightboxImg.src = img.src;
      lightbox.classList.add("ride-lightbox--open");
    });
  }

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target === lightboxImg.parentElement) {
      lightbox.classList.remove("ride-lightbox--open");
      lightboxImg.src = "";
    }
  });
}

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
// AVIS SUR LA SORTIE
// ─────────────────────────────────────────
async function initRideFeedback(rideId) {
  const container = document.getElementById("ride-feedback-list");
  if (!container) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/api/member/ride/${rideId}/feedback`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--text-muted);">Impossible de charger les avis.</p>';
      return;
    }

    const feedbacks = await res.json();

    if (feedbacks.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucun avis pour cette sortie.</p>';
      return;
    }

    container.innerHTML = "";
    feedbacks.forEach(function (fb) {
      const stars = "★".repeat(fb.rating) + "☆".repeat(5 - fb.rating);
      const card = document.createElement("div");
      card.className = "feedback-card";
      card.innerHTML =
        '<div class="feedback-header">' +
        '<span class="feedback-author">' + fb.author + '</span>' +
        '<span class="feedback-stars">' + stars + '</span>' +
        '<span class="feedback-date">' + new Date(fb.created_at).toLocaleDateString("fr-FR") + '</span>' +
        '</div>' +
        '<p class="feedback-comment">' + fb.comment + '</p>';
      container.appendChild(card);
    });

  } catch {
    container.innerHTML = '<p style="color:var(--text-muted);">Erreur réseau.</p>';
  }
}

// ─────────────────────────────────────────
// INSCRIPTION / INSCRITS
// ─────────────────────────────────────────
async function initRideRegistration(rideId, rideStatus) {
  const token = localStorage.getItem("token");
  const registerSection = document.getElementById("ride-register-section");
  const registerBtn = document.getElementById("ride-register-btn");
  const registerMsg = document.getElementById("ride-register-msg");
  const registrationsList = document.getElementById("ride-registrations-list");

  if (rideStatus === "upcoming" && registerSection) {
    registerSection.style.display = "block";

    // Vérifier si déjà inscrit
    try {
      const res = await fetch(`${API}/api/member/ride/${rideId}/is-registered`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.registered) {
        registerBtn.textContent = "Se désinscrire";
        registerBtn.classList.add("ride-unregister-btn");
      }
    } catch {}

    registerBtn.addEventListener("click", async function () {
      const isRegistered = registerBtn.classList.contains("ride-unregister-btn");
      const method = isRegistered ? "DELETE" : "POST";

      try {
        const res = await fetch(`${API}/api/member/ride/${rideId}/register`, {
          method,
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        if (registerMsg) {
          registerMsg.style.display = "block";
          if (res.ok) {
            registerMsg.style.color = "green";
            registerMsg.textContent = "✅ " + data.message;
            if (isRegistered) {
              registerBtn.textContent = "S'inscrire à cette sortie";
              registerBtn.classList.remove("ride-unregister-btn");
            } else {
              registerBtn.textContent = "Se désinscrire";
              registerBtn.classList.add("ride-unregister-btn");
            }
            await loadRegistrations(rideId, token, registrationsList);
          } else {
            registerMsg.style.color = "red";
            registerMsg.textContent = "❌ " + (data.error || "Erreur inconnue.");
          }
        }
      } catch {
        if (registerMsg) {
          registerMsg.style.display = "block";
          registerMsg.style.color = "red";
          registerMsg.textContent = "❌ Impossible de contacter le serveur.";
        }
      }
    });
  }

  await loadRegistrations(rideId, token, registrationsList);
}


async function loadRegistrations(rideId, token, container) {
  if (!container) return;

  try {
    const res = await fetch(`${API}/api/member/ride/${rideId}/registrations`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Impossible de charger.</p>';
      return;
    }

    const registrations = await res.json();

    if (registrations.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Aucun inscrit pour l\'instant.</p>';
      return;
    }

    container.innerHTML = "";
    registrations.forEach(function (reg) {
      const item = document.createElement("div");
      item.style.cssText = "font-size:0.85rem; padding:0.3rem 0; border-bottom:1px solid var(--border-soft); color:var(--text-light);";
      item.textContent = reg.display_name;
      container.appendChild(item);
    });

  } catch {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Erreur réseau.</p>';
  }
}


// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  initLogout();
  initRidePage();
});
