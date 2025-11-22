import { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import SellerApplicationModal from '../../components/SellerApplicationModal';
import './Settings.css';

const API = import.meta.env.VITE_API_BASE;

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

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailMsgType, setEmailMsgType] = useState("");

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

  // Handlers: Change Email
  const handleChangeEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailMsg("");
    if (!newEmail) {
      setEmailMsgType("error");
      setEmailMsg('Please enter a new email');
      return;
    }
    try {
      setEmailLoading(true);
      const API = import.meta.env.VITE_API_BASE;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token || null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/auth/change-email`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ newEmail, currentPassword: emailCurrentPassword, access_token: token })
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailMsgType('error');
        setEmailMsg(data.message || 'Failed to start email change');
      } else {
        setEmailMsgType('success');
        setEmailMsg(data.message || 'Verification sent to the new email');
        setShowEmailForm(false);
      }
    } catch (err) {
      setEmailMsgType('error');
      setEmailMsg('An error occurred. Please try again.');
    } finally {
      setEmailLoading(false);
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
            className={`museo-tab ${activeTab === 'notifications' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Notifications
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
          
          <button 
            className={`museo-tab ${activeTab === 'activities' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Activities
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
              
              <div className="settings-item">
                <div className="settings-item-info">
                  <label className="museo-label">Email</label>
                  <p className="settings-description">{userData?.email || 'user@example.com'}</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowEmailForm(v => !v)}>
                  {showEmailForm ? 'Cancel' : 'Update Email'}
                </button>
              </div>
              {showEmailForm && (
                <form onSubmit={handleChangeEmailSubmit} className="museo-form" style={{ marginTop: '12px', display:'grid', gap:'12px' }}>
                  <div className="museo-form-field">
                    <label className="museo-label">New Email</label>
                    <input
                      type="email"
                      className="museo-input"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={emailLoading}
                    />
                  </div>
                  <div className="museo-form-field">
                    <label className="museo-label">Current Password (optional)</label>
                    <input
                      type="password"
                      className="museo-input"
                      value={emailCurrentPassword}
                      onChange={e => setEmailCurrentPassword(e.target.value)}
                      placeholder="For extra verification"
                      disabled={emailLoading}
                    />
                  </div>
                  {emailMsg && (
                    <div className={emailMsgType === 'error' ? 'auth-message auth-message--error' : 'auth-message auth-message--success'}>
                      {emailMsg}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={emailLoading}>
                      {emailLoading ? 'Sending...' : 'Send Verification'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEmailForm(false)} disabled={emailLoading}>
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

          {/* Notifications Tab */}
          <div className={`museo-tab-panel ${activeTab === 'notifications' ? 'museo-tab-panel--active' : ''}`}>
            <h2 className="settings-section-title">Notification Preferences</h2>
            
            <div className="settings-group">
              <h3 className="settings-group-title">Email Notifications</h3>
              
              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <label className="museo-label">Marketing Emails</label>
                  <p className="settings-description">Receive updates about new features and promotions</p>
                </div>
                <input type="checkbox" className="museo-checkbox" defaultChecked />
              </div>
              
              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <label className="museo-label">Order Updates</label>
                  <p className="settings-description">Get notified about your order status</p>
                </div>
                <input type="checkbox" className="museo-checkbox" defaultChecked />
              </div>
              
              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <label className="museo-label">New Followers</label>
                  <p className="settings-description">Notification when someone follows you</p>
                </div>
                <input type="checkbox" className="museo-checkbox" defaultChecked />
              </div>
              
              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <label className="museo-label">Comments & Likes</label>
                  <p className="settings-description">Notification for interactions on your posts</p>
                </div>
                <input type="checkbox" className="museo-checkbox" defaultChecked />
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
                    onClick={() => navigate('/MyProfile')}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="settings-group">
              <h3 className="settings-group-title">Privacy</h3>
              
              <div className="settings-item">
                <div className="settings-item-info">
                  <label className="museo-label">Profile Visibility</label>
                  <p className="settings-description">Control who can see your profile</p>
                </div>
                <select className="museo-select">
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
              
              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <label className="museo-label">Show Activity Status</label>
                  <p className="settings-description">Let others see when you're active</p>
                </div>
                <input type="checkbox" className="museo-checkbox" defaultChecked />
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
                
                {/* Seller Settings */}
                <div className="settings-group">
                  <h3 className="settings-group-title">Seller Preferences</h3>
                  
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <label className="museo-label">Commission Rate</label>
                      <p className="settings-description">Set your default commission rate</p>
                    </div>
                    <div className="settings-input-group">
                      <input type="number" className="museo-input" defaultValue="15" min="0" max="100" />
                      <span>%</span>
                    </div>
                  </div>
                  
                  <div className="settings-toggle-item">
                    <div className="settings-toggle-info">
                      <label className="museo-label">Accept Custom Orders</label>
                      <p className="settings-description">Allow buyers to request custom artwork</p>
                    </div>
                    <input type="checkbox" className="museo-checkbox" defaultChecked />
                  </div>
                  
                  <div className="settings-toggle-item">
                    <div className="settings-toggle-info">
                      <label className="museo-label">International Shipping</label>
                      <p className="settings-description">Ship artwork internationally</p>
                    </div>
                    <input type="checkbox" className="museo-checkbox" />
                  </div>
                  
                  <div className="settings-toggle-item">
                    <div className="settings-toggle-info">
                      <label className="museo-label">Vacation Mode</label>
                      <p className="settings-description">Temporarily pause your store while you're away</p>
                    </div>
                    <input type="checkbox" className="museo-checkbox" />
                  </div>
                </div>

                {/* Payment Settings - Coming Soon */}
                <div className="settings-group">
                  <h3 className="settings-group-title">Payment Methods</h3>
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <label className="museo-label">Payout Method</label>
                      <p className="settings-description">New artist-friendly payout system coming soon!</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" disabled>Coming Soon</button>
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
                        <div className="benefit-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 13l4 4L19 7"/>
                          </svg>
                          <span>Reach thousands of art collectors</span>
                        </div>
                        <div className="benefit-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 13l4 4L19 7"/>
                          </svg>
                          <span>Secure payment processing</span>
                        </div>
                        <div className="benefit-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 13l4 4L19 7"/>
                          </svg>
                          <span>Professional seller tools</span>
                        </div>
                        <div className="benefit-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 13l4 4L19 7"/>
                          </svg>
                          <span>Marketing support</span>
                        </div>
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
            <div className="activities-header">
              <h2 className="settings-section-title">Your Activities</h2>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={fetchActivities}
                disabled={loadingActivities}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Refresh
              </button>
            </div>

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
    </div>
  );
}
