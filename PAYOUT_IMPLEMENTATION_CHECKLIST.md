# 📋 Payout System Implementation Checklist

## Overview
Implement a simple, artist-friendly payout system with 24-hour escrow, 4% flat fee, and automatic daily processing.

---

## ✅ Phase 1: Database Setup (Day 1)

### 1.1 Create New Tables
- [ ] Create `seller_payouts` table
  - [ ] payoutId (UUID, primary key)
  - [ ] sellerProfileId (UUID, foreign key)
  - [ ] orderId (UUID, foreign key) 
  - [ ] amount (gross amount before fees)
  - [ ] platformFee (4% fee)
  - [ ] netAmount (what seller receives)
  - [ ] status ('pending', 'ready', 'paid')
  - [ ] payoutType ('standard', 'instant')
  - [ ] instantFee (1% if instant)
  - [ ] readyDate (when funds become available)
  - [ ] paidDate (when actually paid)
  - [ ] payoutMethod (from sellerProfile)
  - [ ] payoutReference (transaction reference)
  - [ ] notes (optional notes)
  - [ ] createdAt
  - [ ] updatedAt

- [ ] Create `payoutSafetyLogs` table
  - [ ] logId (UUID)
  - [ ] orderId (UUID)
  - [ ] sellerProfileId (UUID)
  - [ ] checkType ('first_sale', 'high_value', 'new_buyer')
  - [ ] passed (boolean)
  - [ ] notes (text)
  - [ ] createdAt

### 1.2 Run Database Migration
```sql
-- File: 001_create_payout_tables.sql
CREATE TABLE seller_payouts (
  payoutId UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sellerProfileId UUID REFERENCES sellerProfiles(sellerProfileId),
  orderId UUID REFERENCES orders(orderId),
  amount DECIMAL(10,2) NOT NULL,
  platformFee DECIMAL(10,2) DEFAULT 0,
  netAmount DECIMAL(10,2) DEFAULT 0,
  instantFee DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  payoutType VARCHAR(20) DEFAULT 'standard',
  readyDate TIMESTAMP,
  paidDate TIMESTAMP,
  payoutMethod VARCHAR(20),
  payoutReference VARCHAR(100),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payoutSafetyLogs (
  logId UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orderId UUID REFERENCES orders(orderId),
  sellerProfileId UUID REFERENCES sellerProfiles(sellerProfileId),
  checkType VARCHAR(50),
  passed BOOLEAN,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payouts_seller_status ON seller_payouts(sellerProfileId, status);
CREATE INDEX idx_payouts_ready ON seller_payouts(status, readyDate);
CREATE INDEX idx_safety_order ON payoutSafetyLogs(orderId);
```

---

## ✅ Phase 2: Backend Implementation (Day 2-3)

### 2.1 Create Payout Service
- [ ] Create `backend/services/payoutService.js`
  - [ ] `createPayout(orderId)` - Creates payout when order delivered
  - [ ] `runSafetyChecks(order)` - Check first sale, high value, new buyer
  - [ ] `processReadyPayouts()` - Daily job to mark payouts as ready
  - [ ] `getSellerBalance(sellerId)` - Get available and pending balance
  - [ ] `withdrawBalance(sellerId)` - Process withdrawal
  - [ ] `requestInstantPayout(sellerId)` - Process instant with 1% fee

### 2.2 Create Payout Controller
- [ ] Create `backend/controllers/payoutController.js`
  - [ ] `GET /payouts/balance` - Get seller's balance
  - [ ] `POST /payouts/withdraw` - Request standard withdrawal
  - [ ] `POST /payouts/instant` - Request instant payout
  - [ ] `GET /payouts/history` - Get payout history
  - [ ] `GET /payouts/:payoutId` - Get specific payout details

### 2.3 Create Payout Routes
- [ ] Create `backend/routes/payoutRoutes.js`
  - [ ] Import controller functions
  - [ ] Set up routes with authentication
  - [ ] Add to main server.js

### 2.4 Update Order Flow
- [ ] Modify `markOrderAsDelivered` in marketplaceController.js
  - [ ] Call `payoutService.createPayout()` when order marked delivered
  - [ ] Log the payout creation

### 2.5 Create Cron Job
- [ ] Create `backend/cron/payoutCron.js`
  - [ ] Daily job at 9 AM to process ready payouts
  - [ ] Send notifications to sellers
  - [ ] Log all processing

---

## ✅ Phase 3: Frontend Implementation (Day 4-5)

### 3.1 Update SellerDashboard
- [ ] Add Payouts Tab
  - [ ] Show available balance
  - [ ] Show pending balance (in escrow)
  - [ ] Show total paid out
  - [ ] Withdraw button
  - [ ] Instant payout button (with fee display)

### 3.2 Create Payout Components
- [ ] `PayoutBalance.jsx` - Display balances
- [ ] `PayoutHistory.jsx` - Show payout history
- [ ] `WithdrawModal.jsx` - Withdrawal confirmation

### 3.3 Update Settings Page
- [ ] Replace "Coming Soon" with actual payout settings
- [ ] Show saved payment methods
- [ ] Allow updating payment info

### 3.4 Add API Integration
- [ ] Create payout API service functions
- [ ] Handle withdraw requests
- [ ] Handle instant payout requests
- [ ] Fetch and display history

---

## ✅ Phase 4: Testing (Day 6)

### 4.1 Test Order Flow
- [ ] Create test order
- [ ] Mark as delivered
- [ ] Verify payout created with 24-hour escrow
- [ ] Wait for ready date
- [ ] Test withdrawal

### 4.2 Test Safety Checks
- [ ] Test first sale (3-day hold)
- [ ] Test high value order (>₱5000)
- [ ] Test normal order (24-hour hold)

### 4.3 Test Instant Payout
- [ ] Verify 1% fee calculation
- [ ] Test minimum amount (₱100)
- [ ] Verify immediate availability

### 4.4 Test Edge Cases
- [ ] Multiple orders ready at once
- [ ] Insufficient balance
- [ ] Missing payment info
- [ ] Failed withdrawal

---

## ✅ Phase 5: Documentation (Day 7)

### 5.1 User Documentation
- [ ] How payouts work
- [ ] Fee structure explanation
- [ ] Setting up payment methods
- [ ] FAQ section

### 5.2 Admin Documentation
- [ ] Manual payout processing
- [ ] Handling disputes
- [ ] Monitoring payouts
- [ ] Troubleshooting guide

---

## 📁 File Structure

```
backend/
├── services/
│   └── payoutService.js          ✅ Core payout logic
├── controllers/
│   └── payoutController.js       ✅ API endpoints
├── routes/
│   └── payoutRoutes.js          ✅ Route definitions
├── cron/
│   └── payoutCron.js            ✅ Automated processing
└── migrations/
    └── 001_create_payout_tables.sql  ✅ Database setup

frontend/src/
├── pages/
│   └── Marketplace/
│       ├── SellerDashboard.jsx   ✅ Add payout tab
│       └── components/
│           ├── PayoutBalance.jsx  ✅ Balance display
│           ├── PayoutHistory.jsx  ✅ History table
│           └── WithdrawModal.jsx  ✅ Withdrawal UI
└── services/
    └── payoutService.js          ✅ API calls
```

---

## 🎯 Key Features

### For Artists
- ✅ 24-hour payout (not 7 days!)
- ✅ Only 4% platform fee
- ✅ ₱100 minimum withdrawal
- ✅ Instant payout option (1% fee)
- ✅ Support for Bank, GCash, Maya

### For Safety
- ✅ First sale: 3-day hold
- ✅ High value: Manual review
- ✅ Complete audit trail
- ✅ Automatic daily processing

### For Platform
- ✅ Sustainable fee structure
- ✅ Automated processing
- ✅ Minimal manual intervention
- ✅ Clear documentation

---

## 🚀 Implementation Order

1. **Start with database** - Create tables first
2. **Build service layer** - Core business logic
3. **Add API endpoints** - Controller and routes
4. **Update order flow** - Hook into delivery
5. **Build frontend** - User interface
6. **Test everything** - End-to-end testing
7. **Document** - User and admin guides

---

## ⚠️ Important Notes

1. **Payment Info Already Exists** - Use data from `sellerProfiles` table:
   - paymentMethod (bank/gcash/maya)
   - bankAccountName, bankAccountNumber, bankName
   - gcashNumber
   - mayaNumber

2. **Platform Fee is 4%** - Simple, fair, sustainable

3. **Escrow Period:**
   - Standard: 24 hours after delivery
   - First sale: 3 days (extra safety)
   - High value (>₱5000): Manual review

4. **Minimum Payout: ₱100** - Prevents micro-transactions

5. **Instant Payout: 1% fee** - Optional for urgent needs

---

## 📊 Success Metrics

- [ ] Average payout time < 48 hours
- [ ] Platform fee covers costs
- [ ] Artist satisfaction > 80%
- [ ] Dispute rate < 2%
- [ ] System uptime > 99%

---

## 🎉 When Complete

Artists will have:
- Fast, reliable payouts
- Transparent fee structure  
- Multiple payment options
- Full transaction history
- Peace of mind

The platform will have:
- Automated processing
- Sustainable revenue
- Happy artists
- Growing reputation
- Scalable system
