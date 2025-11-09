# 🚀 Automated Payout Setup Guide

## Overview
Your payout system now automatically sends money to sellers via **Xendit** - supporting Bank Transfer, GCash, and Maya.

---

## 📋 Step 1: Create Xendit Account

### 1.1 Sign Up
1. Go to [https://dashboard.xendit.co/register](https://dashboard.xendit.co/register)
2. Choose "Philippines" as country
3. Register with your email
4. Verify your email

### 1.2 Complete Business Verification
1. Submit business documents:
   - DTI/SEC Registration (or use "Sole Proprietor" for testing)
   - Valid ID
   - Proof of address
2. Wait for approval (usually 1-3 business days)

### 1.3 Get API Keys
1. Go to **Settings** → **Developers** → **API Keys**
2. Copy your **Secret Key** (starts with `xnd_...`)
3. Keep it safe - you'll need it!

---

## 📋 Step 2: Install Dependencies

```bash
cd backend
npm install axios
```

---

## 📋 Step 3: Add Environment Variables

Add to your `.env` file:

```env
# Xendit Configuration
XENDIT_SECRET_KEY=xnd_development_your_secret_key_here

# For production, use:
# XENDIT_SECRET_KEY=xnd_production_your_secret_key_here
```

---

## 📋 Step 4: Enable Xendit Products

### In Xendit Dashboard:

#### 4.1 Enable Disbursements (Bank Transfer)
1. Go to **Products** → **Disbursements**
2. Click **Enable**
3. Complete setup wizard
4. Add your bank account for funding

#### 4.2 Enable eWallet Disbursements (GCash/Maya)
1. Go to **Products** → **eWallet Disbursements**
2. Enable **GCash**
3. Enable **PayMaya**
4. Complete KYC requirements

---

## 📋 Step 5: Fund Your Xendit Account

### Top-up Methods:
1. **Bank Transfer** - Transfer to Xendit's bank account
2. **Online Banking** - Via BPI/BDO/UnionBank
3. **7-Eleven** - Cash deposit

**Minimum:** ₱1,000 to start testing

---

## 📋 Step 6: Test the System

### 6.1 Test Mode (Development)
```env
XENDIT_SECRET_KEY=xnd_development_...
```

In test mode:
- No real money is transferred
- You can test all flows
- Use test bank accounts/numbers

### 6.2 Production Mode
```env
XENDIT_SECRET_KEY=xnd_production_...
```

Real money will be transferred!

---

## 🎯 How It Works Now

### When Seller Withdraws:

```javascript
// 1. Seller clicks "Withdraw" button
// 2. Your system calls Xendit API
// 3. Xendit sends money to seller's bank/GCash/Maya
// 4. System marks payout as "paid"
// 5. Seller receives money (usually within minutes!)
```

### Timeline:
- **Bank Transfer:** 1-2 hours (business hours)
- **GCash:** Instant (within 1 minute)
- **Maya:** Instant (within 1 minute)

---

## 💰 Xendit Fees

### Bank Transfer (Instapay)
- ₱15 per transaction
- Up to ₱50,000 per transaction
- Instant during business hours

### Bank Transfer (Pesonet)
- ₱25 per transaction
- No limit
- Next business day

### GCash
- ₱15 per transaction
- Up to ₱50,000 per transaction
- Instant

### Maya
- ₱15 per transaction
- Up to ₱50,000 per transaction
- Instant

**Note:** These fees are charged to your Xendit balance, not the seller.

---

## 🔐 Security Features

### Built-in Protection:
1. **Idempotency Keys** - Prevents duplicate payouts
2. **Webhook Verification** - Secure status updates
3. **API Authentication** - Secret key required
4. **Transaction Limits** - Configurable per method

---

## 📊 Monitoring Payouts

### In Xendit Dashboard:
1. Go to **Transactions** → **Disbursements**
2. See all payouts in real-time
3. Filter by status (PENDING, COMPLETED, FAILED)
4. Download reports

### In Your System:
```javascript
// Check payout status
const status = await payoutGatewayService.checkPayoutStatus(disbursementId);

// Check Xendit balance
const balance = await payoutGatewayService.getBalance();
```

---

## 🚨 Handling Failures

### If Payout Fails:

```javascript
// System automatically:
1. Does NOT mark payout as "paid"
2. Logs the error
3. Keeps status as "ready"
4. Seller can try again
```

### Common Failure Reasons:
- Insufficient Xendit balance
- Invalid bank account number
- Invalid phone number
- Bank maintenance
- Daily limit reached

---

## 🧪 Testing Checklist

### Before Going Live:

- [ ] Xendit account verified
- [ ] API keys added to `.env`
- [ ] Test bank payout (₱100)
- [ ] Test GCash payout (₱100)
- [ ] Test Maya payout (₱100)
- [ ] Verify money received
- [ ] Check database updates correctly
- [ ] Test failure scenarios
- [ ] Check Xendit dashboard shows transactions
- [ ] Fund production account with buffer (₱10,000+)

---

## 💡 Pro Tips

### 1. Keep Buffer Balance
Always maintain ₱10,000+ in Xendit to handle multiple payouts

### 2. Set Up Webhooks
Xendit can notify you when payouts complete:
```javascript
// Add webhook endpoint
app.post('/api/webhooks/xendit-payout', async (req, res) => {
  const { status, external_id } = req.body;
  
  if (status === 'COMPLETED') {
    // Update payout status in database
  }
});
```

### 3. Monitor Daily
Check Xendit dashboard daily for:
- Failed payouts
- Low balance warnings
- Unusual activity

### 4. Automate Top-ups
Set up auto-debit from your bank to Xendit

---

## 📞 Support

### Xendit Support:
- Email: support@xendit.co
- Phone: +63 2 8520 7157
- Chat: Available in dashboard

### Documentation:
- Disbursements: https://developers.xendit.co/api-reference/#disbursements
- eWallet: https://developers.xendit.co/api-reference/#ewallet-disbursements

---

## 🎉 You're All Set!

Your payout system now:
- ✅ Automatically creates payouts when orders delivered
- ✅ Applies escrow periods (24hr or 3 days)
- ✅ Sends money via Xendit to Bank/GCash/Maya
- ✅ Tracks all transactions
- ✅ Handles failures gracefully

**Artists get paid fast, automatically, and safely!** 🎨💰
