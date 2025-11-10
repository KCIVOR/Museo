-- =====================================================
-- Critical Fixes Migration for Payout System
-- Adds idempotency, centavo columns, audit tables, etc.
-- =====================================================

-- 1. Add new columns to seller_payouts for critical fixes
ALTER TABLE "seller_payouts" 
ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS "amountCentavos" INTEGER,
ADD COLUMN IF NOT EXISTS "platformFeeCentavos" INTEGER,
ADD COLUMN IF NOT EXISTS "netAmountCentavos" INTEGER,
ADD COLUMN IF NOT EXISTS "instantFeeCentavos" INTEGER,
ADD COLUMN IF NOT EXISTS "trustScore" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trustLevel" VARCHAR(20) DEFAULT 'low',
ADD COLUMN IF NOT EXISTS "escrowHours" INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP;

-- Create index for idempotency key
CREATE INDEX IF NOT EXISTS "idx_payouts_idempotency" 
ON "seller_payouts"("idempotencyKey");

-- 2. Create withdrawal attempts table for idempotency
CREATE TABLE IF NOT EXISTS "withdrawal_attempts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId"),
  "idempotencyKey" VARCHAR(64) UNIQUE NOT NULL,
  "amountCentavos" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL, -- For backward compatibility
  "paymentMethod" VARCHAR(20),
  "status" VARCHAR(20) DEFAULT 'processing' CHECK ("status" IN ('processing', 'completed', 'failed')),
  "attempts" INTEGER DEFAULT 1,
  "reference" VARCHAR(100),
  "error" TEXT,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_withdrawal_attempts_seller" 
ON "withdrawal_attempts"("sellerProfileId", "status");

CREATE INDEX IF NOT EXISTS "idx_withdrawal_attempts_idempotency" 
ON "withdrawal_attempts"("idempotencyKey");

-- 3. Create comprehensive audit logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "action" VARCHAR(50) NOT NULL,
  "entityType" VARCHAR(30),
  "entityId" VARCHAR(100),
  "userId" UUID,
  "details" JSONB,
  "error" TEXT,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" 
ON "audit_logs"("action", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" 
ON "audit_logs"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" 
ON "audit_logs"("userId", "createdAt");

-- 4. Create order disputes table (for trust scoring)
CREATE TABLE IF NOT EXISTS "order_disputes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID REFERENCES "orders"("orderId"),
  "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId"),
  "buyerId" UUID REFERENCES auth.users(id),
  "reason" TEXT NOT NULL,
  "status" VARCHAR(30) DEFAULT 'pending' CHECK ("status" IN ('pending', 'under_review', 'resolved_for_buyer', 'resolved_for_seller', 'resolved_against_seller')),
  "resolution" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "resolvedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_disputes_seller" 
ON "order_disputes"("sellerProfileId", "status");

-- 5. Create seller ratings table (for trust scoring)
CREATE TABLE IF NOT EXISTS "seller_ratings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId"),
  "orderId" UUID REFERENCES "orders"("orderId"),
  "buyerId" UUID REFERENCES auth.users(id),
  "rating" INTEGER CHECK ("rating" >= 1 AND "rating" <= 5),
  "review" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ratings_seller" 
ON "seller_ratings"("sellerProfileId");

-- 6. Add verification status to seller profiles if not exists
ALTER TABLE "sellerProfiles"
ADD COLUMN IF NOT EXISTS "verificationStatus" VARCHAR(20) DEFAULT 'unverified' 
  CHECK ("verificationStatus" IN ('unverified', 'pending', 'verified', 'rejected'));

-- 7. Function to lock seller payouts for atomic operations
CREATE OR REPLACE FUNCTION lock_seller_payouts(seller_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Use advisory lock based on seller ID hash
  PERFORM pg_advisory_xact_lock(hashtext(seller_id::text));
END;
$$ LANGUAGE plpgsql;

-- 8. Migrate existing data to centavos (one-time migration)
-- This safely converts existing peso amounts to centavos
DO $$
BEGIN
  -- Only run if centavo columns are empty
  IF EXISTS (
    SELECT 1 FROM "seller_payouts" 
    WHERE "amountCentavos" IS NULL 
    LIMIT 1
  ) THEN
    UPDATE "seller_payouts"
    SET 
      "amountCentavos" = ROUND("amount" * 100)::INTEGER,
      "platformFeeCentavos" = ROUND("platformFee" * 100)::INTEGER,
      "netAmountCentavos" = ROUND("netAmount" * 100)::INTEGER,
      "instantFeeCentavos" = ROUND(COALESCE("instantFee", 0) * 100)::INTEGER
    WHERE "amountCentavos" IS NULL;
    
    RAISE NOTICE 'Migrated existing payouts to centavos';
  END IF;
END $$;

-- 9. Enhanced payout summary view with centavos
CREATE OR REPLACE VIEW "seller_balance_summary_v2" AS
SELECT 
  sp."sellerProfileId",
  sp."shopName",
  
  -- Balances in centavos (precise)
  COALESCE(SUM(CASE 
    WHEN p."status" = 'ready' 
    THEN COALESCE(p."netAmountCentavos", ROUND(p."netAmount" * 100)::INTEGER)
    ELSE 0 
  END), 0) as "availableBalanceCentavos",
  
  COALESCE(SUM(CASE 
    WHEN p."status" = 'pending' 
    THEN COALESCE(p."netAmountCentavos", ROUND(p."netAmount" * 100)::INTEGER)
    ELSE 0 
  END), 0) as "pendingBalanceCentavos",
  
  COALESCE(SUM(CASE 
    WHEN p."status" = 'paid' 
    THEN COALESCE(p."netAmountCentavos", ROUND(p."netAmount" * 100)::INTEGER)
    ELSE 0 
  END), 0) as "totalPaidOutCentavos",
  
  -- Balances in pesos (for display)
  ROUND(COALESCE(SUM(CASE 
    WHEN p."status" = 'ready' 
    THEN COALESCE(p."netAmountCentavos", ROUND(p."netAmount" * 100)::INTEGER)
    ELSE 0 
  END), 0) / 100.0, 2) as "availableBalance",
  
  ROUND(COALESCE(SUM(CASE 
    WHEN p."status" = 'pending' 
    THEN COALESCE(p."netAmountCentavos", ROUND(p."netAmount" * 100)::INTEGER)
    ELSE 0 
  END), 0) / 100.0, 2) as "pendingBalance",
  
  ROUND(COALESCE(SUM(CASE 
    WHEN p."status" = 'paid' 
    THEN COALESCE(p."netAmountCentavos", ROUND(p."netAmount" * 100)::INTEGER)
    ELSE 0 
  END), 0) / 100.0, 2) as "totalPaidOut",
  
  -- Trust metrics
  AVG(p."trustScore") as "averageTrustScore",
  MAX(p."trustLevel") as "currentTrustLevel",
  
  -- Counts
  COUNT(CASE WHEN p."status" = 'ready' THEN 1 END) as "readyPayouts",
  COUNT(CASE WHEN p."status" = 'pending' THEN 1 END) as "pendingPayouts",
  COUNT(CASE WHEN p."status" = 'paid' THEN 1 END) as "completedPayouts",
  
  -- Verification status
  sp."verificationStatus"
  
FROM "sellerProfiles" sp
LEFT JOIN "seller_payouts" p ON sp."sellerProfileId" = p."sellerProfileId"
GROUP BY sp."sellerProfileId", sp."shopName", sp."verificationStatus";

-- 10. Add helpful comments
COMMENT ON COLUMN "seller_payouts"."idempotencyKey" IS 'Prevents duplicate payout creation';
COMMENT ON COLUMN "seller_payouts"."amountCentavos" IS 'Amount in centavos to avoid float precision issues';
COMMENT ON COLUMN "seller_payouts"."trustScore" IS 'Seller trust score 0-100 at time of payout creation';
COMMENT ON COLUMN "seller_payouts"."escrowHours" IS 'Actual escrow period in hours based on trust level';
COMMENT ON TABLE "withdrawal_attempts" IS 'Tracks withdrawal attempts with idempotency';
COMMENT ON TABLE "audit_logs" IS 'Comprehensive audit trail for all payout operations';

-- =====================================================
-- Rollback Script (if needed):
-- 
-- DROP VIEW IF EXISTS "seller_balance_summary_v2";
-- DROP FUNCTION IF EXISTS lock_seller_payouts;
-- DROP TABLE IF EXISTS "audit_logs";
-- DROP TABLE IF EXISTS "withdrawal_attempts";
-- DROP TABLE IF EXISTS "order_disputes";
-- DROP TABLE IF EXISTS "seller_ratings";
-- ALTER TABLE "seller_payouts" 
--   DROP COLUMN IF EXISTS "idempotencyKey",
--   DROP COLUMN IF EXISTS "amountCentavos",
--   DROP COLUMN IF EXISTS "platformFeeCentavos",
--   DROP COLUMN IF EXISTS "netAmountCentavos",
--   DROP COLUMN IF EXISTS "instantFeeCentavos",
--   DROP COLUMN IF EXISTS "trustScore",
--   DROP COLUMN IF EXISTS "trustLevel",
--   DROP COLUMN IF EXISTS "escrowHours",
--   DROP COLUMN IF EXISTS "attemptCount",
--   DROP COLUMN IF EXISTS "lastAttemptAt";
-- ALTER TABLE "sellerProfiles" DROP COLUMN IF EXISTS "verificationStatus";
-- =====================================================
