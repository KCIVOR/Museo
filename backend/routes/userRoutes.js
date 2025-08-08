import express from "express"
import {getAllUsers, createUsers,getUser,updateUser,deleteUser} from "../controllers/userController.js";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id", getUser);
router.post("/", createUsers);
router.put("/:id", updateUser);
router.post("/:id", deleteUser);

export default router;