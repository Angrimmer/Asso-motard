document.getElementById("login-form").addEventListener("submit", async function (e) {
  e.preventDefault(); // Empêche le rechargement de la page

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const reponse = await fetch("http://localhost:4000/api/auth/login", {
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
