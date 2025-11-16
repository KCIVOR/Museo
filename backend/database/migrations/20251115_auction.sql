-- 20251115_auction.sql
-- Blind Auction core tables (camelCase with quotes to match existing schema)

-- Enable pgcrypto if needed for gen_random_uuid()
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  -- ignore errors if extension creation is not permitted
  NULL;
END $$;

-- auction_items table (separate from marketplace_items)
-- Stores auction-specific item data (title, description, images, etc.)
CREATE TABLE IF NOT EXISTS "auction_items" (
  "auctionItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "images" JSONB,
  "primary_image" TEXT,
  "medium" VARCHAR,
  "dimensions" VARCHAR,
  "year_created" INT,
  "weight_kg" NUMERIC,
  "is_original" BOOLEAN DEFAULT TRUE,
  "is_framed" BOOLEAN DEFAULT FALSE,
  "condition" VARCHAR DEFAULT 'excellent',
  "categories" JSONB,
  "tags" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

-- auctions table
CREATE TABLE IF NOT EXISTS "auctions" (
  "auctionId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "auctionItemId" UUID NOT NULL REFERENCES "auction_items"("auctionItemId") ON DELETE CASCADE,
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE CASCADE,
  "startPrice" DECIMAL(10,2) NOT NULL,
  "reservePrice" DECIMAL(10,2),
  "minIncrement" DECIMAL(10,2) DEFAULT 0,
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('draft','scheduled','active','ended','settled','cancelled')),
  "winnerUserId" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "winningBidId" UUID,
  "paymentDueAt" TIMESTAMPTZ,
  "settlementOrderId" UUID REFERENCES "orders"("orderId") ON DELETE SET NULL,
  "requiresDeposit" BOOLEAN DEFAULT FALSE,
  "depositAmountCentavos" INT DEFAULT 0,
  "allowBidUpdates" BOOLEAN DEFAULT TRUE,
  "singleBidOnly" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

-- Indexes for auction_items
CREATE INDEX IF NOT EXISTS "idx_auction_items_title" ON "auction_items"("title");
CREATE INDEX IF NOT EXISTS "idx_auction_items_user" ON "auction_items"("userId");
CREATE INDEX IF NOT EXISTS "idx_auction_items_seller" ON "auction_items"("sellerProfileId");

-- Indexes for auctions
CREATE INDEX IF NOT EXISTS "idx_auctions_status" ON "auctions"("status");
CREATE INDEX IF NOT EXISTS "idx_auctions_seller" ON "auctions"("sellerProfileId");
CREATE INDEX IF NOT EXISTS "idx_auctions_winner" ON "auctions"("winnerUserId");
CREATE INDEX IF NOT EXISTS "idx_auctions_end_time" ON "auctions"("endAt");
CREATE INDEX IF NOT EXISTS "idx_auctions_start_time" ON "auctions"("startAt");
CREATE INDEX IF NOT EXISTS "idx_auctions_item" ON "auctions"("auctionItemId");

-- Sealed bids table
CREATE TABLE IF NOT EXISTS "auction_bids" (
  "bidId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "auctionId" UUID NOT NULL REFERENCES "auctions"("auctionId") ON DELETE CASCADE,
  "bidderUserId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "amount" DECIMAL(10,2) NOT NULL,
  "idempotencyKey" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "isWithdrawn" BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS "idx_auction_bids_auction" ON "auction_bids"("auctionId");
CREATE INDEX IF NOT EXISTS "idx_auction_bids_amount" ON "auction_bids"("auctionId", "amount" DESC);
CREATE INDEX IF NOT EXISTS "idx_auction_bids_bidder" ON "auction_bids"("auctionId", "bidderUserId");
CREATE INDEX IF NOT EXISTS "idx_auction_bids_withdrawn" ON "auction_bids"("auctionId", "isWithdrawn");
CREATE INDEX IF NOT EXISTS "idx_auction_bids_user" ON "auction_bids"("bidderUserId");
CREATE INDEX IF NOT EXISTS "idx_auction_bids_idempotency" ON "auction_bids"("auctionId", "bidderUserId", "idempotencyKey");

-- Orders augmentation
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_auction" BOOLEAN DEFAULT FALSE;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "auctionId" UUID REFERENCES "auctions"("auctionId") ON DELETE SET NULL;

-- Indexes for orders auction columns
CREATE INDEX IF NOT EXISTS "idx_orders_is_auction" ON "orders"("is_auction");
CREATE INDEX IF NOT EXISTS "idx_orders_auction_id" ON "orders"("auctionId");
