import { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import SellerApplicationModal from '../../components/SellerApplicationModal';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import './Settings.css';

const API = import.meta.env.VITE_API_BASE;

const FALLBACK_AVATAR =
  import.meta.env.FALLBACKPHOTO_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";

const FALLBACK_COVER =
  import.meta.env.FALLBACKCOVER_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/coverphoto.png";

export default function Settings() {
  const { userData, refreshUserData } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  // Security forms state
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdMsgType, setPwdMsgType] = useState("");


  // Edit profile modal state
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [profileEditData, setProfileEditData] = useState({
    avatar: userData?.profilePicture || FALLBACK_AVATAR,
    cover: userData?.coverPicture || FALLBACK_COVER,
    bio: userData?.bio || "",
    about: userData?.about || "",
    birthdate: userData?.birthdate || "",
    address: userData?.address || "",
    sex: userData?.sex || "",
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    middleName: userData?.middleName || "",
    username: userData?.username || "",
    profileId: userData?.profileId || ""
  });

  // Sync profile data when userData changes
  useEffect(() => {
    setProfileEditData({
      avatar: userData?.profilePicture || FALLBACK_AVATAR,
      cover: userData?.coverPicture || FALLBACK_COVER,
      bio: userData?.bio || "",
      about: userData?.about || "",
      birthdate: userData?.birthdate || "",
      address: userData?.address || "",
      sex: userData?.sex || "",
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      middleName: userData?.middleName || "",
      username: userData?.username || "",
      profileId: userData?.profileId || ""
    });
  }, [userData]);

  // Fetch user activities
  useEffect(() => {
    if (activeTab === 'activities') {
      fetchActivities();
    }
  }, [activeTab]);

  const fetchActivities = async () => {
    try {
      setLoadingActivities(true);
      const response = await fetch(`${API}/user/activities`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Handlers: Change Password
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdMsg("");

    if (!pwdCurrent) {
      setPwdMsgType("error");
      setPwdMsg("Current password is required");
      return;
    }
    if (!pwdNew || !pwdConfirm) {
      setPwdMsgType("error");
      setPwdMsg("Please fill in all password fields");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdMsgType("error");
      setPwdMsg("Password must be at least 8 characters long");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMsgType("error");
      setPwdMsg("Passwords do not match");
      return;
    }

    try {
      setPwdLoading(true);
      const API = import.meta.env.VITE_API_BASE;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token || null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew, confirmPassword: pwdConfirm, access_token: token })
      });
      const data = await res.json();

      if (!res.ok) {
        setPwdMsgType("error");
        setPwdMsg(data.message || 'Failed to change password');
      } else {
        setPwdMsgType("success");
        setPwdMsg('Password updated successfully');
        setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
        setShowPwdForm(false);
      }
    } catch (err) {
      setPwdMsgType("error");
      setPwdMsg('An error occurred. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };


  const getActivityIcon = (type) => {
    switch (type) {
      case 'artwork_upload':
        return '🎨';
      case 'comment':
        return '💬';
      case 'like':
        return '❤️';
      case 'follow':
        return '👥';
      case 'purchase':
        return '🛒';
      case 'sale':
        return '💰';
      case 'profile_update':
        return '👤';
      case 'event_registration':
        return '📅';
      default:
        return '📋';
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'artwork_upload':
        return `Uploaded artwork "${activity.title || 'Untitled'}"`;
      case 'comment':
        return `Commented on "${activity.targetTitle || 'a post'}"`;
      case 'like':
        return `Liked "${activity.targetTitle || 'a post'}"`;
      case 'follow':
        return `Started following ${activity.targetUser || 'someone'}`;
      case 'purchase':
        return `Purchased "${activity.itemTitle || 'an item'}"`;
      case 'sale':
        return `Sold "${activity.itemTitle || 'an item'}"`;
      case 'profile_update':
        return 'Updated profile information';
      case 'event_registration':
        return `Registered for "${activity.eventTitle || 'an event'}"`;
      default:
        return activity.description || 'Activity';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleCloseEditProfile = async () => {
    setOpenEditProfile(false);
    await refreshUserData();
  };

  const pickImage = (cb) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      cb({ file: f, url });
    };
    input.click();
  };

  const updateProfile = async () => {
    try {
      const errs = {};
      const t = (v) => (typeof v === 'string' ? v.trim() : v);
      if (!t(profileEditData.firstName)) errs.firstName = "First name is required";
      if (!t(profileEditData.lastName)) errs.lastName = "Last name is required";
      if (!t(profileEditData.username)) errs.username = "Username is required";
      if (!t(profileEditData.bio)) errs.bio = "Bio is required";
      if (!t(profileEditData.about)) errs.about = "About is required";
      if (!t(profileEditData.birthdate)) errs.birthdate = "Birthdate is required";
      if (!t(profileEditData.address)) errs.address = "Address is required";
      if (!t(profileEditData.sex)) errs.sex = "Sex is required";

      if (Object.keys(errs).length) {
        alert("Please fill out all required fields.");
        return;
      }

      const fd = new FormData();
      fd.append("firstName", profileEditData.firstName || "");
      fd.append("middleName", profileEditData.middleName || "");
      fd.append("lastName", profileEditData.lastName || "");
      fd.append("bio", profileEditData.bio || "");
      fd.append("about", profileEditData.about || "");
      fd.append("birthdate", profileEditData.birthdate || "");
      fd.append("address", profileEditData.address || "");
      fd.append("sex", profileEditData.sex || "");
      fd.append("username", profileEditData.username || "");

      if (profileEditData.avatar && profileEditData.avatar.file) fd.append("avatar", profileEditData.avatar.file);
      if (profileEditData.cover && profileEditData.cover.file) fd.append("cover", profileEditData.cover.file);

      const res = await fetch(`${API}/profile/updateProfile`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        try {
          const payload = await res.json();
          if (res.status === 409) {
            alert("Username is already taken");
            return;
          }
          throw new Error(payload?.error || payload?.message || "Failed to update profile");
        } catch (_) {
          const t = await res.text();
          throw new Error(t || "Failed to update profile");
        }
      }
      
      handleCloseEditProfile();
    } catch (err) {
      console.error("Update failed:", err);
      alert(err.message || "Failed to update profile");
    }
  };

  return (
    <div className="museo-settings-container">
      {/* Header */}
      <div className="settings-header">
        <h1 className="museo-heading">Settings</h1>
        <p className="settings-subtitle">Manage your account preferences and privacy</p>
      </div>

      {/* Tab Navigation */}
      <div className="museo-tabs settings-tabs">
          <button 
            className={`museo-tab ${activeTab === 'account' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            Account Settings
          </button>
          
          <button 
            className={`museo-tab ${activeTab === 'profile' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </button>
          
          <button 
            className={`museo-tab ${activeTab === 'marketplace' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Marketplace
          </button>
      </div>

      {/* Tab Content */}
      <div className="museo-tab-content settings-content">
          {/* Account Settings Tab */}
          <div className={`museo-tab-panel ${activeTab === 'account' ? 'museo-tab-panel--active' : ''}`}>
            <h2 className="settings-section-title">Account Settings</h2>
            
            {/* Change Password */}
            <div className="settings-group">
              <h3 className="settings-group-title">Security</h3>
              <div className="settings-item">
                <div className="settings-item-info">
                  <label className="museo-label">Password</label>
                  <p className="settings-description">Change your account password</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPwdForm(v => !v)}>
                  {showPwdForm ? 'Cancel' : 'Change Password'}
                </button>
              </div>
              {showPwdForm && (
                <form onSubmit={handleChangePasswordSubmit} className="museo-form" style={{ marginTop: '12px', display:'grid', gap:'12px' }}>
                  <div className="museo-form-field">
                    <label className="museo-label">Current Password</label>
                    <input
                      type="password"
                      className="museo-input"
                      value={pwdCurrent}
                      onChange={e => setPwdCurrent(e.target.value)}
                      placeholder="Enter current password"
                      required
                      disabled={pwdLoading}
                    />
                  </div>
                  <div className="museo-form-field">
                    <label className="museo-label">New Password</label>
                    <input
                      type="password"
                      className="museo-input"
                      value={pwdNew}
                      onChange={e => setPwdNew(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      disabled={pwdLoading}
                    />
                  </div>
                  <div className="museo-form-field">
                    <label className="museo-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="museo-input"
                      value={pwdConfirm}
                      onChange={e => setPwdConfirm(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      disabled={pwdLoading}
                    />
                  </div>
                  {pwdMsg && (
                    <div className={pwdMsgType === 'error' ? 'auth-message auth-message--error' : 'auth-message auth-message--success'}>
                      {pwdMsg}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={pwdLoading}>
                      {pwdLoading ? 'Saving...' : 'Save Password'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPwdForm(false)} disabled={pwdLoading}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Account Management */}
            <div className="settings-group">
              <h3 className="settings-group-title">Account Management</h3>
              <div className="settings-item">
                <div className="settings-item-info">
                  <label className="museo-label">Delete Account</label>
                  <p className="settings-description">Permanently delete your account and all data</p>
                </div>
                <button className="btn btn-danger btn-sm">Delete Account</button>
              </div>
            </div>
          </div>

{/* Profile Tab */}
          <div className={`museo-tab-panel ${activeTab === 'profile' ? 'museo-tab-panel--active' : ''}`}>
            <h2 className="settings-section-title">Profile Settings</h2>
            
            {/* Profile Preview */}
            <div className="settings-group">
              <h3 className="settings-group-title">Profile Information</h3>
              <div className="profile-preview-card">
                <img 
                  src={userData?.avatar || "https://via.placeholder.com/100"} 
                  alt="Profile" 
                  className="profile-preview-avatar"
                />
                <div className="profile-preview-info">
                  <h4>{userData?.fullName || userData?.username || 'User Name'}</h4>
                  <p>@{userData?.username || 'username'}</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setOpenEditProfile(true)}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Marketplace Tab */}
          <div className={`museo-tab-panel ${activeTab === 'marketplace' ? 'museo-tab-panel--active' : ''}`}>
            <h2 className="settings-section-title">Marketplace</h2>
            
            {userData?.isSeller ? (
              <>
                {/* Existing Seller Settings */}
                <div className="settings-group">
                  <h3 className="settings-group-title">Seller Dashboard</h3>
                  <div className="seller-status-card">
                    <div className="seller-status-badge active">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                      <span>Verified Seller</span>
                    </div>
                    <p className="seller-status-description">You are registered as a seller on Museo Marketplace</p>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/marketplace/seller-dashboard')}
                    >
                      Go to Seller Dashboard
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Non-Seller Registration */}
                <div className="settings-group">
                  <h3 className="settings-group-title">Become a Seller</h3>
                  <div className="seller-registration-card">
                    <div className="seller-benefits">
                      <h4>Start Selling Your Art on Museo</h4>
                      <p>Join thousands of artists selling their work on Museo Marketplace</p>
                      
                      <div className="benefits-list">
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowSellerModal(true)}
                    >
                      Apply to Become a Seller
                    </button>
                  </div>
                </div>
                
                {/* Requirements */}
                <div className="settings-group">
                  <h3 className="settings-group-title">Seller Requirements</h3>
                  <div className="requirements-list">
                    <div className="requirement-item">
                      <div className="requirement-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div className="requirement-info">
                        <h4>Complete Profile</h4>
                        <p>Fill out your profile with bio, avatar, and portfolio</p>
                      </div>
                    </div>
                    
                    <div className="requirement-item">
                      <div className="requirement-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="requirement-info">
                        <h4>Identity Verification</h4>
                        <p>Verify your identity for secure transactions</p>
                      </div>
                    </div>
                    
                    <div className="requirement-item">
                      <div className="requirement-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="10" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <div className="requirement-info">
                        <h4>Payment Setup</h4>
                        <p>Connect your bank account or payment method</p>
                      </div>
                    </div>
                    
                    <div className="requirement-item">
                      <div className="requirement-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </div>
                      <div className="requirement-info">
                        <h4>Quality Standards</h4>
                        <p>Maintain high-quality artwork and professional service</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Activities Tab */}
          <div className={`museo-tab-panel ${activeTab === 'activities' ? 'museo-tab-panel--active' : ''}`}>
            {loadingActivities ? (
              <div className="activities-loading">
                <div className="loading-spinner"></div>
                <p>Loading activities...</p>
              </div>
            ) : activities.length > 0 ? (
              <div className="activities-list">
                {activities.map((activity, index) => (
                  <div key={activity.id || index} className="activity-card">
                    <div className="activity-icon-wrapper">
                      <span className="activity-emoji">{getActivityIcon(activity.type)}</span>
                    </div>
                    <div className="activity-content">
                      <p className="activity-text">{getActivityText(activity)}</p>
                      <span className="activity-time">{formatDate(activity.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="activities-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h3>No Activities Yet</h3>
                <p>Your activities will appear here as you interact with Museo</p>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/gallery')}
                >
                  Explore Gallery
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Seller Application Modal */}
      <SellerApplicationModal
        isOpen={showSellerModal}
        onClose={() => setShowSellerModal(false)}
        onSubmitted={(data) => {
          console.log('Seller application submitted:', data);
          refreshUserData();
          setShowSellerModal(false);
        }}
      />

      {/* Edit Profile Modal */}
      <MuseoModal
        open={openEditProfile}
        onClose={handleCloseEditProfile}
        title="Edit Profile"
        subtitle="Update your profile information"
        size="lg"
      >
        <MuseoModalBody>
          {/* Cover Photo Section */}
          <div style={{
            position: 'relative',
            height: '160px',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #e8dcc6 0%, #f0e6d2 100%)',
            border: '1px solid rgba(212, 180, 138, 0.2)'
          }}>
            {profileEditData.cover ? (
              <img 
                src={profileEditData.cover.url || profileEditData.cover} 
                alt="Cover" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => { e.currentTarget.src = ""; }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b6f4d',
                fontSize: '16px',
                fontFamily: 'Georgia, Times New Roman, serif'
              }}>
                Background photo
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => pickImage((v) => setProfileEditData({...profileEditData, cover: v}))}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                zIndex: 10
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              Change Cover
            </button>
          </div>

          {/* Main Content - Two Column Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr',
            gap: '24px',
            alignItems: 'start',
            marginBottom: '16px'
          }}>
            {/* Avatar Section */}
            <div style={{
              position: 'relative',
              alignSelf: 'start',
              width: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <img
                src={profileEditData.avatar?.url || profileEditData.avatar || FALLBACK_AVATAR}
                alt="Avatar"
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '20px',
                  objectFit: 'cover',
                  border: '6px solid #faf8f5',
                  boxShadow: '0 8px 24px rgba(110, 74, 46, 0.15)'
                }}
                onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => pickImage((v) => setProfileEditData({...profileEditData, avatar: v}))}
                style={{
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Change Photo
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Name Fields Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                alignItems: 'start'
              }}>
                <label className="museo-form-label">
                  First name *
                  <input
                    type="text"
                    className="museo-input"
                    value={profileEditData.firstName}
                    onChange={(e) => setProfileEditData({...profileEditData, firstName: e.target.value})}
                    placeholder="First name"
                  />
                </label>
                <label className="museo-form-label">
                  Middle name
                  <input
                    type="text"
                    className="museo-input"
                    value={profileEditData.middleName}
                    onChange={(e) => setProfileEditData({...profileEditData, middleName: e.target.value})}
                    placeholder="Middle name"
                  />
                </label>
              </div>

              <label className="museo-form-label">
                Last name *
                <input
                  type="text"
                  className="museo-input"
                  value={profileEditData.lastName}
                  onChange={(e) => setProfileEditData({...profileEditData, lastName: e.target.value})}
                  placeholder="Last name"
                />
              </label>

              <label className="museo-form-label">
                Username *
                <input
                  type="text"
                  className="museo-input"
                  value={profileEditData.username}
                  onChange={(e) => setProfileEditData({...profileEditData, username: e.target.value})}
                  placeholder="Username"
                />
              </label>

              <label className="museo-form-label">
                Bio *
                <textarea
                  className="museo-input museo-textarea"
                  placeholder="Short intro about yourself…"
                  value={profileEditData.bio}
                  onChange={(e) => setProfileEditData({...profileEditData, bio: e.target.value})}
                  rows={3}
                />
              </label>

              <label className="museo-form-label">
                About *
                <textarea
                  className="museo-input museo-textarea"
                  placeholder="Write a more detailed description, story, or background…"
                  value={profileEditData.about}
                  onChange={(e) => setProfileEditData({...profileEditData, about: e.target.value})}
                  rows={5}
                />
              </label>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                alignItems: 'start'
              }}>
                <label className="museo-form-label">
                  Birthdate *
                  <input
                    type="date"
                    className="museo-input"
                    value={profileEditData.birthdate || ""}
                    onChange={(e) => setProfileEditData({...profileEditData, birthdate: e.target.value})}
                  />
                </label>

                <label className="museo-form-label">
                  Sex *
                  <select
                    className="museo-input"
                    value={profileEditData.sex}
                    onChange={(e) => setProfileEditData({...profileEditData, sex: e.target.value})}
                  >
                    <option value="">Select…</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Prefer not to say</option>
                  </select>
                </label>
              </div>

              <label className="museo-form-label">
                Address *
                <input
                  type="text"
                  className="museo-input"
                  placeholder="Street, city, province"
                  value={profileEditData.address}
                  onChange={(e) => setProfileEditData({...profileEditData, address: e.target.value})}
                />
              </label>
            </div>
          </div>
        </MuseoModalBody>

        <MuseoModalActions>
          <button 
            type="button"
            className="btn btn-secondary btn-sm" 
            onClick={handleCloseEditProfile}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={updateProfile}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
            Save Changes
          </button>
        </MuseoModalActions>
      </MuseoModal>
    </div>
  );
}
