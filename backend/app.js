require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin");
const memberRoutes = require("./src/routes/member");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/member", memberRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend Les Fêlés du Bocal fonctionne" });
});

app.listen(PORT, () => {
  console.log(`API backend démarrée sur http://localhost:${PORT}`);
});
