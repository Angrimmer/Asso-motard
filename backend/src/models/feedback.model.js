const db = require("../db");

async function findByRide(ride_id) {
  const [rows] = await db.query(
    `SELECT rf.rating, rf.comment, rf.created_at, u.display_name as author
     FROM ride_feedback rf
     JOIN users u ON rf.user_id = u.id
     WHERE rf.ride_id = ?
     ORDER BY rf.created_at DESC`,
    [ride_id]
  );
  return rows;
}

async function create({ ride_id, user_id, rating, comment }) {
  await db.query(
    "INSERT INTO ride_feedback (ride_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
    [ride_id, user_id, rating, comment]
  );
}

module.exports = { findByRide, create };
