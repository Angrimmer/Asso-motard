const express = require("express");
const db = require("../db");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// ─────────────────────────────────────────
// POST /api/member/idea
// Soumettre une idée
// ─────────────────────────────────────────
router.post("/idea", authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  const user_id = req.user.id;

  if (!title || !content) {
    return res.status(400).json({ error: "Titre et contenu requis." });
  }

  try {
    await db.query(
      "INSERT INTO ideas (user_id, title, content, status) VALUES (?, ?, ?, 'pending')",
      [user_id, title, content]
    );
    res.status(201).json({ message: "Votre idée a bien été envoyée au bureau !" });
  } catch (err) {
    console.error("Erreur /idea :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// POST /api/member/feedback
// Soumettre un avis sur une sortie
// ─────────────────────────────────────────
router.post("/feedback", authMiddleware, async (req, res) => {
  const { ride_id, rating, comment } = req.body;
  const user_id = req.user.id;

  if (!ride_id || !rating || !comment) {
    return res.status(400).json({ error: "Sortie, note et commentaire requis." });
  }

  const ratingInt = parseInt(rating, 10);
  if (ratingInt < 1 || ratingInt > 5) {
    return res.status(400).json({ error: "La note doit être entre 1 et 5." });
  }

  try {
    await db.query(
      "INSERT INTO ride_feedback (ride_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
      [ride_id, user_id, ratingInt, comment]
    );
    res.status(201).json({ message: "Votre avis a bien été envoyé, merci !" });
  } catch (err) {
    console.error("Erreur /feedback :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// GET /api/member/rides
// Récupérer les sorties pour remplir le select
// ─────────────────────────────────────────
router.get("/rides", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, title, start_date FROM rides WHERE status = 'past' ORDER BY start_date DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur /rides :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// GET /api/member/all-rides
// Toutes les sorties pour le tableau membres
// ─────────────────────────────────────────
router.get("/all-rides", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, title, start_date, end_date, type, level, status FROM rides ORDER BY start_date DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur /all-rides :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// GET /api/member/ride/:id
// Détail d'une sortie + ses photos
// ─────────────────────────────────────────
router.get("/ride/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  try {
    const [[ride]] = await db.query(
      "SELECT id, title, start_date, end_date, type, level, status, short_description, full_description FROM rides WHERE id = ?",
      [id]
    );

    if (!ride) return res.status(404).json({ error: "Sortie introuvable." });

    const [photos] = await db.query(
      "SELECT url, caption FROM ride_photos WHERE ride_id = ? AND is_approved = 1 ORDER BY taken_at ASC",
      [id]
    );

    ride.photos = photos;
    res.json(ride);
  } catch (err) {
    console.error("Erreur /ride/:id :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});


module.exports = router;