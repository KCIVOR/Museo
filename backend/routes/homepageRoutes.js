import express from "express";
import { createPost, upload, getPost } from "../controllers/homepage.js";

const router = express.Router();

router.post("/createPost", upload.array('media', 4), createPost);
router.get("/getPost", getPost);

export default router;
