# ✅ Payout System - Next Steps

## Database Setup ✅ DONE
- ✅ Created `seller_payouts` table
- ✅ Created `payoutSafetyLogs` table
- ✅ Created indexes

---

## Backend Integration (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install node-cron
```

### Step 2: Update `backend/server.js`

Add these imports at the top:
```javascript
import payoutRoutes from './routes/payoutRoutes.js';
import './cron/payoutCron.js';
```

Add this route (with your other routes):
```javascript
app.use('/api/payouts', payoutRoutes);
```

**Complete example:**
```javascript
// backend/server.js
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js'; // ← ADD THIS

// Start cron jobs
import './cron/payoutCron.js'; // ← ADD THIS

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/payouts', payoutRoutes); // ← ADD THIS

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3: Restart Server
```bash
npm run dev
```

You should see:
```
💰 Payout cron job initialized
   Schedule: Daily at 9:00 AM (Asia/Manila)
```

---

## Test the Backend (5 minutes)

### Test 1: Check if routes work
```bash
# Get balance (should return 0 for new seller)
GET http://localhost:5000/api/payouts/balance
```

### Test 2: Create a test payout
1. Create an order
2. Mark it as delivered
3. Check console - should see: `Payout created for delivered order {orderId}`

### Test 3: Check payout in database
Go to Supabase → Table Editor → `seller_payouts`
- Should see new payout with status: 'pending'
- Should have `readyDate` set to 24 hours from now (or 3 days if first sale)

---

## Frontend Implementation (Next)

Now we need to create the UI for sellers to:
1. View their balance
2. Withdraw money
3. See payout history
4. Update payment info

### Files to create/update:
1. `frontend/src/pages/Marketplace/SellerDashboard.jsx` - Add Payouts tab
2. `frontend/src/pages/Settings/Settings.jsx` - Update payment settings

---

## Quick Test Checklist

- [ ] Backend dependencies installed (`node-cron`)
- [ ] Routes added to `server.js`
- [ ] Cron job imported in `server.js`
- [ ] Server restarted successfully
- [ ] Cron job message appears in console
- [ ] Can access `/api/payouts/balance` endpoint
- [ ] Order delivery creates payout automatically
- [ ] Payout appears in database

---

## What's Working Now:

✅ **Database** - Tables created and ready
✅ **Service Layer** - All business logic implemented
✅ **API Endpoints** - 8 endpoints ready to use
✅ **Automation** - Daily cron job configured
✅ **Order Integration** - Payouts created on delivery

## What's Next:

🔲 **Frontend UI** - Display balance and withdrawal buttons
🔲 **Payment Settings** - Let sellers update bank/GCash/Maya info
🔲 **Testing** - End-to-end flow testing

---

Ready to add the frontend? Let me know and I'll create the payout UI components! 🎨
