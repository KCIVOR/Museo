import "./css/MyProfile.css";
import MuseoLoadingBox from "../../components/MuseoLoadingBox.jsx";
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import React, { useEffect, useState, useMemo } from "react";
import { useUser } from "../../contexts/UserContext";
import ArtGallery from "../Gallery/artGallery";
import UploadArt from "./UploadArt";

const API = import.meta.env.VITE_API_BASE;

const FALLBACK_AVATAR =
  import.meta.env.FALLBACKPHOTO_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";

const FALLBACK_COVER =
  import.meta.env.FALLBACKCOVER_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/coverphoto.png";

function EditProfileModal({ open, onClose, initial }) {
  const [avatar, setAvatar] = useState(initial?.avatar || "");
  const [cover, setCover] = useState(initial?.cover || "");
  const [bio, setBio] = useState(initial?.bio || "");
  const [about, setAbout] = useState(initial?.about || ""); 
  const [birthdate, setBirthdate] = useState(initial?.birthdate || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [sex, setSex] = useState(initial?.sex || "");
  const [firstName, setFirstName] = useState(initial?.firstName || "");
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [middleName, setMiddleName] = useState(initial?.middleName || "");
  const [username, setUsername] = useState(initial?.username || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setAvatar(initial?.avatar || "");
    setCover(initial?.cover || "");
    setBio(initial?.bio || "");
    setAbout(initial?.about || "");          
    setBirthdate(initial?.birthdate || "");
    setAddress(initial?.address || "");
    setSex(initial?.sex || "");
    setFirstName(initial?.firstName || "");
    setLastName(initial?.lastName || "");
    setMiddleName(initial?.middleName || "");
    setUsername(initial?.username || "")
    setValidationErrors({});
  }, [open, initial]);

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
      if (isSubmitting) return;
      setIsSubmitting(true);
      // Validate required text fields
      const errs = {};
      const t = (v) => (typeof v === 'string' ? v.trim() : v);
      if (!t(firstName)) errs.firstName = "First name is required";
      // middleName is optional
      if (!t(lastName)) errs.lastName = "Last name is required";
      if (!t(username)) errs.username = "Username is required";
      if (!t(bio)) errs.bio = "Bio is required";
      if (!t(about)) errs.about = "About is required";
      if (!t(birthdate)) errs.birthdate = "Birthdate is required";
      if (!t(address)) errs.address = "Address is required";
      if (!t(sex)) errs.sex = "Sex is required";

      if (Object.keys(errs).length) {
        setValidationErrors(errs);
        throw new Error("Please fill out all required fields.");
      }

      const fd = new FormData();
      // text fields
      fd.append("firstName", firstName || "");
      fd.append("middleName", middleName || "");
      fd.append("lastName", lastName || "");
      fd.append("bio", bio || "");
      fd.append("about", about || "");
      fd.append("birthdate", birthdate || "");
      fd.append("address", address || "");
      fd.append("sex", sex || "");
      fd.append("username", username || "")

      // files only if newly chosen via pickImage (which stores {file, url})
      if (avatar && avatar.file) fd.append("avatar", avatar.file);
      if (cover && cover.file) fd.append("cover", cover.file);

      const res = await fetch(`${API}/profile/updateProfile`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        try {
          const payload = await res.json();
          if (res.status === 409) {
            setValidationErrors((prev) => ({ ...prev, username: "Username is already taken" }));
            return; // keep modal open
          }
          throw new Error(payload?.error || payload?.message || "Failed to update profile");
        } catch (_) {
          const t = await res.text();
          throw new Error(t || "Failed to update profile");
        }
      }
      
      // Dispatch custom event to notify other components about profile update
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { 
          avatar: avatar?.url || avatar,
          firstName,
          lastName,
          username,
          bio
        }
      }));
      
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={open}
      onClose={onClose}
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
          {cover ? (
            <img 
              src={cover.url || cover} 
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
            onClick={() => pickImage((v) => setCover(v))}
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
              src={avatar?.url || avatar || FALLBACK_AVATAR}
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
              onClick={() => pickImage((v) => setAvatar(v))}
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
                  className={`museo-input ${validationErrors.firstName ? 'museo-input--error' : ''}`}
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setValidationErrors((p)=>({...p, firstName: ''})); }}
                  placeholder="First name"
                />
                {validationErrors.firstName && <span className="museo-error-text">{validationErrors.firstName}</span>}
              </label>
              <label className="museo-form-label">
                Middle name
                <input
                  type="text"
                  className={`museo-input ${validationErrors.middleName ? 'museo-input--error' : ''}`}
                  value={middleName}
                  onChange={(e) => { setMiddleName(e.target.value); setValidationErrors((p)=>({...p, middleName: ''})); }}
                  placeholder="Middle name"
                />
                {validationErrors.middleName && <span className="museo-error-text">{validationErrors.middleName}</span>}
              </label>
            </div>

            <label className="museo-form-label">
              Last name *
              <input
                type="text"
                className={`museo-input ${validationErrors.lastName ? 'museo-input--error' : ''}`}
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setValidationErrors((p)=>({...p, lastName: ''})); }}
                placeholder="Last name"
              />
              {validationErrors.lastName && <span className="museo-error-text">{validationErrors.lastName}</span>}
            </label>

            <label className="museo-form-label">
              Username *
              <input
                type="text"
                className={`museo-input ${validationErrors.username ? 'museo-input--error' : ''}`}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setValidationErrors((p)=>({...p, username: ''})); }}
                placeholder="Username"
              />
              {validationErrors.username && <span className="museo-error-text">{validationErrors.username}</span>}
            </label>

            <label className="museo-form-label">
              Bio *
              <textarea
                className={`museo-input museo-textarea ${validationErrors.bio ? 'museo-input--error' : ''}`}
                placeholder="Short intro about yourself…"
                value={bio}
                onChange={(e) => { setBio(e.target.value); setValidationErrors((p)=>({...p, bio: ''})); }}
                rows={3}
              />
              {validationErrors.bio && <span className="museo-error-text">{validationErrors.bio}</span>}
            </label>

            <label className="museo-form-label">
              About *
              <textarea
                className={`museo-input museo-textarea ${validationErrors.about ? 'museo-input--error' : ''}`}
                placeholder="Write a more detailed description, story, or background…"
                value={about}
                onChange={(e) => { setAbout(e.target.value); setValidationErrors((p)=>({...p, about: ''})); }}
                rows={5}
              />
              {validationErrors.about && <span className="museo-error-text">{validationErrors.about}</span>}
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
                  className={`museo-input ${validationErrors.birthdate ? 'museo-input--error' : ''}`}
                  value={birthdate || ""}
                  onChange={(e) => { setBirthdate(e.target.value); setValidationErrors((p)=>({...p, birthdate: ''})); }}
                />
                {validationErrors.birthdate && <span className="museo-error-text">{validationErrors.birthdate}</span>}
              </label>

              <label className="museo-form-label">
                Sex *
                <select
                  className={`museo-input ${validationErrors.sex ? 'museo-input--error' : ''}`}
                  value={sex}
                  onChange={(e) => { setSex(e.target.value); setValidationErrors((p)=>({...p, sex: ''})); }}
                >
                  <option value="">Select…</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Prefer not to say</option>
                </select>
                {validationErrors.sex && <span className="museo-error-text">{validationErrors.sex}</span>}
              </label>
            </div>

            <label className="museo-form-label">
              Address *
              <input
                type="text"
                className={`museo-input ${validationErrors.address ? 'museo-input--error' : ''}`}
                placeholder="Street, city, province"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setValidationErrors((p)=>({...p, address: ''})); }}
              />
              {validationErrors.address && <span className="museo-error-text">{validationErrors.address}</span>}
            </label>
          </div>
        </div>

      </MuseoModalBody>

      <MuseoModalActions>
        <button 
          type="button"
          className="btn btn-secondary btn-sm" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={updateProfile}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="btn-spinner"></div>
              Saving...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              Save Changes
            </>
          )}
        </button>
      </MuseoModalActions>
    </MuseoModal>
  );
}


export default function MyProfile() {
  const { userData, refreshUserData } = useUser();
  // Get role from UserContext instead of separate state
  const role = userData?.role || null;
  
  const [profileId, setProfileId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState(FALLBACK_AVATAR);
  const [cover, setCover] = useState(FALLBACK_COVER);
  const [sex, setSex] = useState("");
  const [address, setAddress] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [bio, setBio] = useState("");
  const [about, setAbout] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [loadingArts, setLoadingArts] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [artsLoaded, setArtsLoaded] = useState(false);
  const [arts, setArts] = useState([]);
  const [openUploadArt, setOpenUploadArt] = useState(false);
  const [username, setUsername] = useState("");


  const [openEdit, setOpenEdit] = useState(false);

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  const age = useMemo(() => {
    if (!birthdate) return "";
    const b = new Date(birthdate);
    const now = new Date();
    let years = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
    return years;
  }, [birthdate]);

  const fetchProfile = async () => {
    if (isFetching) return;
    setIsFetching(true);
    try {
      const res = await fetch(`${API}/profile/getProfile`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const result = await res.json();
      const p = result?.profile ?? result ?? {};
      setProfileId(p.profileId || "");
      setFirstName(p.firstName ?? "");
      setMiddleName(p.middleName ?? "");
      setLastName(p.lastName ?? "");
      setBio(p.bio ?? "");
      setBirthdate(p.birthdate ?? "");
      setAddress(p.address ?? "");
      setSex(p.sex ?? "");
      setAvatar(p.profilePicture || FALLBACK_AVATAR);
      setCover(p.coverPicture || FALLBACK_COVER);
      setAbout(p.about ?? "");
      setUsername(p.username ?? "");
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
      setProfileLoaded(true);
    }
  };

  const fetchArts = async () => {
    try{
      setLoadingArts(true);
      // Get the current user's ID from userData
      const userId = userData?.userId || userData?.id;
      if (!userId) {
        console.warn("User ID not available for fetching arts");
        setArts([]);
        return;
      }
      
      const response = await fetch(`${API}/artist/getArts/${userId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Failed to fetch arts: ${response.statusText}`);
      const data = await response.json();
      
      setArts(data);

      console.log("Fetched arts:", data);
    }catch(err){
      console.error(err);
    } finally {
      setLoadingArts(false);
      setArtsLoaded(true);
    }
  }


 

  useEffect(() => {
    fetchProfile();
    fetchArts();
  }, []);

  const handleCloseEdit = async () => {
    setOpenEdit(false);
    console.log('MyProfile: Edit modal closed, refreshing UserContext...');
    // Refresh UserContext to get updated profile data
    await refreshUserData();
    console.log('MyProfile: UserContext refreshed');
    // Also refresh local profile data for display
    fetchProfile();
  };

  // Event handlers for ArtGallery
  const handleViewArt = (art, index) => {
    console.log('Viewing art:', art, 'at index:', index);
  };

  const handleLikeArt = (art, index) => {
    console.log('Liking art:', art, 'at index:', index);
    // Refresh arts data after like action
    fetchArts();
  };

  const handleArtClick = (art, index) => {
    console.log('Art clicked:', art, 'at index:', index);
  };

  const handleModalClose = () => {
    // Refresh arts data when modal closes to get updated stats
    fetchArts();
  };

  // Show full-page loader first, then render all content
  if (!(profileLoaded && artsLoaded)) {
    return (
      <div className="museo-page">
        <div className="museo-feed" style={{ gap: '24px', maxWidth: '960px' }}>
          <MuseoLoadingBox
            show={true}
            message={MuseoLoadingBox.messages.loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="museo-page">
      <div className="museo-feed mp__feed">
        {/* Profile Card */}
        <div className="museo-card mp__profile-card">
          {/* Cover Image */}
          <div className="mp__cover" style={{
            backgroundImage: cover ? `url(${cover})` : `linear-gradient(135deg, var(--museo-primary) 0%, var(--museo-primary-dark) 100%), url(${FALLBACK_COVER})`
          }}>
            {/* Overlay for better text readability */}
            <div className="mp__cover-overlay" />
            
            {/* Role Badge (SVG, no emoji) */}
            <div className="mp__role-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {role === 'artist' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3c-4.97 0-9 3.582-9 8 0 2.485 2.015 4.5 4.5 4.5h.75a1.75 1.75 0 1 0 3.5 0h1.5a3.75 3.75 0 1 0 0-7.5h-.75C10.093 8 9 6.907 9 5.5S10.093 3 11.5 3H12z"/>
                </svg>
              ) : role === 'admin' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3 6 6 .9-4.5 4.2L17.8 20 12 16.9 6.2 20l1.3-6.9L3 8.9 9 8z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              )}
              <span>{role === 'artist' ? 'Artist' : role === 'admin' ? 'Admin' : 'User'}</span>
            </div>

          </div>

          {/* Avatar */}
          <div className="mp__avatar-container">
            <img
              className="museo-avatar mp__avatar"
              src={avatar || FALLBACK_AVATAR}
              alt={`${fullName || "User"} avatar`}
            />
          </div>

          <div className="museo-body mp__body">
            <h3 className="museo-title mp__title">
              {fullName || "Unnamed user"}
            </h3>
            
            {username && (
              <div className="mp__username">
                @{username}
              </div>
            )}

            {bio && (
              <p className="museo-desc mp__bio">
                "{bio}"
              </p>
            )}

            {/* User Stats */}
            <div className="mp__stats">
              <div className="mp__stat-item">
                <div className="mp__stat-number">
                  {arts.length}
                </div>
                <div className="mp__stat-label">
                  {role === 'artist' ? 'Artworks' : 'Artworks'}
                </div>
              </div>
              <div className="mp__stat-item">
                <div className="mp__stat-number">
                  {age || '—'}
                </div>
                <div className="mp__stat-label">
                  Years Old
                </div>
              </div>
              <div className="mp__stat-item">
                <div className="mp__stat-number" aria-hidden="true">
                  {role === 'artist' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3c-4.97 0-9 3.582-9 8 0 2.485 2.015 4.5 4.5 4.5h.75a1.75 1.75 0 1 0 3.5 0h1.5a3.75 3.75 0 1 0 0-7.5h-.75C10.093 8 9 6.907 9 5.5S10.093 3 11.5 3H12z"/>
                    </svg>
                  ) : role === 'admin' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3 6 6 .9-4.5 4.2L17.8 20 12 16.9 6.2 20l1.3-6.9L3 8.9 9 8z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  )}
                </div>
                <div className="mp__stat-label">
                  {role === 'artist' ? 'Artist' : role === 'admin' ? 'Admin' : 'Member'}
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="mp__details-grid">
              {sex && (
                <div className="mp__detail-item">
                  <strong className="mp__detail-label">Gender:</strong> {sex}
                </div>
              )}
              {address && (
                <div className="mp__detail-item">
                  <strong className="mp__detail-label">Location:</strong> {address}
                </div>
              )}
              {birthdate && (
                <div className="mp__detail-item">
                  <strong className="mp__detail-label">Born:</strong> {age !== "" ? `${age} years old (${new Date(birthdate).toLocaleDateString()})` : new Date(birthdate).toLocaleDateString()}
                </div>
              )}
            </div>

            {about && (
              <div className="mp__about-section">
                <h4 className="mp__about-heading">
                  About
                </h4>
                <p className="mp__about-text">
                  {about}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Art galleries for artists and admins */}
        {(role === "artist" || role === "admin") && (
          <>
            {/* Main Artwork Gallery */}
            <div className="museo-card" style={{ marginBottom: '24px' }}>
              <div className="museo-body">
                <h1 className="museo-heading">My Artwork</h1>
                <ArtGallery
                  enablePagination={true}
                  fetchUrl="/api/profile/getArts"
                  title=""
                  showStats={true}
                  showActions={false}
                  showUpload={true}
                  onUploadRequest={() => setOpenUploadArt(true)}
                  onViewArt={handleViewArt}
                  onLikeArt={handleLikeArt}
                  onArtClick={handleArtClick}
                  onModalClose={handleModalClose}
                  fallbackImage={FALLBACK_COVER}
                  currentUser={{ name: fullName, avatar }}
                  emptyStateIcon={(
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 3c-4.97 0-9 3.582-9 8 0 2.485 2.015 4.5 4.5 4.5h.75a1.75 1.75 0 1 0 3.5 0h1.5a3.75 3.75 0 1 0 0-7.5h-.75C10.093 8 9 6.907 9 5.5S10.093 3 11.5 3H12z"/>
                    </svg>
                  )}
                />
              </div>
            </div>

            {/* Featured Works Gallery */}
            <div className="museo-card">
              <div className="museo-body">
                <h1 className="museo-heading">Featured Works</h1>
                <ArtGallery
                  enablePagination={true}
                  fetchUrl="/api/gallery/user-artworks"
                  userId={userData?.userId || userData?.id}
                  title=""
                  emptyStateTitle="No featured works"
                  emptyStateMessage="Promote your best artwork here!"
                  emptyStateIcon={(
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  )}
                  showActions={false}
                  showStats={false}
                />
              </div>
            </div>
          </>
        )}

        {/* Welcome message for regular users */}
        {role === "user" && (
          <div className="museo-card">
            <div className="museo-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ marginBottom: '16px', opacity: 0.7, display: 'flex', justifyContent: 'center' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3c-4.97 0-9 3.582-9 8 0 2.485 2.015 4.5 4.5 4.5h.75a1.75 1.75 0 1 0 3.5 0h1.5a3.75 3.75 0 1 0 0-7.5h-.75C10.093 8 9 6.907 9 5.5S10.093 3 11.5 3H12z"/>
                </svg>
              </div>
              <h3 className="museo-title" style={{ fontSize: '22px', color: 'var(--museo-primary)', marginBottom: '8px' }}>
                Welcome to the Gallery!
              </h3>
              <p className="museo-desc" style={{ fontSize: '16px', color: 'var(--museo-text-muted)' }}>
                Explore amazing artwork from talented artists. Upgrade to artist account to showcase your own creations!
              </p>
            </div>
          </div>
        )}
      </div>

      <EditProfileModal
        open={openEdit}
        onClose={handleCloseEdit}
        initial={{
          avatar,
          cover,
          bio,
          birthdate,
          address,
          about,
          sex,
          firstName,
          middleName,
          lastName,
          profileId,
          username,
        }}
      />

      <UploadArt
        open={openUploadArt}
        onClose={() => { setOpenUploadArt(false); fetchArts(); }}
        onUploaded={() => { fetchArts(); }}
      />
    </div>
  );
}
