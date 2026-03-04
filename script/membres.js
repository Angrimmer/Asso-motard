const rides = [
  {
    id: 1,
    date: "28/03/2026",
    title: "Route des Crêtes – Vosges",
    type: "Balade journée",
    level: "Intermédiaire",
    status: "upcoming",            // à venir
    category: "balade",
    statusLabel: "Inscriptions ouvertes",

    // Tableau membres
    actionType: "register",
    actionLabel: "S'inscrire",
    actionUrl: "ride.html?id=1",

    meta: "28/03/2026 • Balade journée • Intermédiaire",
    description: [
      "Belle boucle sur la Route des Crêtes avec vue sur les vallées vosgiennes, accessible à tout niveau.",
      "Rendez-vous à 8h30 pour le briefing sécurité, départ à 9h, pauses régulières et retour en fin d’après-midi par les petites routes."
    ],
    gallery: [
      "https://images.pexels.com/photos/2101187/pexels-photo-2101187.jpeg"
    ]
  },
  {
    id: 2,
    date: "10/04/2026",
    title: "Ride by night",
    type: "Soirée",
    level: "Débutant +",
    status: "upcoming",
    category: "balade",
    statusLabel: "Prévue",

    actionType: "disabled",        // pas encore de CR ni d’inscription
    actionLabel: "À venir",
    actionUrl: "ride.html?id=2",

    meta: "10/04/2026 • Soirée • Débutant +",
    description: [
      "Sortie nocturne autour de la vallée, rythme adapté aux débutants avec pauses régulières.",
      "Dîner sur place puis retour groupé, idéal pour découvrir la conduite de nuit en sécurité."
    ],
    gallery: []
  },
  {
    id: 3,
    date: "01–03/05/2026",
    title: "Roadtrip Forêt Noire",
    type: "Road trip",
    level: "Confirmé",
    status: "past",                // déjà passé
    category: "roadtrip",
    statusLabel: "Terminé",

    actionType: "report",
    actionLabel: "Compte rendu",
    actionUrl: "ride.html?id=3",

    meta: "01–03/05/2026 • Road trip • Confirmé",
    description: [
      "Trois jours de virages en Forêt Noire, avec hébergement en gîte et répartition par groupes de niveau.",
      "Premier jour sur les petites routes sinueuses, deuxième jour plus roulant, troisième jour retour tranquille avec de nombreuses pauses photos."
    ],
    gallery: [
      "https://images.pexels.com/photos/3803855/pexels-photo-3803855.jpeg"
    ]
  }
];


function renderRidesTable(filter = "all") {
  const container = document.getElementById("rides-body");
  if (!container) return;

  container.innerHTML = "";

  const filtered = rides.filter(ride => {
    if (filter === "all") return true;
    if (filter === "upcoming") return ride.status === "upcoming";
    if (filter === "past") return ride.status === "past";
    if (filter === "roadtrip") return ride.category === "roadtrip";
    if (filter === "caritatif") return ride.category === "caritatif";
    return true;
  });

  filtered.forEach(ride => {
    const row = document.createElement("div");
    row.className = "rides-row";

    let badgeClass = "";
    if (ride.status === "upcoming") badgeClass = "badge badge-open";
    else if (ride.status === "past") badgeClass = "badge badge-done";

    let btnClass = "ride-btn";
    if (ride.actionType === "disabled") btnClass += " ride-btn--disabled";
    if (ride.actionType === "register") btnClass += " ride-btn--primary";

    row.innerHTML = `
      <span>${ride.date}</span>
      <span>${ride.title}</span>
      <span>${ride.type}</span>
      <span>${ride.level}</span>
      <span class="${badgeClass}">${ride.statusLabel}</span>
      <span>
        <button class="${btnClass}" data-ride-id="${ride.id}">
          ${ride.actionLabel}
        </button>
      </span>
    `;

    container.appendChild(row);
  });

  initRideButtons();
}

function initRideButtons() {
  const buttons = document.querySelectorAll(".ride-btn");

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];

    btn.addEventListener("click", function () {
      const id = parseInt(btn.dataset.rideId, 10);
      const ride = rides.find(r => r.id === id);
      if (!ride) return;

      if (btn.classList.contains("ride-btn--disabled")) {
        alert("Le compte rendu ou les inscriptions ne sont pas encore disponibles pour cette sortie.");
        return;
      }

      if (ride.actionType === "register") {
        window.open(ride.actionUrl, "_blank");
      }

      if (ride.actionType === "report") {
        window.location.href = ride.actionUrl;
      }
    });
  }
}

function initRideFilters() {
  const filterButtons = document.querySelectorAll(".rides-filter");
  if (!filterButtons.length) return;

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

/* --- GALERIES EN BAS DE PAGE --- */

function renderMembersGalleries(filter) {
  const grid = document.getElementById("members-gallery-grid");
  if (!grid) return;

  grid.innerHTML = "";

  const albums = [];
  for (let i = 0; i < rides.length; i++) {
    const ride = rides[i];
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
    const coverUrl = hasPhotos
      ? ride.gallery[0]
      : "https://via.placeholder.com/400x250?text=Aucune+photo";

    const btnLabel = hasPhotos ? "Voir la galerie" : "Pas encore de photos";
    const btnClasses = hasPhotos
      ? "members-gallery-btn"
      : "members-gallery-btn members-gallery-btn--disabled";

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
      const ride = rides.find(r => r.id === id);
      if (!ride) return;

      const hasPhotos = Array.isArray(ride.gallery) && ride.gallery.length > 0;

      if (!hasPhotos || btn.classList.contains("members-gallery-btn--disabled")) {
        alert("Aucune photo n’a encore été ajoutée pour cette sortie.");
        return;
      }

      const url = "ride.html?id=" + ride.id;
      window.location.href = url;
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

      if (btnFilter === filter) {
        btn.classList.add("gallery-filter--active");
      } else {
        btn.classList.remove("gallery-filter--active");
      }
    }
    renderMembersGalleries(filter);
  }

  for (let i = 0; i < filterButtons.length; i++) {
    const btn = filterButtons[i];
    btn.addEventListener("click", function () {
      const filter = btn.dataset.galleryFilter || "all";
      setGalleryFilter(filter);
    });
  }

  setGalleryFilter("all");
}

document.addEventListener("DOMContentLoaded", function () {
  initRideFilters();
  initMembersGalleryFilters();
});
