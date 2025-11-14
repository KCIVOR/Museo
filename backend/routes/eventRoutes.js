import express from "express";
import multer from "multer";
import { validateRequest } from "../middleware/validation.js";
import { getEvents,getEventById, createEvent, updateEvent, deleteEvent, joinEvent, isJoined, myEvents, eventParticipants, removeParticipant } from "../controllers/eventController.js";


const router = express.Router();

// Multer in-memory storage for event image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get(
  "/getEvents",
  validateRequest(
    { query: { page: { type: "integer", default: 1, min: 1 }, limit: { type: "integer", default: 10, min: 1, max: 100 } } },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getEvents
);

router.post(
  "/create",
  upload.single('image'),
  validateRequest(
    {
      body: {
        title: { type: "string", required: true, min: 1, max: 200 },
        details: { type: "string", required: true, min: 1, max: 5000 },
        venueName: { type: "string", required: true, min: 1, max: 200 },
        venueAddress: { type: "string", required: true, min: 1, max: 300 },
        startsAt: { type: "date", required: true },
        endsAt: { type: "date", required: true },
        admission: { type: "string", required: true, min: 1, max: 200 },
        admissionNote: { type: "string", required: true, min: 1, max: 300 },
        image: { type: "string", required: false },
        activities: {
          required: true,
          validate: (v) => {
            if (typeof v === 'string') return v.trim().length > 0 || 'activities is required';
            if (Array.isArray(v)) return (v.length > 0 && v.every(x => typeof x === 'string' && x.trim().length > 0)) || 'activities must be a non-empty array of strings';
            return 'activities must be a string or array of strings';
          }
        }
      }
    },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  createEvent
);

router.post(
  "/joinEvent",
  validateRequest(
    { body: { eventId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  joinEvent
);

router.get(
  "/isJoined",
  validateRequest(
    { query: { eventId: { type: "string", required: true, min: 1 } } },
    { source: "query", allowUnknown: false, stripUnknown: true }
  ),
  isJoined
);

router.get("/myEvents", myEvents);

router.post(
  "/eventParticipants",
  validateRequest(
    { body: { eventId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  eventParticipants
);

router.post(
  "/removeParticipant",
  validateRequest(
    { body: { eventId: { type: "string", required: true, min: 1 }, userId: { type: "string", required: true, min: 1 } } },
    { source: "body", allowUnknown: false, stripUnknown: true }
  ),
  removeParticipant
);

router.get(
  "/:id",
  validateRequest(
    { params: { id: { type: "string", required: true, min: 1 } } },
    { source: "params", allowUnknown: false }
  ),
  getEventById
);

router.put(
  "/update/:id",
  upload.single('image'),
  validateRequest(
    {
      params: { id: { type: "string", required: true, min: 1 } },
      body: {
        title: { type: "string", required: false, min: 0, max: 200 },
        details: { type: "string", required: false, min: 0, max: 5000 },
        venueName: { type: "string", required: false, min: 0, max: 200 },
        venueAddress: { type: "string", required: false, min: 0, max: 300 },
        startsAt: { type: "date", required: false },
        endsAt: { type: "date", required: false },
        admission: { type: "string", required: false, min: 0, max: 200 },
        admissionNote: { type: "string", required: false, min: 0, max: 300 },
        image: { type: "string", required: false },
        activities: {
          required: false,
          validate: (v) => (v === undefined) ||
            (typeof v === 'string' ? v.trim().length > 0 : (Array.isArray(v) && v.every(x => typeof x === 'string' && x.trim().length > 0))) ||
            'activities must be a string or array of strings'
        }
      }
    },
    { source: ["params","body"], allowUnknown: false, stripUnknown: true }
  ),
  updateEvent
);

router.delete(
  "/:id",
  validateRequest(
    { params: { id: { type: "string", required: true, min: 1 } } },
    { source: "params", allowUnknown: false }
  ),
  deleteEvent
);





export default router;