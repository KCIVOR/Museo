// marketplaceController.js
import db from '../database/db.js';
import * as xenditService from '../services/xenditService.js';

// ========================================
// PHASE 1: CART SYSTEM
// ========================================

// Helper: Create test marketplace items (TESTING ONLY - REMOVE IN PRODUCTION)
export const createTestItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const title = req.body.title;
    const description = req.body.description;
    const price = parseFloat(req.body.price);
    const medium = req.body.medium;
    const dimensions = req.body.dimensions;
    const year_created = req.body.year_created ? parseInt(req.body.year_created) : null;
    const weight_kg = req.body.weight_kg ? parseFloat(req.body.weight_kg) : null;
    const is_original = req.body.is_original === 'true';
    const is_framed = req.body.is_framed === 'true';
    const condition = req.body.condition || 'excellent';
    const quantity = parseInt(req.body.quantity) || 1;
    const is_available = req.body.is_available === 'true';
    const is_featured = req.body.is_featured === 'true';
    const status = req.body.status || 'active';
    
    // Parse JSON fields
    const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    // Validation
    if (!title || !price) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and price are required' 
      });
    }

    if (price < 0 || price > 1000000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Price must be between 0 and 1,000,000' 
      });
    }

    if (quantity < 1 || quantity > 1000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quantity must be between 1 and 1,000' 
      });
    }

    if (year_created && (year_created < 1900 || year_created > new Date().getFullYear())) {
      return res.status(400).json({ 
        success: false, 
        error: `Year created must be between 1900 and ${new Date().getFullYear()}` 
      });
    }

    if (weight_kg && (weight_kg < 0 || weight_kg > 1000)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Weight must be between 0 and 1,000 kg' 
      });
    }

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

    // Create marketplace item with seller profile
    const newItem = {
      userId: userId,
      sellerProfileId: sellerProfile.sellerProfileId,
      title,
      description: description || null,
      price,
      medium: medium || null,
      dimensions: dimensions || null,
      year_created,
      weight_kg,
      is_original,
      is_framed,
      condition,
      images: imageUrls,
      primary_image: primaryImageUrl,
      is_available,
      is_featured,
      quantity,
      categories,
      tags,
      status
    };

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
    const { status, sellerProfileId } = req.query; // Optional filters
    
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
      .limit(20);
    
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
      count: transformedItems.length
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
          error: 'You can only edit your own items' 
        });
      }
    }

    // Parse FormData fields if they exist
    let updateData = {};
    
    // Handle text fields from FormData
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
    if (req.body.medium) updateData.medium = req.body.medium;
    if (req.body.dimensions) updateData.dimensions = req.body.dimensions;
    if (req.body.year_created) updateData.year_created = parseInt(req.body.year_created);
    if (req.body.weight_kg) updateData.weight_kg = parseFloat(req.body.weight_kg);
    if (req.body.is_original !== undefined) updateData.is_original = req.body.is_original === 'true';
    if (req.body.is_framed !== undefined) updateData.is_framed = req.body.is_framed === 'true';
    if (req.body.condition) updateData.condition = req.body.condition;
    if (req.body.quantity !== undefined) updateData.quantity = parseInt(req.body.quantity);
    if (req.body.is_available !== undefined) updateData.is_available = req.body.is_available === 'true';
    if (req.body.is_featured !== undefined) updateData.is_featured = req.body.is_featured === 'true';
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.categories) updateData.categories = JSON.parse(req.body.categories);
    if (req.body.tags) updateData.tags = JSON.parse(req.body.tags);
    
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
// PHASE 1: CART SYSTEM
// ========================================

// 1. Get user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get cart items with marketplace item details and seller profiles
    const { data: cartItems, error } = await db
      .from('cart_items')
      .select(`
        *,
        marketplace_items (
          marketItemId,
          title,
          description,
          price,
          images,
          medium,
          dimensions,
          is_original,
          quantity,
          status,
          userId,
          sellerProfileId,
          sellerProfiles (
            sellerProfileId,
            shopName,
            city,
            province
          )
        )
      `)
      .eq('userId', userId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching cart:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Filter out items where marketplace_item is null (deleted items)
    const validCartItems = cartItems.filter(item => item.marketplace_items !== null);

    // Calculate total
    const total = validCartItems.reduce((sum, item) => {
      return sum + (item.marketplace_items.price * item.quantity);
    }, 0);

    res.json({ 
      success: true, 
      data: {
        items: validCartItems,
        total: total,
        itemCount: validCartItems.length
      }
    });

  } catch (error) {
    console.error('Error in getCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 2. Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { marketplace_item_id, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    if (!marketplace_item_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'marketplace_item_id is required' 
      });
    }

    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quantity must be between 1 and 100' 
      });
    }

    // Check if item exists and is available
    const { data: item, error: itemError } = await db
      .from('marketplace_items')
      .select('marketItemId, quantity, status, userId')
      .eq('marketItemId', marketplace_item_id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    if (item.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item is not available for purchase' 
      });
    }

    // Check if user is trying to buy their own item
    if (item.userId === userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'You cannot add your own items to cart' 
      });
    }

    // Check stock availability
    if (quantity > item.quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `Only ${item.quantity} items available in stock` 
      });
    }
    // Check if item already in cart
    const { data: existingCartItem, error: checkError } = await db
      .from('cart_items')
      .select('*')
      .eq('userId', userId)
      .eq('marketItemId', marketplace_item_id)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 results

    // Only return error if it's NOT a "no rows" error
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking cart:', checkError);
      return res.status(500).json({ 
        success: false, 
        error: checkError.message 
      });
    }

    if (existingCartItem) {
      // Update existing cart item quantity
      const newQuantity = existingCartItem.quantity + quantity;

      // Check if new quantity exceeds stock
      if (newQuantity > item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Cannot add ${quantity} more. Only ${item.quantity - existingCartItem.quantity} items available` 
        });
      }

      const { data: updatedItem, error: updateError } = await db
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('cartItemId', existingCartItem.cartItemId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating cart:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: updateError.message 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cart updated',
        data: updatedItem
      });
    }

    // Add new item to cart
    const { data: newCartItem, error: insertError } = await db
      .from('cart_items')
      .insert([{
        userId: userId,
        marketItemId: marketplace_item_id,
        quantity: quantity
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error adding to cart:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: insertError.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Item added to cart',
      data: newCartItem
    });

  } catch (error) {
    console.error('Error in addToCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 3. Update cart item quantity
export const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    if (!quantity || quantity < 1 || quantity > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quantity must be between 1 and 100' 
      });
    }

    // Get cart item
    const { data: cartItem, error: cartError } = await db
      .from('cart_items')
      .select('*, marketplace_items(quantity, status)')
      .eq('cartItemId', itemId)
      .eq('userId', userId)
      .single();

    if (cartError || !cartItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cart item not found' 
      });
    }

    // Check if marketplace item still available
    if (cartItem.marketplace_items.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item is no longer available' 
      });
    }

    // Check stock
    if (quantity > cartItem.marketplace_items.quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `Only ${cartItem.marketplace_items.quantity} items available` 
      });
    }

    // Update quantity
    const { data: updatedItem, error: updateError } = await db
      .from('cart_items')
      .update({ quantity })
      .eq('cartItemId', itemId)
      .eq('userId', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating quantity:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({
      success: true,
      message: 'Quantity updated',
      data: updatedItem
    });

  } catch (error) {
    console.error('Error in updateCartQuantity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 4. Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Delete cart item
    const { error } = await db
      .from('cart_items')
      .delete()
      .eq('cartItemId', itemId)
      .eq('userId', userId);

    if (error) {
      console.error('Error removing from cart:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Item removed from cart' 
    });

  } catch (error) {
    console.error('Error in removeFromCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 5. Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Delete all cart items for user
    const { error } = await db
      .from('cart_items')
      .delete()
      .eq('userId', userId);

    if (error) {
      console.error('Error clearing cart:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Cart cleared' 
    });

  } catch (error) {
    console.error('Error in clearCart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ========================================
// PHASE 2: ORDERS & CHECKOUT
// ========================================

// 1. Create order from cart
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { shipping_address, contact_info, payment_method } = req.body;

    // ===== PREVENT DUPLICATE ORDERS =====
    // Check if user already has a pending order (created in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: existingPendingOrder, error: checkError } = await db
      .from('orders')
      .select('orderId, createdAt, paymentReference')
      .eq('userId', userId)
      .eq('paymentStatus', 'pending')
      .eq('status', 'pending')
      .gt('createdAt', fiveMinutesAgo)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();
    
    if (existingPendingOrder && !checkError) {
      // User already has a recent pending order
      const timeSinceCreation = Math.floor((Date.now() - new Date(existingPendingOrder.createdAt).getTime()) / 1000);
      
      return res.status(400).json({
        success: false,
        error: `You already have a pending order created ${timeSinceCreation} seconds ago. Please complete or cancel it first.`,
        data: {
          existingOrderId: existingPendingOrder.orderId,
          createdAt: existingPendingOrder.createdAt,
          paymentReference: existingPendingOrder.paymentReference
        }
      });
    }

    // Get cart items with seller profiles
    const { data: cartItems, error: cartError } = await db
      .from('cart_items')
      .select(`
        *,
        marketplace_items (
          marketItemId,
          title,
          price,
          quantity,
          status,
          userId,
          sellerProfileId,
          sellerProfiles (
            sellerProfileId,
            shopName,
            isActive,
            isSuspended
          )
        )
      `)
      .eq('userId', userId);

    if (cartError) {
      console.error('Error fetching cart:', cartError);
      return res.status(500).json({ 
        success: false, 
        error: cartError.message 
      });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart is empty' 
      });
    }

    // ===== INVENTORY LOCKING: Validate and prepare inventory updates =====
    const inventoryUpdates = [];
    
    for (const item of cartItems) {
      if (!item.marketplace_items) {
        return res.status(400).json({ 
          success: false, 
          error: 'One or more items no longer exist' 
        });
      }

      // Check if seller is active
      if (!item.marketplace_items.sellerProfiles || 
          !item.marketplace_items.sellerProfiles.isActive || 
          item.marketplace_items.sellerProfiles.isSuspended) {
        return res.status(400).json({ 
          success: false, 
          error: `Seller for "${item.marketplace_items.title}" is no longer active` 
        });
      }

      if (item.marketplace_items.status !== 'active') {
        return res.status(400).json({ 
          success: false, 
          error: `Item "${item.marketplace_items.title}" is no longer available` 
        });
      }

      // CRITICAL: Re-fetch current inventory to prevent race conditions
      const { data: currentItem, error: fetchError } = await db
        .from('marketplace_items')
        .select('marketItemId, title, quantity')
        .eq('marketItemId', item.marketplace_items.marketItemId)
        .single();
      
      if (fetchError || !currentItem) {
        return res.status(400).json({ 
          success: false, 
          error: `Failed to verify stock for "${item.marketplace_items.title}"` 
        });
      }
      
      // Check real-time stock availability
      if (item.quantity > currentItem.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Not enough stock for "${currentItem.title}". Only ${currentItem.quantity} available` 
        });
      }
      
      // Prepare inventory update
      inventoryUpdates.push({
        marketItemId: currentItem.marketItemId,
        title: currentItem.title,
        requestedQty: item.quantity,
        currentQty: currentItem.quantity,
        newQty: currentItem.quantity - item.quantity
      });
    }

    // ===== NEW: GROUP ITEMS BY SELLER =====
    const platformFeeRate = 0.10; // 10% platform fee
    const itemsBySeller = {};
    
    // Group cart items by seller
    cartItems.forEach(item => {
      const sellerProfileId = item.marketplace_items.sellerProfileId;
      if (!itemsBySeller[sellerProfileId]) {
        itemsBySeller[sellerProfileId] = {
          sellerProfileId: sellerProfileId,
          shopName: item.marketplace_items.sellerProfiles.shopName,
          items: [],
          subtotal: 0
        };
      }
      
      const itemTotal = item.marketplace_items.price * item.quantity;
      const marketplaceItemId = item.marketItemId || item.marketplace_items?.marketItemId;
      
      itemsBySeller[sellerProfileId].items.push({
        userId: userId,
        marketplaceItemId: marketplaceItemId,
        sellerId: item.marketplace_items.userId,
        sellerProfileId: sellerProfileId,
        title: item.marketplace_items.title,
        priceAtPurchase: item.marketplace_items.price,
        quantity: item.quantity,
        itemTotal: itemTotal,
        platformFeeAmount: itemTotal * platformFeeRate,
        artistEarnings: itemTotal - (itemTotal * platformFeeRate)
      });
      
      itemsBySeller[sellerProfileId].subtotal += itemTotal;
    });

    // Calculate grand total across all sellers
    const grandTotal = Object.values(itemsBySeller).reduce((sum, seller) => sum + seller.subtotal, 0);
    const grandPlatformFee = grandTotal * platformFeeRate;
    
    // Generate ONE payment group ID for all orders
    const { randomUUID } = await import('crypto');
    const paymentGroupId = randomUUID();
    
    console.log(`🛒 Creating ${Object.keys(itemsBySeller).length} orders for payment group ${paymentGroupId}`);
    
    // ===== CREATE SEPARATE ORDER FOR EACH SELLER WITH ROLLBACK =====
    const createdOrders = [];
    const allOrderItems = [];
    const rollbackOperations = []; // Track what needs to be rolled back
    
    try {
      for (const [sellerProfileId, sellerData] of Object.entries(itemsBySeller)) {
      const sellerSubtotal = sellerData.subtotal;
      const sellerPlatformFee = sellerSubtotal * platformFeeRate;
      
      // Create order for this seller
      const { data: sellerOrder, error: orderError } = await db
        .from('orders')
        .insert({
          userId: userId,
          sellerProfileId: sellerProfileId, // NEW: Link to seller
          paymentGroupId: paymentGroupId,   // NEW: Link all orders together
          subtotal: sellerSubtotal,
          platformFee: sellerPlatformFee,
          shippingCost: 0,
          totalAmount: sellerSubtotal,
          status: 'pending',
          paymentStatus: 'pending',
          shippingAddress: shipping_address,
          contactInfo: contact_info,
          paymentMethod: payment_method,
          paymentProvider: 'xendit'
        })
        .select()
        .single();

        if (orderError) {
          console.error(`Error creating order for seller ${sellerProfileId}:`, orderError);
          throw new Error(`Failed to create order: ${orderError.message}`);
        }
        
        // Track this order for rollback if needed
        rollbackOperations.push({
          type: 'order',
          orderId: sellerOrder.orderId
        });
      
      console.log(`✅ Created order ${sellerOrder.orderId} for seller ${sellerData.shopName} (₱${sellerSubtotal})`);
      
      // Add orderId to items for this seller
      const orderItemsForSeller = sellerData.items.map(item => ({
        ...item,
        orderId: sellerOrder.orderId
      }));
      
      // Create order_items for this seller
      const { data: createdItems, error: itemsError } = await db
        .from('order_items')
        .insert(orderItemsForSeller)
        .select();

        if (itemsError) {
          console.error('Error creating order items:', itemsError);
          throw new Error(`Failed to create order items: ${itemsError.message}`);
        }
        
        // Track order items for rollback
        rollbackOperations.push({
          type: 'order_items',
          orderItemIds: createdItems.map(item => item.orderItemId)
        });
        
        createdOrders.push({
          ...sellerOrder,
          shopName: sellerData.shopName,
          itemCount: sellerData.items.length
        });
        allOrderItems.push(...createdItems);
      }
      
      // ===== RESERVE INVENTORY (reduce quantities) =====
      console.log('📦 Reserving inventory...');
      for (const update of inventoryUpdates) {
        const { error: updateError } = await db
          .from('marketplace_items')
          .update({ 
            quantity: update.newQty,
            updated_at: new Date().toISOString()
          })
          .eq('marketItemId', update.marketItemId);
        
        if (updateError) {
          console.error(`❌ Failed to reserve inventory for ${update.title}:`, updateError);
          throw new Error(`Failed to reserve inventory: ${updateError.message}`);
        }
        
        console.log(`✅ Reserved inventory: ${update.title} (${update.currentQty} → ${update.newQty})`);
      }
      
      // ===== CLEAR CART AFTER SUCCESSFUL ORDER CREATION =====
      console.log('🗑️ Clearing user cart...');
      const { error: clearCartError } = await db
        .from('cart_items')
        .delete()
        .eq('userId', userId);
      
      if (clearCartError) {
        console.error('Error clearing cart:', clearCartError);
        throw new Error(`Failed to clear cart: ${clearCartError.message}`);
      }
      
      console.log('✅ Cart cleared successfully');
      
    } catch (error) {
      // ===== ROLLBACK ON FAILURE =====
      console.error('❌ Order creation failed, initiating rollback...', error);
      
      // Rollback database operations in reverse order
      for (const operation of rollbackOperations.reverse()) {
        try {
          if (operation.type === 'order_items' && operation.orderItemIds) {
            await db
              .from('order_items')
              .delete()
              .in('orderItemId', operation.orderItemIds);
            console.log(`🔄 Rolled back ${operation.orderItemIds.length} order items`);
          } else if (operation.type === 'order' && operation.orderId) {
            await db
              .from('orders')
              .delete()
              .eq('orderId', operation.orderId);
            console.log(`🔄 Rolled back order ${operation.orderId}`);
          }
        } catch (rollbackError) {
          console.error(`❌ Rollback failed for ${operation.type}:`, rollbackError);
        }
      }
      
      // Restore inventory if it was already reduced
      for (const update of inventoryUpdates) {
        try {
          const { error: restoreError } = await db
            .from('marketplace_items')
            .update({ 
              quantity: update.currentQty,
              updated_at: new Date().toISOString()
            })
            .eq('marketItemId', update.marketItemId);
          
          if (restoreError) {
            console.error(`❌ Failed to restore inventory for ${update.title}:`, restoreError);
          } else {
            console.log(`🔄 Restored inventory: ${update.title} (${update.newQty} → ${update.currentQty})`);
          }
        } catch (restoreError) {
          console.error(`❌ Failed to restore inventory:`, restoreError);
        }
      }
      
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Order creation failed'
      });
    }
    
    // Use the first order for payment link (represents the whole payment group)
    const mainOrder = createdOrders[0];

    // Create Xendit invoice (payment link) for the TOTAL amount
    let paymentLink;
    try {
      console.log('📝 Creating Xendit payment link for ₱' + grandTotal);
      paymentLink = await xenditService.createPaymentLink({
        amount: grandTotal, // Xendit uses regular amount, not centavos
        description: `Museo Orders (${createdOrders.length} seller${createdOrders.length > 1 ? 's' : ''})`,
        metadata: {
          paymentGroupId: paymentGroupId,
          userId: userId,
          orderCount: createdOrders.length,
          orderIds: createdOrders.map(o => o.orderId).join(','),
          email: contact_info?.email || 'customer@museo.art',
          customerInfo: {
            given_names: contact_info?.name?.split(' ')[0] || 'Museo',
            surname: contact_info?.name?.split(' ')[1] || 'Customer',
            email: contact_info?.email || 'customer@museo.art',
            mobile_number: contact_info?.phone || ''
          }
        }
      });
      
      console.log('✅ Xendit payment link created:', {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        referenceNumber: paymentLink.referenceNumber
      });

      // Update ALL orders with payment link details
      for (const order of createdOrders) {
        const { error: updateError } = await db
          .from('orders')
          .update({
            paymentLinkId: paymentLink.paymentLinkId,
            paymentReference: paymentLink.referenceNumber
          })
          .eq('orderId', order.orderId);

        if (updateError) {
          console.error(`Error updating order ${order.orderId} with payment link:`, updateError);
        }
      }

    } catch (paymentError) {
      console.error('Error creating payment link:', paymentError);
      // Don't fail the order creation, just log the error
    }

    // Inventory has been reserved, cart has been cleared
    console.log('✅ Orders created with inventory reserved and cart cleared');

    res.status(201).json({ 
      success: true, 
      message: `${createdOrders.length} order${createdOrders.length > 1 ? 's' : ''} created successfully. Please complete payment.`,
      data: {
        paymentGroupId: paymentGroupId,
        orders: createdOrders,
        orderItems: allOrderItems,
        payment: paymentLink ? {
          paymentUrl: paymentLink.checkoutUrl,
          paymentLinkId: paymentLink.paymentLinkId,
          referenceNumber: paymentLink.referenceNumber,
          expiresAt: paymentLink.expiresAt
        } : null,
        summary: {
          paymentGroupId: paymentGroupId,
          orderCount: createdOrders.length,
          sellerCount: Object.keys(itemsBySeller).length,
          totalItems: allOrderItems.length,
          subtotal: grandTotal,
          platformFee: grandPlatformFee,
          shippingCost: 0,
          total: grandTotal
        }
      }
    });

  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// 1.5. Check payment status manually (backup for webhook failures)
export const checkPaymentStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get all orders for this buyer
    const { data: orders, error: ordersError } = await db
      .from('orders')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (ordersError) {
      console.error('Error fetching buyer orders:', ordersError);
      return res.status(500).json({ 
        success: false, 
        error: ordersError.message 
      });
    }

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items } = await db
          .from('order_items')
          .select('*')
          .eq('orderId', order.orderId);

        // Group items by seller profile
        const itemsBySeller = {};
        items.forEach(item => {
          if (!itemsBySeller[item.sellerProfileId]) {
            itemsBySeller[item.sellerProfileId] = [];
          }
          itemsBySeller[item.sellerProfileId].push(item);
        });

        return {
          ...order,
          items: items,
          itemsBySeller: itemsBySeller,
          itemCount: items.length,
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
    const userId = req.user?.id;
    const { status } = req.query; // Optional status filter
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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

    // NEW: Get orders directly for this seller (more efficient)
    let ordersQuery = db
      .from('orders')
      .select('*')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .eq('paymentStatus', 'paid') // Only show paid orders
      .order('createdAt', { ascending: false });
    
    // Apply status filter if provided
    if (status) {
      ordersQuery = ordersQuery.eq('status', status);
    }
    
    const { data: allOrders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).json({ 
        success: false, 
        error: ordersError.message 
      });
    }

    if (!allOrders || allOrders.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        stats: {
          totalOrders: 0,
          toShip: 0,
          shipping: 0,
          completed: 0
        },
        count: 0
      });
    }

    // Get order items for these orders
    const orderIds = allOrders.map(order => order.orderId);
    const { data: orderItems, error: itemsError } = await db
      .from('order_items')
      .select('*')
      .in('orderId', orderIds)
      .eq('sellerProfileId', sellerProfile.sellerProfileId);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).json({ 
        success: false, 
        error: ordersError.message 
      });
    }

    // Get marketplace item details
    const itemIds = [...new Set(orderItems.map(item => item.marketplaceItemId))];
    const { data: marketItems } = await db
      .from('marketplace_items')
      .select('marketItemId, title, primary_image, medium, dimensions')
      .in('marketItemId', itemIds);

    // Create a map for quick lookup
    const itemsMap = new Map(marketItems?.map(i => [i.marketItemId, i]) || []);

    // Filter by status if provided
    let filteredOrders = allOrders;
    if (status && status !== 'all') {
      filteredOrders = allOrders.filter(o => o.status === status);
    }

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
        const marketItem = itemsMap.get(item.marketplaceItemId);
        
        // Use stored title from order_items first (preserved even if item deleted)
        // Fall back to marketplace item data if available
        groupedOrdersMap.get(item.orderId).items.push({
          orderItemId: item.orderItemId,
          marketplaceItemId: item.marketplaceItemId,
          title: item.title || marketItem?.title || 'Unknown Item',
          image: marketItem?.primary_image,
          medium: marketItem?.medium,
          dimensions: marketItem?.dimensions,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          subtotal: item.priceAtPurchase * item.quantity
        });
      }
    });
    
    // Convert map to array
    const finalOrders = Array.from(groupedOrdersMap.values());
    
    // Calculate statistics from ALL orders (not filtered)
    const stats = {
      totalOrders: allOrders.length,
      toShip: allOrders.filter(o => o.status === 'paid' || o.status === 'processing').length,
      shipping: allOrders.filter(o => o.status === 'shipped').length,
      completed: allOrders.filter(o => o.status === 'delivered').length
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
    const userId = req.user?.id;
    const { orderId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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

    // Group items by seller profile
    const itemsBySeller = {};
    items.forEach(item => {
      if (!itemsBySeller[item.sellerProfileId]) {
        itemsBySeller[item.sellerProfileId] = [];
      }
      itemsBySeller[item.sellerProfileId].push(item);
    });

    res.json({ 
      success: true, 
      data: {
        ...order,
        items: items,
        itemsBySeller: itemsBySeller,
        itemCount: items.length,
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
    const userId = req.user?.id;
    const { orderId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
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
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { tracking_number } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
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

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'shipped',
        trackingNumber: tracking_number,
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

    // TEMPORARY: Create payout when shipped (for testing only)
    // Remove this in production - payouts should only happen after delivery confirmation
    if (process.env.NODE_ENV !== 'production') {
      try {
        const payoutService = (await import('../services/payoutService.js')).default;
        await payoutService.createPayout(orderId);
        console.log(`[TEST MODE] Payout created for shipped order ${orderId}`);
      } catch (payoutError) {
        console.error('Error creating test payout:', payoutError);
      }
    }

    res.json({ 
      success: true, 
      message: process.env.NODE_ENV !== 'production' 
        ? 'Order marked as shipped. [TEST MODE] Payout created.'
        : 'Order marked as shipped',
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
    const userId = req.user?.id;
    const { orderId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
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
      // Log error but don't fail the delivery confirmation
      console.error('❌ Error creating payout for order', orderId, ':', payoutError.message);
      console.error('Stack trace:', payoutError.stack);
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
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { reason } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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


    // Validation
    const missingFields = [];
    if (!shopName) missingFields.push('shopName');
    if (!fullName) missingFields.push('fullName');
    if (!email) missingFields.push('email');
    if (!phoneNumber) missingFields.push('phoneNumber');
    if (!street) missingFields.push('street');
    if (!region) missingFields.push('region');
    if (!province) missingFields.push('province');
    if (!city) missingFields.push('city');
    if (!barangay) missingFields.push('barangay');
    if (!postalCode) missingFields.push('postalCode');
    if (!shopDescription) missingFields.push('shopDescription');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'All required fields must be filled',
        missingFields
      });
    }

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

    // Prepare data for JSONB column
    const requestData = {
      shopName,
      fullName,
      email,
      phoneNumber,
      street,
      landmark: landmark || null,
      region,
      province,
      city,
      barangay,
      postalCode,
      shopDescription,
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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const { applicationId } = req.params;
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
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

    // Check if already approved
    if (application.status === 'approved') {
      return res.status(400).json({ 
        success: false, 
        error: 'Application is already approved' 
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
    const { applicationId } = req.params;
    const adminId = req.user?.id;
    const { rejectionReason } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rejection reason is required' 
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
    const { applicationId } = req.params;
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const userId = req.user?.id;
    const { period = 'all' } = req.query; // all, daily, weekly, monthly
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
        if (item.orders.status === 'processing' || item.orders.status === 'paid') {
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
    const platformFeeRate = 0.10; // 10%
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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const {
      fullName, email, phoneNumber, alternatePhone,
      addressLine1, addressLine2, landmark,
      regionCode, provinceCode, cityMunicipalityCode, barangayCode,
      regionName, provinceName, cityMunicipalityName, barangayName,
      postalCode, addressType, isDefault, deliveryInstructions
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !addressLine1 || 
        !regionCode || !provinceCode || !cityMunicipalityCode || !barangayCode ||
        !regionName || !provinceName || !cityMunicipalityName || !barangayName || 
        !postalCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide all required address fields' 
      });
    }

    // Validate phone number format (Philippine)
    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format. Use 09XXXXXXXXX or +639XXXXXXXXX' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    // Validate postal code
    if (!/^\d{4}$/.test(postalCode)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Postal code must be 4 digits' 
      });
    }

    // If this is set as default, update other addresses
    if (isDefault) {
      await db
        .from('user_addresses')
        .update({ isDefault: false })
        .eq('userId', userId);
    }

    // Create new address
    const { data: newAddress, error: insertError } = await db
      .from('user_addresses')
      .insert({
        userId,
        fullName,
        email,
        phoneNumber,
        alternatePhone: alternatePhone || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        landmark: landmark || null,
        regionCode,
        provinceCode,
        cityMunicipalityCode,
        barangayCode,
        regionName,
        provinceName,
        cityMunicipalityName,
        barangayName,
        postalCode,
        addressType: addressType || null,
        isDefault: isDefault || false,
        deliveryInstructions: deliveryInstructions || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating address:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: insertError.message 
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
    const userId = req.user?.id;
    const { addressId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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
    const userId = req.user?.id;
    const { addressId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

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