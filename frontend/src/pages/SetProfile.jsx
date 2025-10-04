// src/components/SetProfileModal.jsx
import React, { useEffect, useRef, useState } from "react";
import "./css/MyProfile.css";

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

  // Prevent escape key from closing modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

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

      const res = await fetch("http://localhost:3000/api/profile/updateProfile", {
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

  if (!open) return null;

  return (
    <div className="pe__scrim">
      <section
        className="pe__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Set up your profile"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pe__header">
          <h3 className="pe__title">Complete Your Profile</h3>
          <p className="pe__subtitle">Please fill out all required fields to continue</p>
        </header>

        <div className="pe__coverBox">
          {cover ? (
            <img
              className="pe__coverImg"
              src={cover.url || cover}
              alt=""
              onError={(e) => { e.currentTarget.src = ""; }}
            />
          ) : (
            <div className="pe__coverEmpty">Background photo</div>
          )}
          <button
            type="button"
            className="pe__coverBtn"
            onClick={() => pickImage((v) => setCover(v))}
          >
            Change cover
          </button>
        </div>

        <div className="pe__body">
          <div className="pe__avatarWrap">
            {avatar ? (
              <img
                className="pe__avatar"
                src={avatar.url || avatar}
                alt=""
                onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="pe__avatarEmpty">Photo</div>
            )}
            <button
              type="button"
              className="pe__avatarBtn"
              onClick={() => pickImage((v) => setAvatar(v))}
            >
              Change photo
            </button>
          </div>

          <div className="pe__form">
            <div className="pe__row">
              <label className="pe__label">
                First name *
                <input
                  type="text"
                  className={`pe__input ${validationErrors.firstName ? 'pe__input--error' : ''}`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
                {validationErrors.firstName && <span className="pe__error">{validationErrors.firstName}</span>}
              </label>
              <label className="pe__label">
                Middle name
                <input
                  type="text"
                  className="pe__input"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle name"
                />
              </label>
            </div>

            <label className="pe__label">
              Last name *
              <input
                type="text"
                className={`pe__input ${validationErrors.lastName ? 'pe__input--error' : ''}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
              {validationErrors.lastName && <span className="pe__error">{validationErrors.lastName}</span>}
            </label>

            <label className="pe__label">
              Username *
              <input
                type="text"
                className={`pe__input ${validationErrors.username ? 'pe__input--error' : ''}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
              {validationErrors.username && <span className="pe__error">{validationErrors.username}</span>}
            </label>

            <label className="pe__label">
              Bio *
              <textarea
                className={`pe__input pe__input--area ${validationErrors.bio ? 'pe__input--error' : ''}`}
                placeholder="Short intro about yourself…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
              {validationErrors.bio && <span className="pe__error">{validationErrors.bio}</span>}
            </label>

            <label className="pe__label">
              About *
              <textarea
                className={`pe__input pe__input--area ${validationErrors.about ? 'pe__input--error' : ''}`}
                placeholder="Write a more detailed description, story, or background…"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={5}
              />
              {validationErrors.about && <span className="pe__error">{validationErrors.about}</span>}
            </label>

            <div className="pe__row">
              <label className="pe__label">
                Birthdate *
                <input
                  type="date"
                  className={`pe__input ${validationErrors.birthdate ? 'pe__input--error' : ''}`}
                  value={birthdate || ""}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
                {validationErrors.birthdate && <span className="pe__error">{validationErrors.birthdate}</span>}
              </label>

              <label className="pe__label">
                Sex *
                <select
                  className={`pe__input ${validationErrors.sex ? 'pe__input--error' : ''}`}
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <option value="">Select…</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Prefer not to say</option>
                </select>
                {validationErrors.sex && <span className="pe__error">{validationErrors.sex}</span>}
              </label>
            </div>

            <label className="pe__label">
              Address *
              <input
                type="text"
                className={`pe__input ${validationErrors.address ? 'pe__input--error' : ''}`}
                placeholder="Street, city, province"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              {validationErrors.address && <span className="pe__error">{validationErrors.address}</span>}
            </label>
          </div>
        </div>

        <footer className="pe__footer">
          <button
            className="pe__btn pe__btn--primary"
            onClick={async () => { await updateProfile(); }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Complete Profile"}
          </button>
        </footer>
      </section>
    </div>
  );
}
