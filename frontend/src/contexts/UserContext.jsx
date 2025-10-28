// src/contexts/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    avatar: null,
    username: null,
    fullName: null,
    bio: null,
    // ... other user fields
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      // Fetch profile picture
      const pictureRes = await fetch(`${window.location.origin.replace(':5173', ':3000')}/api/users/picture`, {
        credentials: 'include'
      });
      
      let avatar = null;
      if (pictureRes.ok) {
        const pictureData = await pictureRes.json();
        avatar = pictureData?.avatar || null;
      }

      // Fetch profile data
      const profileRes = await fetch(`${window.location.origin.replace(':5173', ':3000')}/api/users/profile`, {
        credentials: 'include'
      });
      
      let profileData = {};
      if (profileRes.ok) {
        profileData = await profileRes.json();
      }

      setUserData({
        avatar,
        username: profileData.username,
        fullName: profileData.fullName || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
        bio: profileData.bio,
        ...profileData
      });
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  const refreshUserData = () => {
    fetchUserData();
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <UserContext.Provider value={{
      userData,
      setUserData,
      updateUserData,
      refreshUserData,
      isLoading,
      fetchUserData
    }}>
      {children}
    </UserContext.Provider>
  );
};
