// routes/profileRoutes.js
import express from "express";
import multer from "multer";
import { artPreferenceStatus, saveArtPreferences, getProfile, getUserProfile, uploadProfileMedia, profileStatus, getArts, getUserArts, createComment, getComments, createReact, getReact, uploadArt, trackView, getViews, updateArt, deleteArt } from "../controllers/profileController.js";

const router = express.Router();

// Multer in-memory storage, same pattern as homepage createPost
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get("/getProfile", getProfile);
router.post("/getUserProfile", getUserProfile);
router.get("/getArts", getArts);
router.get("/getUserArts", getUserArts);
router.post("/createComment", createComment);
router.get("/getComments", getComments);
router.post("/createComment", createComment);
router.post("/createReact", createReact);
router.get("/getReact", getReact);
router.post("/uploadArt", upload.array('images', 5), uploadArt);
router.get("/artPreferenceStatus", artPreferenceStatus);
router.post("/saveArtPreferences", saveArtPreferences);

// Also accept POST with JSON body for ID-based reads
router.post("/getComments", getComments);
router.post("/getReact", getReact);

// View tracking endpoints
router.post("/trackView", trackView);
router.post("/getViews", getViews);

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

// Artwork update and delete routes
router.put("/art/:artId", upload.array('images', 5), updateArt);
router.delete("/art/:artId", deleteArt);

export default router;
