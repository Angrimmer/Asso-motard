function adminOnly(req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "bureau") {
    return res.status(403).json({ error: "Accès réservé au bureau." });
  }
  next();
}

module.exports = { adminOnly };
