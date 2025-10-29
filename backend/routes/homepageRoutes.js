import express from "express";
import { createPost, upload, getPost, createReact, createComment, getReact, getComments, deletePost, updatePost, deleteComment, updateComment, reportComment } from "../controllers/homepage.js";
import { requirePermission } from "../middleware/permission.js";

const router = express.Router();

router.post("/createPost", upload.fields([
  { name: "file", maxCount: 1 },
  { name: "file2", maxCount: 1 },
  { name: "file3", maxCount: 1 },
  { name: "file4", maxCount: 1 }
]), createPost);
router.get("/getPost", getPost);
router.post("/createReact",createReact);
router.post("/createComment", createComment);
router.get("/getComments", getComments);

// Post management routes
router.delete("/posts/:postId", deletePost);
router.put("/posts/:postId", upload.array('images', 5), updatePost);

// Comment management routes
router.delete("/deleteComment/:commentId", deleteComment);
router.put("/updateComment/:commentId", updateComment);
router.post("/reportComment", reportComment);

//requirePermission(['admin','artist','user'])

export default router;
