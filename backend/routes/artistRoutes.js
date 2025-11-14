import express from "express";
import { getArtist, getArtistById, getRole, getArts } from "../controllers/artistController.js";
import { validateRequest } from "../middleware/validation.js";


const router = express.Router();

router.get("/getArtist", getArtist);
router.get(
  "/getArtistById/:id",
  validateRequest(
    { params: { id: { type: "string", required: true, min: 1, max: 120 } } },
    { source: "params", allowUnknown: false }
  ),
  getArtistById
);
router.get(
  "/getRole/:id",
  validateRequest(
    { params: { id: { type: "string", required: true, min: 1, max: 120 } } },
    { source: "params", allowUnknown: false }
  ),
  getRole
);
router.get(
  "/getArts/:id",
  validateRequest(
    { params: { id: { type: "string", required: true, min: 1, max: 120 } } },
    { source: "params", allowUnknown: false }
  ),
  getArts
);


export default router;