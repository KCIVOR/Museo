import { Router } from "express";
import { registerAsArtist, getRequest, action, deleteRequest } from "../controllers/requestController.js";
import { requirePermission } from "../middleware/permission.js";
import { validateRequest } from "../middleware/validation.js";
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
  validateRequest(
    {
      body: {
        firstName: { type: "string", required: false, min: 0, max: 100 },
        midInit: { type: "string", required: false, min: 0, max: 10 },
        lastName: { type: "string", required: false, min: 0, max: 100 },
        phone: { type: "string", required: false, min: 5, max: 30 },
        age: { type: "integer", required: false, min: 1, max: 150 },
        sex: { type: "string", required: false, min: 0, max: 20 },
        birthdate: { type: "date", required: false },
        address: { type: "string", required: false, min: 0, max: 300 },
        requestType: {
          type: "string",
          required: false,
          default: "artist_verification",
          validate: (v) => (!v || ["artist_verification","seller_application","visit_booking"].includes(v)) || 'requestType must be one of artist_verification, seller_application, visit_booking'
        }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  registerAsArtist
);

router.get(
  "/getRequest",
  requirePermission(['admin']),
  validateRequest(
    { query: { type: { type: "string", required: false, min: 1 }, page: { type: "integer", default: 1, min: 1 }, limit: { type: "integer", default: 50, min: 1, max: 200 } } },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getRequest
)
router.post(
  "/action",
  requirePermission(['admin']),
  validateRequest(
    { body: { id: { type: "string", required: true, min: 1 }, action: { type: "string", required: true, validate: (v) => (["approve","reject"].includes(v)) || 'action must be approve or reject' }, type: { type: "string", required: false, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  action
)
router.delete(
  "/:id",
  requirePermission(['admin']),
  validateRequest(
    { params: { id: { type: "string", required: true, min: 1 } } },
    { source: "params", allowUnknown: false }
  ),
  deleteRequest
)
export default router;
