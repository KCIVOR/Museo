-- IMPORTANT: Run this in your Supabase SQL Editor to fix the featured system

-- 1. Add the featured_date column if it doesn't exist
ALTER TABLE galleryart ADD COLUMN IF NOT EXISTS featured_date TIMESTAMP;

-- 2. Update existing featured artworks with their featured_date
UPDATE galleryart 
SET featured_date = COALESCE(featured_date, "datePosted")
WHERE featured = true AND featured_date IS NULL;

-- 3. Verify the changes
SELECT "galleryArtId", title, featured, featured_date, "datePosted" 
FROM galleryart 
ORDER BY "datePosted" DESC
LIMIT 20;

-- 4. Check current featured artworks
SELECT COUNT(*) as featured_count FROM galleryart WHERE featured = true;
