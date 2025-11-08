-- ========================================
-- SELLER APPLICATIONS TABLE
-- Stores seller application submissions
-- ========================================

CREATE TABLE IF NOT EXISTS "sellerApplications" (
  -- Primary Key
  "sellerApplicationId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Reference (from auth.users)
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step 1: Basic Information
  "shopName" VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "phoneNumber" VARCHAR(50) NOT NULL,
  
  -- Step 2: Business Address
  "street" TEXT NOT NULL,
  "landmark" TEXT,
  "region" VARCHAR(255) NOT NULL,
  "province" VARCHAR(255) NOT NULL,
  "city" VARCHAR(255) NOT NULL,
  "barangay" VARCHAR(255) NOT NULL,
  "postalCode" VARCHAR(10) NOT NULL,
  
  -- Step 3: Verification & Terms
  "shopDescription" TEXT NOT NULL,
  "idDocumentUrl" TEXT NOT NULL, -- URL to uploaded government ID
  "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
  
  -- Application Status
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  "reviewedBy" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "reviewedAt" TIMESTAMP WITH TIME ZONE,
  "rejectionReason" TEXT,
  
  -- Metadata
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS "idx_sellerApplications_userId" 
ON "sellerApplications"("userId");

-- Index for status filtering
CREATE INDEX IF NOT EXISTS "idx_sellerApplications_status" 
ON "sellerApplications"("status");

-- Index for reviewer lookups
CREATE INDEX IF NOT EXISTS "idx_sellerApplications_reviewedBy" 
ON "sellerApplications"("reviewedBy");

-- Index for date sorting
CREATE INDEX IF NOT EXISTS "idx_sellerApplications_createdAt" 
ON "sellerApplications"("createdAt" DESC);

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_sellerApplications_updatedAt()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sellerApplications_updatedAt
  BEFORE UPDATE ON "sellerApplications"
  FOR EACH ROW
  EXECUTE FUNCTION update_sellerApplications_updatedAt();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS
ALTER TABLE "sellerApplications" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own applications
CREATE POLICY "Users can view own applications"
ON "sellerApplications"
FOR SELECT
USING (auth.uid() = "userId");

-- Policy: Users can insert their own applications
CREATE POLICY "Users can create applications"
ON "sellerApplications"
FOR INSERT
WITH CHECK (auth.uid() = "userId");

-- Policy: Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON "sellerApplications"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.userid = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy: Admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
ON "sellerApplications"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.userid = auth.uid()
    AND users.role = 'admin'
  )
);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE "sellerApplications" IS 'Stores seller application submissions from users wanting to sell on Museo';
COMMENT ON COLUMN "sellerApplications"."sellerApplicationId" IS 'Primary key - auto-generated UUID';
COMMENT ON COLUMN "sellerApplications"."userId" IS 'Foreign key to auth.users table';
COMMENT ON COLUMN "sellerApplications"."shopName" IS 'Public seller/shop name';
COMMENT ON COLUMN "sellerApplications"."fullName" IS 'Applicant full legal name';
COMMENT ON COLUMN "sellerApplications"."email" IS 'Contact email';
COMMENT ON COLUMN "sellerApplications"."phoneNumber" IS 'Contact phone number';
COMMENT ON COLUMN "sellerApplications"."street" IS 'Street address (house/unit no., building, street)';
COMMENT ON COLUMN "sellerApplications"."landmark" IS 'Optional landmark for easier location';
COMMENT ON COLUMN "sellerApplications"."region" IS 'Philippine region name';
COMMENT ON COLUMN "sellerApplications"."province" IS 'Philippine province name';
COMMENT ON COLUMN "sellerApplications"."city" IS 'Philippine city/municipality name';
COMMENT ON COLUMN "sellerApplications"."barangay" IS 'Philippine barangay name';
COMMENT ON COLUMN "sellerApplications"."postalCode" IS 'Postal/ZIP code';
COMMENT ON COLUMN "sellerApplications"."shopDescription" IS 'Description of shop and art style';
COMMENT ON COLUMN "sellerApplications"."idDocumentUrl" IS 'URL to uploaded government ID document';
COMMENT ON COLUMN "sellerApplications"."agreedToTerms" IS 'Whether applicant agreed to seller terms';
COMMENT ON COLUMN "sellerApplications"."status" IS 'Application status: pending, approved, rejected';
COMMENT ON COLUMN "sellerApplications"."reviewedBy" IS 'Admin user who reviewed the application';
COMMENT ON COLUMN "sellerApplications"."reviewedAt" IS 'Timestamp when application was reviewed';
COMMENT ON COLUMN "sellerApplications"."rejectionReason" IS 'Reason for rejection (if applicable)';
COMMENT ON COLUMN "sellerApplications"."createdAt" IS 'Timestamp when application was submitted';
COMMENT ON COLUMN "sellerApplications"."updatedAt" IS 'Timestamp when application was last updated';
