-- Robustly drop any existing CHECK on status, then add the new one allowing 'paused'
DO $$
DECLARE
  r record;
  exists_named boolean;
BEGIN
  -- Drop the expected named constraint if present
  PERFORM 1 FROM pg_constraint WHERE conname = 'auctions_status_check' AND conrelid = 'auctions'::regclass;
  IF FOUND THEN
    EXECUTE 'ALTER TABLE "auctions" DROP CONSTRAINT auctions_status_check';
  END IF;

  -- Drop any other CHECK constraints that mention the status column
  FOR r IN (
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'auctions'
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%status%IN%('
        OR pg_get_constraintdef(c.oid) ILIKE '%status%ANY%'
        OR pg_get_constraintdef(c.oid) ILIKE '%"status"%'
      )
  ) LOOP
    EXECUTE format('ALTER TABLE "auctions" DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- Add the new CHECK constraint if not already present
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_status_check' AND conrelid = 'auctions'::regclass
  ) INTO exists_named;
  IF NOT exists_named THEN
    EXECUTE 'ALTER TABLE "auctions" ADD CONSTRAINT auctions_status_check CHECK ("status" IN (''draft'',''scheduled'',''active'',''paused'',''ended'',''settled'',''cancelled''))';
  END IF;
END$$;

-- Optional but recommended for cron: speed up status+endAt scans
CREATE INDEX IF NOT EXISTS "idx_auctions_status_end" ON "auctions" ("status", "endAt");
