-- ========================================
-- MIGRATION: visit_bookings to request table
-- ========================================

-- Step 1: Backup existing data (optional but recommended)
-- You can export the visit_bookings table first as backup

-- Step 2: Migrate existing visit bookings to request table
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
  "user_id" as "userId",
  'visit_booking' as "requestType",
  "status",
  jsonb_build_object(
    'visitor_type', "visitor_type",
    'organization_name', "organization_name",
    'number_of_visitors', "number_of_visitors",
    'classification', "classification",
    'year_level', "year_level",
    'institutional_type', "institutional_type",
    'location', "location",
    'organization_details', "organization_details",
    'contact_name', "contact_name",
    'contact_email', "contact_email",
    'contact_phone', "contact_phone",
    'preferred_date', "preferred_date",
    'preferred_time', "preferred_time",
    'purpose_of_visit', "purpose_of_visit",
    'purpose_other', "purpose_other",
    'remarks', "remarks",
    'admin_notes', "admin_notes",
    'originalVisitId', "visitId"  -- Keep reference to old ID
  ) as "data",
  "created_at" as "createdAt",
  COALESCE("updated_at", "created_at") as "updatedAt"
FROM "visit_bookings"
WHERE NOT EXISTS (
  -- Avoid duplicates if migration is run multiple times
  SELECT 1 FROM request r 
  WHERE r."data"->>'originalVisitId' = "visit_bookings"."visitId"::text
);

-- Step 3: Verify migration
SELECT 
  'Original visit_bookings' as source,
  COUNT(*) as count 
FROM "visit_bookings"
UNION ALL
SELECT 
  'Migrated to request table' as source,
  COUNT(*) as count 
FROM request 
WHERE "requestType" = 'visit_booking';

-- Step 4: Once verified, drop the old table
-- IMPORTANT: Only run this after confirming migration is successful!
-- Uncomment the line below when ready:
-- DROP TABLE IF EXISTS "visit_bookings" CASCADE;

-- Step 5: Clean up any references
-- If there are any foreign key constraints or views referencing visit_bookings,
-- they will need to be updated or dropped
