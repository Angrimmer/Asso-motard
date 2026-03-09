const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Token manquant. Accès refusé." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // on attache l'utilisateur à la requête
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token invalide ou expiré." });
  }
}

module.exports = authMiddleware;
