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

      // Si le bouton est désactivé, on ne fait rien
      if (btn.classList.contains("ride-btn--disabled")) {
        alert("Le compte rendu ou les inscriptions ne sont pas encore disponibles pour cette sortie.");
        return;
      }

      // Action selon le type
      if (ride.actionType === "register") {
        // page d'inscription
        window.open(ride.actionUrl, "_blank");
      }

      if (ride.actionType === "report") {
        // page compte rendu de type ride.html?id=...
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

      // état visuel
      filterButtons.forEach(b => b.classList.remove("rides-filter--active"));
      btn.classList.add("rides-filter--active");

      // re-générer le tableau avec le bon filtre
      renderRidesTable(filter);
    });
  });

  // affichage initial
  renderRidesTable("all");
}


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
}

document.addEventListener("DOMContentLoaded", function () {
  initRideFilters();
  initRidePage();
});