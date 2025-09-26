// src/pages/MyProfile.jsx
import "./css/MyProfile.css";
import React, { useEffect, useState, useMemo } from "react";

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
  const [birthdate, setBirthdate] = useState(initial?.birthdate || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [about, setAbout] = useState(initial?.about || "");
  const [sex, setSex] = useState(initial?.sex || "");
  const [firstName, setFirstName] = useState(initial?.firstName || "");
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [middleName, setMiddleName] = useState(initial?.middleName || "");

  useEffect(() => {
    if (!open) return;
    setAvatar(initial?.avatar || "");
    setCover(initial?.cover || "");
    setBio(initial?.bio || "");
    setBirthdate(initial?.birthdate || "");
    setAddress(initial?.address || "");
    setAbout(initial?.about || "");
    setSex(initial?.sex || "");
    setFirstName(initial?.firstName || "");
    setLastName(initial?.lastName || "");
    setMiddleName(initial?.middleName || "");
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
              Bio
              <textarea
                className="pe__input pe__input--area"
                placeholder="Write something about yourself…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
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
            onClick={() => onClose()}
          >
            Save
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

  // NEW: modal open state
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCloseEdit = () => {
    setOpenEdit(false);
    // optionally refresh after saving:
    // fetchProfile();
  };

  return (
    <div className="profilePage">
      <div className="profileFeed">
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

          {/* Kebab now opens the editor */}
          <button
            type="button"
            className="pKebab compact"
            aria-label="Edit profile"
            onClick={() => setOpenEdit(true)}
            title="Edit profile"
          >
            ⋯
          </button>

          {/* If a separate refresh is desired, add this near the header or kebab:
          <button
            type="button"
            className="pKebab compact"
            aria-label="Refresh profile"
            onClick={fetchProfile}
            title="Refresh profile"
            style={{ right: 56 }}
          >
            ⟳
          </button>
          */}

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
      </div>

      {/* Mount the edit modal with initial values from current state */}
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
        }}
      />
    </div>
  );
}
