// routes/profileRoutes.js
import express from "express";
import multer from "multer";
import { getProfile, uploadProfileMedia, profileStatus } from "../controllers/profileController.js";

const router = express.Router();

// Multer in-memory storage, same pattern as homepage createPost
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get("/getProfile", getProfile);

router.get("/profileStatus", profileStatus);
// Upload files then update profile
router.post(
  "/updateProfile",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  uploadProfileMedia
);

export default router;
