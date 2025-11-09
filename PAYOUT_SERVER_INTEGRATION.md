# 🔧 Server Integration Guide for Payout System

## Add to your `backend/server.js` file:

### 1. Import Payout Routes
Add this with your other route imports:
```javascript
import payoutRoutes from './routes/payoutRoutes.js';
```

### 2. Import Cron Job
Add this after your route imports:
```javascript
// Start payout cron job
import './cron/payoutCron.js';
```

### 3. Add Routes Middleware
Add this with your other route definitions:
```javascript
// Payout routes
app.use('/api/payouts', payoutRoutes);
```

## Complete Example:

```javascript
// backend/server.js

import express from 'express';
import cors from 'cors';
// ... other imports

// Route imports
import authRoutes from './routes/authRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js'; // ← ADD THIS

// Cron jobs
import './cron/payoutCron.js'; // ← ADD THIS

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/payouts', payoutRoutes); // ← ADD THIS

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Required Package Installation:

```bash
cd backend
npm install node-cron
```

## Environment Variables (if needed):

Add to your `.env` file if you want to customize:
```env
# Payout Settings (optional)
PLATFORM_FEE_RATE=0.04  # 4% platform fee
INSTANT_FEE_RATE=0.01   # 1% instant payout fee
MIN_PAYOUT_AMOUNT=100   # Minimum ₱100
```

## That's it! The payout system is now integrated.
