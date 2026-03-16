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


// ─────────────────────────────────────────
// GET /api/member/photos
// Photos approuvées, toutes ou par sortie
// ─────────────────────────────────────────
router.get("/photos", authMiddleware, async (req, res) => {
  const ride_id = req.query.ride_id ? parseInt(req.query.ride_id, 10) : null;

  try {
    let rows;
    if (ride_id) {
      [rows] = await db.query(
        "SELECT rp.id, rp.url, rp.caption, r.title as ride_title FROM ride_photos rp JOIN rides r ON rp.ride_id = r.id WHERE rp.ride_id = ? AND rp.is_approved = 1 ORDER BY rp.taken_at ASC",
        [ride_id]
      );
    } else {
      [rows] = await db.query(
        "SELECT rp.id, rp.url, rp.caption, r.title as ride_title FROM ride_photos rp JOIN rides r ON rp.ride_id = r.id WHERE rp.is_approved = 1 ORDER BY r.start_date DESC, rp.taken_at ASC"
      );
    }
    res.json(rows);
  } catch (err) {
    console.error("Erreur /photos :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// POST /api/member/upload-photo
// Upload de photos par un membre (en attente de validation)
// ─────────────────────────────────────────
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Format non supporté."));
  }
});

router.post("/upload-photo", authMiddleware, upload.array("photos", 10), async (req, res) => {
  const { ride_id, caption } = req.body;

  if (!ride_id || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Sortie et photos requises." });
  }

  try {
    for (const file of req.files) {
      const url = "/uploads/" + file.filename;
      await db.query(
        "INSERT INTO ride_photos (ride_id, url, caption, uploaded_by, is_approved) VALUES (?, ?, ?, ?, 0)",
        [ride_id, url, caption || null, req.user.id]
      );
    }
    res.status(201).json({ message: `${req.files.length} photo(s) soumise(s) au bureau pour validation.` });
  } catch (err) {
    console.error("Erreur /upload-photo membre :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});


module.exports = router;