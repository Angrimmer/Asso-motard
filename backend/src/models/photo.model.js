const db = require("../db");
const path = require("path");
const fs = require("fs");

async function findPending() {
  const [rows] = await db.query(
    `SELECT rp.id, rp.url, rp.caption, r.title as ride_title, u.display_name as uploaded_by
     FROM ride_photos rp
     JOIN rides r ON rp.ride_id = r.id
     JOIN users u ON rp.uploaded_by = u.id
     WHERE rp.is_approved = 0
     ORDER BY rp.created_at ASC`
  );
  return rows;
}

async function findApproved(ride_id) {
  if (ride_id) {
    const [rows] = await db.query(
      `SELECT rp.id, rp.url, rp.caption, r.title as ride_title
       FROM ride_photos rp JOIN rides r ON rp.ride_id = r.id
       WHERE rp.ride_id = ? AND rp.is_approved = 1 ORDER BY rp.taken_at ASC`,
      [ride_id]
    );
    return rows;
  }
  const [rows] = await db.query(
    `SELECT rp.id, rp.url, rp.caption, r.title as ride_title
     FROM ride_photos rp JOIN rides r ON rp.ride_id = r.id
     WHERE rp.is_approved = 1 ORDER BY r.start_date DESC, rp.taken_at ASC`
  );
  return rows;
}

async function findApprovedByRide(ride_id) {
  const [rows] = await db.query(
    "SELECT url, caption FROM ride_photos WHERE ride_id = ? AND is_approved = 1 ORDER BY taken_at ASC",
    [ride_id]
  );
  return rows;
}

async function findById(id) {
  const [[photo]] = await db.query("SELECT url FROM ride_photos WHERE id = ?", [id]);
  return photo || null;
}

async function insert({ ride_id, url, caption, uploaded_by, is_approved }) {
  await db.query(
    "INSERT INTO ride_photos (ride_id, url, caption, uploaded_by, is_approved) VALUES (?, ?, ?, ?, ?)",
    [ride_id, url, caption || null, uploaded_by, is_approved]
  );
}

async function approve(id) {
  await db.query("UPDATE ride_photos SET is_approved = 1 WHERE id = ?", [id]);
}

async function remove(id) {
  await db.query("DELETE FROM ride_photos WHERE id = ?", [id]);
}

function deleteFile(url) {
  const filePath = path.join(__dirname, "../../../uploads", path.basename(url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { findPending, findApproved, findApprovedByRide, findById, insert, approve, remove, deleteFile };
