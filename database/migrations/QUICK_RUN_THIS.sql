-- ========================================
-- QUICK MIGRATION: Multi-Seller Orders
-- Copy and paste this into Supabase SQL Editor
-- ========================================

-- Add new columns with auto-generation (Supabase format, camelCase)
ALTER TABLE orders 
ADD COLUMN "paymentGroupId" uuid DEFAULT gen_random_uuid(),
ADD COLUMN "sellerProfileId" uuid;

-- Add foreign key
ALTER TABLE orders
ADD CONSTRAINT fk_orders_seller_profile
FOREIGN KEY ("sellerProfileId") 
REFERENCES "sellerProfiles"("sellerProfileId")
ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_orders_payment_group ON orders("paymentGroupId");
CREATE INDEX idx_orders_seller_profile ON orders("sellerProfileId");

-- Backfill existing orders with sellerProfileId
UPDATE orders o
SET "sellerProfileId" = (
  SELECT oi."sellerProfileId" 
  FROM order_items oi 
  WHERE oi."orderId" = o."orderId" 
  LIMIT 1
)
WHERE "sellerProfileId" IS NULL;

-- Verify (should show your order count)
SELECT 
  COUNT(*) as total_orders,
  COUNT("sellerProfileId") as orders_with_seller
FROM orders;
