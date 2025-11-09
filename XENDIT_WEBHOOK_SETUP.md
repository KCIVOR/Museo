# 🔔 Xendit Webhook Setup Guide

## ✅ Webhook is Ready!

Your webhook handler is now configured and ready to receive Xendit payment notifications.

---

## 🧪 Test Webhook Locally (Using ngrok)

### **Step 1: Install ngrok**

```bash
# Download from https://ngrok.com/download
# Or install via npm
npm install -g ngrok
```

### **Step 2: Start Your Backend**

```bash
cd backend
npm run dev
```

You should see:
```
Server is running on port 3000
```

### **Step 3: Expose Your Local Server**

Open a **new terminal** and run:

```bash
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       your-account
Version                       3.x.x
Region                        Asia Pacific (ap)
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL:** `https://abc123xyz.ngrok.io`

---

## 🌐 Configure Webhook in Xendit Dashboard

### **Step 1: Login to Xendit**

Go to: https://dashboard.xendit.co

### **Step 2: Navigate to Webhooks**

1. Click **Settings** (gear icon)
2. Click **Webhooks** in the left menu
3. Click **+ Create Webhook**

### **Step 3: Add Webhook URL**

**Webhook URL:**
```
https://abc123xyz.ngrok.io/api/webhooks/xendit
```

Replace `abc123xyz` with your actual ngrok URL!

### **Step 4: Select Events**

Check these events:
- ✅ **invoice.paid** - When payment is successful
- ✅ **invoice.expired** - When payment link expires

### **Step 5: Save Webhook**

Click **Create Webhook**

---

## 🧪 Test the Webhook

### **Method 1: Test Endpoint**

Visit in browser:
```
https://abc123xyz.ngrok.io/api/webhooks/xendit/test
```

You should see:
```json
{
  "success": true,
  "message": "Xendit webhook endpoint is reachable!",
  "timestamp": "2024-11-09T14:30:00.000Z"
}
```

### **Method 2: Make a Real Payment**

1. **Create an order** in your marketplace
2. **Complete payment** using test card:
   ```
   Card: 4000 0000 0000 0002
   CVV: 123
   Expiry: 12/25
   ```
3. **Check your backend console** for:
   ```
   📥 ========== XENDIT WEBHOOK RECEIVED ==========
   📥 Event Type: invoice.paid
   💰 Payment successful
   ✅ Order payment status updated
   🗑️ Cart was already cleared during order creation
   ✅ ========== PAYMENT PROCESSING COMPLETED ==========
   ```

---

## 📋 Webhook Flow

```
XENDIT                    YOUR SERVER
  │                           │
  │  Payment Completed        │
  │                           │
  ├─[POST /api/webhooks/xendit]─>
  │                           │
  │  Headers:                 │
  │  x-callback-event:        │
  │    invoice.paid           │
  │                           │
  │  Body:                    │
  │  {                        │
  │    id: "inv_abc123",      │
  │    external_id: "MUSEO_...",
  │    status: "PAID",        │
  │    amount: 2222,          │
  │    paid_at: "..."         │
  │  }                        │
  │                           │
  │                           ├─[Find Orders]
  │                           ├─[Update Status to 'paid']
  │                           ├─[Log Success]
  │                           │
  │<─[200 OK]─────────────────┤
```

---

## 🔍 Debugging Webhooks

### **Check Backend Console:**

Look for these messages:

**✅ Success:**
```
📥 ========== XENDIT WEBHOOK RECEIVED ==========
📥 Event Type: invoice.paid
💰 Payment successful
✅ Found 1 order(s) with payment reference
✅ Order 0318a685 payment status updated (₱2222)
✅ ========== PAYMENT PROCESSING COMPLETED ==========
```

**❌ Error:**
```
❌ No orders found with reference: MUSEO_1762696933710_fkaopq
```

### **Check Xendit Dashboard:**

1. Go to **Webhooks** in Xendit dashboard
2. Click on your webhook
3. View **Webhook Logs**
4. See delivery status and responses

---

## 🚀 Production Setup

When you deploy to production:

### **Step 1: Get Production URL**

Example: `https://museo-api.yourdomain.com`

### **Step 2: Update Webhook in Xendit**

Change webhook URL to:
```
https://museo-api.yourdomain.com/api/webhooks/xendit
```

### **Step 3: Switch to Live API Key**

In your `.env`:
```env
XENDIT_SECRET_KEY=xnd_production_YOUR_LIVE_KEY_HERE
```

### **Step 4: Test with Real ₱10**

Make a small real transaction to verify everything works!

---

## 📊 What the Webhook Does

### **When Payment is Successful:**

1. ✅ **Receives webhook** from Xendit
2. ✅ **Finds all orders** with matching reference
3. ✅ **Updates payment status** to 'paid'
4. ✅ **Records payment details** (method, fees, etc.)
5. ✅ **Logs completion**

**Note:** Cart is already cleared during order creation, not in webhook!

### **When Payment Expires:**

1. ⏰ **Receives webhook** from Xendit
2. ⏰ **Finds all orders** with matching reference
3. ⏰ **Updates payment status** to 'expired'
4. ⏰ **Logs expiration**

---

## 🔐 Security Notes

### **Webhook Signature Verification:**

Currently set to skip verification in development. For production:

1. Get webhook verification token from Xendit dashboard
2. Add to `.env`:
   ```env
   XENDIT_WEBHOOK_TOKEN=your_webhook_token_here
   ```
3. Implement proper HMAC verification in `xenditService.js`

---

## ✅ Checklist

```
□ Backend running on port 3000
□ ngrok exposing localhost:3000
□ Webhook URL added to Xendit dashboard
□ Events selected: invoice.paid, invoice.expired
□ Test endpoint returns success
□ Made test payment
□ Webhook received in backend console
□ Order status updated to 'paid'
```

---

## 🆘 Troubleshooting

### **Webhook not received:**
- Check ngrok is still running
- Verify webhook URL in Xendit dashboard
- Check Xendit webhook logs for delivery errors

### **Orders not updating:**
- Check `paymentReference` matches between order and webhook
- Verify database connection
- Check backend console for errors

### **Multiple webhooks:**
- Normal! Xendit may retry
- Your code prevents duplicate processing

---

## 🎉 Success!

When you see this in your console after a payment:

```
✅ ========== PAYMENT PROCESSING COMPLETED ==========
```

**Your webhook is working perfectly!** 🚀

The order status will automatically update from `pending` to `paid`, and the buyer will see their order in "My Orders" page!

---

## 📞 Support

**Xendit Webhook Docs:**
https://developers.xendit.co/api-reference/#webhooks

**ngrok Docs:**
https://ngrok.com/docs

**Your Webhook Endpoint:**
```
Local: http://localhost:3000/api/webhooks/xendit
ngrok: https://[your-id].ngrok.io/api/webhooks/xendit
Production: https://your-domain.com/api/webhooks/xendit
```

**Test it now!** 🎨💰
