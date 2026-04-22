const db = require("../db");

async function findAll() {
  const [rows] = await db.query(
    `SELECT i.id, i.title, i.content, i.status, i.created_at, u.display_name as author
     FROM ideas i
     JOIN users u ON i.user_id = u.id
     ORDER BY i.created_at DESC`
  );
  return rows;
}

async function findUnreadNotifications(user_id) {
  const [rows] = await db.query(
    "SELECT id, title FROM ideas WHERE user_id = ? AND status IN ('done', 'refusée') AND notified = 0",
    [user_id]
  );
  return rows;
}

async function create({ user_id, title, content }) {
  await db.query(
    "INSERT INTO ideas (user_id, title, content, status) VALUES (?, ?, ?, 'nouvelle')",
    [user_id, title, content]
  );
}

async function markDone(id) {
  await db.query("UPDATE ideas SET status = 'done' WHERE id = ?", [id]);
}

async function markRejected(id) {
  await db.query("UPDATE ideas SET status = 'refusée' WHERE id = ?", [id]);
}

async function clearNotifications(user_id) {
  await db.query(
    "DELETE FROM ideas WHERE user_id = ? AND status IN ('done', 'refusée') AND notified = 0",
    [user_id]
  );
}

module.exports = { findAll, findUnreadNotifications, create, markDone, markRejected, clearNotifications };
