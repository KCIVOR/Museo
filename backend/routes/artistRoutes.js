import express from "express";
import { getArtist } from "../controllers/artistController.js";


const router = express.Router();

router.get("/getArtist", getArtist);


export default router;