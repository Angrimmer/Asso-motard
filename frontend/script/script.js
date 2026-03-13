document.addEventListener("DOMContentLoaded", () => {
const duration = 1500;

function animateCounter(el, target) {
  const start = 0;
  const startTime = performance.now();

  function update(now) {
  const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.floor(start + (target - start) * progress);
     el.textContent = value.toString();
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// 1) Compteur MEMBERS (données du site apparaissant dans la Page d’accueil)
const membersEl = document.getElementById("members-counter");
  if (membersEl) {
    fetch("/api/membres/count") // URL à adapter selon ton hébergeur
      .then((res) => res.json())
      .then((data) => {
      const total = parseInt(data.count, 10) || 0;
      animateCounter(membersEl, total);
    })
  .catch((err) => {
    console.error("Erreur compteur membres :", err);
    membersEl.textContent = "?";
  });
}

// 2) Compteur FOLLOWERS Facebook (valeur fixée côté front pour l’instant)
const followersEl = document.getElementById("followers-counter");
if (followersEl && followersEl.dataset.target) {
  const target = parseInt(followersEl.dataset.target, 10) || 0;
  animateCounter(followersEl, target);
  }
});

(function () {
  const link = document.getElementById("nav-membres-link");
  if (!link) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("token");
      return;
    }
    link.href = "membres.html";
  } catch {
    localStorage.removeItem("token");
  }
})();