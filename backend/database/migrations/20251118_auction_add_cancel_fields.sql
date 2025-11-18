-- 20251118_auction_add_cancel_fields.sql
-- Adds audit fields to auctions for cancellation metadata

ALTER TABLE "auctions"
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "cancelledBy" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

-- Helpful index for filtering by cancelled status
CREATE INDEX IF NOT EXISTS "idx_auctions_status_cancelled" ON "auctions" ("status") WHERE "status" = 'cancelled';
