# ⚡ Quick Guide: Xendit Webhook on Render

## 🎯 3-Minute Setup

### **Step 1: Get Your Render URL** (30 seconds)

1. Go to https://dashboard.render.com
2. Click your backend service
3. Copy the URL (e.g., `https://museo-backend.onrender.com`)

---

### **Step 2: Add Webhook to Xendit** (2 minutes)

1. Go to https://dashboard.xendit.co
2. Click **Settings** → **Webhooks**
3. Click **+ Add Webhook**
4. Fill in:

```
Webhook URL:
https://museo-backend.onrender.com/api/webhooks/xendit

Events:
☑ invoice.paid
☑ invoice.expired

Environment:
○ Test Mode (for testing)
○ Live Mode (for production)
```

5. Click **Save**

---

### **Step 3: Test It** (30 seconds)

Open in browser:
```
https://museo-backend.onrender.com/api/webhooks/xendit/test
```

Should show:
```json
{
  "success": true,
  "message": "Xendit webhook endpoint is reachable!"
}
```

---

## ✅ Done!

Your webhook is now configured! 

**What happens next:**
1. User completes payment on Xendit
2. Xendit sends webhook to your Render backend
3. Order status updates to 'paid' automatically
4. User sees paid order in "My Orders"

---

## 🔍 How to Monitor

### **Check Render Logs:**

1. Render Dashboard → Your Service → **Logs**
2. Look for:
```
📥 XENDIT WEBHOOK RECEIVED
💰 Payment successful
✅ Order payment status updated
```

### **Check Xendit Dashboard:**

1. Xendit → Settings → Webhooks
2. Click your webhook
3. View **Webhook Logs**
4. Should show: ✅ **200 OK**

---

## ⚠️ Important: Free Tier Users

Render free tier sleeps after 15 minutes of inactivity.

**Problem:** Webhook might fail if service is sleeping.

**Quick Fix:** Add this to your `backend/server.js`:

```javascript
import cron from 'node-cron';

// Keep service awake (ping every 10 minutes)
if (process.env.NODE_ENV === 'production') {
  cron.schedule('*/10 * * * *', async () => {
    try {
      await fetch(`${process.env.BACKEND_URL}/api/webhooks/xendit/test`);
      console.log('⏰ Keep-alive ping');
    } catch (error) {
      console.log('⏰ Ping failed');
    }
  });
}
```

Add to Render environment variables:
```
NODE_ENV=production
BACKEND_URL=https://museo-backend.onrender.com
```

---

## 🚀 Production Checklist

```
□ Webhook URL added to Xendit
□ Test endpoint returns success
□ Made test payment
□ Webhook received in Render logs
□ Order updated to 'paid'
□ Keep-alive cron added (free tier)
□ Switched to live API key (production)
```

---

## 📞 Need Help?

**Full Guide:** See `XENDIT_WEBHOOK_RENDER.md`

**Your Webhook URL:**
```
https://[your-render-service].onrender.com/api/webhooks/xendit
```

**Test Endpoint:**
```
https://[your-render-service].onrender.com/api/webhooks/xendit/test
```

---

**That's it! Your webhook is live on Render!** 🎉
