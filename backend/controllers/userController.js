import supabase from '../database/db.js';
import bcrypt from "bcrypt";
import { cache } from '../utils/cache.js';

export const getAllUsers = async (req, res) =>{
    try {
        // ✅ FIXED: Add pagination to prevent fetching all users
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '100', 10);
        const offset = (page - 1) * limit;
        
        const { data, error } = await supabase
        .from('profile')
        .select('userId, profileId, username, firstName, middleName, lastName, profilePicture, bio')
        .range(offset, offset + limit - 1)
        
        if (error) {
            console.error('getAllUsers error:', error);
            throw error;
        }
        
        res.json(data)
    } catch (error) {
        console.error('getAllUsers catch error:', error);
        res.status(500).json({ error: error.message })
  }
};

// @desc    Get all users for admin management with pagination
// @route   GET /api/users/admin/all
// @access  Private/Admin
export const getAdminUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const offset = (page - 1) * limit;
        
        // Get total count for pagination (only user and artist roles)
        const { count, error: countError } = await supabase
            .from('profile')
            .select('*', { count: 'exact', head: true })
            .in('role', ['user', 'artist']);
        
        if (countError) {
            console.error('Count error:', countError);
            throw countError;
        }
        
        // Fetch users with pagination (only user and artist roles)
        const { data, error } = await supabase
            .from('profile')
            .select('userId, profileId, username, firstName, middleName, lastName, profilePicture, bio, role')
            .in('role', ['user', 'artist'])
            .order('userId', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) {
            console.error('getAdminUsers error:', error);
            throw error;
        }
        
        // Get user IDs to fetch auth metadata
        const userIds = data.map(profile => profile.userId);
        
        // Fetch auth users to get email and created_at from metadata
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.error('Auth users fetch error:', authError);
        }
        
        // Create a map of userId to auth user data
        const authUserMap = {};
        if (authUsers) {
            authUsers.forEach(authUser => {
                if (userIds.includes(authUser.id)) {
                    authUserMap[authUser.id] = authUser;
                }
            });
        }
        
        // Transform data to include full user info
        const users = data.map(user => {
            const authUser = authUserMap[user.userId];
            return {
                id: user.userId,
                profileId: user.profileId,
                username: user.username,
                firstName: user.firstName || '',
                middleName: user.middleName || '',
                lastName: user.lastName || '',
                email: authUser?.email || '',
                avatar: user.profilePicture || null,
                bio: user.bio || '',
                role: user.role || 'user',
                isActive: true,
                createdAt: authUser?.created_at || new Date().toISOString(),
                artworksCount: 0,
                eventsCount: 0
            };
        });
        
        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('getAdminUsers catch error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};


export const createUsers = async (req, res) => {
    try {
        const { username, password, email } = req.body
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        const { data, error } = await supabase
        .from('user')
        .insert([{username, password:hashedPassword, email }])
        .select()
        
        if (error) throw error
        res.status(201).json(data[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
  }
};

export const getUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('id', userId) 
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
};

export const updateUser = async (req, res) =>{

};
export const deleteUser = async (req, res) =>{

};
export const getCurrentUser = (req, res) => {
  // req.user is set by authMiddleware
  res.json(req.user);
};



export const getRole = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { data: profile, error } = await supabase
      .from('profile')
      .select('role', 'userId')
      .eq('userId', userId)
      .maybeSingle(); 
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (!profile) {
      // Return default role if no profile exists
      return res.json('user');
    }
    const cleanRole = (profile.role || 'user').trim();
    res.json(cleanRole);
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export const getPicture = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: profile, error } = await supabase
      .from('profile')
      .select('profilePicture')
      .eq('userId', userId)
      .maybeSingle(); 

    if (error) {
      console.error('Database error in getPicture:', error);
      throw error;
    }
    
    if (!profile) {
      return res.json(null);
    }
    
    res.json(profile.profilePicture);

  } catch(error) {
    console.error('Error in getPicture:', error);
    res.status(500).json({ error: error.message });
  }
}

// @desc    Update user role (Admin only)
// @route   PATCH /api/users/:userId/role
// @access  Private/Admin
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const requesterId = req.user?.id;

    // Verify requester is authenticated
    if (!requesterId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    // Verify requester is an admin
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('profile')
      .select('role')
      .eq('userId', requesterId)
      .single();

    if (requesterError || !requesterProfile) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Unable to verify permissions.' 
      });
    }

    if (requesterProfile.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Admin privileges required.' 
      });
    }

    // Validate role
    const validRoles = ['user', 'artist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role. Must be user or artist.' 
      });
    }

    // Check if target user exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profile')
      .select('userId, role')
      .eq('userId', userId)
      .single();

    if (checkError || !existingProfile) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Prevent changing admin role
    if (existingProfile.role === 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Cannot change admin role' 
      });
    }

    // Prevent users from changing their own role
    if (userId === requesterId) {
      return res.status(403).json({ 
        success: false,
        error: 'Cannot change your own role' 
      });
    }

    // Update the role
    const { data, error } = await supabase
      .from('profile')
      .update({ role })
      .eq('userId', userId)
      .select('userId, role')
      .single();

    if (error) {
      console.error('Update role error:', error);
      throw error;
    }

    // ✅ CACHE INVALIDATION: Clear profile cache for the updated user
    const cacheKey = `profile:${userId}`;
    await cache.del(cacheKey);
    console.log('🗑️ CACHE CLEARED:', cacheKey, '(role updated)');

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        userId: data.userId,
        role: data.role
      }
    });

  } catch (error) {
    console.error('updateUserRole catch error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// ========================================
// CATEGORY MANAGEMENT (ADMIN ONLY)
// ========================================

// @desc    Create a new category (Admin only)
// @route   POST /api/users/admin/categories
// @access  Private/Admin
export const createCategory = async (req, res) => {
  try {
    const { name, slug, active, sortOrder } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    // Check if category already exists
    const { data: existing, error: existError } = await supabase
      .from('category')
      .select('categoryId')
      .ilike('name', name)
      .single();

    if (existing) {
      return res.status(409).json({ success: false, error: 'Category already exists' });
    }

    // Create category
    const { data, error } = await supabase
      .from('category')
      .insert({
        name: name.trim(),
        slug: slug?.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
        active: active !== false, // default true
        sortOrder: sortOrder || 0
      })
      .select('*')
      .single();

    if (error) {
      console.error('Create category error:', error);
      throw error;
    }

    // Clear cache
    await cache.clearPattern('categories:*');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data
    });

  } catch (error) {
    console.error('createCategory catch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all categories
// @route   GET /api/users/admin/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const { active } = req.query;

    // Try cache first
    const cacheKey = `categories:${active || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached) });
    }

    let query = supabase.from('category').select('*');

    // Filter by active status if provided
    if (active !== undefined) {
      const isActive = active === 'true' || active === '1';
      query = query.eq('active', isActive);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Get categories error:', error);
      throw error;
    }

    // Cache for 1 hour
    await cache.set(cacheKey, JSON.stringify(data), 3600);

    res.json({ success: true, data });

  } catch (error) {
    console.error('getCategories catch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single category by ID
// @route   GET /api/users/admin/categories/:categoryId
// @access  Public
export const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const { data, error } = await supabase
      .from('category')
      .select('*')
      .eq('categoryId', categoryId)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, data });

  } catch (error) {
    console.error('getCategoryById catch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update category (Admin only)
// @route   PUT /api/users/admin/categories/:categoryId
// @access  Private/Admin
export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, slug, active, sortOrder } = req.body;

    // Validate at least one field is provided
    if (!name && slug === undefined && active === undefined && sortOrder === undefined) {
      return res.status(400).json({ success: false, error: 'At least one field is required' });
    }

    // Check if category exists
    const { data: existing, error: existError } = await supabase
      .from('category')
      .select('categoryId')
      .eq('categoryId', categoryId)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Build update object
    const updateObj = {};
    if (name) updateObj.name = name.trim();
    if (slug !== undefined) updateObj.slug = slug?.trim() || name?.trim().toLowerCase().replace(/\s+/g, '-');
    if (active !== undefined) updateObj.active = active;
    if (sortOrder !== undefined) updateObj.sortOrder = sortOrder;

    // Update category
    const { data, error } = await supabase
      .from('category')
      .update(updateObj)
      .eq('categoryId', categoryId)
      .select('*')
      .single();

    if (error) {
      console.error('Update category error:', error);
      throw error;
    }

    // Clear cache
    await cache.clearPattern('categories:*');

    res.json({
      success: true,
      message: 'Category updated successfully',
      data
    });

  } catch (error) {
    console.error('updateCategory catch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete category (Admin only)
// @route   DELETE /api/users/admin/categories/:categoryId
// @access  Private/Admin
export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Check if category exists
    const { data: existing, error: existError } = await supabase
      .from('category')
      .select('categoryId')
      .eq('categoryId', categoryId)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Delete category
    const { error } = await supabase
      .from('category')
      .delete()
      .eq('categoryId', categoryId);

    if (error) {
      console.error('Delete category error:', error);
      throw error;
    }

    // Clear cache
    await cache.clearPattern('categories:*');

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('deleteCategory catch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

//const isMatch = await bcrypt.compare(password, data.password); check password