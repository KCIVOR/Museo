import express from "express"
import {getAllUsers, createUsers,getUser,updateUser,deleteUser, getCurrentUser, getRole, getPicture, getAdminUsers, updateUserRole } from "../controllers/userController.js";
import { requirePermission } from "../middleware/permission.js";
const router = express.Router();

router.get("/me", getCurrentUser);
router.get("/getall", requirePermission(['user','admin','artist']), getAllUsers);
router.get("/admin/all", requirePermission(['admin']), getAdminUsers);
router.get("/role", getRole);
router.get("/picture", requirePermission(['user','admin','artist']), getPicture);

router.get("/:id", getUser);
router.post("/", createUsers);
router.put("/:id", updateUser);
router.post("/:id", deleteUser);
router.patch("/:userId/role", requirePermission(['admin']), updateUserRole);

export default router;