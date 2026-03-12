// ─────────────────────────────────────────
// CONFIG API
// ─────────────────────────────────────────
const API = "http://localhost:4000";

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

  // Chargement depuis l'API
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
    if (titleEl)  titleEl.textContent  = ride.title;
    if (dateEl)   dateEl.textContent   = ride.start_date ? new Date(ride.start_date).toLocaleDateString("fr-FR") : "–";
    if (typeEl)   typeEl.textContent   = ride.type;
    if (levelEl)  levelEl.textContent  = ride.level;
    const statusLabels = { upcoming: "Inscriptions ouvertes", planned: "Prévue", past: "Terminé" };
      if (statusEl) statusEl.textContent = statusLabels[ride.status] || ride.status;

    if (metaEl)   metaEl.textContent   = [
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
          item.innerHTML = '<img src="' + photo.url + '" alt="' + (photo.caption || "Photo de la sortie") + '" />';
          galleryEl.appendChild(item);
        });
      } else {
        const placeholder = document.createElement("p");
        placeholder.style.fontSize = "0.85rem";
        placeholder.style.color = "var(--text-muted)";
        placeholder.textContent = "Pas encore de photos pour cette sortie.";
        galleryEl.appendChild(placeholder);
      }
    }

    initRideLightbox();

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
// INIT
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  initRidePage();
});
