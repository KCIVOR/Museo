// routes/profileRoutes.js
import express from "express";
import multer from "multer";
import { validateRequest } from "../middleware/validation.js";
import { artPreferenceStatus, saveArtPreferences, getProfile, getUserProfile, uploadProfileMedia, profileStatus, getArts, getUserArts, createComment, getComments, createReact, getReact, uploadArt, trackView, getViews, updateArt, deleteArt, deleteComment, updateComment, reportComment } from "../controllers/profileController.js";

const router = express.Router();

// Multer in-memory storage, same pattern as homepage createPost
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get("/getProfile", getProfile);

router.post(
  "/getUserProfile",
  validateRequest(
    { body: { userId: { type: "uuid", required: true } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  getUserProfile
);

router.get(
  "/getArts",
  validateRequest(
    { query: { page: { type: "integer", default: 1, min: 1 }, limit: { type: "integer", default: 10, min: 1, max: 100 } } },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getArts
);

// Note: controller expects query.userId to actually be the username
router.get(
  "/getUserArts",
  validateRequest(
    { query: { userId: { type: "string", required: true, min: 1, max: 60 }, page: { type: "integer", default: 1, min: 1 }, limit: { type: "integer", default: 10, min: 1, max: 100 } } },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getUserArts
);

router.post(
  "/createComment",
  validateRequest(
    { body: { artId: { type: "string", required: true, min: 1 }, text: { type: "string", required: true, min: 1, max: 2000 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  createComment
);

router.get(
  "/getComments",
  validateRequest(
    { query: { artId: { type: "string", required: true, min: 1 }, page: { type: "integer", default: 1, min: 1 }, limit: { type: "integer", default: 10, min: 1, max: 100 } } },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getComments
);

// duplicate createComment route kept for compatibility
router.post(
  "/createComment",
  validateRequest(
    { body: { artId: { type: "string", required: true, min: 1 }, text: { type: "string", required: true, min: 1, max: 2000 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  createComment
);

router.post(
  "/createReact",
  validateRequest(
    { body: { artId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  createReact
);

router.get(
  "/getReact",
  validateRequest(
    { query: { artId: { type: "string", required: true, min: 1 } } },
    { source: "query", allowUnknown: false, stripUnknown: true }
  ),
  getReact
);

router.post(
  "/uploadArt",
  upload.array('images', 5),
  validateRequest(
    {
      body: {
        title: { type: "string", required: false, min: 0, max: 200 },
        description: { type: "string", required: false, min: 0, max: 2000 },
        medium: { type: "string", required: false, min: 0, max: 200 },
        categories: { type: "string", required: false },
        applyWatermark: { type: "boolean", required: false, default: true },
        watermarkText: { type: "string", required: false, min: 0, max: 120 }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  uploadArt
);

router.get("/artPreferenceStatus", artPreferenceStatus);

router.post(
  "/saveArtPreferences",
  validateRequest(
    {
      body: {
        classicalArt: { type: "boolean", required: false, default: false },
        contemporaryArt: { type: "boolean", required: false, default: false },
        impressionist: { type: "boolean", required: false, default: false },
        abstractArt: { type: "boolean", required: false, default: false },
        sculpture: { type: "boolean", required: false, default: false },
        photography: { type: "boolean", required: false, default: false },
        digitalArt: { type: "boolean", required: false, default: false },
        streetArt: { type: "boolean", required: false, default: false },
        minimalist: { type: "boolean", required: false, default: false },
        surrealist: { type: "boolean", required: false, default: false },
        landscape: { type: "boolean", required: false, default: false },
        portrait: { type: "boolean", required: false, default: false },
        miniature: { type: "boolean", required: false, default: false },
        expressionist: { type: "boolean", required: false, default: false },
        realism: { type: "boolean", required: false, default: false },
        conceptual: { type: "boolean", required: false, default: false }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  saveArtPreferences
);

// Also accept POST with JSON body for ID-based reads
router.post(
  "/getComments",
  validateRequest(
    { body: { artId: { type: "string", required: true, min: 1 }, page: { type: "integer", required: false, default: 1, min: 1 }, limit: { type: "integer", required: false, default: 10, min: 1, max: 100 } } },
    { source: "body", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getComments
);
router.post(
  "/getReact",
  validateRequest(
    { body: { artId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  getReact
);

// View tracking endpoints
router.post(
  "/trackView",
  validateRequest(
    { body: { artId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  trackView
);
router.post(
  "/getViews",
  validateRequest(
    { body: { artId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  getViews
);

router.get("/profileStatus", profileStatus);
// Upload files then update profile
router.post(
  "/updateProfile",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  validateRequest(
    {
      body: {
        firstName: { type: "string", required: false, min: 0, max: 100 },
        middleName: { type: "string", required: false, min: 0, max: 100 },
        lastName: { type: "string", required: false, min: 0, max: 100 },
        bio: { type: "string", required: false, min: 0, max: 500 },
        about: { type: "string", required: false, min: 0, max: 2000 },
        birthdate: { type: "date", required: false },
        address: { type: "string", required: false, min: 0, max: 300 },
        sex: { type: "string", required: false, min: 0, max: 20 },
        username: { type: "string", required: false, min: 3, max: 30 }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  uploadProfileMedia
);

// Artwork update and delete routes
router.put(
  "/art/:artId",
  upload.array('images', 5),
  validateRequest(
    {
      params: { artId: { type: "string", required: true, min: 1 } },
      body: {
        title: { type: "string", required: false, min: 0, max: 200 },
        description: { type: "string", required: false, min: 0, max: 2000 },
        medium: { type: "string", required: false, min: 0, max: 200 },
        existingImages: {
          required: false,
          validate: (v) => (v === undefined || typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string'))) || 'existingImages must be a string or an array of strings'
        },
        imagesToRemove: {
          required: false,
          validate: (v) => (v === undefined || typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string'))) || 'imagesToRemove must be a string or an array of strings'
        },
        applyWatermark: { type: "boolean", required: false, default: false },
        watermarkText: { type: "string", required: false, min: 0, max: 120 }
      }
    },
    { source: ["params","body"], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  updateArt
);

router.delete(
  "/art/:artId",
  validateRequest(
    { params: { artId: { type: "string", required: true, min: 1 } } },
    { source: "params", allowUnknown: false }
  ),
  deleteArt
);

// Comment management routes
router.delete(
  "/deleteComment/:commentId",
  validateRequest(
    { params: { commentId: { type: "string", required: true, min: 1 } } },
    { source: "params", allowUnknown: false }
  ),
  deleteComment
);
router.put(
  "/updateComment/:commentId",
  validateRequest(
    { params: { commentId: { type: "string", required: true, min: 1 } }, body: { text: { type: "string", required: true, min: 1, max: 2000 } } },
    { source: ["params","body"], allowUnknown: false, stripUnknown: true }
  ),
  updateComment
);
router.post(
  "/reportComment",
  validateRequest(
    { body: { commentId: { type: "string", required: true, min: 1 }, reason: { type: "string", required: true, min: 5, max: 400 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  reportComment
);

export default router;
