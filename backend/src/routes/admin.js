const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/role.middleware");
const upload = require("../config/upload");
const adminController = require("../controllers/admin.controller");

router.post("/create-user", authMiddleware, adminOnly, adminController.createUser);
router.post("/upload-photo", authMiddleware, adminOnly, upload.array("photos", 10), adminController.uploadPhoto);
router.delete("/photo/:id", authMiddleware, adminOnly, adminController.deletePhoto);
router.get("/photos/pending", authMiddleware, adminOnly, adminController.getPendingPhotos);
router.patch("/photo/:id/approve", authMiddleware, adminOnly, adminController.approvePhoto);
router.patch("/photo/:id/reject", authMiddleware, adminOnly, adminController.rejectPhoto);
router.get("/ideas", authMiddleware, adminOnly, adminController.getIdeas);
router.patch("/idea/:id/done", authMiddleware, adminOnly, adminController.markIdeaDone);
router.patch("/idea/:id/reject", authMiddleware, adminOnly, adminController.rejectIdea);
router.post("/ride", authMiddleware, adminOnly, adminController.createRide);
router.put("/ride/:id", authMiddleware, adminOnly, adminController.updateRide);
router.delete("/ride/:id", authMiddleware, adminOnly, adminController.deleteRide);

module.exports = router;
