/**
 * Webhook Routes
 * Handles incoming webhooks from payment providers
 */

import express from 'express';
import { handlePaymongoWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Test endpoint to verify webhook is reachable
router.get('/paymongo/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Webhook endpoint is reachable!',
    timestamp: new Date().toISOString()
  });
});

// PayMongo webhook endpoint
// NOTE: This endpoint should NOT use authentication middleware
// PayMongo will call this endpoint directly
router.post('/paymongo', handlePaymongoWebhook);

export default router;
