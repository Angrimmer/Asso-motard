const API = "http://localhost:4000";

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

  // 1) Compteur MEMBERS
  const membersEl = document.getElementById("members-counter");
  if (membersEl) {
    fetch(`${API}/api/member/count`)
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

  // 2) Compteur FOLLOWERS Facebook
  const followersEl = document.getElementById("followers-counter");
  if (followersEl && followersEl.dataset.target) {
    const target = parseInt(followersEl.dataset.target, 10) || 0;
    animateCounter(followersEl, target);
  }

  // Menu burger
  const burgerBtn = document.getElementById("burger-btn");
  const navLinks = document.getElementById("nav-links");
    console.log("burgerBtn =", burgerBtn);
    console.log("navLinks =", navLinks);

  if (burgerBtn && navLinks) {
    // Accessibilité de base
    burgerBtn.setAttribute("aria-expanded", "false");
    burgerBtn.setAttribute("aria-controls", "nav-links");

    burgerBtn.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      burgerBtn.classList.toggle("open", isOpen);
      burgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Fermer le menu quand on clique sur un lien
    navLinks.addEventListener("click", (event) => {
      if (event.target.tagName.toLowerCase() === "a") {
        navLinks.classList.remove("open");
        burgerBtn.classList.remove("open");
        burgerBtn.setAttribute("aria-expanded", "false");
      }
    });
  }
});

// Gestion du lien Espace membres selon le token
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
