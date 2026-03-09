const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Middleware pour vérifier que c'est bien un admin
function adminOnly(req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "bureau") {
    return res.status(403).json({ error: "Accès réservé au bureau." });
  }
  next();
}

// POST /api/admin/create-user → créer un membre avec mot de passe temporaire
router.post("/create-user", authMiddleware, adminOnly, async (req, res) => {
  const { email, display_name, role, temp_password } = req.body;

  if (!email || !display_name || !temp_password) {
    return res.status(400).json({ error: "Email, nom et mot de passe temporaire requis." });
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Cet email est déjà utilisé." });
    }

    const hash = await bcrypt.hash(temp_password, 10);

    await db.query(
      "INSERT INTO users (email, password_hash, display_name, role, must_change_password, is_active) VALUES (?, ?, ?, ?, 1, 1)",
      [email, hash, display_name, role || "member"]
    );

    res.status(201).json({ message: "Compte créé avec succès. Le membre doit changer son mot de passe à la première connexion." });

  } catch (err) {
    console.error("Erreur /create-user :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;