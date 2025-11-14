import express from "express";
import { loginUser, registerUser, logout } from "../controllers/authController.js";
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

export default router;