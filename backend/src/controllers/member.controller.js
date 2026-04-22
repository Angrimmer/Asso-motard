const User = require("../models/user.model");
const Ride = require("../models/ride.model");
const Photo = require("../models/photo.model");
const Idea = require("../models/idea.model");
const Feedback = require("../models/feedback.model");
const Registration = require("../models/registration.model");

async function submitIdea(req, res) {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Titre et contenu requis." });
  try {
    await Idea.create({ user_id: req.user.id, title, content });
    res.status(201).json({ message: "Votre idée a bien été envoyée au bureau !" });
  } catch (err) {
    console.error("Erreur /idea :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getIdeaNotifications(req, res) {
  try {
    res.json(await Idea.findUnreadNotifications(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function readIdeaNotifications(req, res) {
  try {
    await Idea.clearNotifications(req.user.id);
    res.json({ message: "ok" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function submitFeedback(req, res) {
  const { ride_id, rating, comment } = req.body;
  if (!ride_id || !rating || !comment) return res.status(400).json({ error: "Sortie, note et commentaire requis." });
  const ratingInt = parseInt(rating, 10);
  if (ratingInt < 1 || ratingInt > 5) return res.status(400).json({ error: "La note doit être entre 1 et 5." });
  try {
    await Feedback.create({ ride_id, user_id: req.user.id, rating: ratingInt, comment });
    res.status(201).json({ message: "Votre avis a bien été envoyé, merci !" });
  } catch (err) {
    console.error("Erreur /feedback :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getPastRides(req, res) {
  try {
    res.json(await Ride.findPast());
  } catch (err) {
    console.error("Erreur /rides :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getAllRides(req, res) {
  try {
    res.json(await Ride.findAll());
  } catch (err) {
    console.error("Erreur /all-rides :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getRide(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    const ride = await Ride.findById(id);
    if (!ride) return res.status(404).json({ error: "Sortie introuvable." });
    ride.photos = await Photo.findApprovedByRide(id);
    res.json(ride);
  } catch (err) {
    console.error("Erreur /ride/:id :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getPhotos(req, res) {
  const ride_id = req.query.ride_id ? parseInt(req.query.ride_id, 10) : null;
  try {
    res.json(await Photo.findApproved(ride_id));
  } catch (err) {
    console.error("Erreur /photos :", err);
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
      await Photo.insert({ ride_id, url: "/uploads/" + file.filename, caption, uploaded_by: req.user.id, is_approved: 0 });
    }
    res.status(201).json({ message: `${req.files.length} photo(s) soumise(s) au bureau pour validation.` });
  } catch (err) {
    console.error("Erreur /upload-photo membre :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getRideFeedback(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide." });
  try {
    res.json(await Feedback.findByRide(id));
  } catch (err) {
    console.error("Erreur /ride/feedback :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function registerForRide(req, res) {
  const ride_id = parseInt(req.params.id, 10);
  if (isNaN(ride_id)) return res.status(400).json({ error: "ID invalide." });
  try {
    const ride = await Ride.findByIdWithStatus(ride_id);
    if (!ride) return res.status(404).json({ error: "Sortie introuvable." });
    if (ride.status !== "upcoming") return res.status(400).json({ error: "Les inscriptions ne sont pas ouvertes pour cette sortie." });
    await Registration.create(ride_id, req.user.id);
    res.status(201).json({ message: "Inscription enregistrée !" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Vous êtes déjà inscrit à cette sortie." });
    console.error("Erreur /register :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function unregisterFromRide(req, res) {
  const ride_id = parseInt(req.params.id, 10);
  if (isNaN(ride_id)) return res.status(400).json({ error: "ID invalide." });
  try {
    await Registration.remove(ride_id, req.user.id);
    res.json({ message: "Désinscription effectuée." });
  } catch (err) {
    console.error("Erreur /unregister :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getRideRegistrations(req, res) {
  const ride_id = parseInt(req.params.id, 10);
  if (isNaN(ride_id)) return res.status(400).json({ error: "ID invalide." });
  try {
    res.json(await Registration.findByRide(ride_id));
  } catch (err) {
    console.error("Erreur /registrations :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function isRegistered(req, res) {
  const ride_id = parseInt(req.params.id, 10);
  if (isNaN(ride_id)) return res.status(400).json({ error: "ID invalide." });
  try {
    const row = await Registration.findOne(ride_id, req.user.id);
    res.json({ registered: !!row });
  } catch (err) {
    console.error("Erreur /is-registered :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

async function getMemberCount(req, res) {
  try {
    const count = await User.count();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ count: 0 });
  }
}

module.exports = {
  submitIdea, getIdeaNotifications, readIdeaNotifications, submitFeedback,
  getPastRides, getAllRides, getRide, getPhotos, uploadPhoto, getRideFeedback,
  registerForRide, unregisterFromRide, getRideRegistrations, isRegistered, getMemberCount
};
