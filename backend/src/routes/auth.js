const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const crypto = require("crypto"); 
const { sendResetPasswordEmail } = require("../mailer");

const router = express.Router();

// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GET /api/auth/verify-token?token=XXXX
// Vérifie que le token d'activation est valide
// ─────────────────────────────────────────
router.get("/verify-token", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token manquant." });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, display_name, email FROM users WHERE activation_token = ? AND token_expires_at > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Token invalide ou expiré." });
    }

    res.json({ valid: true, user: rows[0] });

  } catch (err) {
    console.error("Erreur /verify-token :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/set-password
// Active le compte via le token + définit le mot de passe
// ─────────────────────────────────────────
router.post("/set-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token et mot de passe requis." });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });
  }

  try {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE activation_token = ? AND token_expires_at > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Token invalide ou expiré." });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users 
       SET password_hash = ?, is_active = 1, must_change_password = 0,
           activation_token = NULL, token_expires_at = NULL
       WHERE id = ?`,
      [hash, rows[0].id]
    );

    res.json({ message: "Compte activé ! Vous pouvez maintenant vous connecter." });

  } catch (err) {
    console.error("Erreur /set-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/change-password
// Utilisateur connecté qui change son mot de passe
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email requis." });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, display_name FROM users WHERE email = ? AND is_active = 1",
      [email]
    );

    if (rows.length === 0) {
      return res.json({ message: "Si cet email existe, un lien vous a été envoyé." });
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [token, expires, user.id]
    );

    await sendResetPasswordEmail(email, user.display_name, token);

    res.json({ message: "Si cet email existe, un lien vous a été envoyé." });
  } catch (err) {
    console.error("Erreur /forgot-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Token et mot de passe requis." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });
  }

  try {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Token invalide ou expiré." });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hash, rows[0].id]
    );

    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error("Erreur /reset-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
