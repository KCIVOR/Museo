-- ========================================
-- FIX: Drop and recreate sellerProfiles table
-- ========================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS "sellerProfiles" CASCADE;

-- Recreate with proper DEFAULT for UUID
CREATE TABLE "sellerProfiles" (
  -- Primary Key with DEFAULT
  "sellerProfileId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Reference (from auth.users)
  "userId" UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Shop Information
  "shopName" VARCHAR(255) NOT NULL,
  "shopDescription" TEXT NOT NULL,
  
  -- Contact Information
  "fullName" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "phoneNumber" VARCHAR(50) NOT NULL,
  
  -- Business Address
  "street" TEXT NOT NULL,
  "landmark" TEXT,
  "region" VARCHAR(255) NOT NULL,
  "province" VARCHAR(255) NOT NULL,
  "city" VARCHAR(255) NOT NULL,
  "barangay" VARCHAR(255) NOT NULL,
  "postalCode" VARCHAR(10) NOT NULL,
  
  -- Status & Settings
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  "suspensionReason" TEXT,
  
  -- Metadata
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX "idx_sellerProfiles_userId" ON "sellerProfiles"("userId");
CREATE INDEX "idx_sellerProfiles_isActive" ON "sellerProfiles"("isActive");
CREATE INDEX "idx_sellerProfiles_shopName" ON "sellerProfiles"("shopName");

-- Trigger for updatedAt
CREATE OR REPLACE FUNCTION update_sellerProfiles_updatedAt()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sellerProfiles_updatedAt
  BEFORE UPDATE ON "sellerProfiles"
  FOR EACH ROW
  EXECUTE FUNCTION update_sellerProfiles_updatedAt();

-- RLS Policies
ALTER TABLE "sellerProfiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seller profile"
ON "sellerProfiles" FOR SELECT
USING (auth.uid() = "userId");

CREATE POLICY "Users can update own seller profile"
ON "sellerProfiles" FOR UPDATE
USING (auth.uid() = "userId");

CREATE POLICY "Admins can view all seller profiles"
ON "sellerProfiles" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.userid = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Admins can update all seller profiles"
ON "sellerProfiles" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.userid = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "System can insert seller profiles"
ON "sellerProfiles" FOR INSERT
WITH CHECK (true);
