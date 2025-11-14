import express from "express";
import { createMessage, getConversation, getConversationById, markRead } from "../controllers/messageController.js";
import { validateRequest } from "../middleware/validation.js";


const router = express.Router();

// Preserve message content as raw text (no HTML execution). React will render
// string children safely as text, so "<script>" will display literally.
const normalizeMessageContent = (req, _res, next) => {
  if (typeof req.body?.content === "string") {
    // Trim and cap length to 2000 characters; keep raw characters
    req.body.content = req.body.content.trim().slice(0, 2000);
  }
  // Receiver/messageType are validated by validateRequest
  next();
};

router.post(
  "/createMessage",
  normalizeMessageContent,
  validateRequest({
    body: {
      receiverId: { type: "uuid", required: true },
      content: { type: "string", required: true, min: 1, max: 2000 },
      messageType: { type: "string", required: false, enum: ["text", "image"] }
    }
  }, { sanitize: false, allowUnknown: false, stripUnknown: true }),
  createMessage
);
// Preferred endpoint used by frontend
router.post(
  "/send",
  normalizeMessageContent,
  validateRequest({
    body: {
      receiverId: { type: "uuid", required: true },
      content: { type: "string", required: true, min: 1, max: 2000 },
      messageType: { type: "string", required: false, enum: ["text", "image"] }
    }
  }, { sanitize: false, allowUnknown: false, stripUnknown: true }),
  createMessage
);
router.get("/getConversation", getConversation);
router.get(
  "/getConversation/:conversationId",
  validateRequest(
    { 
      params: { conversationId: { type: "uuid", required: true } },
      query: { 
        limit: { type: "integer", required: false, min: 1, max: 100 },
        page: { type: "integer", required: false, min: 1 }
      }
    },
    { source: ["params","query"], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  getConversationById
);
router.post(
  "/markRead/:conversationId",
  validateRequest(
    { params: { conversationId: { type: "uuid", required: true } } },
    { source: "params", allowUnknown: false }
  ),
  markRead
);



export default router;
