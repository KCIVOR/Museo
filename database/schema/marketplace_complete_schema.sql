-- ========================================
-- COMPLETE MARKETPLACE SCHEMA
-- Updated with sellerProfileId integration
-- ========================================

-- ========================================
-- 1. MARKETPLACE ITEMS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS marketplace_items (
  -- Primary Key
  "marketItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Seller References
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE CASCADE,
  
  -- Basic Info
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  
  -- Artwork Details
  "medium" VARCHAR(255),
  "dimensions" VARCHAR(100),
  "year_created" INTEGER,
  "weight_kg" DECIMAL(5, 2),
  
  -- Artwork Type
  "is_original" BOOLEAN DEFAULT true,
  "is_framed" BOOLEAN DEFAULT false,
  "condition" VARCHAR(50) DEFAULT 'excellent',
  
  -- Images
  "images" TEXT[], -- Array of image URLs
  "primary_image" TEXT,
  
  -- Inventory
  "quantity" INTEGER DEFAULT 1 CHECK (quantity >= 0),
  "is_available" BOOLEAN DEFAULT true,
  
  -- Status
  "status" VARCHAR(50) DEFAULT 'active', -- active, sold, pending, inactive
  "is_featured" BOOLEAN DEFAULT false,
  
  -- Categories & Tags
  "categories" TEXT[], -- Array of category names
  "tags" TEXT[], -- Array of tags
  
  -- Metadata
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace_items
CREATE INDEX IF NOT EXISTS idx_marketplace_items_userId ON marketplace_items("userId");
CREATE INDEX IF NOT EXISTS idx_marketplace_items_sellerProfileId ON marketplace_items("sellerProfileId");
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items("status");
CREATE INDEX IF NOT EXISTS idx_marketplace_items_price ON marketplace_items("price");
CREATE INDEX IF NOT EXISTS idx_marketplace_items_created_at ON marketplace_items("created_at");

-- ========================================
-- 2. CART ITEMS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS cart_items (
  -- Primary Key
  "cartItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "marketItemId" UUID NOT NULL REFERENCES marketplace_items("marketItemId") ON DELETE CASCADE,
  
  -- Cart Details
  "quantity" INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  "added_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one item per user
  UNIQUE("userId", "marketItemId")
);

-- Indexes for cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_userId ON cart_items("userId");
CREATE INDEX IF NOT EXISTS idx_cart_items_marketItemId ON cart_items("marketItemId");

-- ========================================
-- 3. ORDERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS orders (
  -- Primary Key
  "orderId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Buyer Reference
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Order Details
  "orderNumber" VARCHAR(50) UNIQUE,
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  "platformFeeTotal" DECIMAL(10, 2),
  "artistEarningsTotal" DECIMAL(10, 2),
  
  -- Status
  "status" VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
  "paymentStatus" VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  "paymentMethod" VARCHAR(50), -- cash_on_delivery, gcash, paymongo, etc.
  
  -- Shipping Info
  "shippingAddress" JSONB,
  "contactInfo" JSONB,
  "trackingNumber" VARCHAR(100),
  
  -- Payment Info
  "paymentLinkId" VARCHAR(255),
  "paymentLinkUrl" TEXT,
  "paymentIntentId" VARCHAR(255),
  
  -- Notes
  "notes" TEXT,
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "shippedAt" TIMESTAMP WITH TIME ZONE,
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "cancelledAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders("userId");
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders("status");
CREATE INDEX IF NOT EXISTS idx_orders_paymentStatus ON orders("paymentStatus");
CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders("createdAt");
CREATE INDEX IF NOT EXISTS idx_orders_orderNumber ON orders("orderNumber");

-- ========================================
-- 4. ORDER ITEMS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS order_items (
  -- Primary Key
  "orderItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  "orderId" UUID NOT NULL REFERENCES orders("orderId") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id), -- buyer
  "marketplaceItemId" UUID REFERENCES marketplace_items("marketItemId"),
  "sellerId" UUID REFERENCES auth.users(id), -- Keep for backward compatibility
  "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId"), -- Primary seller reference
  
  -- Item Details (locked at purchase time)
  "title" VARCHAR(255) NOT NULL,
  "priceAtPurchase" DECIMAL(10, 2) NOT NULL,
  "quantity" INTEGER NOT NULL CHECK (quantity > 0),
  
  -- Financial Breakdown
  "itemTotal" DECIMAL(10, 2) NOT NULL,
  "platformFeeAmount" DECIMAL(10, 2),
  "artistEarnings" DECIMAL(10, 2),
  
  -- Metadata
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items("orderId");
CREATE INDEX IF NOT EXISTS idx_order_items_userId ON order_items("userId");
CREATE INDEX IF NOT EXISTS idx_order_items_sellerId ON order_items("sellerId");
CREATE INDEX IF NOT EXISTS idx_order_items_sellerProfileId ON order_items("sellerProfileId");
CREATE INDEX IF NOT EXISTS idx_order_items_marketplaceItemId ON order_items("marketplaceItemId");

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updatedAt for marketplace_items
CREATE OR REPLACE FUNCTION update_marketplace_items_updatedAt()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketplace_items_updatedAt
  BEFORE UPDATE ON marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_items_updatedAt();

-- Auto-update updatedAt for orders
CREATE OR REPLACE FUNCTION update_orders_updatedAt()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_updatedAt
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updatedAt();

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE marketplace_items IS 'Stores items listed for sale in the marketplace';
COMMENT ON COLUMN marketplace_items."userId" IS 'User who created the item (artist)';
COMMENT ON COLUMN marketplace_items."sellerProfileId" IS 'Seller profile reference (required for sellers, null for admin items)';
COMMENT ON COLUMN marketplace_items."price" IS 'Price in PHP';
COMMENT ON COLUMN marketplace_items."is_original" IS 'True if original artwork, false if print/reproduction';
COMMENT ON COLUMN marketplace_items."status" IS 'Item status: active, sold, pending, inactive';

COMMENT ON TABLE cart_items IS 'Shopping cart items for users';
COMMENT ON COLUMN cart_items."quantity" IS 'Number of items in cart';

COMMENT ON TABLE orders IS 'Main orders table for marketplace purchases';
COMMENT ON COLUMN orders."orderNumber" IS 'Human-readable order number (e.g., ORD-20240101-001)';
COMMENT ON COLUMN orders."platformFeeTotal" IS 'Total platform fee (10% of subtotal)';
COMMENT ON COLUMN orders."artistEarningsTotal" IS 'Total artist earnings (90% of subtotal)';

COMMENT ON TABLE order_items IS 'Individual items within an order';
COMMENT ON COLUMN order_items."priceAtPurchase" IS 'Price locked at time of purchase';
COMMENT ON COLUMN order_items."sellerProfileId" IS 'Seller profile who sold this item';
COMMENT ON COLUMN order_items."sellerId" IS 'Legacy field - kept for backward compatibility';
COMMENT ON COLUMN order_items."platformFeeAmount" IS 'Platform fee for this item (10%)';
COMMENT ON COLUMN order_items."artistEarnings" IS 'Artist earnings for this item (90%)';

-- ========================================
-- SAMPLE DATA VERIFICATION QUERIES
-- ========================================

-- Check marketplace items with seller info
-- SELECT 
--   mi."marketItemId",
--   mi."title",
--   mi."price",
--   mi."sellerProfileId",
--   sp."shopName"
-- FROM marketplace_items mi
-- LEFT JOIN "sellerProfiles" sp ON mi."sellerProfileId" = sp."sellerProfileId";

-- Check orders with seller info
-- SELECT 
--   o."orderId",
--   o."orderNumber",
--   o."totalAmount",
--   oi."title",
--   oi."sellerProfileId",
--   sp."shopName"
-- FROM orders o
-- JOIN order_items oi ON o."orderId" = oi."orderId"
-- LEFT JOIN "sellerProfiles" sp ON oi."sellerProfileId" = sp."sellerProfileId";
