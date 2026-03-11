const API = "http://localhost:4000";

    // Récupérer le token dans l'URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    function show(id) {
      ["card-loading", "card-form", "card-error", "card-success"].forEach(c => {
        document.getElementById(c).style.display = "none";
      });
      document.getElementById(id).style.display = "block";
    }

    // Au chargement : vérifier le token
    async function verifierToken() {
      if (!token) {
        show("card-error");
        return;
      }

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

    // Soumission du formulaire
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

      try {
        const res = await fetch(`${API}/api/auth/set-password`, {
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