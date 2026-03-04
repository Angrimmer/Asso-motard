function initRidePage() {
  if (!document.body.classList.contains("ride-page")) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const idParam = params.get("id");
  const id = idParam ? parseInt(idParam, 10) : NaN;

  const titleEl = document.getElementById("ride-title");
  const metaEl = document.getElementById("ride-meta");
  const dateEl = document.getElementById("ride-date");
  const typeEl = document.getElementById("ride-type");
  const levelEl = document.getElementById("ride-level");
  const statusEl = document.getElementById("ride-status");
  const descEl = document.getElementById("ride-description");
  const galleryEl = document.getElementById("ride-gallery");

  if (!idParam || isNaN(id)) {
    if (titleEl) titleEl.textContent = "Sortie introuvable";
    if (descEl) descEl.textContent = "Aucune sortie n’est associée à cet identifiant.";
    return;
  }

  const ride = rides.find(r => r.id === id);
  if (!ride) {
    if (titleEl) titleEl.textContent = "Sortie introuvable";
    if (descEl) descEl.textContent = "Aucune sortie n’est associée à cet identifiant.";
    return;
  }

  // Remplissage
  if (titleEl) titleEl.textContent = ride.title;
  if (metaEl)  metaEl.textContent  = ride.meta || "";
  if (dateEl)  dateEl.textContent  = ride.date;
  if (typeEl)  typeEl.textContent  = ride.type;
  if (levelEl) levelEl.textContent = ride.level;
  if (statusEl) statusEl.textContent = ride.statusLabel;

  if (descEl && Array.isArray(ride.description)) {
    descEl.innerHTML = ride.description
      .map(p => "<p>" + p + "</p>")
      .join("");
  }

  if (galleryEl) {
    galleryEl.innerHTML = "";
    if (Array.isArray(ride.gallery) && ride.gallery.length > 0) {
      ride.gallery.forEach(url => {
        const item = document.createElement("div");
        item.className = "ride-gallery-item";
        item.innerHTML = '<img src="' + url + '" alt="Photo de la sortie" />';
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
}

function initRideLightbox() {
  const lightbox = document.getElementById("ride-lightbox");
  const lightboxImg = document.getElementById("ride-lightbox-img");
  if (!lightbox || !lightboxImg) return;

  // Cliquez sur une vignette pour l'agrandir
  const thumbs = document.querySelectorAll(".ride-gallery-item img");
  for (let i = 0; i < thumbs.length; i++) {
    const img = thumbs[i];
    img.addEventListener("click", function () {
      lightboxImg.src = img.src;
      lightbox.classList.add("ride-lightbox--open");
    });
  }

  // Cliquez sur le fond pour fermer
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target === lightboxImg.parentElement) {
      lightbox.classList.remove("ride-lightbox--open");
      lightboxImg.src = "";
    }
  });
}

  document.addEventListener("DOMContentLoaded", function () {
  initRidePage();
});