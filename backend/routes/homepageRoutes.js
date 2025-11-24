import express from "express";
import { createPost, upload, getPost, createReact, createComment, getReact, getComments, deletePost, updatePost, deleteComment, updateComment, reportComment } from "../controllers/homepage.js";
import { requirePermission } from "../middleware/permission.js";
import { validateRequest } from "../middleware/validation.js";

const router = express.Router();

// Create post (multipart). Validate only body fields; files handled by multer.
router.post(
  "/createPost",
  requirePermission('artist','admin'),
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "file2", maxCount: 1 },
    { name: "file3", maxCount: 1 },
    { name: "file4", maxCount: 1 }
  ]),
  validateRequest(
    {
      body: {
        description: { type: "string", required: false, min: 0, max: 2000 },
        createdAt: { type: "date", required: false }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  createPost
);

// Get posts with pagination
router.get(
  "/getPost",
  validateRequest(
    {
      query: {
        page: { type: "integer", required: false, default: 1, min: 1 },
        limit: { type: "integer", required: false, default: 10, min: 1, max: 100 }
      }
    },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getPost
);

// React (like/unlike) to a post
router.post(
  "/createReact",
  validateRequest(
    { body: { postId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  createReact
);

// Create a comment
router.post(
  "/createComment",
  validateRequest(
    {
      body: {
        postId: { type: "string", required: true, min: 1 },
        text: { type: "string", required: true, min: 1, max: 2000 }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  createComment
);

// Get reactions for a post
router.get(
  "/getReact",
  validateRequest(
    { query: { postId: { type: "string", required: true, min: 1 } } },
    { source: "query", allowUnknown: false, stripUnknown: true }
  ),
  getReact
);

// Get comments with pagination
router.get(
  "/getComments",
  validateRequest(
    {
      query: {
        postId: { type: "string", required: true, min: 1 },
        page: { type: "integer", required: false, default: 1, min: 1 },
        limit: { type: "integer", required: false, default: 10, min: 1, max: 100 }
      }
    },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getComments
);

// Post management routes
router.delete(
  "/posts/:postId",
  validateRequest(
    { params: { postId: { type: "string", required: true, min: 1 } } },
    { source: "params", allowUnknown: false }
  ),
  deletePost
);

router.put(
  "/posts/:postId",
  upload.array('images', 5),
  validateRequest(
    {
      params: { postId: { type: "string", required: true, min: 1 } },
      body: {
        description: { type: "string", required: true, min: 1, max: 2000 },
        existingImages: { type: "string", required: false }, // frontend may send serialized JSON
        imagesToRemove: { type: "string", required: false }  // ditto
      }
    },
    { source: ["params", "body"], allowUnknown: false, stripUnknown: true }
  ),
  updatePost
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
    {
      params: { commentId: { type: "string", required: true, min: 1 } },
      body: { text: { type: "string", required: true, min: 1, max: 2000 } }
    },
    { source: ["params", "body"], allowUnknown: false, stripUnknown: true }
  ),
  updateComment
);

router.post(
  "/reportComment",
  validateRequest(
    {
      body: {
        commentId: { type: "string", required: true, min: 1 },
        reason: { type: "string", required: true, min: 5, max: 400 }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  reportComment
);

//requirePermission(['admin','artist','user'])

export default router;
