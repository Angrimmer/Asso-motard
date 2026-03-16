const express = require("express");
const crypto = require("crypto");          
const db = require("../db");
const authMiddleware = require("../middlewares/auth.middleware");
const { sendActivationEmail } = require("../mailer"); 
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const router = express.Router();

// Middleware pour vérifier que c'est bien un admin
function adminOnly(req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "bureau") {
    return res.status(403).json({ error: "Accès réservé au bureau." });
  }
  next();
}

// POST /api/admin/create-user → créer un membre + envoyer email d'activation
router.post("/create-user", authMiddleware, adminOnly, async (req, res) => {
  const { email, display_name, role } = req.body; // ← plus de temp_password

  if (!email || !display_name) {
    return res.status(400).json({ error: "Email et nom requis." });
  }

  try {
    // Vérifier si l'email existe déjà
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Cet email est déjà utilisé." });
    }

    // Générer un token unique + expiration dans 48h
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    // Insérer le compte (inactif, sans mot de passe)
    await db.query(
      `INSERT INTO users 
        (email, password_hash, display_name, role, must_change_password, is_active, activation_token, token_expires_at) 
       VALUES (?, '', ?, ?, 1, 0, ?, ?)`,
      [email, display_name, role || "member", token, expires]
    );

    // Envoyer l'email d'activation
    await sendActivationEmail(email, display_name, token);

    res.status(201).json({ message: "Compte créé. Un email d'activation a été envoyé au membre." });

  } catch (err) {
    console.error("Erreur /create-user :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// CONFIG UPLOAD PHOTOS
// ─────────────────────────────────────────
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max par fichier
  fileFilter: function (req, file, cb) {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Format non supporté. JPG, PNG ou WEBP uniquement."));
  }
});

// ─────────────────────────────────────────
// POST /api/admin/upload-photo
// Upload de photos pour une sortie
// ─────────────────────────────────────────
router.post("/upload-photo", authMiddleware, adminOnly, upload.array("photos", 10), async (req, res) => {
  const { ride_id, caption } = req.body;

  if (!ride_id || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Sortie et photos requises." });
  }

  try {
    for (const file of req.files) {
      const url = "/uploads/" + file.filename;
      await db.query(
        "INSERT INTO ride_photos (ride_id, url, caption, uploaded_by, is_approved) VALUES (?, ?, ?, ?, 1)",
        [ride_id, url, caption || null, req.user.id]
      );
    }
    res.status(201).json({ message: `${req.files.length} photo(s) ajoutée(s) avec succès.` });
  } catch (err) {
    console.error("Erreur /upload-photo :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});


// ─────────────────────────────────────────
// DELETE /api/admin/photo/:id
// Supprimer une photo
// ─────────────────────────────────────────
router.delete("/photo/:id", authMiddleware, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  try {
    const [[photo]] = await db.query(
      "SELECT url FROM ride_photos WHERE id = ?", [id]
    );

    if (!photo) return res.status(404).json({ error: "Photo introuvable." });

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, "../../../uploads", path.basename(photo.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Supprimer en BDD
    await db.query("DELETE FROM ride_photos WHERE id = ?", [id]);

    res.json({ message: "Photo supprimée." });
  } catch (err) {
    console.error("Erreur /photo/:id :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/photos/pending
// Photos en attente de validation
// ─────────────────────────────────────────
router.get("/photos/pending", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rp.id, rp.url, rp.caption, r.title as ride_title,
              u.display_name as uploaded_by
       FROM ride_photos rp
       JOIN rides r ON rp.ride_id = r.id
       JOIN users u ON rp.uploaded_by = u.id
       WHERE rp.is_approved = 0
       ORDER BY rp.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur /photos/pending :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/photo/:id/approve
// Approuver une photo
// ─────────────────────────────────────────
router.patch("/photo/:id/approve", authMiddleware, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  try {
    await db.query("UPDATE ride_photos SET is_approved = 1 WHERE id = ?", [id]);
    res.json({ message: "Photo approuvée." });
  } catch (err) {
    console.error("Erreur /approve :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/photo/:id/reject
// Refuser et supprimer une photo
// ─────────────────────────────────────────
router.patch("/photo/:id/reject", authMiddleware, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  try {
    const [[photo]] = await db.query("SELECT url FROM ride_photos WHERE id = ?", [id]);
    if (!photo) return res.status(404).json({ error: "Photo introuvable." });

    const filePath = path.join(__dirname, "../../../uploads", path.basename(photo.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.query("DELETE FROM ride_photos WHERE id = ?", [id]);
    res.json({ message: "Photo refusée et supprimée." });
  } catch (err) {
    console.error("Erreur /reject :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/ideas
// Récupérer toutes les idées
// ─────────────────────────────────────────
router.get("/ideas", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.id, i.title, i.content, i.status, i.created_at,
              u.display_name as author
       FROM ideas i
       JOIN users u ON i.user_id = u.id
       ORDER BY i.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur /ideas :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/idea/:id/done
// Marquer une idée comme traitée
// ─────────────────────────────────────────
router.patch("/idea/:id/done", authMiddleware, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  try {
    await db.query("UPDATE ideas SET status = 'done' WHERE id = ?", [id]);
    res.json({ message: "Idée marquée comme traitée." });
  } catch (err) {
    console.error("Erreur /idea/done :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// DELETE /api/admin/idea/:id
// Supprimer une idée
// ─────────────────────────────────────────
router.delete("/idea/:id", authMiddleware, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  try {
    await db.query("DELETE FROM ideas WHERE id = ?", [id]);
    res.json({ message: "Idée supprimée." });
  } catch (err) {
    console.error("Erreur /idea delete :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// POST /api/admin/ride
// Créer une sortie
// ─────────────────────────────────────────
router.post("/ride", authMiddleware, adminOnly, async (req, res) => {
  const { title, start_date, end_date, type, level, status, short_description, full_description } = req.body;

  if (!title || !start_date || !type || !level || !status) {
    return res.status(400).json({ error: "Titre, date, type, niveau et statut requis." });
  }

  // Générer le slug depuis le titre
  const slug = title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  try {
    await db.query(
      `INSERT INTO rides (title, slug, start_date, end_date, type, level, status, short_description, full_description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, start_date, end_date || null, type, level, status, short_description || null, full_description || null, req.user.id]
    );
    res.status(201).json({ message: "Sortie créée avec succès." });
  } catch (err) {
    console.error("Erreur POST /ride :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// PUT /api/admin/ride/:id
// Modifier une sortie
// ─────────────────────────────────────────
router.put("/ride/:id", authMiddleware, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  const { title, start_date, end_date, type, level, status, short_description, full_description } = req.body;

  if (!title || !start_date || !type || !level || !status) {
    return res.status(400).json({ error: "Titre, date, type, niveau et statut requis." });
  }

  const slug = title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  try {
    await db.query(
      `UPDATE rides SET title=?, slug=?, start_date=?, end_date=?, type=?, level=?, status=?, short_description=?, full_description=?
       WHERE id=?`,
      [title, slug, start_date, end_date || null, type, level, status, short_description || null, full_description || null, id]
    );
    res.json({ message: "Sortie modifiée avec succès." });
  } catch (err) {
    console.error("Erreur PUT /ride :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────
// DELETE /api/admin/ride/:id
// Supprimer une sortie
// ─────────────────────────────────────────
router.delete("/ride/:id", authMiddleware, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });

  try {
    await db.query("DELETE FROM rides WHERE id = ?", [id]);
    res.json({ message: "Sortie supprimée." });
  } catch (err) {
    console.error("Erreur DELETE /ride :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});


module.exports = router;
