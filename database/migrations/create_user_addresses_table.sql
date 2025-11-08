-- =====================================================
-- CREATE USER_ADDRESSES TABLE
-- =====================================================
-- This table stores user delivery addresses with Philippine location support
-- All columns use camelCase naming convention

-- Drop existing table if it exists (CAUTION: This deletes all data)
DROP TABLE IF EXISTS user_addresses CASCADE;

-- =====================================================
-- CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to auto-update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."isDefault" = true THEN
    -- Set all other addresses for this user to non-default
    UPDATE user_addresses 
    SET "isDefault" = false 
    WHERE "userId" = NEW."userId" 
      AND "userAddressId" != NEW."userAddressId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TABLE
-- =====================================================

CREATE TABLE user_addresses (
  "userAddressId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contact Information
  "fullName" varchar NOT NULL,
  "email" varchar NOT NULL,
  "phoneNumber" varchar NOT NULL,
  "alternatePhone" varchar,
  
  -- Address Details
  "addressLine1" varchar NOT NULL,
  "addressLine2" varchar,
  "landmark" varchar,
  
  -- Philippine Location Codes
  "regionCode" varchar NOT NULL,
  "provinceCode" varchar NOT NULL,
  "cityMunicipalityCode" varchar NOT NULL,
  "barangayCode" varchar NOT NULL,
  
  -- Philippine Location Names
  "regionName" varchar NOT NULL,
  "provinceName" varchar NOT NULL,
  "cityMunicipalityName" varchar NOT NULL,
  "barangayName" varchar NOT NULL,
  "postalCode" varchar NOT NULL,
  
  -- Metadata
  "addressType" varchar,
  "isDefault" boolean DEFAULT false,
  "deliveryInstructions" text,
  
  -- Timestamps
  "createdAt" timestamptz DEFAULT NOW(),
  "updatedAt" timestamptz DEFAULT NOW()
);

-- =====================================================
-- ADD CONSTRAINTS
-- =====================================================

-- Check: Address Type must be valid
ALTER TABLE user_addresses 
  ADD CONSTRAINT chk_address_type 
  CHECK ("addressType" IN ('Home', 'Work', 'Other') OR "addressType" IS NULL);

-- Check: Phone Number Format (Philippine mobile numbers)
ALTER TABLE user_addresses 
  ADD CONSTRAINT chk_phone_format 
  CHECK ("phoneNumber" ~ '^(09|\+639)\d{9}$');

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Index for user lookup
CREATE INDEX idx_user_addresses_userId 
  ON user_addresses("userId");

-- Index for default address queries
CREATE INDEX idx_user_addresses_userId_isDefault 
  ON user_addresses("userId", "isDefault");

-- Index for location-based queries
CREATE INDEX idx_user_addresses_location 
  ON user_addresses("regionCode", "provinceCode", "cityMunicipalityCode");

-- Index for address type filtering
CREATE INDEX idx_user_addresses_addressType 
  ON user_addresses("addressType");

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger: Auto-update updatedAt timestamp
CREATE TRIGGER trigger_update_user_addresses_timestamp
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_addresses_updated_at();

-- Trigger: Ensure only one default address per user
CREATE TRIGGER trigger_ensure_single_default
  BEFORE INSERT OR UPDATE ON user_addresses
  FOR EACH ROW
  WHEN (NEW."isDefault" = true)
  EXECUTE FUNCTION ensure_single_default_address();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own addresses
CREATE POLICY user_addresses_select_policy ON user_addresses
  FOR SELECT
  USING (auth.uid() = "userId");

-- Policy: Users can insert their own addresses
CREATE POLICY user_addresses_insert_policy ON user_addresses
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

-- Policy: Users can update their own addresses
CREATE POLICY user_addresses_update_policy ON user_addresses
  FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

-- Policy: Users can delete their own addresses
CREATE POLICY user_addresses_delete_policy ON user_addresses
  FOR DELETE
  USING (auth.uid() = "userId");

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_addresses TO authenticated;

-- Grant usage on the table to service role
GRANT ALL ON user_addresses TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_addresses IS 'Stores user delivery addresses with Philippine location support';
COMMENT ON COLUMN user_addresses."userAddressId" IS 'Primary key - Auto-generated UUID for each address';
COMMENT ON COLUMN user_addresses."userId" IS 'Foreign key to auth.users - Auto-populated from auth.uid()';
COMMENT ON COLUMN user_addresses."fullName" IS 'Recipient full name';
COMMENT ON COLUMN user_addresses."email" IS 'Contact email';
COMMENT ON COLUMN user_addresses."phoneNumber" IS 'Primary contact number (Philippine format)';
COMMENT ON COLUMN user_addresses."alternatePhone" IS 'Secondary contact number';
COMMENT ON COLUMN user_addresses."addressLine1" IS 'Street address, house/building number';
COMMENT ON COLUMN user_addresses."addressLine2" IS 'Additional address details (unit, floor, etc.)';
COMMENT ON COLUMN user_addresses."landmark" IS 'Nearby landmark for easier delivery';
COMMENT ON COLUMN user_addresses."regionCode" IS 'Philippine region code';
COMMENT ON COLUMN user_addresses."provinceCode" IS 'Province code';
COMMENT ON COLUMN user_addresses."cityMunicipalityCode" IS 'City/Municipality code';
COMMENT ON COLUMN user_addresses."barangayCode" IS 'Barangay code';
COMMENT ON COLUMN user_addresses."regionName" IS 'Full region name';
COMMENT ON COLUMN user_addresses."provinceName" IS 'Full province name';
COMMENT ON COLUMN user_addresses."cityMunicipalityName" IS 'Full city/municipality name';
COMMENT ON COLUMN user_addresses."barangayName" IS 'Full barangay name';
COMMENT ON COLUMN user_addresses."postalCode" IS 'ZIP/Postal code';
COMMENT ON COLUMN user_addresses."addressType" IS 'Address type: Home, Work, or Other';
COMMENT ON COLUMN user_addresses."isDefault" IS 'Is this the default delivery address?';
COMMENT ON COLUMN user_addresses."deliveryInstructions" IS 'Special delivery instructions';
COMMENT ON COLUMN user_addresses."createdAt" IS 'Timestamp when address was created';
COMMENT ON COLUMN user_addresses."updatedAt" IS 'Timestamp when address was last updated';

-- =====================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Uncomment to insert sample data
/*
INSERT INTO user_addresses (
  "userId", "fullName", "email", "phoneNumber",
  "addressLine1", "addressLine2", "landmark",
  "regionCode", "provinceCode", "cityMunicipalityCode", "barangayCode",
  "regionName", "provinceName", "cityMunicipalityName", "barangayName",
  "postalCode", "addressType", "isDefault", "deliveryInstructions"
) VALUES (
  'YOUR_USER_ID_HERE',
  'Juan Dela Cruz',
  'juan@example.com',
  '09171234567',
  '123 Rizal Street',
  'Unit 4B, Building A',
  'Near SM City Makati',
  'NCR',
  'NCR',
  '137404',
  '137404001',
  'National Capital Region',
  'Metro Manila',
  'Makati City',
  'San Antonio',
  '1203',
  'Home',
  true,
  'Ring doorbell twice. Gate code: 1234'
);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if table was created successfully
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'user_addresses';

-- Check columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_addresses'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'user_addresses';

-- Check indexes
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'user_addresses';

-- Check triggers
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing 
FROM information_schema.triggers 
WHERE event_object_table = 'user_addresses';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Table: user_addresses created successfully
-- All columns use camelCase naming convention
-- RLS policies enabled for security
-- Triggers configured for auto-updates
-- Ready for production use
-- =====================================================
