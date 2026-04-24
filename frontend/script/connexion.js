document.getElementById("login-form").addEventListener("submit", async function (e) {
  e.preventDefault(); // Empêche le rechargement de la page

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const reponse = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await reponse.json();

    if (reponse.ok) {
      // Stocker le token
      localStorage.setItem("token", data.token);
      // Rediriger vers l'espace membre
      window.location.href = "membres.html";
    } else {
      alert(data.error || "Identifiants incorrects.");
    }

  } catch (err) {
    alert("Impossible de contacter le serveur.");
    console.error(err);
  }
});

// ─────────────────────────────────────────
// MOT DE PASSE OUBLIÉ
// ─────────────────────────────────────────
const forgotLink = document.getElementById("forgot-password-link");
const forgotWrapper = document.getElementById("forgot-form-wrapper");
const forgotForm = document.getElementById("forgot-form");
const forgotMsg = document.getElementById("forgot-msg");

if (forgotLink && forgotWrapper) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    forgotWrapper.classList.toggle("visible");
  });
}

if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value.trim();

    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      forgotMsg.style.display = "block";
      forgotMsg.style.color = res.ok ? "green" : "red";
      forgotMsg.textContent = res.ok ? "✅ " + data.message : "❌ " + data.error;
      if (res.ok) forgotForm.reset();
    } catch {
      forgotMsg.style.display = "block";
      forgotMsg.style.color = "red";
      forgotMsg.textContent = "❌ Impossible de contacter le serveur.";
    }
  });
}

