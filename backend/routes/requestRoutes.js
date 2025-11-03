import { Router } from "express";
import { registerAsArtist, getRequest, action, deleteRequest } from "../controllers/requestController.js";
import { requirePermission } from "../middleware/permission.js";
import multer from "multer";

const router = Router();

// Multer in-memory storage consistent with other routes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Protected: requires req.user set by auth
router.post(
  "/registerAsArtist",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "file2", maxCount: 1 },
  ]),
  registerAsArtist
);

router.get("/getRequest", requirePermission(['admin']), getRequest)
router.post("/action", requirePermission(['admin']), action)
router.delete("/:id", requirePermission(['admin']), deleteRequest)
export default router;
