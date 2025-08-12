import express from "express";
import { loginUser, registerUser,verifyToken, refreshAccessToken } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/verify", verifyToken);
router.get("/refresh", refreshAccessToken)
export default router;