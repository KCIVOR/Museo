import express from "express";
import multer from "multer";
import {maintenanceRotation , getCategories, getFilteredArtworks, uploadArtwork, getArtPreference, createGalleryReact, getGalleryReact, createGalleryComment, getGalleryComments, trackArtworkView, getArtworkViews, getBatchArtworkStats, getCurrentTopArts, generateWeeklyTopArts, updateGalleryArt, deleteGalleryArt } from "../controllers/galleryController.js";

const router = express.Router();

// Manual trigger for top arts generation (for testing) - No auth required
router.post('/trigger-top-arts', async (req, res) => {
  try {
    console.log('🚀 Manual trigger received - generating top arts...');
    await generateWeeklyTopArts();
    res.json({ success: true, message: 'Top arts generation triggered successfully' });
  } catch (error) {
    console.error('Manual trigger failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Only allow JPG and PNG files
    if (file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG files are allowed'), false);
    }
  }
});

// Get available art categories
router.get('/getCategories', getCategories);

router.post('/maintenance', maintenanceRotation);


// Get filtered artworks based on categories
router.get('/artworks', getFilteredArtworks);

router.get('/getArtPreference', getArtPreference);

// Upload new artwork (with file upload middleware)
router.post('/upload', (req, res, next) => {
  console.log('Upload route hit!');
  next();
}, upload.array('images', 5), uploadArtwork);

// Gallery artwork likes/reactions
router.post('/react', createGalleryReact);
router.get('/react', getGalleryReact);
router.post('/getReact', getGalleryReact); // Also accept POST for consistency

// Gallery artwork comments
router.post('/comment', createGalleryComment);
router.get('/comments', getGalleryComments);
router.post('/getComments', getGalleryComments); // Also accept POST for consistency

// Gallery artwork views
router.post('/view', trackArtworkView);
router.get('/views', getArtworkViews);
router.post('/getViews', getArtworkViews); // Also accept POST for consistency

// Batch stats endpoint - get stats for multiple artworks in one call
router.post('/batch-stats', getBatchArtworkStats);

// Get current top arts of the week
router.get('/top-arts-weekly', getCurrentTopArts);

// Update gallery artwork
router.put('/artwork/:galleryArtId', upload.array('images', 5), updateGalleryArt);

// Delete gallery artwork
router.delete('/artwork/:galleryArtId', deleteGalleryArt);

// Debug endpoint to check topArtsWeekly table
router.get('/debug-top-arts', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get all records from topArtsWeekly table
    const { data: allRecords, error } = await supabase
      .from('topArtsWeekly')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Debug query error:', error);
      return res.json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      message: 'Debug info for topArtsWeekly table',
      totalRecords: allRecords?.length || 0,
      records: allRecords || [],
      tableExists: true
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Debug endpoint failed'
    });
  }
});

// Manual trigger for Top Arts generation (for testing)
router.post('/trigger-top-arts', async (req, res) => {
  try {
    const { generateWeeklyTopArts } = await import('../controllers/galleryController.js');
    await generateWeeklyTopArts();
    res.json({ success: true, message: 'Weekly Top Arts generation completed successfully' });
  } catch (error) {
    console.error('❌ Error in manual trigger:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;