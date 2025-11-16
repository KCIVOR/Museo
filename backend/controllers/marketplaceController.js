// marketplaceController.js
import db from '../database/db.js';
import * as xenditService from '../services/xenditService.js';
import payoutService from '../services/payoutService.js';

// Simple inline helper functions
const sanitizeInput = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
};

const validatePhone = (phone) => {
  // Philippine phone format
  const phoneRegex = /^(\+63|0)?9\d{9}$/;
  if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  return { valid: true };
};

const validateAddress = (address) => {
  const required = ['street', 'barangay', 'city', 'province', 'postal_code'];
  const missing = required.filter(field => !address[field] || address[field].toString().trim() === '');
  
  if (missing.length > 0) {
    return { valid: false, errors: [`Missing address fields: ${missing.join(', ')}`] };
  }
  
  // Validate postal code format (4 digits for Philippines)
  const postalCode = address.postal_code.toString();
  if (!/^\d{4}$/.test(postalCode)) {
    return { valid: false, errors: ['Postal code must be 4 digits'] };
  }
  
  return { valid: true };
};

const validateTextLength = (text, min, max, fieldName = 'Field') => {
  if (typeof text !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  const trimmed = text.trim();
  if (trimmed.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  if (trimmed.length > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max} characters` };
  }
  return { valid: true };
};

const validateRequiredFields = (data, fields) => {
  const missing = fields.filter(field => !data[field] || data[field].toString().trim() === '');
  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }
  return { valid: true };
};

const validateAuth = (req) => {
  if (!req.user || !req.user.id) {
    return { valid: false, error: 'Authentication required' };
  }
  return { valid: true, userId: req.user.id };
};

// Helper: Create test marketplace items (TESTING ONLY - REMOVE IN PRODUCTION)
export const createTestItems = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;

    const testItems = [
      {
        userId: userId,
        title: "Sunset Over Mountains",
        description: "A breathtaking landscape painting capturing the golden hour",
        price: 2500,
        quantity: 3,
        status: "active",
        medium: "Oil on Canvas",
        dimensions: "24x36 inches",
        is_original: true,
        is_available: true,
        is_featured: false
      },
      {
        userId: userId,
        title: "Abstract Emotions",
        description: "Modern abstract art expressing deep feelings",
        price: 1800,
        quantity: 5,
        status: "active",
        medium: "Acrylic",
        dimensions: "18x24 inches",
        is_original: true,
        is_available: true,
        is_featured: false
      },
      {
        userId: userId,
        title: "City Lights at Night",
        description: "Urban landscape with vibrant city lights",
        price: 3200,
        quantity: 2,
        status: "active",
        medium: "Digital Print",
        dimensions: "30x40 inches",
        is_original: false,
        is_available: true,
        is_featured: true
      }
    ];

    const { data, error } = await db
      .from('marketplace_items')
      .insert(testItems)
      .select();

    if (error) {
      console.error('Error creating test items:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: `Created ${data.length} test items`,
      data: data
    });

  } catch (error) {
    console.error('Error in createTestItems:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Create/Upload marketplace item
export const createMarketplaceItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // STEP 1: Verify user is an artist or admin
    const { data: userProfile, error: profileError } = await db
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to verify user profile' 
      });
    }

    if (userProfile.role !== 'artist' && userProfile.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only verified artists or admins can list items in the marketplace. Please apply for artist verification first.' 
      });
    }

    // STEP 2: Get active seller profile
    const { data: sellerProfile, error: sellerError } = await db
      .from('sellerProfiles')
      .select('*')
      .eq('userId', userId)
      .eq('isActive', true)
      .eq('isSuspended', false)
      .single();

    if (sellerError || !sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be an approved seller to list items. Please apply to become a seller first.',
        requiresSellerProfile: true
      });
    }

    // Parse FormData fields
    const {
      title, description, medium, dimensions,
      year_created, weight_kg, is_original, is_framed,
      condition, quantity, is_available, is_featured, status
    } = req.body;
    
    const price = parseFloat(req.body.price);
    const parsedQuantity = parseInt(quantity) || 1;
    
    // Parse JSON fields
    const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    // Check required fields
    if (!title || !title.trim() || !req.body.price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and price are required' 
      });
    }

    // Check title length
    if (title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title must be between 3 and 200 characters' 
      });
    }

    // Check price
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Price must be a positive number' 
      });
    }
    if (price > 10000000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Price must not exceed 10,000,000' 
      });
    }

    // Check quantity
    if (parsedQuantity < 1 || parsedQuantity > 1000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be between 1 and 1000' 
      });
    }

    // Check description if provided
    if (description && description.trim().length > 5000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Description must not exceed 5000 characters' 
      });
    }

    // Check year if provided
    if (year_created) {
      const currentYear = new Date().getFullYear();
      const yearInt = parseInt(year_created);
      if (yearInt < 1000 || yearInt > currentYear) {
        return res.status(400).json({ 
          success: false, 
          message: `Year created must be between 1000 and ${currentYear}` 
        });
      }
    }

    // Check weight if provided
    if (weight_kg) {
      const weightFloat = parseFloat(weight_kg);
      if (weightFloat < 0 || weightFloat > 1000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Weight must be between 0 and 1000 kg' 
        });
      }
    }

    // Check categories array
    if (categories.length > 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Categories must not exceed 10 items' 
      });
    }

    // Sanitize text inputs
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = description ? sanitizeInput(description) : '';
    const sanitizedMedium = medium ? sanitizeInput(medium) : '';
    const sanitizedDimensions = dimensions ? sanitizeInput(dimensions) : '';

    // Handle image uploads (similar to galleryController)
    let imageUrls = [];
    let primaryImageUrl = null;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";
          const fileName = `${Date.now()}-${safeName}`;
          const filePath = `marketplace/${userId}/${fileName}`;

          const { data, error } = await db.storage
            .from("uploads")
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              upsert: false,
            });

          if (error) {
            continue;
          }

          const { data: publicUrlData } = db.storage
            .from("uploads")
            .getPublicUrl(data.path);

          if (publicUrlData?.publicUrl) {
            imageUrls.push(publicUrlData.publicUrl);
          }
        } catch (uploadError) {
          continue;
        }
      }

      // First image becomes primary
      if (imageUrls.length > 0) {
        primaryImageUrl = imageUrls[0];
      }
    }

    // Create the item object with sanitized values
    const newItem = {
      userId,
      sellerProfileId: sellerProfile.sellerProfileId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      price,
      medium: sanitizedMedium,
      dimensions: sanitizedDimensions,
      year_created: year_created ? parseInt(year_created) : null,
      weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      is_original: is_original === 'true',
      is_framed: is_framed === 'true',
      condition: condition || 'excellent',
      quantity: parsedQuantity,
      is_available: is_available === 'true',
      is_featured: is_featured === 'true',
      status: status || 'active',
      categories,
      tags,
      images: imageUrls,
      primary_image: primaryImageUrl
    };

    // Insert marketplace item with sanitized values
    const { data, error } = await db
      .from('marketplace_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Marketplace item created successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in createMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get single marketplace item by ID
export const getMarketplaceItem = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: item, error } = await db
      .from('marketplace_items')
      .select(`
        *,
        sellerProfiles (
          sellerProfileId,
          shopName,
          shopDescription,
          fullName,
          email,
          phoneNumber,
          street,
          city,
          province,
          region,
          isActive,
          isSuspended
        )
      `)
      .eq('marketItemId', id)
      .single();

    if (error || !item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    // Check if seller is still active
    if (!item.sellerProfiles || 
        !item.sellerProfiles.isActive || 
        item.sellerProfiles.isSuspended) {
      return res.status(404).json({ 
        success: false, 
        error: 'This item is no longer available (seller inactive or suspended)' 
      });
    }

    // Check if item is active and available
    if (item.status !== 'active' || !item.is_available) {
      return res.status(404).json({ 
        success: false, 
        error: 'This item is no longer available' 
      });
    }

    res.json({ 
      success: true, 
      data: item
    });

  } catch (error) {
    console.error('Error in getMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get all marketplace items
export const getMarketplaceItems = async (req, res) => {
  try {
    const { status, sellerProfileId, page, limit } = req.query;
    
    // Check pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    if (pageNum < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid page number' 
      });
    }
    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Limit must be between 1 and 100' 
      });
    }
    
    const offset = (pageNum - 1) * limitNum;
    
    let query = db
      .from('marketplace_items')
      .select(`
        *,
        sellerProfiles!inner (
          sellerProfileId,
          shopName,
          city,
          province,
          isActive,
          isSuspended
        )
      `)
      .eq('sellerProfiles.isActive', true)
      .eq('sellerProfiles.isSuspended', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    // Filter by status if provided, otherwise show only active items
    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: only show active items in public marketplace
      query = query.eq('status', 'active');
    }
    
    // Also filter by is_available flag
    query = query.eq('is_available', true);

    // Filter by seller profile if provided (for seller dashboard)
    if (sellerProfileId) {
      query = query.eq('sellerProfileId', sellerProfileId);
    }
    
    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching items:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Transform to include seller info at root level
    const transformedItems = items.map(item => ({
      ...item,
      seller: {
        shopName: item.sellerProfiles.shopName,
        location: `${item.sellerProfiles.city}, ${item.sellerProfiles.province}`
      }
    }));

    res.json({ 
      success: true, 
      data: transformedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: transformedItems.length,
        hasMore: transformedItems.length === limitNum
      }
    });

  } catch (error) {
    console.error('Error in getMarketplaceItems:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Update marketplace item
export const updateMarketplaceItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await db
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to verify user profile' 
      });
    }

    const isAdmin = userProfile.role === 'admin';

    // Check if item exists
    const { data: existingItem, error: checkError } = await db
      .from('marketplace_items')
      .select('userId, sellerProfileId')
      .eq('marketItemId', id)
      .single();

    if (checkError || !existingItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    // If not admin, verify seller profile and ownership
    if (!isAdmin) {
      // Get user's active seller profile
      const { data: sellerProfile, error: sellerError } = await db
        .from('sellerProfiles')
        .select('sellerProfileId')
        .eq('userId', userId)
        .eq('isActive', true)
        .eq('isSuspended', false)
        .single();

      if (sellerError || !sellerProfile) {
        return res.status(403).json({ 
          success: false, 
          error: 'You must be an active seller to update items' 
        });
      }

      // Check ownership via sellerProfileId
      if (existingItem.sellerProfileId !== sellerProfile.sellerProfileId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to update this item'
        });
      }
    }
    
    // Build update object with validation
    let updateData = {};
    const errors = [];
    
    // Check and sanitize title if provided
    if (req.body.title !== undefined) {
      const titleTrimmed = req.body.title.trim();
      if (titleTrimmed.length < 3 || titleTrimmed.length > 200) {
        errors.push('Title must be between 3 and 200 characters');
      } else {
        updateData.title = sanitizeInput(req.body.title);
      }
    }
    
    // Check and sanitize description if provided
    if (req.body.description !== undefined) {
      if (req.body.description.trim().length > 5000) {
        errors.push('Description must not exceed 5000 characters');
      } else {
        updateData.description = sanitizeInput(req.body.description);
      }
    }
    
    // Check price if provided
    if (req.body.price !== undefined) {
      const price = parseFloat(req.body.price);
      if (isNaN(price) || price <= 0) {
        errors.push('Price must be a positive number');
      } else if (price > 10000000) {
        errors.push('Price must not exceed 10,000,000');
      } else {
        updateData.price = price;
      }
    }
    
    // Check and sanitize medium if provided
    if (req.body.medium !== undefined) {
      if (req.body.medium.trim().length > 100) {
        errors.push('Medium must not exceed 100 characters');
      } else {
        updateData.medium = sanitizeInput(req.body.medium);
      }
    }
    
    // Check and sanitize dimensions if provided
    if (req.body.dimensions !== undefined) {
      if (req.body.dimensions.trim().length > 100) {
        errors.push('Dimensions must not exceed 100 characters');
      } else {
        updateData.dimensions = sanitizeInput(req.body.dimensions);
      }
    }
    
    // Check year if provided
    if (req.body.year_created !== undefined) {
      const year = parseInt(req.body.year_created);
      const currentYear = new Date().getFullYear();
      if (year < 1000 || year > currentYear) {
        errors.push(`Year created must be between 1000 and ${currentYear}`);
      } else {
        updateData.year_created = year;
      }
    }
    
    // Check weight if provided
    if (req.body.weight_kg !== undefined) {
      const weight = parseFloat(req.body.weight_kg);
      if (weight < 0 || weight > 1000) {
        errors.push('Weight must be between 0 and 1000 kg');
      } else {
        updateData.weight_kg = weight;
      }
    }
    
    // Check quantity if provided
    if (req.body.quantity !== undefined) {
      const quantity = parseInt(req.body.quantity);
      if (quantity < 1 || quantity > 1000) {
        errors.push('Quantity must be between 1 and 1000');
      } else {
        updateData.quantity = quantity;
      }
    }
    
    // Boolean fields
    if (req.body.is_original !== undefined) updateData.is_original = req.body.is_original === 'true';
    if (req.body.is_framed !== undefined) updateData.is_framed = req.body.is_framed === 'true';
    if (req.body.is_available !== undefined) updateData.is_available = req.body.is_available === 'true';
    if (req.body.is_featured !== undefined) updateData.is_featured = req.body.is_featured === 'true';
    
    // Other fields
    if (req.body.condition) updateData.condition = req.body.condition;
    if (req.body.status) updateData.status = req.body.status;
    
    // Check categories array if provided
    if (req.body.categories) {
      const categories = JSON.parse(req.body.categories);
      if (!Array.isArray(categories)) {
        errors.push('Categories must be an array');
      } else if (categories.length > 10) {
        errors.push('Categories must not exceed 10 items');
      } else {
        updateData.categories = categories;
      }
    }
    
    // Parse tags if provided
    if (req.body.tags) updateData.tags = JSON.parse(req.body.tags);
    
    // Return errors if any validation failed
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: errors.join(', ')
      });
    }
    
    // Handle image updates
    let finalImageUrls = [];
    
    // Get current images from database
    const { data: itemWithImages } = await db
      .from('marketplace_items')
      .select('images')
      .eq('marketItemId', id)
      .single();
    
    const currentImages = itemWithImages?.images || [];
    
    // Handle different image update scenarios
    if (req.body.remove_all_images === 'true') {
      // User removed all images
      finalImageUrls = [];
      
      // Delete all existing images from storage
      for (const imageUrl of currentImages) {
        try {
          let filePath = '';
          if (imageUrl.includes('/storage/v1/object/public/uploads/')) {
            const pathPart = imageUrl.split('/storage/v1/object/public/uploads/')[1];
            filePath = pathPart;
          } else if (imageUrl.includes('/uploads/')) {
            const pathPart = imageUrl.split('/uploads/')[1];
            filePath = pathPart;
          }

          if (filePath) {
            const { error: deleteError } = await db.storage
              .from('uploads')
              .remove([filePath]);
            
            if (deleteError) {
              console.error(`Error deleting image ${filePath}:`, deleteError);
            }
          }
        } catch (err) {
          console.error('Error processing image deletion:', err);
        }
      }
    } else {
      // Parse existing images to keep
      let existingImagesToKeep = [];
      if (req.body.existing_images_to_keep) {
        try {
          existingImagesToKeep = JSON.parse(req.body.existing_images_to_keep);
        } catch (e) {
          existingImagesToKeep = [];
        }
      }
      
      // Find images to delete (ones that are not in the keep list)
      const imagesToDelete = currentImages.filter(img => !existingImagesToKeep.includes(img));
      
      // Delete removed images from storage
      for (const imageUrl of imagesToDelete) {
        try {
          let filePath = '';
          if (imageUrl.includes('/storage/v1/object/public/uploads/')) {
            const pathPart = imageUrl.split('/storage/v1/object/public/uploads/')[1];
            filePath = pathPart;
          } else if (imageUrl.includes('/uploads/')) {
            const pathPart = imageUrl.split('/uploads/')[1];
            filePath = pathPart;
          }

          if (filePath) {
            console.log(`🗑️ Deleting removed image: ${filePath}`);
            const { error: deleteError } = await db.storage
              .from('uploads')
              .remove([filePath]);
            
            if (deleteError) {
              console.error(`Error deleting image ${filePath}:`, deleteError);
            }
          }
        } catch (err) {
          console.error('Error processing image deletion:', err);
        }
      }
      
      // Start with existing images to keep
      finalImageUrls = [...existingImagesToKeep];
      
      // Upload and add new images
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${safeName}`;
            const filePath = `marketplace/${userId}/${fileName}`;

            const { data, error } = await db.storage
              .from("uploads")
              .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
              });

            if (error) {
              console.error('Upload error:', error);
              continue;
            }

            const { data: publicUrlData } = db.storage
              .from("uploads")
              .getPublicUrl(data.path);

            if (publicUrlData?.publicUrl) {
              finalImageUrls.push(publicUrlData.publicUrl);
            }
          } catch (uploadError) {
            console.error('Error uploading new image:', uploadError);
            continue;
          }
        }
      }
    }
    
    // Update images in database
    updateData.images = finalImageUrls;
    updateData.primary_image = finalImageUrls.length > 0 ? finalImageUrls[0] : null;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('marketplace_items')
      .update(updateData)
      .eq('marketItemId', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Item updated successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in updateMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Delete marketplace item
export const deleteMarketplaceItem = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { id } = req.params;

    // Check if user is admin
    const { data: userProfile, error: profileError } = await db
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to verify user profile' 
      });
    }

    const isAdmin = userProfile.role === 'admin';

    // Check if item exists
    const { data: existingItem, error: checkError } = await db
      .from('marketplace_items')
      .select('userId, sellerProfileId, images')
      .eq('marketItemId', id)
      .single();

    if (checkError || !existingItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    // Check if item has existing orders
    const { data: existingOrders, error: ordersError } = await db
      .from('order_items')
      .select(`
        orderItemId,
        orderId,
        orders!inner(
          status,
          deliveredAt
        )
      `)
      .eq('marketplaceItemId', id);

    if (existingOrders && existingOrders.length > 0) {
      // Check if any orders are still active or within return window
      const activeOrders = existingOrders.filter(item => {
        const order = item.orders;
        
        // If order is not delivered yet, it's active
        if (order.status !== 'delivered') {
          return true; // Cannot delete
        }
        
        // If delivered, check if within return window
        if (order.deliveredAt) {
          const deliveryDate = new Date(order.deliveredAt);
          const now = new Date();
          const daysSinceDelivery = (now - deliveryDate) / (1000 * 60 * 60 * 24);
          
          // Still within 30-day return window
          if (daysSinceDelivery < 30) {
            return true; // Cannot delete
          }
        }
        
        return false; // Order is old enough, can delete
      });

      if (activeOrders.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete this item because it has active orders or orders within the 30-day return window. To remove it from the marketplace, please edit the item and mark it as "Inactive" instead.',
          hasOrders: true,
          activeOrdersCount: activeOrders.length
        });
      }
      
      // All orders are delivered and past 30-day window - deletion allowed
      console.log(`✅ All orders for item ${id} are delivered and past 30-day return window. Deletion allowed.`);
    }

    // If not admin, verify seller profile and ownership
    if (!isAdmin) {
      // Get user's active seller profile
      const { data: sellerProfile, error: sellerError } = await db
        .from('sellerProfiles')
        .select('sellerProfileId')
        .eq('userId', userId)
        .eq('isActive', true)
        .eq('isSuspended', false)
        .single();

      if (sellerError || !sellerProfile) {
        return res.status(403).json({ 
          success: false, 
          error: 'You must be an active seller to delete items' 
        });
      }

      // Check ownership via sellerProfileId
      if (existingItem.sellerProfileId !== sellerProfile.sellerProfileId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only delete your own items' 
        });
      }
    }

    // Delete associated images from storage
    if (existingItem.images && Array.isArray(existingItem.images) && existingItem.images.length > 0) {
      console.log(`🗑️ Deleting ${existingItem.images.length} images for marketplace item ${id}`);
      
      for (const imageUrl of existingItem.images) {
        try {
          let filePath = '';
          
          // Extract file path from URL
          if (imageUrl.includes('/storage/v1/object/public/uploads/')) {
            const pathPart = imageUrl.split('/storage/v1/object/public/uploads/')[1];
            filePath = pathPart;
          } else if (imageUrl.includes('/uploads/')) {
            const pathPart = imageUrl.split('/uploads/')[1];
            filePath = pathPart;
          }
          
          if (filePath) {
            console.log(`🗑️ Attempting to delete: ${filePath}`);
            
            const { error: storageError } = await db.storage
              .from('uploads')
              .remove([filePath]);
            
            if (storageError) {
              console.error(`❌ Error deleting image ${filePath}:`, storageError);
            } else {
              console.log(`✅ Successfully deleted image: ${filePath}`);
            }
          }
        } catch (err) {
          console.error(`Error processing image deletion:`, err);
        }
      }
    }

    // Delete item
    const { error } = await db
      .from('marketplace_items')
      .delete()
      .eq('marketItemId', id);

    if (error) {
      console.error('Error deleting item:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// PHASE 2: ORDERS & CHECKOUT
// ========================================

// Buy Now (single item, single seller)
export const buyNowOrder = async (req, res) => {
  try {
    // Auth
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const userId = req.user.id;

    const { 
      marketItemId, 
      quantity = 1, 
      shippingFee,
      shippingMethod,
      orderNotes,
      shippingAddress,
      contactInfo
    } = req.body || {};
    
    if (!marketItemId) {
      return res.status(400).json({ success: false, error: 'marketItemId is required' });
    }
    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 100) {
      return res.status(400).json({ success: false, error: 'Quantity must be between 1 and 100' });
    }

    // Fetch item and seller status
    const { data: item, error: itemError } = await db
      .from('marketplace_items')
      .select(`
        marketItemId, title, price, quantity, status, is_available, sellerProfileId, userId,
        sellerProfiles ( sellerProfileId, isActive, isSuspended, shopName )
      `)
      .eq('marketItemId', marketItemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (item.status !== 'active' || !item.is_available) {
      return res.status(400).json({ success: false, error: 'Item is no longer available' });
    }
    if (!item.sellerProfiles?.isActive || item.sellerProfiles?.isSuspended) {
      return res.status(400).json({ success: false, error: 'Seller is inactive or suspended' });
    }
    if (item.quantity < qty) {
      return res.status(400).json({ success: false, error: `Only ${item.quantity} items available` });
    }

    // Check if buyer is trying to buy their own item
    if (item.userId === userId) {
      return res.status(403).json({ success: false, error: 'Sellers cannot purchase their own items' });
    }
    
    // Additional check using seller profile - check if the user has any seller profile that matches the item's seller profile
    const { data: userSellerProfiles, error: sellerProfilesError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId);
      
    if (!sellerProfilesError && userSellerProfiles && userSellerProfiles.length > 0) {
      const hasMatchingSellerProfile = userSellerProfiles.some(profile => 
        profile.sellerProfileId === item.sellerProfileId
      );
      
      if (hasMatchingSellerProfile) {
        return res.status(403).json({ success: false, error: 'Sellers cannot purchase their own items' });
      }
    }

    const shipping = parseFloat(shippingFee) > 0 ? parseFloat(shippingFee) : 0;
    const subtotal = item.price * qty;
    const totalAmount = subtotal + shipping;
    // Platform fee (matches payout service rate of 4%)
    const PLATFORM_FEE_RATE = 0.04;
    const platformFee = parseFloat((totalAmount * PLATFORM_FEE_RATE).toFixed(2));
    // orderNumber column is not present in DB; skipping generation

    // Create order
    const now = new Date().toISOString();
    const newOrderRow = {
      userId,
      sellerProfileId: item.sellerProfileId,
      status: 'pending',
      paymentStatus: 'pending',
      subtotal: subtotal,
      platformFee: platformFee,
      shippingCost: shipping,
      totalAmount: totalAmount,
      shippingMethod: shippingMethod || 'standard', // DB column name per schema screenshot
      orderNotes: orderNotes || 'None',
      shippingAddress: shippingAddress || {},
      contactInfo: contactInfo || {},
      createdAt: now,
      updatedAt: now,
    };

    const { data: order, error: orderError } = await db
      .from('orders')
      .insert([newOrderRow])
      .select()
      .single();
    
    if (orderError || !order) {
      return res.status(500).json({ success: false, error: orderError?.message || 'Failed to create order' });
    }

    // Create order item row
    const { error: oiError } = await db
      .from('order_items')
      .insert([{ 
        orderId: order.orderId, 
        marketplaceItemId: item.marketItemId, 
        sellerProfileId: item.sellerProfileId,
        userId: userId,
        sellerId: item.userId,
        title: item.title,
        priceAtPurchase: item.price,
        quantity: qty,
        itemTotal: parseFloat((item.price * qty).toFixed(2)),
        platformFeeAmount: parseFloat(((item.price * qty) * PLATFORM_FEE_RATE).toFixed(2)),
        artistEarnings: parseFloat(((item.price * qty) - ((item.price * qty) * PLATFORM_FEE_RATE)).toFixed(2)),
        createdAt: now
      }]);
    if (oiError) {
      await db.from('orders').delete().eq('orderId', order.orderId);
      return res.status(500).json({ success: false, error: oiError.message || 'Failed to create order item' });
    }

    // Reduce inventory
    const newQty = item.quantity - qty;
    const { error: invError } = await db
      .from('marketplace_items')
      .update({ quantity: newQty, is_available: newQty > 0 })
      .eq('marketItemId', item.marketItemId);
    if (invError) {
      await db.from('order_items').delete().eq('orderId', order.orderId);
      await db.from('orders').delete().eq('orderId', order.orderId);
      return res.status(500).json({ success: false, error: invError.message || 'Failed to update inventory' });
    }

    // Create payment link
    let paymentLink;
    try {
      paymentLink = await xenditService.createPaymentLink({
        amount: totalAmount,
        description: `Order ${order.orderId}`,
        metadata: { 
          orderId: order.orderId, 
          userId, 
          sellerProfileId: item.sellerProfileId, 
          shippingFee: shipping, 
          shippingMethod: shippingMethod || 'standard',
          customerInfo: contactInfo || {}
        }
      });
    } catch (plError) {
      // Rollback on failure
      await db
        .from('marketplace_items')
        .update({ quantity: item.quantity, is_available: true })
        .eq('marketItemId', item.marketItemId);
      await db.from('order_items').delete().eq('orderId', order.orderId);
      await db.from('orders').delete().eq('orderId', order.orderId);
      return res.status(502).json({ success: false, error: plError.message || 'Failed to create payment link' });
    }

    // Update order with payment details
    await db
      .from('orders')
      .update({ 
        paymentLinkId: paymentLink.paymentLinkId,
        paymentReference: paymentLink.referenceNumber,
        paymentProvider: 'xendit',
        paymentMethodUsed: 'xendit_invoice',
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', order.orderId);

    return res.status(201).json({
      success: true,
      message: 'Order created. Redirect to payment.',
      data: {
        orderId: order.orderId,
        checkoutUrl: paymentLink.checkoutUrl,
        referenceNumber: paymentLink.referenceNumber,
        amount: totalAmount
      }
    });
  } catch (error) {
    console.error('Error in buyNowOrder:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create order' });
  }
};

// 1. Create order from cart — removed by P2P migration. Use buyNowOrder instead.

// 1.5. Check payment status manually (backup for webhook failures)
export const checkPaymentStatus = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { orderId } = req.params;

    // ===== SECURITY: Rate limiting - prevent spam clicks =====
    // Check if user checked this order recently (within last 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: recentCheck } = await db
      .from('orders')
      .select('updatedAt')
      .eq('orderId', orderId)
      .eq('userId', userId)
      .gte('updatedAt', thirtySecondsAgo)
      .single();
    
    if (recentCheck && recentCheck.updatedAt > thirtySecondsAgo) {
      return res.status(429).json({ 
        success: false, 
        error: 'Please wait 30 seconds before checking again' 
      });
    }

    // Get the order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .eq('userId', userId) // SECURITY: Ensure user owns this order
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found or you do not have permission to view it' 
      });
    }

    // If already paid, return success
    if (order.paymentStatus === 'paid') {
      return res.json({ 
        success: true, 
        message: 'Payment already confirmed',
        data: { paymentStatus: 'paid' }
      });
    }

    // Check with Xendit if payment was actually completed
    if (order.paymentLinkId) {
      try {
        const paymentLinkStatus = await xenditService.getPaymentLinkStatus(order.paymentLinkId);
        
        console.log(`🔍 Payment status check for order ${orderId}:`, {
          xenditStatus: paymentLinkStatus.status,
          currentDbStatus: order.paymentStatus,
          hasPayments: paymentLinkStatus.payments?.length > 0
        });
        
        // ===== SECURITY: Only trust Xendit's response =====
        // If Xendit says it's paid, update our database
        if (paymentLinkStatus.status === 'paid') {
          console.log(`✅ Manual payment check: Order ${orderId} was paid but webhook missed. Updating now...`);
          
          // Double-check: Verify payment actually exists
          if (!paymentLinkStatus.paidAt) {
            console.warn(`⚠️ Xendit says paid but no payment timestamp found for order ${orderId}`);
            return res.json({ 
              success: false, 
              message: 'Payment verification failed. Please contact support.',
              data: { paymentStatus: order.paymentStatus }
            });
          }
          
          // Update order status (match webhook behavior - only update paymentStatus, not status)
          const { error: updateError } = await db
            .from('orders')
            .update({
              paymentStatus: 'paid',
              // NOTE: Keep status as 'pending' - seller will change to 'processing' later
              paidAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            .eq('orderId', orderId)
            .eq('userId', userId); // SECURITY: Ensure user owns this order

          if (updateError) {
            console.error('Error updating order:', updateError);
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to update order status' 
            });
          }

          console.log(`✅ Order ${orderId} status updated to paid via manual check`);

          return res.json({ 
            success: true, 
            message: 'Payment confirmed! Order status updated.',
            data: { paymentStatus: 'paid' }
          });
        } else if (paymentLinkStatus.status === 'failed') {
          // Payment explicitly failed
          console.log(`❌ Payment failed for order ${orderId}`);
          return res.json({ 
            success: false, 
            message: 'Payment failed. Please try again or use a different payment method.',
            data: { paymentStatus: 'failed' }
          });
        } else {
          // Still pending
          console.log(`⏳ Payment still pending for order ${orderId}`);
          return res.json({ 
            success: false, 
            message: 'Payment not yet completed. Please complete payment first.',
            data: { paymentStatus: order.paymentStatus }
          });
        }
      } catch (paymentError) {
        console.error('Error checking payment status:', paymentError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to check payment status. Please try again later.' 
        });
      }
    }

    return res.json({ 
      success: false, 
      message: 'No payment link found',
      data: { paymentStatus: order.paymentStatus }
    });

  } catch (error) {
    console.error('Error in checkPaymentStatus:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 2. Get buyer's orders
export const getBuyerOrders = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { status } = req.query; // Optional status filter (e.g., 'cancelled')

    // Build query with optional status filter
    let query = db
      .from('orders')
      .select('*')
      .eq('userId', userId);
    
    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: orders, error: ordersError } = await query
      .order('createdAt', { ascending: false });

    if (ordersError) {
      console.error('Error fetching buyer orders:', ordersError);
      return res.status(500).json({ 
        success: false, 
        error: ordersError.message 
      });
    }

    // Get order items per order and enrich using marketplace_items and auction_items
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items } = await db
          .from('order_items')
          .select('*')
          .eq('orderId', order.orderId);

        // Collect IDs for both listing types
        const marketIds = [...new Set((items || []).map(i => i.marketplaceItemId).filter(Boolean))];
        const auctionIds = [...new Set((items || []).map(i => i.auctionItemId).filter(Boolean))];

        // Fetch metadata
        let marketItems = [];
        let auctionItems = [];
        if (marketIds.length > 0) {
          const { data: marketData } = await db
            .from('marketplace_items')
            .select('marketItemId, title, primary_image, images')
            .in('marketItemId', marketIds);
          marketItems = marketData || [];
        }
        if (auctionIds.length > 0) {
          const { data: auctionData } = await db
            .from('auction_items')
            .select('auctionItemId, title, primary_image, images')
            .in('auctionItemId', auctionIds);
          auctionItems = auctionData || [];
        }

        // Build lookup maps
        const marketMap = new Map((marketItems || []).map(i => [i.marketItemId, i]));
        const auctionMap = new Map((auctionItems || []).map(i => [i.auctionItemId, i]));

        // Robust image helpers
        const extractImg = (v) => {
          if (!v) return null;
          if (typeof v === 'string') {
            const s = v.trim();
            if (s.startsWith('{') || s.startsWith('[')) {
              try { return extractImg(JSON.parse(s)); } catch (_) { return s; }
            }
            return s;
          }
          if (typeof v === 'object') return v.url || v.path || v.src || null;
          return null;
        };
        const pickImage = (meta) => {
          if (!meta) return null;
          const fromPrimary = extractImg(meta.primary_image);
          if (fromPrimary) return fromPrimary;
          const imgs = meta.images;
          if (Array.isArray(imgs)) {
            for (const im of imgs) { const out = extractImg(im); if (out) return out; }
          } else if (imgs && typeof imgs === 'object') {
            const out = extractImg(imgs); if (out) return out;
          }
          return null;
        };

        // Decorate items
        const itemsWithImages = (items || []).map(item => {
          const isAuction = !!item.auctionItemId;
          const m = isAuction ? null : marketMap.get(item.marketplaceItemId);
          const a = isAuction ? auctionMap.get(item.auctionItemId) : null;
          const image = isAuction ? pickImage(a) : pickImage(m);
          const title = item.title || m?.title || a?.title;
          return {
            ...item,
            isAuction,
            image,
            itemImage: image,
            itemTitle: title
          };
        });

        // Group items by seller profile
        const itemsBySeller = {};
        itemsWithImages.forEach(item => {
          if (!itemsBySeller[item.sellerProfileId]) {
            itemsBySeller[item.sellerProfileId] = [];
          }
          itemsBySeller[item.sellerProfileId].push(item);
        });

        return {
          ...order,
          items: itemsWithImages,
          itemsBySeller: itemsBySeller,
          itemCount: itemsWithImages.length,
          sellerCount: Object.keys(itemsBySeller).length
        };
      })
    );

    res.json({ 
      success: true, 
      data: ordersWithItems,
      count: ordersWithItems.length
    });

  } catch (error) {
    console.error('Error in getBuyerOrders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 3. Get seller's orders with full details
export const getSellerOrders = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { status, filter } = req.query; // Optional status/filter

    // Get seller's profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be an active seller to view orders' 
      });
    }

    // Base query for stats (ALL paid orders regardless of tab)
    const baseOrdersQuery = db
      .from('orders')
      .select('*')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .eq('paymentStatus', 'paid')
      .order('createdAt', { ascending: false });

    // Filtered query for the tab data (start from same base)
    let ordersQuery = db
      .from('orders')
      .select('*')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .eq('paymentStatus', 'paid') // Only show paid orders in listing
      .order('createdAt', { ascending: false });
    
    // Apply friendly status filters if provided
    const statusParam = (filter || status || '').toString().toLowerCase();
    if (statusParam && statusParam !== 'all') {
      if (statusParam === 'toship' || statusParam === 'to_ship' || statusParam === 'to-ship' || statusParam === 'paid') {
        ordersQuery = ordersQuery.in('status', ['pending', 'processing']);
      } else if (statusParam === 'shipping') {
        ordersQuery = ordersQuery.eq('status', 'shipped');
      } else if (statusParam === 'completed' || statusParam === 'complete') {
        ordersQuery = ordersQuery.eq('status', 'delivered');
      } else if (statusParam === 'cancelled' || statusParam === 'canceled') {
        ordersQuery = ordersQuery.eq('status', 'cancelled');
      } else if (['pending', 'processing', 'shipped', 'delivered'].includes(statusParam)) {
        ordersQuery = ordersQuery.eq('status', statusParam);
      }
      // Otherwise: unknown filter, do not apply extra condition
    }
    
    // Fetch unfiltered list for stats
    const { data: allOrdersForStats, error: baseOrdersError } = await baseOrdersQuery;
    if (baseOrdersError) {
      console.error('Error fetching base orders for stats:', baseOrdersError);
      return res.status(500).json({ success: false, error: baseOrdersError.message });
    }

    // Fetch filtered list for current tab
    const { data: allOrders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).json({ 
        success: false, 
        error: ordersError.message 
      });
    }

    // Compute order IDs for filtered result
    const orderIds = (allOrders || []).map(o => o.orderId);
    
    // If no filtered orders, return empty list BUT keep global stats
    if (!orderIds || orderIds.length === 0) {
      const stats = {
        totalOrders: allOrdersForStats.length,
        toShip: allOrdersForStats.filter(o => ['pending', 'processing'].includes(o.status)).length,
        shipping: allOrdersForStats.filter(o => o.status === 'shipped').length,
        completed: allOrdersForStats.filter(o => o.status === 'delivered').length,
        cancelled: allOrdersForStats.filter(o => o.status === 'cancelled').length
      };
      return res.json({ success: true, data: [], stats, count: 0 });
    }

    // Fetch order items for filtered orders
    const { data: orderItems, error: itemsError } = await db
      .from('order_items')
      .select('orderItemId, orderId, marketplaceItemId, auctionItemId, title, priceAtPurchase, quantity, sellerProfileId')
      .in('orderId', orderIds);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return res.status(500).json({ success: false, error: itemsError.message });
    }

    // Get metadata for both marketplace and auction items
    const marketIds = [...new Set((orderItems || []).map(it => it.marketplaceItemId).filter(Boolean))];
    const auctionIds = [...new Set((orderItems || []).map(it => it.auctionItemId).filter(Boolean))];
    const { data: marketItems } = marketIds.length > 0
      ? await db.from('marketplace_items')
          .select('marketItemId, title, primary_image, images, medium, dimensions')
          .in('marketItemId', marketIds)
      : { data: [] };
    const { data: auctionItems } = auctionIds.length > 0
      ? await db.from('auction_items')
          .select('auctionItemId, title, primary_image, images, medium, dimensions')
          .in('auctionItemId', auctionIds)
      : { data: [] };
    

    // Create maps for quick lookup
    const marketMap = new Map((marketItems || []).map(i => [i.marketItemId, i]));
    const auctionMap = new Map((auctionItems || []).map(i => [i.auctionItemId, i]));

    // Robust image helpers
    const extractImg = (v) => {
      if (!v) return null;
      if (typeof v === 'string') {
        const s = v.trim();
        if (s.startsWith('{') || s.startsWith('[')) {
          try { return extractImg(JSON.parse(s)); } catch (_) { return s; }
        }
        return s;
      }
      if (typeof v === 'object') return v.url || v.path || v.src || null;
      return null;
    };
    const pickImage = (meta) => {
      if (!meta) return null;
      const fromPrimary = extractImg(meta.primary_image);
      if (fromPrimary) return fromPrimary;
      const imgs = meta.images;
      if (Array.isArray(imgs)) {
        for (const im of imgs) { const out = extractImg(im); if (out) return out; }
      } else if (imgs && typeof imgs === 'object') {
        const out = extractImg(imgs); if (out) return out;
      }
      return null;
    };

    // Use the DB-filtered result set directly
    const filteredOrders = allOrders;

    // Group items by order for better organization
    const groupedOrdersMap = new Map();
    
    filteredOrders.forEach(order => {
      groupedOrdersMap.set(order.orderId, {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
        contactInfo: order.contactInfo,
        trackingNumber: order.trackingNumber,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        updatedAt: order.updatedAt,
        items: []
      });
    });
    
    // Add items to their respective orders
    orderItems.forEach(item => {
      if (groupedOrdersMap.has(item.orderId)) {
        const isAuction = !!item.auctionItemId;
        const m = isAuction ? null : marketMap.get(item.marketplaceItemId);
        const a = isAuction ? auctionMap.get(item.auctionItemId) : null;
        const image = isAuction ? pickImage(a) : pickImage(m);
        const title = item.title || m?.title || a?.title || 'Unknown Item';
        const medium = m?.medium || a?.medium;
        const dimensions = m?.dimensions || a?.dimensions;
        groupedOrdersMap.get(item.orderId).items.push({
          orderItemId: item.orderItemId,
          marketplaceItemId: item.marketplaceItemId,
          auctionItemId: item.auctionItemId,
          isAuction,
          title,
          image,
          medium,
          dimensions,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          subtotal: item.priceAtPurchase * item.quantity
        });
      }
    });
    
    // Convert map to array
    const finalOrders = Array.from(groupedOrdersMap.values());
    
    // Calculate statistics from ALL paid orders (unfiltered)
    const stats = {
      totalOrders: allOrdersForStats.length,
      toShip: allOrdersForStats.filter(o => ['pending', 'processing'].includes(o.status)).length,
      shipping: allOrdersForStats.filter(o => o.status === 'shipped').length,
      completed: allOrdersForStats.filter(o => o.status === 'delivered').length,
      cancelled: allOrdersForStats.filter(o => o.status === 'cancelled').length
    };

    res.json({ 
      success: true, 
      data: finalOrders,
      stats: stats,
      count: finalOrders.length
    });

  } catch (error) {
    console.error('Error in getSellerOrders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 4. Get order details
export const getOrderDetails = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { orderId } = req.params;

    // Get main order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Get order items
    const { data: items, error: itemsError } = await db
      .from('order_items')
      .select('*')
      .eq('orderId', orderId);

    if (itemsError) {
      return res.status(500).json({ 
        success: false, 
        error: itemsError.message 
      });
    }

    // Check if user is buyer or seller
    const isBuyer = order.userId === userId;
    
    // Check if user is seller (need to get seller profile)
    let isSeller = false;
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();
    
    if (sellerProfile) {
      isSeller = items.some(item => item.sellerProfileId === sellerProfile.sellerProfileId);
    }

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to view this order' 
      });
    }
    
    // Get metadata for both marketplace and auction items
    const marketIds = [...new Set(items.map(item => item.marketplaceItemId).filter(Boolean))];
    const auctionIds = [...new Set(items.map(item => item.auctionItemId).filter(Boolean))];
    let marketplaceItems = [];
    let auctionItems = [];
    if (marketIds.length > 0) {
      const { data: marketData, error: marketError } = await db
        .from('marketplace_items')
        .select('marketItemId, title, primary_image, images')
        .in('marketItemId', marketIds);
      if (marketError) {
        console.error('Error fetching marketplace items:', marketError);
      } else {
        marketplaceItems = marketData || [];
      }
    }
    if (auctionIds.length > 0) {
      const { data: auctionData, error: auctionError } = await db
        .from('auction_items')
        .select('auctionItemId, title, primary_image, images')
        .in('auctionItemId', auctionIds);
      if (auctionError) {
        console.error('Error fetching auction items:', auctionError);
      } else {
        auctionItems = auctionData || [];
      }
    }
    
    // Create maps for quick lookup
    const marketMap = new Map((marketplaceItems || []).map(i => [i.marketItemId, i]));
    const auctionMap = new Map((auctionItems || []).map(i => [i.auctionItemId, i]));
    
    // Robust image helpers
    const extractImg = (v) => {
      if (!v) return null;
      if (typeof v === 'string') {
        const s = v.trim();
        if (s.startsWith('{') || s.startsWith('[')) {
          try { return extractImg(JSON.parse(s)); } catch (_) { return s; }
        }
        return s;
      }
      if (typeof v === 'object') return v.url || v.path || v.src || null;
      return null;
    };
    const pickImage = (meta) => {
      if (!meta) return null;
      const fromPrimary = extractImg(meta.primary_image);
      if (fromPrimary) return fromPrimary;
      const imgs = meta.images;
      if (Array.isArray(imgs)) {
        for (const im of imgs) { const out = extractImg(im); if (out) return out; }
      } else if (imgs && typeof imgs === 'object') {
        const out = extractImg(imgs); if (out) return out;
      }
      return null;
    };
    
    // Enhance items with images and ensure data integrity
    const enhancedItems = items.map(item => {
      const isAuction = !!item.auctionItemId;
      const m = isAuction ? null : marketMap.get(item.marketplaceItemId);
      const a = isAuction ? auctionMap.get(item.auctionItemId) : null;
      // Ensure all price fields are proper numbers
      const price = parseFloat(item.priceAtPurchase) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const image = isAuction ? pickImage(a) : pickImage(m);
      const title = item.title || m?.title || a?.title || 'Product';
      return {
        ...item,
        isAuction,
        price: price,
        quantity: quantity,
        itemImage: image,
        itemTitle: title,
        total: price * quantity
      };
    });

    // Format shipping address if it's JSONB
    let formattedShippingAddress = order.shippingAddress;
    if (typeof formattedShippingAddress === 'string') {
      try {
        formattedShippingAddress = JSON.parse(formattedShippingAddress);
      } catch (e) {
        console.error('Error parsing shipping address:', e);
        formattedShippingAddress = {};
      }
    }
    
    // Ensure totalAmount is a proper number
    const totalAmount = parseFloat(order.totalAmount) || 0;
    const paymentFee = parseFloat(order.paymentFee) || 0;

    // Group items by seller profile
    const itemsBySeller = {};
    enhancedItems.forEach(item => {
      if (!itemsBySeller[item.sellerProfileId]) {
        itemsBySeller[item.sellerProfileId] = [];
      }
      itemsBySeller[item.sellerProfileId].push(item);
    });

    res.json({ 
      success: true, 
      data: {
        ...order,
        totalAmount: totalAmount,
        paymentFee: paymentFee,
        shippingAddress: formattedShippingAddress,
        items: enhancedItems,
        itemsBySeller: itemsBySeller,
        itemCount: enhancedItems.length,
        sellerCount: Object.keys(itemsBySeller).length
      }
    });

  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// PHASE 3: ORDER STATUS UPDATES
// ========================================

// 5. Mark order as processing (Seller)
export const markOrderAsProcessing = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { orderId } = req.params;

    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Get user's seller profile
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();

    if (!sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be an active seller to process orders' 
      });
    }

    // Check if seller has items in this order
    const { data: items } = await db
      .from('order_items')
      .select('sellerProfileId')
      .eq('orderId', orderId);

    const isSeller = items.some(item => item.sellerProfileId === sellerProfile.sellerProfileId);

    if (!isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only sellers with items in this order can mark it as processing' 
      });
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'processing',
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Order marked as processing',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in markOrderAsProcessing:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 6. Mark order as shipped (Seller)
export const markOrderAsShipped = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { orderId } = req.params;
    const { tracking_number } = req.body;

    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Get user's seller profile
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();

    if (!sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be an active seller to ship orders' 
      });
    }

    // Check if seller has items in this order
    const { data: items } = await db
      .from('order_items')
      .select('sellerProfileId')
      .eq('orderId', orderId);

    const isSeller = items.some(item => item.sellerProfileId === sellerProfile.sellerProfileId);

    if (!isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only sellers with items in this order can mark it as shipped' 
      });
    }

    // Check tracking number
    if (!tracking_number || tracking_number.trim().length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tracking number must be at least 5 characters' 
      });
    }
    if (tracking_number.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tracking number must not exceed 100 characters' 
      });
    }
    const sanitizedTrackingNumber = sanitizeInput(tracking_number);

    // Send email notification to buyer about shipment
    try {
      const emailService = (await import('../services/emailService.js')).default;
      await emailService.sendOrderShippedEmail(orderId);
      console.log(`✉ Email sent to buyer about shipped order ${orderId}`);
    } catch (emailError) {
      console.error('Failed to send email about shipped order:', emailError);
    }

    // Update order status and tracking
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'shipped',
        trackingNumber: sanitizedTrackingNumber,
        shippedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Order marked as shipped',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in markOrderAsShipped:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 6. Mark order as delivered
export const markOrderAsDelivered = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    const userId = req.user.id;
    const { orderId } = req.params;

    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Only buyer can mark as delivered
    if (order.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only buyer can confirm delivery' 
      });
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    // Create payout for the seller (NEW)
    try {
      // Import payout service at the top of the file
      const payoutService = (await import('../services/payoutService.js')).default;
      
      // Create payout with escrow period
      await payoutService.createPayout(orderId);
      console.log(`✅ Payout created for delivered order ${orderId}`);
    } catch (payoutError) {
      // Log error to database for admin review
      console.error('❌ CRITICAL: Failed to create payout for order', orderId, payoutError);
      
      try {
        await db.from('payoutSafetyLogs').insert({
          orderId: orderId,
          sellerProfileId: order.sellerProfileId,
          checkType: 'payout_creation_failed',
          passed: false,
          notes: `Failed to create payout: ${payoutError.message}`
        });
      } catch (logError) {
        console.error('Failed to log payout error:', logError);
      }
      
      // Don't fail delivery, but flag it
      console.warn(`⚠️ Order ${orderId} delivered but payout creation failed. Manual intervention needed.`);
    }

    res.json({ 
      success: true, 
      message: 'Order marked as delivered. Seller payout will be available after escrow period.',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in markOrderAsDelivered:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 7. Cancel order
export const cancelOrder = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;
    const { orderId } = req.params;
    const { reason } = req.body;
    
    // Check reason if provided
    if (reason) {
      const reasonValidation = validateTextLength(reason, 1, 500, 'Cancellation reason');
      if (!reasonValidation.valid) {
        return res.status(400).json({ 
          success: false, 
          message: reasonValidation.error 
        });
      }
    }

    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Check if user is buyer or seller
    const { data: items } = await db
      .from('order_items')
      .select('sellerProfileId')
      .eq('orderId', orderId);

    const isBuyer = order.userId === userId;
    
    // Check if user is seller
    let isSeller = false;
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();
    
    if (sellerProfile) {
      isSeller = items.some(item => item.sellerProfileId === sellerProfile.sellerProfileId);
    }

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to cancel this order' 
      });
    }

    // Can't cancel if already shipped or delivered
    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel order that has been shipped or delivered' 
      });
    }

    // Get order items to restore inventory
    const { data: orderItems } = await db
      .from('order_items')
      .select('marketplaceItemId, quantity')
      .eq('orderId', orderId);

    // Restore inventory for each item
    for (const item of orderItems) {
      const { data: marketItem } = await db
        .from('marketplace_items')
        .select('quantity')
        .eq('marketItemId', item.marketplaceItemId)
        .single();

      if (marketItem) {
        await db
          .from('marketplace_items')
          .update({ 
            quantity: marketItem.quantity + item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('marketItemId', item.marketplaceItemId);
      }
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling order:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Order cancelled successfully. Inventory has been restored.',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// SELLER APPLICATIONS
// ========================================

// Submit seller application
export const submitSellerApplication = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;

    // CRITICAL: Check if user is an artist first
    const { data: userProfile, error: profileError } = await db
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to verify user profile' 
      });
    }

    if (userProfile.role !== 'artist') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only verified artists can apply to become sellers. Please apply for artist verification first.',
        requiresArtistRole: true
      });
    }

    const {
      shopName,
      fullName,
      email,
      phoneNumber,
      street,
      landmark,
      region,
      province,
      city,
      barangay,
      postalCode,
      shopDescription
    } = req.body;

    // Check required fields
    const required = validateRequiredFields(req.body, [
      'shopName', 'fullName', 'email', 'phoneNumber',
      'street', 'region', 'province', 'city', 'barangay', 
      'postalCode', 'shopDescription'
    ]);
    if (!required.valid) {
      return res.status(400).json({ 
        success: false, 
        message: required.error 
      });
    }

    const errors = [];

    // Validate shop name
    const shopNameValidation = validateTextLength(shopName, 3, 100, 'Shop name');
    if (!shopNameValidation.valid) errors.push(shopNameValidation.error);

    // Validate full name
    const nameValidation = validateTextLength(fullName, 2, 100, 'Full name');
    if (!nameValidation.valid) errors.push(nameValidation.error);

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) errors.push(emailValidation.error);

    // Validate phone
    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.valid) errors.push(phoneValidation.error);

    // Validate address fields
    const streetValidation = validateTextLength(street, 5, 200, 'Street address');
    if (!streetValidation.valid) errors.push(streetValidation.error);

    const barangayValidation = validateTextLength(barangay, 2, 100, 'Barangay');
    if (!barangayValidation.valid) errors.push(barangayValidation.error);

    const cityValidation = validateTextLength(city, 2, 100, 'City');
    if (!cityValidation.valid) errors.push(cityValidation.error);

    const provinceValidation = validateTextLength(province, 2, 100, 'Province');
    if (!provinceValidation.valid) errors.push(provinceValidation.error);

    // Validate postal code
    if (!/^\d{4}$/.test(postalCode)) {
      errors.push('Postal code must be 4 digits');
    }

    // Validate shop description
    const descValidation = validateTextLength(shopDescription, 20, 1000, 'Shop description');
    if (!descValidation.valid) errors.push(descValidation.error);

    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: errors.join(', ')
      });
    }

    // Sanitize text inputs
    const sanitizedData = {
      shopName: sanitizeInput(shopName),
      fullName: sanitizeInput(fullName),
      email,
      phoneNumber,
      street: sanitizeInput(street),
      landmark: landmark ? sanitizeInput(landmark) : '',
      region: sanitizeInput(region),
      province: sanitizeInput(province),
      city: sanitizeInput(city),
      barangay: sanitizeInput(barangay),
      postalCode,
      shopDescription: sanitizeInput(shopDescription)
    };

    // Check if user already has a seller application in the request table
    const { data: existingApp, error: checkError } = await db
      .from('request')
      .select('*')
      .eq('userId', userId)
      .eq('requestType', 'seller_application')
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing application:', checkError);
      return res.status(500).json({ 
        success: false, 
        error: checkError.message 
      });
    }

    // Block ONLY if approved (already a seller)
    if (existingApp && existingApp.status === 'approved') {
      return res.status(400).json({ 
        success: false, 
        error: 'You already have an approved seller account.' 
      });
    }

    // Handle ID document upload (multer single file)
    let idDocumentUrl = null;
    if (req.file) {
      const file = req.file;
      
      // Sanitize filename
      const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "id-document";
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `seller-documents/${userId}/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await db.storage
        .from("uploads")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload ID document',
          message: error.message
        });
      }

      // Get public URL
      const { data: publicUrlData } = db.storage
        .from("uploads")
        .getPublicUrl(filePath);

      idDocumentUrl = publicUrlData.publicUrl;
    }

    if (!idDocumentUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Government ID document is required' 
      });
    }

    // Prepare data for JSONB column using sanitized data
    const requestData = {
      shopName: sanitizedData.shopName,
      fullName: sanitizedData.fullName,
      email: sanitizedData.email,
      phoneNumber: sanitizedData.phoneNumber,
      street: sanitizedData.street,
      landmark: sanitizedData.landmark,
      region: sanitizedData.region,
      province: sanitizedData.province,
      city: sanitizedData.city,
      barangay: sanitizedData.barangay,
      postalCode: sanitizedData.postalCode,
      shopDescription: sanitizedData.shopDescription,
      idDocumentUrl,
      agreedToTerms: true,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null
    };

    let application;
    let isUpdate = false;

    // If any existing application (pending or rejected), UPDATE it
    if (existingApp && (existingApp.status === 'pending' || existingApp.status === 'rejected')) {
      isUpdate = true;
      
      const { data, error: updateError } = await db
        .from('request')
        .update({
          data: requestData,
          status: 'pending',
          updatedAt: new Date().toISOString()
        })
        .eq('requestId', existingApp.requestId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating seller application:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: updateError.message 
        });
      }

      application = data;
    } 
    // Otherwise, CREATE new application
    else {
      const { data, error: insertError } = await db
        .from('request')
        .insert([{
          userId,
          requestType: 'seller_application',
          data: requestData,
          status: 'pending'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating seller application:', insertError);
        return res.status(500).json({ 
          success: false, 
          error: insertError.message 
        });
      }

      application = data;
    }

    res.status(isUpdate ? 200 : 201).json({ 
      success: true, 
      message: isUpdate 
        ? 'Seller application updated successfully' 
        : 'Seller application submitted successfully',
      data: application,
      isResubmission: isUpdate
    });

  } catch (error) {
    console.error('Error in submitSellerApplication:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get user's seller application status
export const getMySellerApplication = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;

    const { data: application, error } = await db
      .from('request')
      .select('*')
      .eq('userId', userId)
      .eq('requestType', 'seller_application')
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching application:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Transform the data to match expected format
    if (application) {
      const transformedApp = {
        sellerApplicationId: application.requestId,
        userId: application.userId,
        status: application.status,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        ...application.data  // Spread the JSONB data
      };
      
      res.json({ 
        success: true, 
        data: transformedApp
      });
    } else {
      res.json({ 
        success: true, 
        data: null
      });
    }

  } catch (error) {
    console.error('Error in getMySellerApplication:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get all seller applications (Admin only)
export const getAllSellerApplications = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = db
      .from('request')
      .select('*')
      .eq('requestType', 'seller_application')
      .order('createdAt', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Transform the applications to match expected format
    const transformedApps = applications.map(app => ({
      sellerApplicationId: app.requestId,
      userId: app.userId,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      ...app.data  // Spread the JSONB data
    }));

    res.json({ 
      success: true, 
      data: transformedApps,
      count: transformedApps.length
    });

  } catch (error) {
    console.error('Error in getAllSellerApplications:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Approve seller application (Admin only)
export const approveSellerApplication = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const adminId = auth.userId;
    const { applicationId } = req.params;

    // Get the application first
    const { data: application, error: fetchError } = await db
      .from('request')
      .select('*')
      .eq('requestId', applicationId)
      .eq('requestType', 'seller_application')
      .single();

    if (fetchError || !application) {
      console.error('Error fetching application:', fetchError);
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Check if already approved
    if (application.status === 'approved') {
      return res.status(400).json({ 
        success: false, 
        error: 'Application is already approved' 
      });
    }

    // Check if seller profile already exists
    const { data: existingProfile } = await db
      .from('sellerProfiles')
      .select('*')
      .eq('userId', application.userId)
      .single();

    if (existingProfile) {
      // Just update the request status, don't create duplicate profile
      const updatedData = {
        ...application.data,
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString()
      };

      await db
        .from('request')
        .update({
          status: 'approved',
          data: updatedData,
          updatedAt: new Date().toISOString()
        })
        .eq('requestId', applicationId);

      return res.json({ 
        success: true, 
        message: 'Application approved. Seller profile already exists.',
        data: {
          application: { ...application, status: 'approved' },
          profile: existingProfile
        }
      });
    }

    // 1. Update application status in the data JSONB
    const updatedData = {
      ...application.data,
      reviewedBy: adminId,
      reviewedAt: new Date().toISOString()
    };

    const { error: updateError } = await db
      .from('request')
      .update({
        status: 'approved',
        data: updatedData,
        updatedAt: new Date().toISOString()
      })
      .eq('requestId', applicationId);

    if (updateError) {
      console.error('Error approving application:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    // 2. Create seller profile
    const { data: profile, error: profileError } = await db
      .from('sellerProfiles')
      .insert({
        userId: application.userId,
        shopName: application.data.shopName,
        shopDescription: application.data.shopDescription,
        fullName: application.data.fullName,
        email: application.data.email,
        phoneNumber: application.data.phoneNumber,
        street: application.data.street,
        landmark: application.data.landmark,
        region: application.data.region,
        province: application.data.province,
        city: application.data.city,
        barangay: application.data.barangay,
        postalCode: application.data.postalCode,
        isActive: true,
        isSuspended: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating seller profile:', profileError);
      // If profile already exists, that's okay
      if (profileError.code !== '23505') { // Not a duplicate key error
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create seller profile: ' + profileError.message 
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Seller application approved successfully. User is now a seller!',
      data: {
        application: { ...application, status: 'approved' },
        profile: profile
      }
    });

  } catch (error) {
    console.error('Error in approveSellerApplication:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Reject seller application (Admin only)
export const rejectSellerApplication = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const adminId = auth.userId;
    const { applicationId } = req.params;
    const { rejectionReason } = req.body;
    
    // Check rejection reason
    const reasonValidation = validateTextLength(rejectionReason, 10, 500, 'Rejection reason');
    if (!reasonValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: reasonValidation.error 
      });
    }

    // Get the application first
    const { data: application, error: fetchError } = await db
      .from('request')
      .select('*')
      .eq('requestId', applicationId)
      .eq('requestType', 'seller_application')
      .single();

    if (fetchError || !application) {
      console.error('Error fetching application:', fetchError);
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Update application status and add rejection reason to data
    const updatedData = {
      ...application.data,
      reviewedBy: adminId,
      reviewedAt: new Date().toISOString(),
      rejectionReason
    };

    const { data: updated, error: updateError } = await db
      .from('request')
      .update({
        status: 'rejected',
        data: updatedData,
        updatedAt: new Date().toISOString()
      })
      .eq('requestId', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting application:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Seller application rejected',
      data: updated
    });

  } catch (error) {
    console.error('Error in rejectSellerApplication:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Delete seller application (Admin only)
export const deleteSellerApplication = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const adminId = auth.userId;
    const { applicationId } = req.params;

    // Get the application first to retrieve the image URL
    const { data: application, error: fetchError } = await db
      .from('request')
      .select('*')
      .eq('requestId', applicationId)
      .eq('requestType', 'seller_application')
      .single();

    if (fetchError || !application) {
      console.error('Error fetching application:', fetchError);
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Extract the image URL from the data
    const idDocumentUrl = application.data?.idDocumentUrl;
    
    // If there's an image, delete it from Supabase storage
    if (idDocumentUrl) {
      try {
        // Extract the file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/uploads/seller-documents/userId/filename
        const urlParts = idDocumentUrl.split('/uploads/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          
          // Delete from Supabase storage
          const { error: storageError } = await db.storage
            .from('uploads')
            .remove([filePath]);
          
          if (storageError) {
            console.error('Error deleting image from storage:', storageError);
            // Continue with deletion even if image deletion fails
          } else {
            console.log('Successfully deleted image:', filePath);
          }
        }
      } catch (imgError) {
        console.error('Error processing image deletion:', imgError);
        // Continue with deletion even if image deletion fails
      }
    }

    // Delete the application from the database
    const { error: deleteError } = await db
      .from('request')
      .delete()
      .eq('requestId', applicationId)
      .eq('requestType', 'seller_application');

    if (deleteError) {
      console.error('Error deleting application:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: deleteError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Seller application and associated documents deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteSellerApplication:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Check if user has an active seller profile
export const checkSellerStatus = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;

    // Check for active seller profile
    const { data: sellerProfile, error } = await db
      .from('sellerProfiles')
      .select('*')
      .eq('userId', userId)
      .eq('isActive', true)
      .eq('isSuspended', false)
      .single();

    if (error || !sellerProfile) {
      return res.json({ 
        success: true, 
        isSeller: false,
        sellerProfile: null
      });
    }

    res.json({ 
      success: true, 
      isSeller: true,
      sellerProfile: sellerProfile
    });

  } catch (error) {
    console.error('Error in checkSellerStatus:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get seller's own items for dashboard
export const getMyItems = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .eq('isSuspended', false)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be an active seller to view your items' 
      });
    }

    // Get all items for this seller
    const { data: items, error } = await db
      .from('marketplace_items')
      .select('*')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seller items:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      data: items || [],
      count: items ? items.length : 0
    });

  } catch (error) {
    console.error('Error in getMyItems:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get seller dashboard statistics
export const getSellerStats = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;
    const { period = 'all' } = req.query; // all, daily, weekly, monthly

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .eq('isSuspended', false)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be an active seller to view stats' 
      });
    }

    // Get date range based on period
    let dateFilter = null;
    const now = new Date();
    
    if (period === 'daily') {
      dateFilter = new Date(now.setDate(now.getDate() - 1)).toISOString();
    } else if (period === 'weekly') {
      dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString();
    } else if (period === 'monthly') {
      dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    }

    // Build base query for orders
    let ordersQuery = db
      .from('order_items')
      .select('*, orders!inner(*)')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .eq('orders.paymentStatus', 'paid');

    if (dateFilter) {
      ordersQuery = ordersQuery.gte('orders.paidAt', dateFilter);
    }

    // Get order statistics
    const { data: orderItems, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching order stats:', ordersError);
    }

    // Calculate statistics
    let totalSales = 0;
    let totalOrders = new Set();
    let pendingOrders = 0;
    let pendingShipments = 0;

    if (orderItems) {
      orderItems.forEach(item => {
        totalSales += item.priceAtPurchase * item.quantity;
        totalOrders.add(item.orderId);
        
        if (item.orders.status === 'pending') {
          pendingOrders++;
        }
        if (['pending', 'processing'].includes(item.orders.status)) {
          pendingShipments++;
        }
      });
    }

    // Get product count
    const { data: products, error: productsError } = await db
      .from('marketplace_items')
      .select('marketItemId, status')
      .eq('sellerProfileId', sellerProfile.sellerProfileId);

    const activeProducts = products ? products.filter(p => p.status === 'active').length : 0;
    const totalProducts = products ? products.length : 0;

    // Calculate earnings (after platform fee)
    const platformFeeRate = 0.04; // 4% (matches payout service)
    const netEarnings = totalSales * (1 - platformFeeRate);

    res.json({ 
      success: true,
      stats: {
        totalSales: totalSales,
        totalOrders: totalOrders.size,
        totalProducts: totalProducts,
        activeProducts: activeProducts,
        pendingOrders: pendingOrders,
        pendingShipments: pendingShipments,
        earnings: {
          gross: totalSales,
          net: netEarnings,
          platformFee: totalSales * platformFeeRate
        }
      }
    });

  } catch (error) {
    console.error('Error in getSellerStats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// TESTING ONLY - Cancel my own application (for testing resubmission)
export const cancelMyApplication = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;

    // Find user's application
    const { data: application, error: findError } = await db
      .from('request')
      .select('*')
      .eq('userId', userId)
      .eq('requestType', 'seller_application')
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !application) {
      return res.status(404).json({ 
        success: false, 
        error: 'No application found' 
      });
    }

    // Update to rejected status (for testing)
    const updatedData = {
      ...application.data,
      rejectionReason: 'Cancelled by user for testing'
    };

    const { data: updated, error: updateError } = await db
      .from('request')
      .update({
        status: 'rejected',
        data: updatedData,
        updatedAt: new Date().toISOString()
      })
      .eq('requestId', application.requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling application:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Application cancelled. You can now resubmit.',
      data: updated
    });

  } catch (error) {
    console.error('Error in cancelMyApplication:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// ADDRESS MANAGEMENT
// ========================================

// Get all user addresses
export const getUserAddresses = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;

    const { data: addresses, error } = await db
      .from('user_addresses')
      .select('*')
      .eq('userId', userId)
      .order('isDefault', { ascending: false })
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      data: addresses || []
    });

  } catch (error) {
    console.error('Error in getUserAddresses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Create new address
export const createAddress = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;

    const {
      fullName, email, phoneNumber, alternatePhone,
      addressLine1, addressLine2, landmark,
      regionCode, provinceCode, cityMunicipalityCode, barangayCode,
      regionName, provinceName, cityMunicipalityName, barangayName,
      postalCode, addressType, isDefault, deliveryInstructions
    } = req.body;

    // Check required fields
    const required = validateRequiredFields(req.body, [
      'fullName', 'email', 'phoneNumber', 'addressLine1',
      'regionCode', 'provinceCode', 'cityMunicipalityCode', 'barangayCode',
      'regionName', 'provinceName', 'cityMunicipalityName', 'barangayName',
      'postalCode'
    ]);
    if (!required.valid) {
      return res.status(400).json({ 
        success: false, 
        message: required.error 
      });
    }

    // Create address object for validation
    const addressData = {
      fullName: fullName,
      phone: phoneNumber,
      street: addressLine1,
      barangay: barangayName,
      city: cityMunicipalityName,
      province: provinceName,
      postalCode: postalCode
    };

    // Check address fields
    const addressValidation = validateAddress(addressData);
    if (!addressValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: addressValidation.errors.join(', ')
      });
    }

    // Check email separately
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: emailValidation.error 
      });
    }

    // Sanitize text inputs
    const sanitizedData = {
      fullName: sanitizeInput(fullName),
      addressLine1: sanitizeInput(addressLine1),
      addressLine2: addressLine2 ? sanitizeInput(addressLine2) : '',
      landmark: landmark ? sanitizeInput(landmark) : '',
      regionName: sanitizeInput(regionName),
      provinceName: sanitizeInput(provinceName),
      cityMunicipalityName: sanitizeInput(cityMunicipalityName),
      barangayName: sanitizeInput(barangayName),
      deliveryInstructions: deliveryInstructions ? sanitizeInput(deliveryInstructions) : ''
    };

    // If this is set as default, update other addresses
    if (isDefault) {
      await db
        .from('user_addresses')
        .update({ isDefault: false })
        .eq('userId', userId);
    }

    // Create new address with sanitized values
    const { data: newAddress, error: createError } = await db
      .from('user_addresses')
      .insert({
        userId,
        fullName: sanitizedData.fullName,
        email,
        phoneNumber,
        alternatePhone,
        addressLine1: sanitizedData.addressLine1,
        addressLine2: sanitizedData.addressLine2,
        landmark: sanitizedData.landmark,
        regionCode,
        provinceCode,
        cityMunicipalityCode,
        barangayCode,
        regionName: sanitizedData.regionName,
        provinceName: sanitizedData.provinceName,
        cityMunicipalityName: sanitizedData.cityMunicipalityName,
        barangayName: sanitizedData.barangayName,
        postalCode,
        addressType: addressType || 'home',
        isDefault: isDefault || false,
        deliveryInstructions: sanitizedData.deliveryInstructions
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating address:', createError);
      return res.status(500).json({ 
        success: false, 
        error: createError.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Address created successfully',
      data: newAddress
    });

  } catch (error) {
    console.error('Error in createAddress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;
    const { addressId } = req.params;

    // Check if address exists and belongs to user
    const { data: existingAddress, error: checkError } = await db
      .from('user_addresses')
      .select('*')
      .eq('userAddressId', addressId)
      .eq('userId', userId)
      .single();

    if (checkError || !existingAddress) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found' 
      });
    }

    const updateData = { ...req.body };

    // If setting as default, update other addresses
    if (updateData.isDefault === true) {
      await db
        .from('user_addresses')
        .update({ isDefault: false })
        .eq('userId', userId)
        .neq('userAddressId', addressId);
    }

    // Update address
    const { data: updatedAddress, error: updateError } = await db
      .from('user_addresses')
      .update(updateData)
      .eq('userAddressId', addressId)
      .eq('userId', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating address:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Address updated successfully',
      data: updatedAddress
    });

  } catch (error) {
    console.error('Error in updateAddress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    // Check authentication
    const auth = validateAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ 
        success: false, 
        message: auth.error 
      });
    }
    const userId = auth.userId;
    const { addressId } = req.params;

    // Delete address
    const { error: deleteError } = await db
      .from('user_addresses')
      .delete()
      .eq('userAddressId', addressId)
      .eq('userId', userId);

    if (deleteError) {
      console.error('Error deleting address:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: deleteError.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteAddress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// PAYOUT SYSTEM REMOVED - Will be replaced with simpler implementation