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
// UPLOAD PHOTOS (admin/bureau)
// ─────────────────────────────────────────
async function initUploadPhotoForm() {
  const form = document.getElementById("upload-photo-form");
  if (!form) return;

  const token = localStorage.getItem("token");
  const select = document.getElementById("upload-ride-select");
  const msgEl = document.getElementById("upload-photo-msg");

  // Charger toutes les sorties pour peupler le <select>
  try {
    const res = await fetch(`${API}/api/member/all-rides`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const ridesData = await res.json();
      select.innerHTML = '<option value="">Choisir une sortie…</option>';
      ridesData.forEach(function (ride) {
        const option = document.createElement("option");
        option.value = ride.id;
        option.textContent = ride.title + " – " + new Date(ride.start_date).toLocaleDateString("fr-FR");
        select.appendChild(option);
      });
    }
  } catch {
    // silencieux
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const ride_id = select.value;
    const caption = document.getElementById("upload-caption").value.trim();
    const files = document.getElementById("photo-upload-admin").files;

    if (!ride_id || files.length === 0) {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "red";
        msgEl.textContent = "❌ Choisissez une sortie et au moins une photo.";
      }
      return;
    }

    const formData = new FormData();
    formData.append("ride_id", ride_id);
    formData.append("caption", caption);
    for (let i = 0; i < files.length; i++) {
      formData.append("photos", files[i]);
    }

    try {
      const res = await fetch(`${API}/api/admin/upload-photo`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (msgEl) {
        msgEl.style.display = "block";
        if (res.ok) {
          msgEl.style.color = "green";
          msgEl.textContent = "✅ " + data.message;
          form.reset();
          select.innerHTML = '<option value="">Choisir une sortie…</option>';
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
        option.textContent = ride.title + " – " + new 
          Date(ride.start_date).toLocaleDateString("fr-FR");
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
// UPLOAD PHOTOS MEMBRE
// ─────────────────────────────────────────
async function initMemberUploadForm() {
  const form = document.getElementById("member-upload-form");
  if (!form) return;

  const token = localStorage.getItem("token");
  const select = document.getElementById("member-upload-ride-select");
  const msgEl = document.getElementById("member-upload-msg");

  try {
    const res = await fetch(`${API}/api/member/all-rides`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const ridesData = await res.json();
      select.innerHTML = '<option value="">Choisir une sortie…</option>';
      ridesData.forEach(function (ride) {
        const opt = document.createElement("option");
        opt.value = ride.id;
        opt.textContent = ride.title + " – " + new Date(ride.start_date).toLocaleDateString("fr-FR");
        select.appendChild(opt);
      });
    }
  } catch {}

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const ride_id = select.value;
    const caption = document.getElementById("member-upload-caption").value.trim();
    const files = document.getElementById("photo-upload-member").files;

    if (!ride_id || files.length === 0) {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "red";
        msgEl.textContent = "❌ Choisissez une sortie et au moins une photo.";
      }
      return;
    }

    const formData = new FormData();
    formData.append("ride_id", ride_id);
    formData.append("caption", caption);
    for (let i = 0; i < files.length; i++) {
      formData.append("photos", files[i]);
    }

    try {
      const res = await fetch(`${API}/api/member/upload-photo`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
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
// VALIDATION PHOTOS (admin/bureau)
// ─────────────────────────────────────────
async function initPendingPhotos() {
  const container = document.getElementById("pending-photos-list");
  if (!container) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/api/admin/photos/pending`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return;

    const photos = await res.json();

    if (photos.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune photo en attente.</p>';
      return;
    }

    container.innerHTML = "";
    photos.forEach(function (photo) {
      const item = document.createElement("div");
      item.className = "pending-photo-item";
      item.id = "pending-" + photo.id;
      item.innerHTML =
        '<img src="' + API + photo.url + '" alt="Photo en attente" class="pending-photo-img" />' +
        '<div class="pending-photo-info">' +
        '<span class="pending-photo-ride">' + photo.ride_title + '</span>' +
        '<span class="pending-photo-author">Par : ' + photo.uploaded_by + '</span>' +
        (photo.caption ? '<span class="pending-photo-caption">' + photo.caption + '</span>' : '') +
        '</div>' +
        '<div class="pending-photo-actions">' +
        '<button class="pending-approve-btn" data-id="' + photo.id + '">✅ Approuver</button>' +
        '<button class="pending-reject-btn" data-id="' + photo.id + '">❌ Refuser</button>' +
        '</div>';
      container.appendChild(item);
    });

    initPendingButtons(token);

  } catch {
    container.innerHTML = '<p style="color:red; font-size:0.9rem;">Erreur de chargement.</p>';
  }
}

function initPendingButtons(token) {
  document.querySelectorAll(".pending-approve-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`${API}/api/admin/photo/${id}/approve`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          document.getElementById("pending-" + id).remove();
          const container = document.getElementById("pending-photos-list");
          if (!container.querySelector(".pending-photo-item")) {
            container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune photo en attente.</p>';
          }
        }
      } catch {}
    });
  });

  document.querySelectorAll(".pending-reject-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const id = btn.dataset.id;
      if (!confirm("Refuser et supprimer cette photo ?")) return;
      try {
        const res = await fetch(`${API}/api/admin/photo/${id}/reject`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          document.getElementById("pending-" + id).remove();
          const container = document.getElementById("pending-photos-list");
          if (!container.querySelector(".pending-photo-item")) {
            container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune photo en attente.</p>';
          }
        }
      } catch {}
    });
  });
}

// ─────────────────────────────────────────
// APERÇU GALERIE (3 dernières photos) SECTION RIDES
// ─────────────────────────────────────────
async function initGalleryPreview() {
  const container = document.getElementById("gallery-preview");
  if (!container) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/api/member/photos`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return;

    const photos = await res.json();
    const preview = photos.slice(0, 3);

    if (preview.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; text-align:center;">Aucune photo disponible pour l\'instant.</p>';
      return;
    }

    preview.forEach(function (photo) {
      const item = document.createElement("a");
      item.className = "gallery-preview-item";
      item.href = "galerie.html";
      item.innerHTML = '<img src="' + API + photo.url + '" alt="' + (photo.caption || "Photo de sortie") + '" />';
      container.appendChild(item);
    });

  } catch {}
}

// ─────────────────────────────────────────
// BOÎTE À IDÉES (admin/bureau)
// ─────────────────────────────────────────
async function initIdeasAdmin() {
  const container = document.getElementById("ideas-list");
  if (!container) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/api/admin/ideas`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return;

    const ideas = await res.json();
    const pending = ideas.filter(idea => idea.status === "nouvelle"); 

    if (pending.length === 0) { 
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune idée soumise.</p>';
      return;
    }

    container.innerHTML = "";
    pending.forEach(function (idea) { 
      const item = document.createElement("div");
      item.className = "pending-photo-item"; 
      item.id = "idea-" + idea.id;
      item.innerHTML =
        '<div class="pending-photo-info">' +
        '<span class="pending-photo-ride">' + idea.title + '</span>' +
        '<span class="pending-photo-author">Par : ' + idea.author + ' — ' + new Date(idea.created_at).toLocaleDateString("fr-FR") + '</span>' +
        '<span class="pending-photo-caption">' + idea.content + '</span>' +
        '</div>' +
        '<div class="pending-photo-actions">' +
        '<button class="pending-approve-btn" data-id="' + idea.id + '">✅ Traité</button>' + // ← plus besoin du ternaire non plus
        '<button class="idea-reject-btn" data-id="' + idea.id + '">❌ Refuser</button>' +
        '</div>';
      container.appendChild(item);
    });

    initIdeasButtons(token);

  } catch {
    container.innerHTML = '<p style="color:red; font-size:0.9rem;">Erreur de chargement.</p>';
  }
}

function initIdeasButtons(token) {
  document.querySelectorAll(".pending-approve-btn[data-id]").forEach(function (btn) {
    if (btn.closest("#ideas-list") === null) return;
    btn.addEventListener("click", async function () {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`${API}/api/admin/idea/${id}/done`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          document.getElementById("idea-" + id).remove(); // ← remplace classList.add + replaceWith
          const container = document.getElementById("ideas-list");
          if (!container.querySelector(".pending-photo-item")) {
            container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune idée soumise.</p>';
          }
        }
      } catch {}
    });
  });

  document.querySelectorAll(".idea-reject-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const id = btn.dataset.id;
      if (!confirm("Refuser cette idée ?")) return;
      try {
        const res = await fetch(`${API}/api/admin/idea/${id}/reject`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          document.getElementById("idea-" + id).remove();
          const container = document.getElementById("ideas-list");
          if (!container.querySelector(".pending-photo-item")) {
            container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune idée soumise.</p>';
          }
        }
      } catch {}
    });
  });
}


// notifications pour les idées traitées
async function checkIdeaNotifications() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/member/ideas/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.length > 0) {
      // Marquer comme lu
      await fetch(`${API}/api/member/ideas/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Afficher l'alerte
      const msg = data.length === 1
        ? `💡 Votre idée "${data[0].title}" a été traitée par le bureau.`
        : `💡 ${data.length} de vos idées ont été traitées par le bureau.`;

      showNotificationBanner(msg);
    }
  } catch (err) {
    console.error('Erreur notifications idées :', err);
  }
}

function showNotificationBanner(message) {
  const banner = document.createElement('div');
  banner.className = 'notif-banner';
  banner.textContent = message;
  document.body.appendChild(banner);

  setTimeout(() => banner.classList.add('notif-banner--visible'), 100);
  setTimeout(() => {
    banner.classList.remove('notif-banner--visible');
    setTimeout(() => banner.remove(), 400);
  }, 5000);
}


// ─────────────────────────────────────────
// GESTION DES SORTIES (admin/bureau)
// ─────────────────────────────────────────
async function initRidesAdmin() {
  const form = document.getElementById("ride-form");
  if (!form) return;

  const token = localStorage.getItem("token");
  const submitBtn = document.getElementById("ride-submit-btn");
  const cancelBtn = document.getElementById("ride-cancel-btn");
  const editIdInput = document.getElementById("ride-edit-id");
  const msgEl = document.getElementById("ride-form-msg");

  await loadRidesAdminList(token);

  // Annuler l'édition
  cancelBtn.addEventListener("click", function () {
    form.reset();
    editIdInput.value = "";
    submitBtn.textContent = "➕ Créer la sortie";
    cancelBtn.style.display = "none";
    if (msgEl) msgEl.style.display = "none";
  });

  // Soumission formulaire
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const editId = editIdInput.value;
    const isEdit = editId !== "";

    const body = {
      title: document.getElementById("ride-title-input").value.trim(),
      start_date: document.getElementById("ride-start-date").value,
      end_date: document.getElementById("ride-end-date").value || null,
      type: document.getElementById("ride-type-select").value,
      level: document.getElementById("ride-level-select").value,
      status: document.getElementById("ride-status-select").value,
      short_description: document.getElementById("ride-short-desc").value.trim() || null,
      full_description: document.getElementById("ride-full-desc").value.trim() || null
    };

    const url = isEdit ? `${API}/api/admin/ride/${editId}` : `${API}/api/admin/ride`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (msgEl) {
        msgEl.style.display = "block";
        if (res.ok) {
          msgEl.style.color = "green";
          msgEl.textContent = "✅ " + data.message;
          form.reset();
          editIdInput.value = "";
          submitBtn.textContent = "➕ Créer la sortie";
          cancelBtn.style.display = "none";
          await loadRidesAdminList(token);
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

async function loadRidesAdminList(token) {
  const container = document.getElementById("rides-admin-list");
  if (!container) return;

  try {
    const res = await fetch(`${API}/api/member/all-rides`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--text-muted);">Impossible de charger les sorties.</p>';
      return;
    }

    const rides = await res.json();

    if (rides.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune sortie créée.</p>';
      return;
    }

    container.innerHTML = "";
    rides.forEach(function (ride) {
      const item = document.createElement("div");
      item.className = "pending-photo-item";
      item.id = "ride-admin-" + ride.id;
      item.innerHTML =
        '<div class="pending-photo-info">' +
        '<span class="pending-photo-ride">' + ride.title + '</span>' +
        '<span class="pending-photo-author">' + new Date(ride.start_date).toLocaleDateString("fr-FR") + ' • ' + ride.type + ' • ' + ride.level + '</span>' +
        '<span class="pending-photo-caption">' + ride.status + '</span>' +
        '</div>' +
        '<div class="pending-photo-actions">' +
        '<button class="pending-approve-btn ride-edit-btn" data-id="' + ride.id + '">✏️ Modifier</button>' +
        '<button class="pending-reject-btn ride-delete-btn" data-id="' + ride.id + '">🗑 Supprimer</button>' +
        '</div>';
      container.appendChild(item);
    });

    initRidesAdminButtons(token, rides);

  } catch {
    container.innerHTML = '<p style="color:red;">Erreur de chargement.</p>';
  }
}

function initRidesAdminButtons(token, rides) {
  // Boutons modifier
  document.querySelectorAll(".ride-edit-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = parseInt(btn.dataset.id, 10);
      const ride = rides.find(r => r.id === id);
      if (!ride) return;

      document.getElementById("ride-edit-id").value = ride.id;
      document.getElementById("ride-title-input").value = ride.title;
      document.getElementById("ride-start-date").value = ride.start_date ? ride.start_date.split("T")[0] : "";
      document.getElementById("ride-end-date").value = ride.end_date ? ride.end_date.split("T")[0] : "";
      document.getElementById("ride-type-select").value = ride.type;
      document.getElementById("ride-level-select").value = ride.level;
      document.getElementById("ride-status-select").value = ride.status;
      document.getElementById("ride-short-desc").value = ride.short_description || "";
      document.getElementById("ride-full-desc").value = ride.full_description || "";

      document.getElementById("ride-submit-btn").textContent = "💾 Enregistrer les modifications";
      document.getElementById("ride-cancel-btn").style.display = "inline-block";

      // Scroll vers le formulaire
      document.getElementById("ride-form").scrollIntoView({ behavior: "smooth" });
    });
  });

  // Boutons supprimer
  document.querySelectorAll(".ride-delete-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const id = btn.dataset.id;
      if (!confirm("Supprimer cette sortie définitivement ? Les photos et avis associés seront aussi supprimés.")) return;

      try {
        const res = await fetch(`${API}/api/admin/ride/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          document.getElementById("ride-admin-" + id).remove();
          const container = document.getElementById("rides-admin-list");
          if (!container.querySelector(".pending-photo-item")) {
            container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune sortie créée.</p>';
          }
        }
      } catch {}
    });
  });
}

// Navigation admin
document.querySelectorAll('.admin-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
  });
});


// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  initLogout();
  initRideFilters();
  initAdminSection();
  initIdeaForm();
  initFeedbackForm();
  initUploadPhotoForm();
  initMemberUploadForm();
  initPendingPhotos();
  initGalleryPreview();
  initIdeasAdmin();
  initRidesAdmin();
  checkIdeaNotifications()
});

