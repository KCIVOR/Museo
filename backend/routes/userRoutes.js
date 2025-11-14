import express from "express"
import {getAllUsers, createUsers,getUser,updateUser,deleteUser, getCurrentUser, getRole, getPicture, getAdminUsers, updateUserRole } from "../controllers/userController.js";
import { requirePermission } from "../middleware/permission.js";
import { validateRequest } from "../middleware/validation.js";
const router = express.Router();

router.get("/me", getCurrentUser);
router.get(
  "/getall",
  requirePermission(['user','admin','artist']),
  validateRequest(
    { query: { page: { type: 'integer', default: 1, min: 1 }, limit: { type: 'integer', default: 100, min: 1, max: 500 } } },
    { source: 'query', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  getAllUsers
);
router.get(
  "/admin/all",
  requirePermission(['admin']),
  validateRequest(
    { query: { page: { type: 'integer', default: 1, min: 1 }, limit: { type: 'integer', default: 20, min: 1, max: 100 } } },
    { source: 'query', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  getAdminUsers
);
router.get("/role", getRole);
router.get("/picture", requirePermission(['user','admin','artist']), getPicture);

router.get(
  "/:id",
  validateRequest(
    { params: { id: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getUser
);
router.post(
  "/",
  validateRequest(
    {
      body: {
        username: { type: 'string', required: true, min: 3, max: 50 },
        password: { type: 'string', required: true, min: 8, max: 200 },
        email: { type: 'email', required: true }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  createUsers
);
router.put(
  "/:id",
  validateRequest(
    { params: { id: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  updateUser
);
router.post(
  "/:id",
  validateRequest(
    { params: { id: { type: 'string', required: true, min: 1 } }, body: {} },
    { source: ['params','body'], allowUnknown: false, stripUnknown: true }
  ),
  deleteUser
);
router.patch(
  "/:userId/role",
  requirePermission(['admin']),
  validateRequest(
    { params: { userId: { type: 'uuid', required: true } }, body: { role: { type: 'string', required: true, enum: ['user','artist'] } } },
    { source: ['params','body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  updateUserRole
);

export default router;