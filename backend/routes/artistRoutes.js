import express from "express";
import { getArtist, getArtistById, getRole, getArts } from "../controllers/artistController.js";


const router = express.Router();

router.get("/getArtist", getArtist);
router.get("/getArtistById/:id", getArtistById);
router.get("/getRole/:id", getRole);
router.get("/getArts/:id", getArts);


export default router;