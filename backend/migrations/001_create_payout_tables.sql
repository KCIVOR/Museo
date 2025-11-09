-- =====================================================
-- Simple Payout System for Museo
-- Artist-Friendly with 24-hour escrow
-- Supabase/PostgreSQL Compatible (camelCase with quotes)
-- =====================================================

-- 1. Create seller_payouts table
CREATE TABLE IF NOT EXISTS "seller_payouts" (
  "payoutId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId"),
  "orderId" UUID REFERENCES "orders"("orderId"),
  
  -- Amount details
  "amount" DECIMAL(10,2) NOT NULL, -- Gross amount before fees
  "platformFee" DECIMAL(10,2) DEFAULT 0, -- 4% platform fee
  "netAmount" DECIMAL(10,2) DEFAULT 0, -- What seller receives
  "instantFee" DECIMAL(10,2) DEFAULT 0, -- 1% if instant payout
  
  -- Status and type
  "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'ready', 'paid', 'failed')),
  "payoutType" VARCHAR(20) DEFAULT 'standard' CHECK ("payoutType" IN ('standard', 'instant')),
  
  -- Dates
  "readyDate" TIMESTAMP, -- When funds become available for withdrawal
  "paidDate" TIMESTAMP, -- When actually paid out
  
  -- Payment details
  "payoutMethod" VARCHAR(20), -- Will be copied from sellerProfile (bank/gcash/maya)
  "payoutReference" VARCHAR(100), -- Transaction reference number
  "notes" TEXT, -- Optional notes
  
  -- Timestamps
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 2. Create payout safety logs table
CREATE TABLE IF NOT EXISTS "payoutSafetyLogs" (
  "logId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID REFERENCES "orders"("orderId"),
  "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId"),
  "checkType" VARCHAR(50), -- 'first_sale', 'high_value', 'new_buyer'
  "passed" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_payouts_seller_status" 
ON "seller_payouts"("sellerProfileId", "status");

CREATE INDEX IF NOT EXISTS "idx_payouts_ready" 
ON "seller_payouts"("status", "readyDate") 
WHERE "status" = 'pending';

CREATE INDEX IF NOT EXISTS "idx_payouts_order" 
ON "seller_payouts"("orderId");

CREATE INDEX IF NOT EXISTS "idx_safety_order" 
ON "payoutSafetyLogs"("orderId");

CREATE INDEX IF NOT EXISTS "idx_safety_seller" 
ON "payoutSafetyLogs"("sellerProfileId");

-- 4. Create view for seller balance summary
CREATE OR REPLACE VIEW "seller_balance_summary" AS
SELECT 
  sp."sellerProfileId",
  sp."shopName",
  
  -- Available balance (ready to withdraw)
  COALESCE(SUM(CASE 
    WHEN p."status" = 'ready' 
    THEN p."netAmount" 
    ELSE 0 
  END), 0) as "availableBalance",
  
  -- Pending balance (still in escrow)
  COALESCE(SUM(CASE 
    WHEN p."status" = 'pending' 
    THEN p."netAmount" 
    ELSE 0 
  END), 0) as "pendingBalance",
  
  -- Total paid out
  COALESCE(SUM(CASE 
    WHEN p."status" = 'paid' 
    THEN p."netAmount" 
    ELSE 0 
  END), 0) as "totalPaidOut",
  
  -- Count of payouts
  COUNT(CASE WHEN p."status" = 'ready' THEN 1 END) as "readyPayouts",
  COUNT(CASE WHEN p."status" = 'pending' THEN 1 END) as "pendingPayouts",
  COUNT(CASE WHEN p."status" = 'paid' THEN 1 END) as "completedPayouts"
  
FROM "sellerProfiles" sp
LEFT JOIN "seller_payouts" p ON sp."sellerProfileId" = p."sellerProfileId"
GROUP BY sp."sellerProfileId", sp."shopName";

-- 5. Function to calculate next ready date
CREATE OR REPLACE FUNCTION "calculate_payout_ready_date"(
  p_order_id UUID,
  p_seller_id UUID
) RETURNS TIMESTAMP AS $$
DECLARE
  v_is_first_sale BOOLEAN;
  v_order_amount DECIMAL;
  v_ready_date TIMESTAMP;
BEGIN
  -- Check if this is seller's first sale
  SELECT COUNT(*) = 0 INTO v_is_first_sale
  FROM "seller_payouts"
  WHERE "sellerProfileId" = p_seller_id
  AND "status" = 'paid';
  
  -- Get order amount
  SELECT "totalAmount" INTO v_order_amount
  FROM "orders"
  WHERE "orderId" = p_order_id;
  
  -- Calculate ready date based on conditions
  IF v_is_first_sale THEN
    -- First sale: 3 days hold
    v_ready_date := NOW() + INTERVAL '3 days';
  ELSIF v_order_amount > 5000 THEN
    -- High value: 2 days for review
    v_ready_date := NOW() + INTERVAL '2 days';
  ELSE
    -- Standard: 24 hours
    v_ready_date := NOW() + INTERVAL '1 day';
  END IF;
  
  RETURN v_ready_date;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant permissions (adjust based on your Supabase setup)
-- GRANT SELECT, INSERT, UPDATE ON "seller_payouts" TO authenticated;
-- GRANT SELECT ON "seller_balance_summary" TO authenticated;
-- GRANT SELECT, INSERT ON "payoutSafetyLogs" TO authenticated;

-- =====================================================
-- To rollback:
-- DROP VIEW IF EXISTS "seller_balance_summary";
-- DROP FUNCTION IF EXISTS "calculate_payout_ready_date";
-- DROP TABLE IF EXISTS "payoutSafetyLogs";
-- DROP TABLE IF EXISTS "seller_payouts";
-- =====================================================
