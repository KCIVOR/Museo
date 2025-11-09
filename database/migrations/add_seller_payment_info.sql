-- =====================================================
-- SELLER PAYMENT INFORMATION & PAYOUT SYSTEM
-- Created: 2025-11-09
-- Purpose: Add seller bank account fields and payout tracking
-- =====================================================

-- Step 1: Add payment information fields to sellerProfiles table
ALTER TABLE "sellerProfiles" 
  ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(20) DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS "bankAccountName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "bankAccountNumber" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "bankName" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "gcashNumber" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "mayaNumber" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "paymentInfoUpdatedAt" TIMESTAMPTZ;

-- Step 2: Create seller payouts tracking table
CREATE TABLE IF NOT EXISTS "seller_payouts" (
  "payoutId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE CASCADE,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  "payoutMethod" VARCHAR(20), -- bank_transfer, gcash, maya
  "payoutReference" VARCHAR(255),
  "notes" TEXT,
  "requestedAt" TIMESTAMPTZ DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "processedBy" UUID, -- References user table but no FK constraint (Supabase auth)
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS "idx_seller_payouts_seller" ON "seller_payouts"("sellerProfileId");
CREATE INDEX IF NOT EXISTS "idx_seller_payouts_status" ON "seller_payouts"("status");
CREATE INDEX IF NOT EXISTS "idx_seller_payouts_created" ON "seller_payouts"("createdAt" DESC);

-- Step 4: Add table and column comments for documentation
COMMENT ON TABLE "seller_payouts" IS 'Tracks seller payout requests and processing history';

COMMENT ON COLUMN "sellerProfiles"."paymentMethod" IS 'Preferred payout method: bank, gcash, or maya';
COMMENT ON COLUMN "sellerProfiles"."bankAccountName" IS 'Full name as shown on bank account';
COMMENT ON COLUMN "sellerProfiles"."bankAccountNumber" IS 'Bank account number';
COMMENT ON COLUMN "sellerProfiles"."bankName" IS 'Name of the bank (e.g., BDO, BPI, Metrobank, UnionBank)';
COMMENT ON COLUMN "sellerProfiles"."gcashNumber" IS 'GCash mobile number (11 digits, format: 09XXXXXXXXX)';
COMMENT ON COLUMN "sellerProfiles"."mayaNumber" IS 'Maya mobile number (11 digits, format: 09XXXXXXXXX)';

COMMENT ON COLUMN "seller_payouts"."payoutId" IS 'Unique identifier for payout transaction';
COMMENT ON COLUMN "seller_payouts"."sellerProfileId" IS 'Reference to seller receiving the payout';
COMMENT ON COLUMN "seller_payouts"."amount" IS 'Payout amount in PHP';
COMMENT ON COLUMN "seller_payouts"."status" IS 'Payout status: pending (requested), processing (in progress), completed (paid), failed (error)';
COMMENT ON COLUMN "seller_payouts"."payoutMethod" IS 'Method used for payout: bank_transfer, gcash, maya';
COMMENT ON COLUMN "seller_payouts"."payoutReference" IS 'External reference number (e.g., bank transaction ID, GCash reference)';
COMMENT ON COLUMN "seller_payouts"."notes" IS 'Additional notes or comments about the payout';
COMMENT ON COLUMN "seller_payouts"."requestedAt" IS 'When seller requested the payout';
COMMENT ON COLUMN "seller_payouts"."processedAt" IS 'When admin started processing the payout';
COMMENT ON COLUMN "seller_payouts"."completedAt" IS 'When payout was successfully completed';
COMMENT ON COLUMN "seller_payouts"."processedBy" IS 'Admin user who processed the payout';

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE "seller_payouts" ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies

-- Policy: Sellers can view their own payouts
CREATE POLICY "Sellers can view own payouts"
  ON "seller_payouts"
  FOR SELECT
  USING (
    "sellerProfileId" IN (
      SELECT "sellerProfileId" 
      FROM "sellerProfiles" 
      WHERE "userId" = auth.uid()
    )
  );

-- Policy: Sellers can create payout requests
CREATE POLICY "Sellers can request payouts"
  ON "seller_payouts"
  FOR INSERT
  WITH CHECK (
    "sellerProfileId" IN (
      SELECT "sellerProfileId" 
      FROM "sellerProfiles" 
      WHERE "userId" = auth.uid()
    )
  );

-- Policy: Admins can view all payouts
-- Note: Adjust this policy based on your actual user table structure
-- If you're using Supabase Auth, you may need to check auth.users() instead
CREATE POLICY "Admins can view all payouts"
  ON "seller_payouts"
  FOR SELECT
  USING (true); -- Temporarily allow all, adjust based on your auth system

-- Policy: Admins can update payouts (process, complete, fail)
-- Note: Adjust this policy based on your actual user table structure
CREATE POLICY "Admins can update payouts"
  ON "seller_payouts"
  FOR UPDATE
  USING (true); -- Temporarily allow all, adjust based on your auth system

-- Step 7: Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_seller_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for updatedAt
DROP TRIGGER IF EXISTS trigger_update_seller_payouts_updated_at ON "seller_payouts";
CREATE TRIGGER trigger_update_seller_payouts_updated_at
  BEFORE UPDATE ON "seller_payouts"
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_payouts_updated_at();

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- =====================================================

-- Check if columns were added to sellerProfiles
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'sellerProfiles' 
-- AND column_name IN ('paymentMethod', 'bankAccountName', 'bankAccountNumber', 'bankName', 'gcashNumber', 'mayaNumber');

-- Check if seller_payouts table was created
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'seller_payouts';

-- Check if indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename = 'seller_payouts';

-- Check if RLS policies were created
-- SELECT policyname FROM pg_policies WHERE tablename = 'seller_payouts';

-- =====================================================
-- ROLLBACK (Run this if you need to undo the migration)
-- =====================================================

-- DROP TRIGGER IF EXISTS trigger_update_seller_payouts_updated_at ON "seller_payouts";
-- DROP FUNCTION IF EXISTS update_seller_payouts_updated_at();
-- DROP POLICY IF EXISTS "Sellers can view own payouts" ON "seller_payouts";
-- DROP POLICY IF EXISTS "Sellers can request payouts" ON "seller_payouts";
-- DROP POLICY IF EXISTS "Admins can view all payouts" ON "seller_payouts";
-- DROP POLICY IF EXISTS "Admins can update payouts" ON "seller_payouts";
-- DROP TABLE IF EXISTS "seller_payouts";
-- ALTER TABLE "sellerProfiles" 
--   DROP COLUMN IF EXISTS "paymentMethod",
--   DROP COLUMN IF EXISTS "bankAccountName",
--   DROP COLUMN IF EXISTS "bankAccountNumber",
--   DROP COLUMN IF EXISTS "bankName",
--   DROP COLUMN IF EXISTS "gcashNumber",
--   DROP COLUMN IF EXISTS "mayaNumber",
--   DROP COLUMN IF EXISTS "paymentInfoUpdatedAt";
