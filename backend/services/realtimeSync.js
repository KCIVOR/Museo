// backend/services/realtimeSync.js
// Supabase Realtime listener for database changes
// Bridges database changes to Socket.IO for instant frontend updates

import supabase from '../database/db.js';

/**
 * Initialize Supabase Realtime listeners
 * Listens to database changes and emits Socket.IO events
 * 
 * @param {Object} io - Socket.IO server instance
 */
export function initializeRealtimeSync(io) {

  // Listen to user table changes (email, status, etc.)
  const userChannel = supabase
    .channel('user-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users' // For email and status changes
      },
      (payload) => {
        handleUserUpdate(io, payload);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Supabase Realtime: Channel error');
      } else if (status === 'TIMED_OUT') {
        console.error('Supabase Realtime: Connection timed out');
      }
    });

  // Listen to profile table changes (role is stored here!)
  const profileChannel = supabase
    .channel('profile-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profile' // IMPORTANT: Table is 'profile' not 'profiles'
      },
      (payload) => {
        handleProfileUpdate(io, payload);
      }
    )
    .subscribe();

  // Handle errors
  userChannel.on('error', (error) => {
    console.error('❌ Supabase Realtime (users) error:', error);
  });

  profileChannel.on('error', (error) => {
    console.error('❌ Supabase Realtime (profiles) error:', error);
  });

  // Return cleanup function
  return () => {
    supabase.removeChannel(userChannel);
    supabase.removeChannel(profileChannel);
  };
}

/**
 * Handle user table updates
 * Detects role changes and other user field updates
 */
function handleUserUpdate(io, payload) {
  const oldUser = payload.old;
  const newUser = payload.new;


  // Check if role changed
  if (oldUser.role !== newUser.role) {
    // Emit to specific user via Socket.IO
    io.to(`user_${newUser.id}`).emit('user:role_changed', {
      userId: newUser.id,
      oldRole: oldUser.role,
      newRole: newUser.role,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  }

  // Check if email changed
  if (oldUser.email !== newUser.email) {
    io.to(`user_${newUser.id}`).emit('user:email_changed', {
      userId: newUser.id,
      newEmail: newUser.email,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  }

  // Check if account status changed (banned, suspended, etc.)
  if (oldUser.status !== newUser.status) {
    io.to(`user_${newUser.id}`).emit('user:status_changed', {
      userId: newUser.id,
      oldStatus: oldUser.status,
      newStatus: newUser.status,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle profile table updates
 * Detects profile field changes (role, name, bio, avatar, etc.)
 */
function handleProfileUpdate(io, payload) {
  const oldProfile = payload.old;
  const newProfile = payload.new;


  const userId = newProfile.userId; // Field is 'userId' with capital I

  // ✅ IMPROVED: Only detect actual role changes with better validation
  const oldRole = oldProfile.role;
  const newRole = newProfile.role;
  
  // Normalize roles for comparison (handle null, undefined, empty strings)
  const normalizeRole = (role) => {
    if (role === null || role === undefined || role === '') return null;
    return String(role).trim().toLowerCase();
  };
  
  const normalizedOldRole = normalizeRole(oldRole);
  const normalizedNewRole = normalizeRole(newRole);
  
  // Get all changed fields first
  const changedFields = getChangedFields(oldProfile, newProfile);
  const roleWasModified = 'role' in changedFields;
  
  // Only emit if role actually changed AND was explicitly modified
  if (normalizedOldRole !== normalizedNewRole && roleWasModified) {
    console.log(`🔄 Role change detected for user ${userId}:`, {
      oldRole: oldRole,
      newRole: newRole,
      normalizedOld: normalizedOldRole,
      normalizedNew: normalizedNewRole
    });
    
    // Emit to specific user via Socket.IO
    io.to(`user_${userId}`).emit('user:role_changed', {
      userId: userId,
      oldRole: oldRole,
      newRole: newRole,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  } else {
    // Log when profile updates but role doesn't change
    console.log(`📝 Profile updated for user ${userId} (no role change):`, {
      role: newRole,
      changedFields: Object.keys(changedFields)
    });
  }

  // Emit general profile update event (reuse changedFields from above)
  if (Object.keys(changedFields).length > 0) {
    io.to(`user_${userId}`).emit('user:profile_updated', {
      userId: userId,
      updates: changedFields,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get changed fields between old and new objects
 * Returns object with only the changed fields
 */
function getChangedFields(oldObj, newObj) {
  const changes = {};
  
  for (const key in newObj) {
    if (oldObj[key] !== newObj[key]) {
      changes[key] = {
        old: oldObj[key],
        new: newObj[key]
      };
    }
  }
  
  return changes;
}

export default initializeRealtimeSync;
