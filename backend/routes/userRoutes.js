import express from "express"
import {getAllUsers, createUsers,getUser,updateUser,deleteUser, getCurrentUser, getRole } from "../controllers/userController.js";
import { requirePermission } from "../middleware/permission.js";
const router = express.Router();

router.get("/me", getCurrentUser);
router.get("/getall", requirePermission(['admin','artist']), getAllUsers);
router.get("/role", getRole);

router.get("/:id", getUser);
router.post("/", createUsers);
router.put("/:id", updateUser);
router.post("/:id", deleteUser);



export default router;