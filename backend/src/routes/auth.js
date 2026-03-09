const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? AND is_active = 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      message: "Connexion réussie.",
      token,
      must_change_password: user.must_change_password === 1,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Erreur /login :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/auth/change-password
router.post("/change-password", async (req, res) => {
  const { user_id, old_password, new_password } = req.body;

  if (!user_id || !old_password || !new_password) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE id = ? AND is_active = 1",
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(old_password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Ancien mot de passe incorrect." });
    }

    const newHash = await bcrypt.hash(new_password, 10);

    await db.query(
      "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
      [newHash, user_id]
    );

    res.json({ message: "Mot de passe mis à jour avec succès." });

  } catch (err) {
    console.error("Erreur /change-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
