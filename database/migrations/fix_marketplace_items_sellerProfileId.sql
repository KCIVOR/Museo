-- ========================================
-- FIX: Make sellerProfileId nullable in marketplace_items
-- This allows admins to create items without a seller profile
-- ========================================

-- Make sellerProfileId nullable (if it was set to NOT NULL)
ALTER TABLE marketplace_items 
ALTER COLUMN "sellerProfileId" DROP NOT NULL;

-- Verify the change
-- You should see "sellerProfileId" as nullable
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'marketplace_items' 
AND column_name = 'sellerProfileId';
