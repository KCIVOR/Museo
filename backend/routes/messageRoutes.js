import express from "express";
import { createMessage, getConversation, getConversationById, markRead } from "../controllers/messageController.js";

const router = express.Router();

router.post("/createMessage", createMessage);
// Preferred endpoint used by frontend
router.post("/send", createMessage);
router.get("/getConversation", getConversation);
router.get("/getConversation/:conversationId", getConversationById);
router.post("/markRead/:conversationId", markRead);



export default router;
