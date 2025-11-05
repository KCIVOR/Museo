// src/components/SetProfileModal.jsx
import React, { useEffect, useRef, useState } from "react";
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import "./css/MyProfile.css";
const API = import.meta.env.VITE_API_BASE;

const FALLBACK_AVATAR =
  import.meta.env.FALLBACKPHOTO_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";

export default function SetProfileModal({ open, onClose, initial }) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState(initial?.username || "");
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
    setUsername(initial?.username || "");
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

  // Validation function
  const validateForm = () => {
    const errors = {};
    
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!bio.trim()) errors.bio = "Bio is required";
    if (!about.trim()) errors.about = "About is required";
    if (!birthdate) errors.birthdate = "Birthdate is required";
    if (!address.trim()) errors.address = "Address is required";
    if (!sex) errors.sex = "Sex is required";
    if (!username) errors.username = "Username is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateProfile = async () => {
    try {
      if (isSubmitting) return;
      
      // Validate form before submitting
      if (!validateForm()) {
        return;
      }
      
      setIsSubmitting(true);

      const fd = new FormData();
      fd.append("firstName", firstName || "");
      fd.append("middleName", middleName || "");
      fd.append("lastName", lastName || "");
      fd.append("bio", bio || "");
      fd.append("about", about || "");
      fd.append("birthdate", birthdate || "");
      fd.append("address", address || "");
      fd.append("sex", sex || "");
      fd.append("username", username || "")
      if (avatar && avatar.file) fd.append("avatar", avatar.file);
      if (cover && cover.file) fd.append("cover", cover.file);

      const res = await fetch(`${API}/profile/updateProfile`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        // Try to parse JSON error
        try {
          const payload = await res.json();
          if (res.status === 409) {
            // Username conflict
            setValidationErrors((prev) => ({ ...prev, username: "Username is already taken" }));
            return; // stop without closing modal
          }
          throw new Error(payload?.error || payload?.message || "Failed to update profile");
        } catch (_) {
          // Fallback to text
          const t = await res.text();
          throw new Error(t || "Failed to update profile");
        }
      }
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={open}
      onClose={() => {}} // Prevent closing
      title="Complete Your Profile"
      subtitle="Please fill out all required fields to continue"
      size="lg"
      closeOnEscape={false}
      closeOnOverlayClick={false}
      showCloseButton={false}
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
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
                {validationErrors.firstName && <span className="museo-error-text">{validationErrors.firstName}</span>}
              </label>
              <label className="museo-form-label">
                Middle name
                <input
                  type="text"
                  className="museo-input"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle name"
                />
              </label>
            </div>

          <div className="museo-form-field">
            <label className="museo-label">Last Name *</label>
            <input
              type="text"
              className={`museo-input ${validationErrors.lastName ? 'museo-input--error' : ''}`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
            {validationErrors.lastName && <span className="museo-error-text">{validationErrors.lastName}</span>}
          </div>

          <div className="museo-form-field">
            <label className="museo-label">Username *</label>
            <input
              type="text"
              className={`museo-input ${validationErrors.username ? 'museo-input--error' : ''}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            {validationErrors.username && <span className="museo-error-text">{validationErrors.username}</span>}
          </div>

          <div className="museo-form-field">
            <label className="museo-label">Bio *</label>
            <textarea
              className={`museo-input ${validationErrors.bio ? 'museo-input--error' : ''}`}
              placeholder="Short intro about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
            {validationErrors.bio && <span className="museo-error-text">{validationErrors.bio}</span>}
          </div>

          <div className="museo-form-field">
            <label className="museo-label">About *</label>
            <textarea
              className={`museo-input ${validationErrors.about ? 'museo-input--error' : ''}`}
              placeholder="Write a more detailed description, story, or background…"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={5}
            />
            {validationErrors.about && <span className="museo-error-text">{validationErrors.about}</span>}
          </div>

          <div className="museo-form-row">
            <div className="museo-form-field">
              <label className="museo-label">Birthdate *</label>
              <input
                type="date"
                className={`museo-input ${validationErrors.birthdate ? 'museo-input--error' : ''}`}
                value={birthdate || ""}
                onChange={(e) => setBirthdate(e.target.value)}
              />
              {validationErrors.birthdate && <span className="museo-error-text">{validationErrors.birthdate}</span>}
            </div>

            <div className="museo-form-field">
              <label className="museo-label">Sex *</label>
              <select
                className={`museo-input ${validationErrors.sex ? 'museo-input--error' : ''}`}
                value={sex}
                onChange={(e) => setSex(e.target.value)}
              >
                <option value="">Select…</option>
                <option>Female</option>
                <option>Male</option>
                <option>Prefer not to say</option>
              </select>
              {validationErrors.sex && <span className="museo-error-text">{validationErrors.sex}</span>}
            </div>
          </div>

            <div className="museo-form-field">
              <label className="museo-label">Address *</label>
              <input
                type="text"
                className={`museo-input ${validationErrors.address ? 'museo-input--error' : ''}`}
                placeholder="Street, city, province"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              {validationErrors.address && <span className="museo-error-text">{validationErrors.address}</span>}
            </div>
          </div>
        </div>

      </MuseoModalBody>

      <MuseoModalActions>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => { await updateProfile(); }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Complete Profile"}
        </button>
      </MuseoModalActions>
    </MuseoModal>
  );
}
