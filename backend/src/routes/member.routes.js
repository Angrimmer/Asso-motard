const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../config/upload");
const memberController = require("../controllers/member.controller");

router.post("/idea", authMiddleware, memberController.submitIdea);
router.get("/ideas/notifications", authMiddleware, memberController.getIdeaNotifications);
router.post("/ideas/notifications/read", authMiddleware, memberController.readIdeaNotifications);
router.post("/feedback", authMiddleware, memberController.submitFeedback);
router.get("/rides", authMiddleware, memberController.getPastRides);
router.get("/all-rides", authMiddleware, memberController.getAllRides);
router.get("/ride/:id", authMiddleware, memberController.getRide);
router.get("/photos", authMiddleware, memberController.getPhotos);
router.post("/upload-photo", authMiddleware, upload.array("photos", 10), memberController.uploadPhoto);
router.get("/ride/:id/feedback", authMiddleware, memberController.getRideFeedback);
router.post("/ride/:id/register", authMiddleware, memberController.registerForRide);
router.delete("/ride/:id/register", authMiddleware, memberController.unregisterFromRide);
router.get("/ride/:id/registrations", authMiddleware, memberController.getRideRegistrations);
router.get("/ride/:id/is-registered", authMiddleware, memberController.isRegistered);
router.get("/count", memberController.getMemberCount);

module.exports = router;