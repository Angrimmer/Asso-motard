const crypto = require("crypto");
const User = require("../models/user.model");
const Ride = require("../models/ride.model");
const Photo = require("../models/photo.model");
const Idea = require("../models/idea.model");
const { sendActivationEmail } = require("../mailer");

async function createUser(req, res) {
  const { email, display_name, role } = req.body;
  if (!email || !display_name) return res.status(400).json({ error: "Email et nom requis." });
  try {
    const existing = await User.findByEmailAny(email);
    if (existing) return res.status(409).json({ error: "Cet email est déjà utilisé." });
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await User.create({ email, display_name, role: role || "member", token, expires });
    await sendActivationEmail(email, display_name, token);
    res.status(201).json({ message: "Compte créé. Un email d'activation a été envoyé au membre." });
  } catch (err) {
    console.error("Erreur /create-user :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function uploadPhoto(req, res) {
  const { ride_id, caption } = req.body;
  if (!ride_id || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Sortie et photos requises." });
  }
  try {
    for (const file of req.files) {
      await Photo.insert({ ride_id, url: "/uploads/" + file.filename, caption, uploaded_by: req.user.id, is_approved: 1 });
    }
    res.status(201).json({ message: `${req.files.length} photo(s) ajoutée(s) avec succès.` });
  } catch (err) {
    console.error("Erreur /upload-photo :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function deletePhoto(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    const photo = await Photo.findById(id);
    if (!photo) return res.status(404).json({ error: "Photo introuvable." });
    Photo.deleteFile(photo.url);
    await Photo.remove(id);
    res.json({ message: "Photo supprimée." });
  } catch (err) {
    console.error("Erreur /photo/:id :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getPendingPhotos(req, res) {
  try {
    res.json(await Photo.findPending());
  } catch (err) {
    console.error("Erreur /photos/pending :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function approvePhoto(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    await Photo.approve(id);
    res.json({ message: "Photo approuvée." });
  } catch (err) {
    console.error("Erreur /approve :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function rejectPhoto(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    const photo = await Photo.findById(id);
    if (!photo) return res.status(404).json({ error: "Photo introuvable." });
    Photo.deleteFile(photo.url);
    await Photo.remove(id);
    res.json({ message: "Photo refusée et supprimée." });
  } catch (err) {
    console.error("Erreur /reject :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getIdeas(req, res) {
  try {
    res.json(await Idea.findAll());
  } catch (err) {
    console.error("Erreur /ideas :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function markIdeaDone(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    await Idea.markDone(id);
    res.json({ message: "Idée marquée comme traitée." });
  } catch (err) {
    console.error("Erreur /idea/done :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function rejectIdea(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    await Idea.markRejected(id);
    res.json({ message: "Idée refusée." });
  } catch (err) {
    console.error("Erreur /idea/reject :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function createRide(req, res) {
  const { title, start_date, end_date, type, level, status, short_description, full_description } = req.body;
  if (!title || !start_date || !type || !level || !status) {
    return res.status(400).json({ error: "Titre, date, type, niveau et statut requis." });
  }
  try {
    await Ride.create({ title, start_date, end_date, type, level, status, short_description, full_description, created_by: req.user.id });
    res.status(201).json({ message: "Sortie créée avec succès." });
  } catch (err) {
    console.error("Erreur POST /ride :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function updateRide(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  const { title, start_date, end_date, type, level, status, short_description, full_description } = req.body;
  if (!title || !start_date || !type || !level || !status) {
    return res.status(400).json({ error: "Titre, date, type, niveau et statut requis." });
  }
  try {
    await Ride.update(id, { title, start_date, end_date, type, level, status, short_description, full_description });
    res.json({ message: "Sortie modifiée avec succès." });
  } catch (err) {
    console.error("Erreur PUT /ride :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function deleteRide(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    await Ride.remove(id);
    res.json({ message: "Sortie supprimée." });
  } catch (err) {
    console.error("Erreur DELETE /ride :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

module.exports = {
  createUser, uploadPhoto, deletePhoto, getPendingPhotos, approvePhoto, rejectPhoto,
  getIdeas, markIdeaDone, rejectIdea, createRide, updateRide, deleteRide
};
