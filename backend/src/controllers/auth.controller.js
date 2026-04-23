const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user.model");
const { sendResetPasswordEmail } = require("../mailer");

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }
  try {
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: "Identifiants incorrects." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Identifiants incorrects." });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      message: "Connexion réussie.",
      token,
      must_change_password: user.must_change_password === 1,
      user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role }
    });
  } catch (err) {
    console.error("Erreur /login :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function verifyToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token manquant." });
  try {
    const user = await User.findByActivationToken(token);
    if (!user) return res.status(400).json({ error: "Token invalide ou expiré." });
    res.json({ valid: true, user });
  } catch (err) {
    console.error("Erreur /verify-token :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function setPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token et mot de passe requis." });
  if (password.length < 8) return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });
  try {
    const user = await User.findByActivationToken(token);
    if (!user) return res.status(400).json({ error: "Token invalide ou expiré." });
    const hash = await bcrypt.hash(password, 10);
    await User.activateAccount(user.id, hash);
    res.json({ message: "Compte activé ! Vous pouvez maintenant vous connecter." });
  } catch (err) {
    console.error("Erreur /set-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function changePassword(req, res) {
  // user_id tiré du token JWT, pas du body (évite qu'un membre modifie le mdp d'un autre)
  const user_id = req.user.id;
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });
  }
  try {
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
    const ok = await bcrypt.compare(old_password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Ancien mot de passe incorrect." });
    const hash = await bcrypt.hash(new_password, 10);
    await User.updatePassword(user_id, hash);
    res.json({ message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    console.error("Erreur /change-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requis." });
  try {
    const user = await User.findByEmail(email);
    if (!user) return res.json({ message: "Si cet email existe, un lien vous a été envoyé." });
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    await User.setResetToken(user.id, token, expires);
    await sendResetPasswordEmail(email, user.display_name, token);
    res.json({ message: "Si cet email existe, un lien vous a été envoyé." });
  } catch (err) {
    console.error("Erreur /forgot-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token et mot de passe requis." });
  if (password.length < 8) return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });
  try {
    const user = await User.findByResetToken(token);
    if (!user) return res.status(400).json({ error: "Token invalide ou expiré." });
    const hash = await bcrypt.hash(password, 10);
    await User.resetPassword(user.id, hash);
    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error("Erreur /reset-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

module.exports = { login, verifyToken, setPassword, changePassword, forgotPassword, resetPassword };
