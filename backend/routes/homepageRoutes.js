import express from "express";
import { createPost, upload, getPost, createReact, createComment, getReact, getComments } from "../controllers/homepage.js";
import { requirePermission } from "../middleware/permission.js";

const router = express.Router();

router.post("/createPost", upload.array('media', 4), createPost);
router.get("/getPost", getPost);
router.post("/createReact", requirePermission(['admin','artist','user']),createReact);
router.post("/createComment", createComment);
router.get("/getComments", getComments);


export default router;
