require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin");
const memberRoutes = require("./src/routes/member");

const app = express();
const PORT = process.env.PORT || 4000;

// Headers HTTP de sécurité (clickjacking, MIME sniffing, etc.)
app.use(helmet());

// CORS — origines autorisées séparées par des virgules dans .env
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "http://localhost:4000").split(",").map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("CORS non autorisé"));
  }
}));

// Rate limiting sur les routes d'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 tentatives max par IP
  message: { error: "Trop de tentatives, réessayez dans 15 minutes." }
});

app.use(express.json());

// Fichiers statiques
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: function (res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes API
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/member", memberRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend Les Fêlés du Bocal fonctionne" });
});

app.listen(PORT, () => {
  console.log(`API backend démarrée sur http://localhost:${PORT}`);
});
