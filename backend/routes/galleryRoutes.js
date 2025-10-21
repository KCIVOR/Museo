import express from "express";
import multer from "multer";
import {maintenanceRotation , getCategories, getFilteredArtworks, uploadArtwork, getArtPreference, createGalleryReact, getGalleryReact, createGalleryComment, getGalleryComments, trackArtworkView, getArtworkViews, getBatchArtworkStats } from "../controllers/galleryController.js";

const router = express.Router();

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

// Manual trigger for Top Arts calculation (for testing)
router.post('/trigger-top-arts', async (req, res) => {
  try {
    const { calculateTopArtsWeekly } = await import('../controllers/galleryController.js');
    await calculateTopArtsWeekly();
    res.json({ success: true, message: 'Top Arts calculation completed successfully' });
  } catch (error) {
    console.error('❌ Error in manual trigger:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;