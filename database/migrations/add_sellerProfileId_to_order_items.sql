-- ========================================
-- ADD sellerProfileId TO MARKETPLACE TABLES
-- Run this after emptying the tables
-- ========================================

-- Step 1: Add sellerProfileId to marketplace_items table
ALTER TABLE marketplace_items 
ADD COLUMN IF NOT EXISTS "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE CASCADE;

-- Step 2: Add sellerProfileId to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId");

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_items_sellerProfileId 
ON marketplace_items("sellerProfileId");

CREATE INDEX IF NOT EXISTS idx_order_items_sellerProfileId 
ON order_items("sellerProfileId");

-- Step 4: Verify the migration
SELECT 'marketplace_items' as table_name, 
       column_name, 
       data_type, 
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'marketplace_items' 
AND column_name = 'sellerProfileId'

UNION ALL

SELECT 'order_items' as table_name, 
       column_name, 
       data_type, 
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name = 'sellerProfileId';

-- Success message
SELECT 'Migration completed successfully!' as status;
