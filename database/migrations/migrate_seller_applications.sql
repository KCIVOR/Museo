-- ========================================
-- MIGRATION: sellerApplications to request table
-- ========================================

-- Step 1: Backup existing data (optional but recommended)
-- You can export the sellerApplications table first as backup

-- Step 2: Migrate existing seller applications to request table
INSERT INTO request (
  "requestId",
  "userId", 
  "requestType",
  "status",
  "data",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid() as "requestId",  -- Generate new UUID for request
  "userId",
  'seller_application' as "requestType",
  "status",
  jsonb_build_object(
    'shopName', "shopName",
    'fullName', "fullName",
    'email', "email",
    'phoneNumber', "phoneNumber",
    'street', "street",
    'landmark', "landmark",
    'region', "region",
    'province', "province",
    'city', "city",
    'barangay', "barangay",
    'postalCode', "postalCode",
    'shopDescription', "shopDescription",
    'idDocumentUrl', "idDocumentUrl",
    'agreedToTerms', "agreedToTerms",
    'reviewedBy', "reviewedBy",
    'reviewedAt', "reviewedAt",
    'rejectionReason', "rejectionReason",
    'originalSellerApplicationId', "sellerApplicationId"  -- Keep reference to old ID
  ) as "data",
  "createdAt",
  COALESCE("updatedAt", "createdAt")
FROM "sellerApplications"
WHERE NOT EXISTS (
  -- Avoid duplicates if migration is run multiple times
  SELECT 1 FROM request r 
  WHERE r."userId" = "sellerApplications"."userId"
  AND r."requestType" = 'seller_application'
);

-- Step 3: Verify migration
SELECT 
  'Original sellerApplications' as source,
  COUNT(*) as count 
FROM "sellerApplications"
UNION ALL
SELECT 
  'Migrated to request table' as source,
  COUNT(*) as count 
FROM request 
WHERE "requestType" = 'seller_application';

-- Step 4: Once verified, drop the old table
-- IMPORTANT: Only run this after confirming migration is successful!
-- Uncomment the line below when ready:
-- DROP TABLE IF EXISTS "sellerApplications" CASCADE;

-- Step 5: Clean up any references
-- If there are any foreign key constraints or views referencing sellerApplications,
-- they will need to be updated or dropped
