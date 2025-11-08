-- ========================================
-- ENABLE FULL REPLICA IDENTITY FOR REALTIME
-- This allows Supabase Realtime to send old values in UPDATE events
-- ========================================

-- Enable replica identity FULL for profile table
-- This is required for Supabase Realtime to send the old record values
ALTER TABLE profile REPLICA IDENTITY FULL;

-- Also enable for users table if needed
ALTER TABLE users REPLICA IDENTITY FULL;

-- Verify the changes
SELECT 
    schemaname,
    tablename,
    CASE relreplident
        WHEN 'd' THEN 'default'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full'
        WHEN 'i' THEN 'index'
    END AS replica_identity
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
JOIN pg_tables ON pg_tables.tablename = pg_class.relname 
    AND pg_tables.schemaname = pg_namespace.nspname
WHERE pg_tables.tablename IN ('profile', 'users')
AND pg_tables.schemaname = 'public';

-- Expected output:
-- profile  | full
-- users    | full
