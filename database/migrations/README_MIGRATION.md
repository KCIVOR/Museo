# Database Migration Guide

## Overview
We're migrating from separate tables to a unified `request` table for all user requests.

### Migration Status

| Table | Status | Migration File |
|-------|--------|---------------|
| `sellerApplications` | ✅ Ready | `migrate_seller_applications.sql` |
| `visit_bookings` | ✅ Ready | `migrate_visit_bookings.sql` |

## Unified Request Table Structure

```sql
request
├─ requestId (UUID)
├─ userId (UUID)
├─ requestType (VARCHAR)  // 'artist_verification', 'seller_application', 'visit_booking'
├─ status (VARCHAR)        // 'pending', 'approved', 'rejected'
├─ data (JSONB)           // All request-specific data
├─ createdAt (TIMESTAMP)
└─ updatedAt (TIMESTAMP)
```

## Migration Steps

### Step 1: Check Existing Data
```sql
-- Check seller applications
SELECT COUNT(*) FROM "sellerApplications";

-- Check visit bookings  
SELECT COUNT(*) FROM "visit_bookings";
```

### Step 2: Run Migrations
1. Run `migrate_seller_applications.sql` in Supabase SQL Editor
2. Run `migrate_visit_bookings.sql` in Supabase SQL Editor

### Step 3: Verify Migration
```sql
-- Verify all data migrated
SELECT 
  "requestType",
  COUNT(*) as count 
FROM request 
GROUP BY "requestType";
```

### Step 4: Test Application
1. Check RequestsTab shows all request types
2. Test approving/rejecting requests
3. Test submitting new requests

### Step 5: Drop Old Tables (After Testing!)
```sql
-- Only run after confirming everything works!
DROP TABLE IF EXISTS "sellerApplications" CASCADE;
DROP TABLE IF EXISTS "visit_bookings" CASCADE;
```

## Benefits
✅ **Single source of truth** - All requests in one table
✅ **Consistent API** - Same patterns for all request types
✅ **Better performance** - Single query for all requests
✅ **Flexible data** - JSONB allows different fields per type
✅ **Cleaner codebase** - Less duplication

## Rollback Plan
If something goes wrong, the original tables are still intact until Step 5.
You can revert the backend code to use the old tables if needed.
