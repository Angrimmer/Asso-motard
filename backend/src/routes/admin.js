const express = require("express");
const crypto = require("crypto");           //← NOUVEAU (natif Node, pas besoin d'install)
const db = require("../db");
const authMiddleware = require("../middlewares/auth.middleware");
const { sendActivationEmail } = require("../mailer"); // ← NOUVEAU (à créer juste après)

const router = express.Router();

// Middleware pour vérifier que c'est bien un admin
function adminOnly(req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "bureau") {
    return res.status(403).json({ error: "Accès réservé au bureau." });
  }
  next();
}

// POST /api/admin/create-user → créer un membre + envoyer email d'activation
router.post("/create-user", authMiddleware, adminOnly, async (req, res) => {
  const { email, display_name, role } = req.body; // ← plus de temp_password

  if (!email || !display_name) {
    return res.status(400).json({ error: "Email et nom requis." });
  }

  try {
    // Vérifier si l'email existe déjà
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Cet email est déjà utilisé." });
    }

    // Générer un token unique + expiration dans 48h
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    // Insérer le compte (inactif, sans mot de passe)
    await db.query(
      `INSERT INTO users 
        (email, password_hash, display_name, role, must_change_password, is_active, activation_token, token_expires_at) 
       VALUES (?, '', ?, ?, 1, 0, ?, ?)`,
      [email, display_name, role || "member", token, expires]
    );

    // Envoyer l'email d'activation
    await sendActivationEmail(email, display_name, token);

    res.status(201).json({ message: "Compte créé. Un email d'activation a été envoyé au membre." });

  } catch (err) {
    console.error("Erreur /create-user :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
