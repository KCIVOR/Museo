# 🚀 Setting Up Xendit Webhook on Render

## 📋 Prerequisites

- ✅ Your backend is deployed on Render
- ✅ You have your Render backend URL
- ✅ You have access to Xendit dashboard

---

## 🌐 Step 1: Get Your Render Backend URL

Your Render backend URL should look like:
```
https://museo-backend.onrender.com
```

Or whatever you named your service.

### **How to Find It:**

1. Go to https://dashboard.render.com
2. Click on your backend service
3. Copy the URL at the top (e.g., `https://museo-backend.onrender.com`)

---

## 🔔 Step 2: Configure Webhook in Xendit Dashboard

### **A. Login to Xendit**

Go to: https://dashboard.xendit.co

### **B. Navigate to Webhooks**

1. Click **Settings** (⚙️ gear icon in sidebar)
2. Click **Webhooks** in the left menu
3. Click **+ Add Webhook** or **Create Webhook**

### **C. Fill in Webhook Details**

**Webhook URL:**
```
https://museo-backend.onrender.com/api/webhooks/xendit
```

**Important:** Replace `museo-backend` with your actual Render service name!

**Environment:**
- For testing: Select **Test Mode**
- For production: Select **Live Mode**

**Events to Subscribe:**
- ✅ **invoice.paid** - When payment is successful
- ✅ **invoice.expired** - When payment link expires

### **D. Save Webhook**

Click **Create Webhook** or **Save**

---

## 🧪 Step 3: Test Your Webhook

### **Method 1: Test Endpoint**

Open in browser or use curl:

```bash
curl https://museo-backend.onrender.com/api/webhooks/xendit/test
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Xendit webhook endpoint is reachable!",
  "timestamp": "2024-11-09T14:30:00.000Z"
}
```

### **Method 2: Make a Test Payment**

1. **Create an order** in your deployed marketplace
2. **Complete payment** using Xendit test card:
   ```
   Card Number: 4000 0000 0000 0002
   CVV: 123
   Expiry: 12/25
   ```
3. **Check Render logs** for webhook receipt

---

## 📊 Step 4: Monitor Webhook in Render

### **View Logs:**

1. Go to https://dashboard.render.com
2. Click on your backend service
3. Click **Logs** tab
4. Look for webhook messages:

```
📥 ========== XENDIT WEBHOOK RECEIVED ==========
📥 Event Type: invoice.paid
📥 Invoice ID: inv_abc123
📥 Status: PAID
💰 Payment successful
✅ Order payment status updated
✅ ========== PAYMENT PROCESSING COMPLETED ==========
```

---

## 🔍 Step 5: Verify in Xendit Dashboard

### **Check Webhook Delivery:**

1. Go to **Settings → Webhooks** in Xendit
2. Click on your webhook
3. View **Webhook Logs** or **Recent Deliveries**
4. You should see:
   - ✅ **Status: 200 OK**
   - ✅ **Delivered successfully**

### **If Webhook Failed:**

Check for:
- ❌ **404 Not Found** - Wrong URL
- ❌ **500 Server Error** - Backend error
- ❌ **Timeout** - Render service sleeping (free tier)

---

## ⚡ Important: Render Free Tier Considerations

### **Problem: Service Sleeps After 15 Minutes**

Render free tier services sleep when inactive. This can cause webhook failures!

### **Solutions:**

#### **Option 1: Keep Service Awake (Recommended)**

Add a cron job to ping your service every 10 minutes:

**In `backend/server.js`:**
```javascript
import cron from 'node-cron';

// Keep Render service awake (ping every 10 minutes)
if (process.env.NODE_ENV === 'production') {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/api/webhooks/xendit/test`);
      console.log('⏰ Keep-alive ping:', response.ok ? 'OK' : 'Failed');
    } catch (error) {
      console.log('⏰ Keep-alive ping failed:', error.message);
    }
  });
}
```

**Add to `.env` on Render:**
```env
NODE_ENV=production
BACKEND_URL=https://museo-backend.onrender.com
```

#### **Option 2: Upgrade to Paid Plan**

- $7/month for always-on service
- No sleep, instant webhook response
- Better for production

---

## 🔐 Step 6: Add Webhook Security (Optional)

### **Get Webhook Verification Token:**

1. In Xendit dashboard → **Settings → Webhooks**
2. Click on your webhook
3. Copy the **Verification Token**

### **Add to Render Environment Variables:**

1. Go to Render dashboard
2. Click your backend service
3. Click **Environment** tab
4. Add:
   ```
   Key: XENDIT_WEBHOOK_TOKEN
   Value: [paste your verification token]
   ```
5. Click **Save Changes**

Your service will restart automatically.

---

## 📋 Complete Webhook URL Examples

### **Development (Local):**
```
http://localhost:3000/api/webhooks/xendit
```

### **Development (ngrok):**
```
https://abc123xyz.ngrok.io/api/webhooks/xendit
```

### **Production (Render):**
```
https://museo-backend.onrender.com/api/webhooks/xendit
```

### **Production (Custom Domain):**
```
https://api.museo.art/api/webhooks/xendit
```

---

## 🎯 Webhook Configuration Summary

| Setting | Value |
|---------|-------|
| **URL** | `https://[your-service].onrender.com/api/webhooks/xendit` |
| **Method** | POST |
| **Events** | invoice.paid, invoice.expired |
| **Environment** | Test (for testing) / Live (for production) |
| **Authentication** | None (public endpoint) |

---

## ✅ Testing Checklist

```
□ Backend deployed on Render
□ Webhook URL added to Xendit dashboard
□ Test endpoint returns success
□ Made test payment
□ Webhook received (check Render logs)
□ Order status updated to 'paid'
□ Webhook shows as delivered in Xendit
□ Keep-alive cron job added (if free tier)
```

---

## 🐛 Troubleshooting

### **Webhook Not Received:**

**Check 1: URL is Correct**
```bash
# Test your endpoint
curl https://museo-backend.onrender.com/api/webhooks/xendit/test
```

**Check 2: Service is Running**
- Go to Render dashboard
- Check service status is "Live"
- Check recent logs for errors

**Check 3: Xendit Webhook Logs**
- Go to Xendit dashboard → Webhooks
- Check delivery status
- Look for error messages

### **Service is Sleeping:**

**Symptoms:**
- Webhook times out
- First request after inactivity is slow
- Xendit shows "timeout" error

**Fix:**
- Add keep-alive cron job (see above)
- Or upgrade to paid plan

### **Webhook Received but Order Not Updated:**

**Check Render Logs for:**
```
❌ No orders found with reference: MUSEO_xxx
```

**Fix:**
- Verify `paymentReference` matches between order and webhook
- Check database connection
- Verify order was created successfully

---

## 🚀 Production Deployment Steps

### **1. Switch to Live API Key**

In Render environment variables:
```
XENDIT_SECRET_KEY=xnd_production_YOUR_LIVE_KEY
```

### **2. Update Webhook to Live Mode**

In Xendit dashboard:
- Create new webhook for **Live Mode**
- Use same URL: `https://museo-backend.onrender.com/api/webhooks/xendit`

### **3. Test with Real ₱10 Payment**

Make a small real transaction to verify!

---

## 📞 Support Resources

**Render Docs:**
- https://render.com/docs

**Xendit Webhook Docs:**
- https://developers.xendit.co/api-reference/#webhooks

**Your Webhook Endpoints:**
- Test: `https://[your-service].onrender.com/api/webhooks/xendit/test`
- Webhook: `https://[your-service].onrender.com/api/webhooks/xendit`

---

## 🎉 Success!

When you see this in Render logs after a payment:

```
✅ ========== PAYMENT PROCESSING COMPLETED ==========
```

**Your webhook is working on Render!** 🚀

Orders will automatically update from `pending` to `paid` when payments are completed! 💰
