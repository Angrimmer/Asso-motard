require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend Les Fêlés du Bocal fonctionne" });
});

app.listen(PORT, () => {
  console.log(`API backend démarrée sur http://localhost:${PORT}`);
});
