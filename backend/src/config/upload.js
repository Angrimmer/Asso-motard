const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
const allowedExts  = [".jpg", ".jpeg", ".png", ".webp"];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Double vérification : extension ET MIME type réel
    const ext  = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowedExts.includes(ext) && allowedMimes.includes(mime)) cb(null, true);
    else cb(new Error("Format non supporté. JPG, PNG ou WEBP uniquement."));
  }
});

module.exports = upload;
