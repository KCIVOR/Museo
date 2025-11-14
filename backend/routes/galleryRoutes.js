import express from "express";
import multer from "multer";
import { validateRequest } from "../middleware/validation.js";
import {maintenanceRotation , getCategories, getFilteredArtworks, uploadArtwork, getArtPreference, createGalleryReact, getGalleryReact, createGalleryComment, getGalleryComments, deleteGalleryComment, updateGalleryComment, reportGalleryComment, trackArtworkView, getArtworkViews, getBatchArtworkStats, getCurrentTopArts, generateWeeklyTopArts, updateGalleryArt, deleteGalleryArt } from "../controllers/galleryController.js";

const router = express.Router();

// Manual trigger for top arts generation (for testing) - No auth required
// Support both GET and POST for easier testing
router.get('/trigger-top-arts', async (req, res) => {
  try {
    console.log('🚀 Manual trigger received (GET) - generating top arts...');
    await generateWeeklyTopArts();
    res.json({ success: true, message: 'Top arts generation triggered successfully' });
  } catch (error) {
    console.error('Manual trigger failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/trigger-top-arts', async (req, res) => {
  try {
    console.log('🚀 Manual trigger received (POST) - generating top arts...');
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
router.get(
  '/getCategories',
  validateRequest(
    { query: { page: { type: 'integer', default: 1, min: 1 }, limit: { type: 'integer', default: 15, min: 1, max: 100 } } },
    { source: 'query', coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getCategories
);

router.post('/maintenance', maintenanceRotation);


// Get filtered artworks based on categories
router.get(
  '/artworks',
  validateRequest(
    {
      query: {
        categories: { type: 'string', required: false, min: 1 },
        page: { type: 'integer', default: 1, min: 1 },
        limit: { type: 'integer', default: 20, min: 1, max: 100 }
      }
    },
    { source: 'query', coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getFilteredArtworks
);

router.get('/getArtPreference', getArtPreference);

// Upload new artwork (with file upload middleware)
router.post('/upload', (req, res, next) => {
  console.log('Upload route hit!');
  next();
}, upload.array('images', 5), validateRequest(
  {
    body: {
      title: { type: 'string', required: true, min: 1, max: 200 },
      description: { type: 'string', required: true, min: 1, max: 2000 },
      medium: { type: 'string', required: true, min: 1, max: 200 },
      categories: {
        type: 'string',
        required: true,
        validate: (v) => {
          try {
            const arr = JSON.parse(v);
            return (Array.isArray(arr) && arr.length > 0 && arr.every(x => typeof x === 'string' && x.trim().length > 0)) || 'categories must be a non-empty JSON array of strings';
          } catch {
            return 'categories must be a valid JSON array of strings';
          }
        }
      },
      applyWatermark: { type: 'boolean', required: false, default: true },
      watermarkText: { type: 'string', required: false, min: 0, max: 120 }
    }
  },
  { source: 'body', allowUnknown: false, stripUnknown: true, coerce: true }
), uploadArtwork);

// Gallery artwork likes/reactions
router.post(
  '/react',
  validateRequest(
    { body: { galleryArtId: { type: 'string', required: true, min: 1 } } },
    { source: 'body', allowUnknown: false, stripUnknown: true }
  ),
  createGalleryReact
);
router.get(
  '/react',
  validateRequest(
    { query: { galleryArtId: { type: 'string', required: true, min: 1 } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  getGalleryReact
);
router.post(
  '/getReact',
  validateRequest(
    { body: { galleryArtId: { type: 'string', required: true, min: 1 } } },
    { source: 'body', allowUnknown: false, stripUnknown: true }
  ),
  getGalleryReact
); // Also accept POST for consistency

// Gallery artwork comments
router.post(
  '/comment',
  validateRequest(
    { body: { galleryArtId: { type: 'string', required: true, min: 1 }, content: { type: 'string', required: true, min: 1, max: 2000 } } },
    { source: 'body', allowUnknown: false, stripUnknown: true }
  ),
  createGalleryComment
);
router.get(
  '/comments',
  validateRequest(
    { query: { galleryArtId: { type: 'string', required: true, min: 1 }, page: { type: 'integer', default: 1, min: 1 }, limit: { type: 'integer', default: 10, min: 1, max: 100 } } },
    { source: 'query', coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getGalleryComments
);
router.post(
  '/getComments',
  validateRequest(
    {
      body: { galleryArtId: { type: 'string', required: true, min: 1 } },
      query: { page: { type: 'integer', default: 1, min: 1 }, limit: { type: 'integer', default: 10, min: 1, max: 100 } }
    },
    { source: ['body','query'], coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getGalleryComments
); // Also accept POST for consistency
router.put(
  '/updateComment/:commentId',
  validateRequest(
    { params: { commentId: { type: 'string', required: true, min: 1 } }, body: { text: { type: 'string', required: true, min: 1, max: 2000 } } },
    { source: ['params','body'], allowUnknown: false, stripUnknown: true }
  ),
  updateGalleryComment
);
router.delete(
  '/deleteComment/:commentId',
  validateRequest(
    { params: { commentId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  deleteGalleryComment
);
router.post(
  '/reportComment',
  validateRequest(
    { body: { commentId: { type: 'string', required: true, min: 1 }, reason: { type: 'string', required: true, min: 5, max: 400 } } },
    { source: 'body', allowUnknown: false, stripUnknown: true }
  ),
  reportGalleryComment
);

// Gallery artwork views
router.post(
  '/view',
  validateRequest(
    { body: { galleryArtId: { type: 'string', required: true, min: 1 } } },
    { source: 'body', allowUnknown: false, stripUnknown: true }
  ),
  trackArtworkView
);
router.get(
  '/views',
  validateRequest(
    { query: { galleryArtId: { type: 'string', required: true, min: 1 } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  getArtworkViews
);
router.post(
  '/getViews',
  validateRequest(
    { body: { galleryArtId: { type: 'string', required: true, min: 1 } } },
    { source: 'body', allowUnknown: false, stripUnknown: true }
  ),
  getArtworkViews
); // Also accept POST for consistency

// Batch stats endpoint - get stats for multiple artworks in one call
router.post(
  '/batch-stats',
  validateRequest(
    { body: { artworkIds: { type: 'array', required: true, min: 1, items: { type: 'string', min: 1 } } } },
    { source: 'body', allowUnknown: false, stripUnknown: true }
  ),
  getBatchArtworkStats
);

// Get current top arts of the week
router.get('/top-arts-weekly', getCurrentTopArts);

router.put(
  '/artwork/:galleryArtId',
  upload.array('images', 5),
  validateRequest(
    {
      params: { galleryArtId: { type: 'string', required: true, min: 1 } },
      body: {
        title: { type: 'string', required: false, min: 0, max: 200 },
        description: { type: 'string', required: false, min: 0, max: 2000 },
        medium: { type: 'string', required: false, min: 0, max: 200 },
        categories: {
          required: false,
          validate: (v) => {
            if (v === undefined) return true;
            try {
              const arr = JSON.parse(v);
              return (Array.isArray(arr) && arr.every(x => typeof x === 'string')) || 'categories must be a JSON array of strings';
            } catch {
              return 'categories must be a valid JSON array of strings';
            }
          }
        },
        existingImages: {
          required: false,
          validate: (v) => (v === undefined || typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string'))) || 'existingImages must be a string or an array of strings'
        },
        imagesToRemove: {
          required: false,
          validate: (v) => (v === undefined || typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string'))) || 'imagesToRemove must be a string or an array of strings'
        },
        applyWatermark: { type: 'boolean', required: false, default: false },
        watermarkText: { type: 'string', required: false, min: 0, max: 120 }
      }
    },
    { source: ['params','body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  updateGalleryArt
);

// Delete gallery artwork
router.delete(
  '/artwork/:galleryArtId',
  validateRequest(
    { params: { galleryArtId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  deleteGalleryArt
);

// Debug endpoint to check topArtsWeekly table
router.get('/debug-top-arts', async (req, res) => {
  try {
    // ✅ USING SINGLETON: No new client creation!
    const { default: supabase } = await import('../database/db.js');

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

export default router;