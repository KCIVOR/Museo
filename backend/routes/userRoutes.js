import express from "express"
import {getAllUsers, createUsers,getUser,updateUser,deleteUser, getCurrentUser } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", getCurrentUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.post("/", createUsers);
router.put("/:id", updateUser);
router.post("/:id", deleteUser);



export default router;