# 🔧 Fix Payout Creation Issue

## **Step 1: Check if Table Exists**

Go to Supabase SQL Editor and run:

```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'seller_payouts'
);
```

If it returns `false`, the table doesn't exist. Continue to Step 2.

---

## **Step 2: Create the Tables (if missing)**

Run this in Supabase SQL Editor:

```sql
-- =====================================================
-- Create Payout Tables
-- =====================================================

-- 1. Create seller_payouts table
CREATE TABLE IF NOT EXISTS "seller_payouts" (
  "payoutId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId"),
  "orderId" UUID REFERENCES "orders"("orderId"),
  
  -- Amount details
  "amount" DECIMAL(10,2) NOT NULL,
  "platformFee" DECIMAL(10,2) DEFAULT 0,
  "netAmount" DECIMAL(10,2) DEFAULT 0,
  "instantFee" DECIMAL(10,2) DEFAULT 0,
  
  -- Status and type
  "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'ready', 'paid', 'failed')),
  "payoutType" VARCHAR(20) DEFAULT 'standard' CHECK ("payoutType" IN ('standard', 'instant')),
  
  -- Dates
  "readyDate" TIMESTAMP,
  "paidDate" TIMESTAMP,
  
  -- Payment details
  "payoutMethod" VARCHAR(20),
  "payoutReference" VARCHAR(100),
  "notes" TEXT,
  
  -- Timestamps
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 2. Create payout safety logs table
CREATE TABLE IF NOT EXISTS "payoutSafetyLogs" (
  "logId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID REFERENCES "orders"("orderId"),
  "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId"),
  "checkType" VARCHAR(50),
  "passed" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS "idx_payouts_seller_status" 
ON "seller_payouts"("sellerProfileId", "status");

CREATE INDEX IF NOT EXISTS "idx_payouts_ready" 
ON "seller_payouts"("status", "readyDate") 
WHERE "status" = 'pending';

CREATE INDEX IF NOT EXISTS "idx_payouts_order" 
ON "seller_payouts"("orderId");
```

---

## **Step 3: Verify Table Created**

Run this query to check:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'seller_payouts';
```

You should see all the columns listed.

---

## **Step 4: Test Payout Creation**

### **A. Manual Test in Database**

Try creating a test payout directly:

```sql
INSERT INTO "seller_payouts" (
  "sellerProfileId",
  "orderId", 
  "amount",
  "platformFee",
  "netAmount",
  "status",
  "payoutType",
  "readyDate",
  "notes"
) 
SELECT 
  "sellerProfileId",
  "orderId",
  "totalAmount",
  "totalAmount" * 0.04,
  "totalAmount" * 0.96,
  'pending',
  'standard',
  NOW() + INTERVAL '1 day',
  'Test payout'
FROM "orders" 
WHERE "orderId" = 'YOUR_ORDER_ID_HERE'
LIMIT 1;
```

Replace `YOUR_ORDER_ID_HERE` with a real order ID.

---

## **Step 5: Check Backend Logs**

After marking an order as delivered, check your backend logs for:

```
❌ Error creating payout for order xxx: [error message]
```

This will tell you the exact error.

---

## **Step 6: Test the Flow**

1. **Create an order** and pay
2. **Mark as shipped** (seller)
3. **Mark as delivered** (buyer)
4. **Check database:**

```sql
SELECT * FROM "seller_payouts" 
WHERE "orderId" = 'YOUR_ORDER_ID';
```

---

## **🐛 Common Issues:**

### **Issue: "relation does not exist"**
**Fix:** Run Step 2 to create the tables

### **Issue: "violates foreign key constraint"**
**Fix:** Make sure sellerProfileId exists in sellerProfiles table

### **Issue: "null value in column"**
**Fix:** Check that order has sellerProfileId field populated

---

## **✅ Code Fixes Applied:**

1. **Fixed field name:** `buyerId` → `userId` 
2. **Fixed notes field:** Array → String
3. **Added better error logging**

---

## **🚀 Quick Debug Commands:**

```bash
# Check if payout was created
SELECT * FROM "seller_payouts" ORDER BY "createdAt" DESC LIMIT 5;

# Check orders with sellerProfileId
SELECT "orderId", "sellerProfileId", "status" 
FROM "orders" 
WHERE "sellerProfileId" IS NOT NULL 
ORDER BY "createdAt" DESC LIMIT 5;

# Check if seller profile exists
SELECT * FROM "sellerProfiles" WHERE "isActive" = true;
```

---

## **📋 Summary:**

The payout system is failing because:
1. ✅ **Fixed:** Wrong field names (buyerId → userId)
2. ✅ **Fixed:** Wrong data type (notes array → string)
3. ⚠️ **Check:** Table might not exist in database

**Run the SQL in Step 2 to create the tables, then test again!**
