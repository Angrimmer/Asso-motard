const db = require("../db");

async function findByRide(ride_id) {
  const [rows] = await db.query(
    `SELECT u.display_name, rr.created_at
     FROM ride_registrations rr
     JOIN users u ON rr.user_id = u.id
     WHERE rr.ride_id = ?
     ORDER BY rr.created_at ASC`,
    [ride_id]
  );
  return rows;
}

async function findOne(ride_id, user_id) {
  const [[row]] = await db.query(
    "SELECT id FROM ride_registrations WHERE ride_id = ? AND user_id = ?",
    [ride_id, user_id]
  );
  return row || null;
}

async function create(ride_id, user_id) {
  await db.query(
    "INSERT INTO ride_registrations (ride_id, user_id) VALUES (?, ?)",
    [ride_id, user_id]
  );
}

async function remove(ride_id, user_id) {
  await db.query(
    "DELETE FROM ride_registrations WHERE ride_id = ? AND user_id = ?",
    [ride_id, user_id]
  );
}

module.exports = { findByRide, findOne, create, remove };
