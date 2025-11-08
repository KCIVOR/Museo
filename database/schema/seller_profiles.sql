-- ========================================
-- SELLER PROFILES TABLE
-- Stores active seller information
-- ========================================

CREATE TABLE IF NOT EXISTS "sellerProfiles" (
  -- Primary Key
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

-- ========================================
-- INDEXES
-- ========================================

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS "idx_sellerProfiles_userId" 
ON "sellerProfiles"("userId");

-- Index for active sellers
CREATE INDEX IF NOT EXISTS "idx_sellerProfiles_isActive" 
ON "sellerProfiles"("isActive");

-- Index for shop name search
CREATE INDEX IF NOT EXISTS "idx_sellerProfiles_shopName" 
ON "sellerProfiles"("shopName");

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updatedAt timestamp
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

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS
ALTER TABLE "sellerProfiles" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own seller profile"
ON "sellerProfiles"
FOR SELECT
USING (auth.uid() = "userId");

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own seller profile"
ON "sellerProfiles"
FOR UPDATE
USING (auth.uid() = "userId");

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all seller profiles"
ON "sellerProfiles"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.userid = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy: Admins can update all profiles (for suspension)
CREATE POLICY "Admins can update all seller profiles"
ON "sellerProfiles"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.userid = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy: Only system can insert (via approval function)
CREATE POLICY "System can insert seller profiles"
ON "sellerProfiles"
FOR INSERT
WITH CHECK (true);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE "sellerProfiles" IS 'Stores active seller profiles for approved sellers';
COMMENT ON COLUMN "sellerProfiles"."sellerProfileId" IS 'Primary key - auto-generated UUID';
COMMENT ON COLUMN "sellerProfiles"."userId" IS 'Foreign key to auth.users - unique per seller';
COMMENT ON COLUMN "sellerProfiles"."shopName" IS 'Public seller/shop name';
COMMENT ON COLUMN "sellerProfiles"."shopDescription" IS 'Description of shop and art style';
COMMENT ON COLUMN "sellerProfiles"."fullName" IS 'Seller full legal name';
COMMENT ON COLUMN "sellerProfiles"."email" IS 'Contact email';
COMMENT ON COLUMN "sellerProfiles"."phoneNumber" IS 'Contact phone number';
COMMENT ON COLUMN "sellerProfiles"."street" IS 'Street address (house/unit no., building, street)';
COMMENT ON COLUMN "sellerProfiles"."landmark" IS 'Optional landmark for easier location';
COMMENT ON COLUMN "sellerProfiles"."region" IS 'Philippine region name';
COMMENT ON COLUMN "sellerProfiles"."province" IS 'Philippine province name';
COMMENT ON COLUMN "sellerProfiles"."city" IS 'Philippine city/municipality name';
COMMENT ON COLUMN "sellerProfiles"."barangay" IS 'Philippine barangay name';
COMMENT ON COLUMN "sellerProfiles"."postalCode" IS 'Postal/ZIP code';
COMMENT ON COLUMN "sellerProfiles"."isActive" IS 'Whether seller account is active';
COMMENT ON COLUMN "sellerProfiles"."isSuspended" IS 'Whether seller is suspended by admin';
COMMENT ON COLUMN "sellerProfiles"."suspensionReason" IS 'Reason for suspension (if applicable)';
COMMENT ON COLUMN "sellerProfiles"."createdAt" IS 'Timestamp when profile was created';
COMMENT ON COLUMN "sellerProfiles"."updatedAt" IS 'Timestamp when profile was last updated';
