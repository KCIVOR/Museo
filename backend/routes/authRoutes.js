import express from "express";
import { loginUser, registerUser, logout, requestPasswordReset, resetPassword, changeEmail, changePassword } from "../controllers/authController.js";
import { validateRequest } from "../middleware/validation.js";


const router = express.Router();

router.post(
  "/login",
  validateRequest(
    {
      body: {
        access_token: { type: "string", required: true, min: 10, max: 5000 },
        refresh_token: { type: "string", required: true, min: 10, max: 5000 }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  loginUser
);

router.post(
  "/register",
  validateRequest(
    {
      body: {
        email: { type: "email", required: true },
        password: { type: "string", required: true, min: 8, max: 200 }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  registerUser
);

router.post(
  "/logout",
  validateRequest({ body: {} }, { source: "body", allowUnknown: false, stripUnknown: true }),
  logout
);

// ✅ Password Reset Endpoints
router.post(
  "/request-password-reset",
  validateRequest(
    {
      body: {
        email: { type: "email", required: true }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  requestPasswordReset
);

router.post(
  "/reset-password",
  validateRequest(
    {
      body: {
        password: { type: "string", required: true, min: 8, max: 200 },
        confirmPassword: { type: "string", required: true, min: 8, max: 200 },
        // Optional fallback if Authorization header is unavailable
        access_token: { type: "string", required: false, min: 10, max: 5000 }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  resetPassword
);

// ✅ Change Email
router.post(
  "/change-email",
  validateRequest(
    {
      body: {
        newEmail: { type: "email", required: true },
        currentPassword: { type: "string", required: false, min: 6, max: 200 },
        access_token: { type: "string", required: false, min: 10, max: 5000 },
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  changeEmail
);

// ✅ Change Password
router.post(
  "/change-password",
  validateRequest(
    {
      body: {
        currentPassword: { type: "string", required: true, min: 6, max: 200 },
        newPassword: { type: "string", required: true, min: 8, max: 200 },
        confirmPassword: { type: "string", required: true, min: 8, max: 200 },
        access_token: { type: "string", required: false, min: 10, max: 5000 },
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  changePassword
);

export default router;