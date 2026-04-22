const db = require("../db");

function toSlug(title) {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function findAll() {
  const [rows] = await db.query(
    "SELECT id, title, start_date, end_date, type, level, status FROM rides ORDER BY start_date DESC"
  );
  return rows;
}

async function findPast() {
  const [rows] = await db.query(
    "SELECT id, title, start_date FROM rides WHERE status = 'past' ORDER BY start_date DESC"
  );
  return rows;
}

async function findById(id) {
  const [[ride]] = await db.query(
    "SELECT id, title, start_date, end_date, type, level, status, short_description, full_description FROM rides WHERE id = ?",
    [id]
  );
  return ride || null;
}

async function findByIdWithStatus(id) {
  const [[ride]] = await db.query("SELECT id, status FROM rides WHERE id = ?", [id]);
  return ride || null;
}

async function create({ title, start_date, end_date, type, level, status, short_description, full_description, created_by }) {
  const slug = toSlug(title);
  await db.query(
    `INSERT INTO rides (title, slug, start_date, end_date, type, level, status, short_description, full_description, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, slug, start_date, end_date || null, type, level, status, short_description || null, full_description || null, created_by]
  );
}

async function update(id, { title, start_date, end_date, type, level, status, short_description, full_description }) {
  const slug = toSlug(title);
  await db.query(
    `UPDATE rides SET title=?, slug=?, start_date=?, end_date=?, type=?, level=?, status=?, short_description=?, full_description=?
     WHERE id=?`,
    [title, slug, start_date, end_date || null, type, level, status, short_description || null, full_description || null, id]
  );
}

async function remove(id) {
  await db.query("DELETE FROM rides WHERE id = ?", [id]);
}

module.exports = { findAll, findPast, findById, findByIdWithStatus, create, update, remove };
