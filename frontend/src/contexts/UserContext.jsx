// src/contexts/UserContext.jsx
// Central user state management for the entire application
// Eliminates duplicate API calls and provides real-time user data updates

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socket } from '../../lib/socketClient.js';

// Create the context
const UserContext = createContext();

/**
 * Custom hook to access UserContext
 * Must be used within a UserProvider
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

/**
 * UserProvider Component
 * Wraps the app and provides user data to all child components
 */
export const UserProvider = ({ children }) => {
  // State
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Start as false since we don't auto-fetch
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Clear all user data (used on logout or before login)
   */
  const clearUserData = () => {
    setUserData(null);
    setIsAuthenticated(false);
  };

  /**
   * Fetch user data from backend
   * Called on app startup and after login
   * 
   * Endpoints used:
   * - GET /api/users/me - Get basic user auth data (id, username, email)
   * - GET /api/profile/getProfile - Get full profile data (avatar, bio, names, etc.)
   */
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      const API = import.meta.env.VITE_API_BASE;
      
      // Step 1: Check authentication with /api/users/me
      const userRes = await fetch(`${API}/users/me`, {
        method: 'GET',
        credentials: 'include'
      });
      
      // If not authenticated, clear data and exit
      if (!userRes.ok) {
        clearUserData();
        return;
      }

      // Step 2: Get basic user data (id, username, email)
      const userData = await userRes.json();
      
      // Step 3: Fetch full profile data from /api/profile/getProfile
      const profileRes = await fetch(`${API}/profile/getProfile`, {
        method: 'GET',
        credentials: 'include'
      });
      
      let profile = {};
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        // Backend returns { profile: {...} }
        profile = profileData.profile || {};
      }

      // Step 4: Check if user is an active seller
      let sellerData = { isSeller: false, sellerProfile: null };
      try {
        const sellerRes = await fetch(`${API}/marketplace/seller/status`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (sellerRes.ok) {
          const sellerInfo = await sellerRes.json();
          if (sellerInfo.success) {
            sellerData = {
              isSeller: sellerInfo.isSeller || false,
              sellerProfile: sellerInfo.sellerProfile || null
            };
          }
        }
      } catch (sellerError) {
        console.warn('UserContext: Could not fetch seller status:', sellerError);
        // Continue without seller data
      }

      // Step 5: Combine user data, profile data, and seller data
      setUserData({
        id: userData.id || null,
        userId: userData.id || null, // Duplicate for backward compatibility
        username: profile.username || userData.username || null,
        fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null,
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        avatar: profile.profilePicture || null,
        bio: profile.bio || null,
        email: userData.email || null,
        role: profile.role || null,
        isSeller: sellerData.isSeller,
        sellerProfile: sellerData.sellerProfile,
        ...userData, // Include any other fields from user data
        ...profile // Include any other fields from profile
      });
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('UserContext: Failed to fetch user data:', error);
      clearUserData();
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array - function never changes

  /**
   * Update user data (used for optimistic updates)
   * Merges new data with existing data without fetching
   * 
   * @param {Object} newData - New user data to merge
   */
  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  /**
   * Refresh user data (re-fetch from backend)
   * Used after:
   * - Login/OAuth callback
   * - Profile updates (to get fresh data from server)
   * - Any operation that changes user data
   */
  const refreshUserData = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  // DON'T auto-fetch on mount to prevent race conditions with ProtectedRoutes
  // Components should explicitly call refreshUserData() when needed
  // This will be called by:
  // - ProtectedRoutes after auth check
  // - Login after successful authentication
  // - authCallback after OAuth completion
  useEffect(() => {
    // Intentionally empty - no auto-fetch
  }, []);

  // ⚡ REAL-TIME UPDATES: Listen for role changes via Socket.IO
  useEffect(() => {
    // Only listen if user is authenticated and has data
    if (!isAuthenticated || !userData) return;

    // Join user-specific room for targeted events
    socket.emit('join', userData.id);

    // Listen for role change events from backend
    const handleRoleChanged = (payload) => {
      // Verify this event is for the current user
      if (payload.userId !== userData.id && payload.userId !== userData.userId) {
        return;
      }
      
      const oldRole = userData.role;
      // Extract role from payload - handle both direct value and object format
      let newRole = payload.newRole || payload.role;
      
      // If newRole is an object (like {new: 'admin'}), extract the value
      if (typeof newRole === 'object' && newRole !== null) {
        newRole = newRole.new || newRole;
      }
      
      // Update role immediately
      setUserData(prev => ({ ...prev, role: newRole }));
      
      // 🎨 Show toast notification if available
      if (window.addToast) {
        let message = '';
        let title = 'Permissions Changed';
        
        if (newRole === 'artist' && oldRole !== 'artist') {
          message = '🎨 Congratulations! You now have artist permissions.';
        } else if (newRole === 'admin' && oldRole !== 'admin') {
          message = '👑 You have been granted administrator privileges.';
        } else if (oldRole === 'artist' && newRole !== 'artist') {
          message = '⚠️ Your artist permissions have been removed.';
        } else if (oldRole === 'admin' && newRole !== 'admin') {
          message = '⚠️ Your administrator privileges have been revoked.';
        } else {
          message = `Your role has been changed to ${newRole}.`;
        }
        
        window.addToast({
          type: 'user_update',
          title: title,
          message: message,
          duration: 8000
        });
      }
    };

    // Listen for profile update events
    const handleProfileUpdated = (payload) => {
      if (payload.userId !== userData.id && payload.userId !== userData.userId) {
        return;
      }
      
      if (payload.updates) {
        // Extract the actual values from the updates object
        // Backend sends {field: {old: value, new: value}} format
        const cleanedUpdates = {};
        for (const key in payload.updates) {
          const update = payload.updates[key];
          // If the update is an object with 'new' property, extract it
          if (typeof update === 'object' && update !== null && 'new' in update) {
            cleanedUpdates[key] = update.new;
          } else {
            cleanedUpdates[key] = update;
          }
        }
        
        updateUserData(cleanedUpdates);
      }
    };

    // Listen for email change events
    const handleEmailChanged = (payload) => {
      if (payload.userId !== userData.id && payload.userId !== userData.userId) {
        return;
      }
      
      updateUserData({ email: payload.newEmail });
      
      if (window.addToast) {
        window.addToast({
          type: 'user_update',
          title: 'Email Updated',
          message: 'Your email address has been changed.',
          duration: 5000
        });
      }
    };

    // Register all event listeners
    socket.on('user:role_changed', handleRoleChanged);
    socket.on('user:profile_updated', handleProfileUpdated);
    socket.on('user:email_changed', handleEmailChanged);

    // Cleanup on unmount or when dependencies change
    return () => {
      socket.off('user:role_changed', handleRoleChanged);
      socket.off('user:profile_updated', handleProfileUpdated);
      socket.off('user:email_changed', handleEmailChanged);
    };
  }, [isAuthenticated, userData?.id, userData?.userId, userData?.role, refreshUserData, updateUserData]);

  // Provide context value to all children
  return (
    <UserContext.Provider value={{
      userData,
      isLoading,
      isAuthenticated,
      updateUserData,
      refreshUserData,
      clearUserData,
      fetchUserData
    }}>
      {children}
    </UserContext.Provider>
  );
};
