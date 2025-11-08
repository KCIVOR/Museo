-- Migration: Add Multi-Seller Order Support
-- Purpose: Allow splitting orders by seller (like Shopee/Lazada)
-- Date: 2025-11-09

-- Step 1: Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_group_id UUID,
ADD COLUMN IF NOT EXISTS seller_profile_id UUID,
ADD COLUMN IF NOT EXISTS is_parent_order BOOLEAN DEFAULT false;

-- Step 2: Add foreign key constraint for seller_profile_id
ALTER TABLE orders
ADD CONSTRAINT fk_orders_seller_profile
FOREIGN KEY (seller_profile_id) 
REFERENCES "sellerProfiles"("sellerProfileId")
ON DELETE SET NULL;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_group ON orders(payment_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_profile ON orders(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_payment_group ON orders(userId, payment_group_id);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN orders.payment_group_id IS 'Links multiple orders from same checkout/payment';
COMMENT ON COLUMN orders.seller_profile_id IS 'The seller who owns this order (for multi-seller support)';
COMMENT ON COLUMN orders.is_parent_order IS 'Legacy field - not used in new multi-seller flow';

-- Step 5: Update existing orders to have seller_profile_id
-- This sets seller_profile_id based on the first item in the order
UPDATE orders o
SET seller_profile_id = (
  SELECT oi.sellerProfileId 
  FROM order_items oi 
  WHERE oi.orderId = o.orderId 
  LIMIT 1
)
WHERE seller_profile_id IS NULL;

-- Step 6: Verify the migration
SELECT 
  COUNT(*) as total_orders,
  COUNT(payment_group_id) as orders_with_payment_group,
  COUNT(seller_profile_id) as orders_with_seller
FROM orders;

-- Expected result:
-- total_orders: Your current order count
-- orders_with_payment_group: 0 (new orders will have this)
-- orders_with_seller: Should equal total_orders (backfilled)

COMMENT ON TABLE orders IS 'Orders table - Each order belongs to ONE seller. Multiple orders can share payment_group_id for multi-seller checkouts.';
