import express from "express";
import multer from "multer";
import { getEvents, createEvent, updateEvent, deleteEvent, joinEvent, isJoined, myEvents, eventParticipants, removeParticipant } from "../controllers/eventController.js";


const router = express.Router();

// Multer in-memory storage for event image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get("/getEvents", getEvents);
router.post("/create", upload.single('image'), createEvent);
router.post("/joinEvent", joinEvent);
router.get("/isJoined", isJoined);
router.get("/myEvents", myEvents);
router.post("/eventParticipants", eventParticipants);
router.post("/removeParticipant", removeParticipant);
router.put("/update/:id", upload.single('image'), updateEvent);
router.delete("/:id", deleteEvent);





export default router;