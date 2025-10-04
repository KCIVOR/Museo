// src/pages/MyProfile.jsx
import "./css/MyProfile.css";
import React, { useEffect, useState, useMemo } from "react";
import ArtGallery from "./subPages/artGallery";
import UploadArt from "./UploadArt";

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

      const res = await fetch("http://localhost:3000/api/profile/updateProfile", {
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
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pe__scrim" onClick={onClose}>
      <section
        className="pe__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pe__header">
          <h3 className="pe__title">Edit profile</h3>
          <button className="pe__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="pe__coverBox">
          {cover ? (
            <img className="pe__coverImg" src={cover.url || cover} alt="" />
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
              <img className="pe__avatar" src={avatar.url || avatar} alt="" />
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
                First name
                <input
                  type="text"
                  className="pe__input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
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
              Last name
              <input
                type="text"
                className="pe__input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </label>

            <label className="pe__label">
              Username
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
              Bio
              <textarea
                className="pe__input pe__input--area"
                placeholder="Short intro about yourself…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </label>

            <label className="pe__label">
              About
              <textarea
                className="pe__input pe__input--area"
                placeholder="Write a more detailed description, story, or background…"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={5}
              />
            </label>

            <div className="pe__row">
              <label className="pe__label">
                Birthdate
                <input
                  type="date"
                  className="pe__input"
                  value={birthdate || ""}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </label>

              <label className="pe__label">
                Sex
                <select
                  className="pe__input"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <option value="">Select…</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Prefer not to say</option>
                </select>
              </label>
            </div>

            <label className="pe__label">
              Address
              <input
                type="text"
                className="pe__input"
                placeholder="Street, city, province"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          </div>
        </div>

        <footer className="pe__footer">
          <button className="pe__btn pe__btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="pe__btn pe__btn--primary"
            onClick={updateProfile}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </footer>
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
      const res = await fetch("http://localhost:3000/api/profile/getProfile", {
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
    }
  };

  const fetchArts = async () => {
    try{
      const response = await fetch("http://localhost:3000/api/profile/getArts", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Failed to fetch arts: ${response.statusText}`);
      const data = await response.json();
      
      setArts(data);

      console.log("Fetched arts:", data);
    }catch(err){
      console.error(err);
    }
  }


  const fetchRole = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/users/role", {
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

  return (
    <div className="profilePage">
      <div className="profileFeed">
        {/* Profile Card */}
        <section className="pCard">
          <div className="pCover">
            <img className="pCoverImg" src={cover || FALLBACK_COVER} alt="Cover" loading="lazy" />
            <div className="pAvatarRing">
              <div className="pAvatarWrap">
                <img
                  className="pAvatar"
                  src={avatar || FALLBACK_AVATAR}
                  alt={`${fullName || "User"} avatar`}
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="pKebab compact"
            aria-label="Edit profile"
            onClick={() => setOpenEdit(true)}
            title="Edit profile"
          >
            ⋯
          </button>

          <header className="pHeader">
            <h1 className="pName" title={fullName || "Unnamed user"}>
              {fullName || "Unnamed user"}
            </h1>
            <div className="pMeta">
              <div>Sex: {sex || "—"}</div>
              <div>Address: {address || "—"}</div>
              {birthdate && (
                <div>
                  Birthdate: {new Date(birthdate).toLocaleDateString()} {age !== "" ? `(Age ${age})` : ""}
                </div>
              )}
              <div className="pQuickBio">{bio || "—"}</div>
            </div>
          </header>

          {about && <div className="pBio">{about}</div>}
        </section>

        {/* FIXED: Art galleries only show for artists and admins */}
        {(role === "artist" || role === "admin") && (
          <>
            {/* Main Artwork Gallery */}
            <section className="pCard">
            <ArtGallery
              arts={arts}
              title="My Artwork"
              showStats={true}
              showActions={true}
              showUpload={true} // This shows the upload buttons
              onUploadRequest={() => setOpenUploadArt(true)}
              onViewArt={handleViewArt}
              onLikeArt={handleLikeArt}
              onArtClick={handleArtClick}
              fallbackImage={FALLBACK_COVER}
            />
            </section>

            {/* Featured Works Gallery */}
            <section className="pCard">
              <ArtGallery
                arts={[]} // Empty for demonstration
                title="Featured Works"
                emptyStateTitle="No featured works"
                emptyStateMessage="Promote your best artwork here!"
                emptyStateIcon="⭐"
                showActions={false}
              />
            </section>
          </>
        )}

        {/* Optional: Show different content for regular users */}
        {role === "user" && (
          <section className="pCard">
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.03), rgba(147, 51, 234, 0.03))',
              borderRadius: '20px',
              border: '2px dashed rgba(79, 70, 229, 0.2)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: '0.7' }}>🎨</div>
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                color: '#374151', 
                margin: '0 0 8px 0' 
              }}>
                Welcome to the Gallery!
              </h3>
              <p style={{ 
                fontSize: '16px', 
                margin: '0', 
                opacity: '0.8',
                color: '#6b7280'
              }}>
                Explore amazing artwork from talented artists. Upgrade to artist account to showcase your own creations!
              </p>
            </div>
          </section>
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
