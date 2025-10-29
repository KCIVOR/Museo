import supabase from '../database/db.js';
import bcrypt from "bcrypt"

export const getAllUsers = async (req, res) =>{
    try {
        // ✅ FIXED: Add pagination to prevent fetching all users
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const offset = (page - 1) * limit;
        
        const { data, error } = await supabase
        .from('profile')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
        
        if (error) throw error
        res.json(data)
        console.log(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
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


//const isMatch = await bcrypt.compare(password, data.password); check password