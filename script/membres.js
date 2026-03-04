const rides = [
  {
    id: 1,
    date: "28/03/2026",
    title: "Route des Crêtes – Vosges",
    type: "Balade journée",
    level: "Intermédiaire",
    status: "upcoming",        // upcoming | past
    category: "caritatif",        // balade | roadtrip | caritatif
    statusLabel: "Inscriptions ouvertes",
    actionType: "register",
    actionLabel: "S'inscrire",
    actionUrl: "ride.html?id=1"
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
    actionType: "disabled",
    actionLabel: "À venir",
    actionUrl: "ride.html?id=2"
  },
  {
    id: 3,
    date: "01–03/05/2026",
    title: "Roadtrip Forêt Noire",
    type: "Road trip",
    level: "Confirmé",
    status: "past",
    category: "roadtrip",
    statusLabel: "Terminé",
    actionType: "report",
    actionLabel: "Compte rendu",
    actionUrl: "ride.html?id=3"
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


document.addEventListener("DOMContentLoaded", () => {
  initRideFilters();
});
