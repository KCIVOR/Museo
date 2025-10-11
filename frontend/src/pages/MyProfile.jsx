// src/pages/MyProfile.jsx
import "./css/MyProfile.css";
import "../components/MuseoGalleryContainer.css";
import MuseoLoadingBox from "../components/MuseoLoadingBox.jsx";
import React, { useEffect, useState, useMemo } from "react";
import ArtGallery from "./subPages/artGallery";
import UploadArt from "./UploadArt";
import { 
  MuseoPage, 
  MuseoFeed, 
  MuseoHeading, 
  MuseoCard, 
  MuseoAvatar, 
  MuseoBody, 
  MuseoTitle, 
  MuseoDesc, 
  MuseoBtn 
} from "../components/MuseoGalleryContainer.jsx";
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

  if (!open) return null;

  const updateProfile = async () => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      // Validate required text fields
      const errs = {};
      const t = (v) => (typeof v === 'string' ? v.trim() : v);
      if (!t(firstName)) errs.firstName = "First name is required";
      if (!t(middleName)) errs.middleName = "Middle name is required";
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
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(110, 74, 46, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        backdropFilter: 'saturate(120%) blur(8px)'
      }}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        style={{
          background: 'linear-gradient(135deg, #faf8f5 0%, #fdfcfa 100%)',
          borderRadius: '16px',
          border: '2px solid #d4b48a',
          boxShadow: '0 20px 60px rgba(110, 74, 46, 0.25)',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(12px)',
          fontFamily: 'Georgia, Times New Roman, serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={{
          padding: '14px 16px 8px',
          borderBottom: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#6e4a2e',
            margin: 0,
            fontFamily: 'Georgia, Times New Roman, serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Edit Profile
          </h3>
          <button 
            onClick={onClose} 
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(253, 252, 250, 0.9)',
              border: '1px solid rgba(212, 180, 138, 0.3)',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#8b6f4d',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(110, 74, 46, 0.1)',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(212, 180, 138, 0.08)';
              e.target.style.color = '#b8722c';
              e.target.style.borderColor = 'rgba(212, 180, 138, 0.35)';
              e.target.style.transform = 'translateX(1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(110, 74, 46, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(253, 252, 250, 0.9)';
              e.target.style.color = '#8b6f4d';
              e.target.style.borderColor = 'rgba(212, 180, 138, 0.3)';
              e.target.style.transform = 'translateX(0)';
              e.target.style.boxShadow = '0 2px 8px rgba(110, 74, 46, 0.1)';
            }}
          >
            ✕
          </button>
        </header>

        {/* Modal Body - Scrollable */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '0 16px 16px' 
        }}>
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
              onClick={() => pickImage((v) => setCover(v))}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(253, 252, 250, 0.9)',
                border: '1px solid rgba(212, 180, 138, 0.3)',
                borderRadius: '10px',
                padding: '0 14px',
                height: '34px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#8b6f4d',
                cursor: 'pointer',
                fontFamily: 'Georgia, Times New Roman, serif',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(212, 180, 138, 0.08)';
                e.target.style.borderColor = 'rgba(212, 180, 138, 0.35)';
                e.target.style.transform = 'translateX(1px)';
                e.target.style.boxShadow = '0 1px 4px rgba(110, 74, 46, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(253, 252, 250, 0.9)';
                e.target.style.borderColor = 'rgba(212, 180, 138, 0.3)';
                e.target.style.transform = 'translateX(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Change cover
            </button>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="pe__body" style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr',
            gap: '20px',
            alignItems: 'start',
            marginBottom: '16px',
            padding: '0'
          }}>
            {/* Avatar Section */}
            <div className="pe__avatarWrap" style={{
              position: 'relative',
              alignSelf: 'start',
              width: '160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '8px',
              marginLeft: '0',
              paddingLeft: '0'
            }}>
              {avatar ? (
                <img 
                  src={avatar.url || avatar} 
                  alt="Avatar" 
                  className="pe__avatar"
                  style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    border: '6px solid #faf8f5',
                    boxShadow: '0 8px 24px rgba(110, 74, 46, 0.15)',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                />
              ) : (
                <div className="pe__avatarEmpty" style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '20px',
                  background: 'rgba(212, 180, 138, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#8b6f4d',
                  fontSize: '14px',
                  fontWeight: '700',
                  border: '6px solid #faf8f5',
                  boxShadow: '0 8px 24px rgba(110, 74, 46, 0.15)',
                  fontFamily: 'Georgia, Times New Roman, serif'
                }}>
                  Photo
                </div>
              )}
              <button
                type="button"
                onClick={() => pickImage((v) => setAvatar(v))}
                className="pe__avatarBtn"
                style={{
                  alignSelf: 'flex-start',
                  marginLeft: '0'
                }}
              >
                Change photo
              </button>
            </div>

            {/* Form Fields */}
            <div className="pe__form" style={{ display: 'grid', gap: '16px' }}>
              {/* Name Fields Row */}
              <div className="pe__row" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                alignItems: 'start'
              }}>
                <label className="pe__label">
                  First name *
                  <input
                    type="text"
                    className={`pe__input ${validationErrors.firstName ? 'pe__input--error' : ''}`}
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setValidationErrors((p)=>({...p, firstName: ''})); }}
                    placeholder="First name"
                  />
                  {validationErrors.firstName && <span className="pe__error">{validationErrors.firstName}</span>}
                </label>
                <label className="pe__label">
                  Middle name
                  <input
                    type="text"
                    className={`pe__input ${validationErrors.middleName ? 'pe__input--error' : ''}`}
                    value={middleName}
                    onChange={(e) => { setMiddleName(e.target.value); setValidationErrors((p)=>({...p, middleName: ''})); }}
                    placeholder="Middle name"
                  />
                  {validationErrors.middleName && <span className="pe__error">{validationErrors.middleName}</span>}
                </label>
              </div>

            <label className="pe__label">
              Last name
              <input
                type="text"
                className={`pe__input ${validationErrors.lastName ? 'pe__input--error' : ''}`}
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setValidationErrors((p)=>({...p, lastName: ''})); }}
                placeholder="Last name"
              />
              {validationErrors.lastName && <span className="pe__error">{validationErrors.lastName}</span>}
            </label>

            <label className="pe__label">
              Username
              <input
                type="text"
                className={`pe__input ${validationErrors.username ? 'pe__input--error' : ''}`}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setValidationErrors((p)=>({...p, username: ''})); }}
                placeholder="Username"
              />
              {validationErrors.username && <span className="pe__error">{validationErrors.username}</span>}
            </label>

            <label className="pe__label">
              Bio
              <textarea
                className={`pe__input pe__input--area ${validationErrors.bio ? 'pe__input--error' : ''}`}
                placeholder="Short intro about yourself…"
                value={bio}
                onChange={(e) => { setBio(e.target.value); setValidationErrors((p)=>({...p, bio: ''})); }}
                rows={3}
              />
              {validationErrors.bio && <span className="pe__error">{validationErrors.bio}</span>}
            </label>

            <label className="pe__label">
              About
              <textarea
                className={`pe__input pe__input--area ${validationErrors.about ? 'pe__input--error' : ''}`}
                placeholder="Write a more detailed description, story, or background…"
                value={about}
                onChange={(e) => { setAbout(e.target.value); setValidationErrors((p)=>({...p, about: ''})); }}
                rows={5}
              />
              {validationErrors.about && <span className="pe__error">{validationErrors.about}</span>}
            </label>

            <div className="pe__row">
              <label className="pe__label">
                Birthdate
                <input
                  type="date"
                  className={`pe__input ${validationErrors.birthdate ? 'pe__input--error' : ''}`}
                  value={birthdate || ""}
                  onChange={(e) => { setBirthdate(e.target.value); setValidationErrors((p)=>({...p, birthdate: ''})); }}
                />
                {validationErrors.birthdate && <span className="pe__error">{validationErrors.birthdate}</span>}
              </label>

              <label className="pe__label">
                Sex
                <select
                  className={`pe__input ${validationErrors.sex ? 'pe__input--error' : ''}`}
                  value={sex}
                  onChange={(e) => { setSex(e.target.value); setValidationErrors((p)=>({...p, sex: ''})); }}
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
              Address
              <input
                type="text"
                className={`pe__input ${validationErrors.address ? 'pe__input--error' : ''}`}
                placeholder="Street, city, province"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setValidationErrors((p)=>({...p, address: ''})); }}
              />
              {validationErrors.address && <span className="pe__error">{validationErrors.address}</span>}
            </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '8px 16px 14px',
          borderTop: '1px solid #eef0f2',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button 
            onClick={onClose}
            className="pe__btn pe__btn--ghost"
          >
            Cancel
          </button>
          <button
            onClick={updateProfile}
            disabled={isSubmitting}
            className={`pe__btn pe__btn--primary ${isSubmitting ? 'pe__btn--primary:disabled' : ''}`}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>
    </div>
  );
}


export default function MyProfile() {
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
  const [role, setRole] = useState("");
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
      const response = await fetch(`${API}/profile/getArts`, {
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


  const fetchRole = async () => {
    try {
      const response = await fetch(`${API}/users/role`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
      const data = await response.json();
      setRole(data);
      console.log("Fetched user:", data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  }; 

  useEffect(() => {
    fetchProfile();
    fetchRole();
    fetchArts();
  }, []);

  const handleCloseEdit = () => {
    setOpenEdit(false);
    fetchProfile();
  };

  // Event handlers for ArtGallery
  const handleViewArt = (art, index) => {
    console.log('Viewing art:', art, 'at index:', index);
    // Add your view logic here
  };

  const handleLikeArt = (art, index) => {
    console.log('Liking art:', art, 'at index:', index);
    // Add your like logic here
  };

  const handleArtClick = (art, index) => {
    console.log('Art clicked:', art, 'at index:', index);
    // Add your click logic here
  };

  // Show full-page loader first, then render all content
  if (!(profileLoaded && artsLoaded)) {
    return (
      <MuseoPage>
        <MuseoFeed style={{ gap: '24px' }}>
          <MuseoLoadingBox
            show={true}
            message={MuseoLoadingBox.messages.loading}
          />
        </MuseoFeed>
      </MuseoPage>
    );
  }

  return (
    <MuseoPage>
      <MuseoFeed style={{ gap: '24px' }}>
        {/* Profile Card */}
        <MuseoCard variant="profile" style={{ position: 'relative', overflow: 'hidden', marginBottom: '24px' }}>
          {/* Cover Image */}
          <div style={{
            position: 'relative',
            height: '200px',
            background: `linear-gradient(135deg, var(--museo-primary) 0%, var(--museo-primary-dark) 100%)`,
            backgroundImage: `url(${cover || FALLBACK_COVER})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '16px 16px 0 0'
          }}>
            {/* Overlay for better text readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
              borderRadius: '16px 16px 0 0'
            }} />
            
            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setOpenEdit(true)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--museo-white)',
                border: '2px solid var(--museo-accent)',
                borderRadius: '8px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                color: 'var(--museo-primary)',
                zIndex: 10,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--museo-accent)';
                e.target.style.color = 'var(--museo-white)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--museo-white)';
                e.target.style.color = 'var(--museo-primary)';
                e.target.style.transform = 'scale(1)';
              }}
              title="Edit profile"
            >
              ✏️
            </button>
          </div>

          {/* Avatar */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            marginTop: '-60px',
            marginBottom: '20px',
            zIndex: 2
          }}>
            <MuseoAvatar
              src={avatar || FALLBACK_AVATAR}
              alt={`${fullName || "User"} avatar`}
              size="xl"
              style={{
                border: '4px solid var(--museo-white)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
            />
          </div>

          <MuseoBody style={{ textAlign: 'center', padding: '0 24px 24px' }}>
            <MuseoTitle style={{ 
              fontSize: '28px', 
              marginBottom: '12px',
              color: 'var(--museo-primary)'
            }}>
              {fullName || "Unnamed user"}
            </MuseoTitle>
            
            {username && (
              <div style={{
                fontSize: '16px',
                color: 'var(--museo-text-muted)',
                marginBottom: '16px',
                fontWeight: '500'
              }}>
                @{username}
              </div>
            )}

            {bio && (
              <MuseoDesc style={{
                fontSize: '16px',
                fontStyle: 'italic',
                color: 'var(--museo-text-secondary)',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                "{bio}"
              </MuseoDesc>
            )}

            {/* Profile Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              {sex && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--museo-cream)',
                  border: '1px solid var(--museo-gray-200)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: 'var(--museo-text-secondary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <strong style={{ color: 'var(--museo-primary)' }}>Gender:</strong> {sex}
                </div>
              )}
              {address && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--museo-cream)',
                  border: '1px solid var(--museo-gray-200)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: 'var(--museo-text-secondary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <strong style={{ color: 'var(--museo-primary)' }}>Location:</strong> {address}
                </div>
              )}
              {birthdate && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--museo-cream)',
                  border: '1px solid var(--museo-gray-200)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: 'var(--museo-text-secondary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <strong style={{ color: 'var(--museo-primary)' }}>Born:</strong> {age !== "" ? `${age} years old (${new Date(birthdate).toLocaleDateString()})` : new Date(birthdate).toLocaleDateString()}
                </div>
              )}
            </div>

            {about && (
              <div style={{
                textAlign: 'left',
                padding: '16px',
                background: 'var(--museo-cream)',
                borderRadius: '12px',
                border: '1px solid var(--museo-gray-200)'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--museo-primary)',
                  marginBottom: '8px'
                }}>
                  About
                </h4>
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--museo-text-secondary)',
                  margin: 0
                }}>
                  {about}
                </p>
              </div>
            )}
          </MuseoBody>
        </MuseoCard>

        {/* Art galleries for artists and admins */}
        {(role === "artist" || role === "admin") && (
          <>
            {/* Main Artwork Gallery */}
            <MuseoCard style={{ marginBottom: '24px' }}>
              <MuseoBody>
                <MuseoHeading style={{ marginBottom: '20px' }}>My Artwork</MuseoHeading>
                <ArtGallery
                  arts={arts}
                  title=""
                  showStats={true}
                  showActions={true}
                  showUpload={true}
                  onUploadRequest={() => setOpenUploadArt(true)}
                  onViewArt={handleViewArt}
                  onLikeArt={handleLikeArt}
                  onArtClick={handleArtClick}
                  fallbackImage={FALLBACK_COVER}
                />
              </MuseoBody>
            </MuseoCard>

            {/* Featured Works Gallery */}
            <MuseoCard>
              <MuseoBody>
                <MuseoHeading style={{ marginBottom: '20px' }}>Featured Works</MuseoHeading>
                <ArtGallery
                  arts={[]}
                  title=""
                  emptyStateTitle="No featured works"
                  emptyStateMessage="Promote your best artwork here!"
                  emptyStateIcon="⭐"
                  showActions={false}
                />
              </MuseoBody>
            </MuseoCard>
          </>
        )}

        {/* Welcome message for regular users */}
        {role === "user" && (
          <MuseoCard>
            <MuseoBody style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '16px', 
                opacity: '0.7' 
              }}>
                🎨
              </div>
              <MuseoTitle style={{ 
                fontSize: '22px', 
                color: 'var(--museo-primary)', 
                marginBottom: '8px' 
              }}>
                Welcome to the Gallery!
              </MuseoTitle>
              <MuseoDesc style={{ 
                fontSize: '16px',
                color: 'var(--museo-text-muted)'
              }}>
                Explore amazing artwork from talented artists. Upgrade to artist account to showcase your own creations!
              </MuseoDesc>
            </MuseoBody>
          </MuseoCard>
        )}
      </MuseoFeed>

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
    </MuseoPage>
  );
}
