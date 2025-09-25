
import supabase from '../database/db.js';


export function requirePermission(action) {
  return async (req, res, next) => {
    try {
      // Must have an authenticated user from your auth middleware
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Fetch the user's role from your profile table
      const { data: profile, error } = await supabase
        .from('profile')
        .select('role')
        .eq('userId', userId)
        .maybeSingle(); 

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Database query failed' });
      }
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      const role = profile.role;
      


      // If/else version of the normalization:
      let allowed;
      if (Array.isArray(action)) {        // prefer Array.isArray() for robust checks [web:177]
        allowed = action;
      } else if (action == null) {
        allowed = [];
      } else {
        allowed = [action];
      }

      const isAllowed = allowed.includes(role);
      if (!isAllowed) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return next(); 
    } catch (err) {
      console.error('requirePermission error:', err);
      return res.status(500).json({ error: 'Server error during authorization' });
    }
  };
}
