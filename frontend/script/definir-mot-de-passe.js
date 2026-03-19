const API = "http://localhost:4000";

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const mode = params.get("mode"); // "reset" ou absent (activation)

function show(id) {
  ["card-loading", "card-form", "card-error", "card-success"].forEach(c => {
    document.getElementById(c).style.display = "none";
  });
  document.getElementById(id).style.display = "block";
}

async function verifierToken() {
  if (!token) {
    show("card-error");
    return;
  }

  // En mode reset, pas besoin de vérifier le token via verify-token
  // on laisse le back valider au moment de la soumission
  if (mode === "reset") {
    document.getElementById("welcome-msg").textContent =
      "Choisissez votre nouveau mot de passe.";
    document.getElementById("set-password-form")
      .querySelector("button[type=submit]").textContent = "Réinitialiser mon mot de passe";
    show("card-form");
    return;
  }

  // Mode activation (comportement existant)
  try {
    const res = await fetch(`${API}/api/auth/verify-token?token=${token}`);
    const data = await res.json();
    if (res.ok && data.valid) {
      document.getElementById("welcome-msg").textContent =
        `Bonjour ${data.user.display_name} ! Choisissez votre mot de passe.`;
      show("card-form");
    } else {
      show("card-error");
    }
  } catch {
    show("card-error");
  }
}

document.getElementById("set-password-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("password-confirm").value;
  const errorMsg = document.getElementById("error-msg");

  if (password !== confirm) {
    errorMsg.textContent = "Les mots de passe ne correspondent pas.";
    errorMsg.style.display = "block";
    return;
  }
  errorMsg.style.display = "none";

  // Choisir la bonne route selon le mode
  const url = mode === "reset"
    ? `${API}/api/auth/reset-password`
    : `${API}/api/auth/set-password`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (res.ok) {
      show("card-success");
    } else {
      errorMsg.textContent = data.error || "Une erreur est survenue.";
      errorMsg.style.display = "block";
    }
  } catch {
    errorMsg.textContent = "Impossible de contacter le serveur.";
    errorMsg.style.display = "block";
  }
});

verifierToken();
