import supabase from '../database/db.js';
import bcrypt from "bcrypt"

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


//const isMatch = await bcrypt.compare(password, data.password); check password