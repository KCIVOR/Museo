/**
 * Webhook Routes
 * Handles incoming webhooks from payment providers
 */

import express from 'express';
import { handleXenditWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Test endpoint to verify webhook is reachable
router.get('/xendit/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Xendit webhook endpoint is reachable!',
    timestamp: new Date().toISOString()
  });
});

// Xendit webhook endpoint
// NOTE: This endpoint should NOT use authentication middleware
// Xendit will call this endpoint directly
router.post('/xendit', handleXenditWebhook);

export default router;
