const db = require("../db");

async function findByEmail(email) {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE email = ? AND is_active = 1",
    [email]
  );
  return rows[0] || null;
}

async function findByEmailAny(email) {
  const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE id = ? AND is_active = 1",
    [id]
  );
  return rows[0] || null;
}

async function findByActivationToken(token) {
  const [rows] = await db.query(
    "SELECT id, display_name, email FROM users WHERE activation_token = ? AND token_expires_at > NOW()",
    [token]
  );
  return rows[0] || null;
}

async function findByResetToken(token) {
  const [rows] = await db.query(
    "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
    [token]
  );
  return rows[0] || null;
}

async function create({ email, display_name, role, token, expires }) {
  await db.query(
    `INSERT INTO users (email, password_hash, display_name, role, must_change_password, is_active, activation_token, token_expires_at)
     VALUES (?, '', ?, ?, 1, 0, ?, ?)`,
    [email, display_name, role, token, expires]
  );
}

async function activateAccount(id, hash) {
  await db.query(
    `UPDATE users SET password_hash = ?, is_active = 1, must_change_password = 0,
     activation_token = NULL, token_expires_at = NULL WHERE id = ?`,
    [hash, id]
  );
}

async function updatePassword(id, hash) {
  await db.query(
    "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
    [hash, id]
  );
}

async function setResetToken(id, token, expires) {
  await db.query(
    "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
    [token, expires, id]
  );
}

async function resetPassword(id, hash) {
  await db.query(
    "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
    [hash, id]
  );
}

async function count() {
  const [rows] = await db.query("SELECT COUNT(*) as count FROM users");
  return rows[0].count;
}

module.exports = {
  findByEmail, findByEmailAny, findById,
  findByActivationToken, findByResetToken,
  create, activateAccount, updatePassword,
  setResetToken, resetPassword, count
};
