// src/pages/subPages/artistProfile.jsx
import "../Profile/css/MyProfile.css";
import React, { useEffect, useState, useMemo } from "react";
import ArtGallery from "../Gallery/artGallery";
import { useParams } from 'react-router-dom';
// Using CSS classes from design-system.css instead of components
import MuseoLoadingBox from "../../components/MuseoLoadingBox.jsx";
const API = import.meta.env.VITE_API_BASE;

const FALLBACK_AVATAR =
  import.meta.env.FALLBACKPHOTO_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";

const FALLBACK_COVER =
  import.meta.env.FALLBACKCOVER_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/coverphoto.png";

export default function ArtistProfile() {
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
  const [isFetching, setIsFetching] = useState(true);
  const [role, setRole] = useState("");
  const [arts, setArts] = useState([]);

  const { id } = useParams();

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
    setIsFetching(true);
    try {
      const res = await fetch(`${API}/artist/getArtistById/${id}`, {
        credentials: "include",
        method: "GET",
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
      setRole(p.role ?? "artist"); // Get role from profile data
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchArts = async () => {
    try{
      const response = await fetch(`${API}/artist/getArts/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Failed to fetch arts: ${response.statusText}`);
      const data = await response.json();
      
      setArts(data);
    }catch(err){
      console.error(err);
    }
  }

  const fetchRole = async () => {
    try {
      const response = await fetch(`${API}/artist/getRole/${id}`, {
        credentials: "include",
        method: "GET",
      });
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
      const data = await response.json();
      setRole(data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  }; 

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchRole();
      fetchArts();
    } else {
      setIsFetching(false);
    }
  }, [id]);

  const handleCloseEdit = () => {
    setOpenEdit(false);
    fetchProfile();
  };

  // Event handlers for ArtGallery
  const handleViewArt = (art, index) => {
    // Add your view logic here
  };

  const handleLikeArt = (art, index) => {
    // Add your like logic here
  };

  const handleArtClick = (art, index) => {
    // Add your click logic here
  };

  const handleModalClose = () => {
    // Modal closed - no need to refresh data since this is a view-only profile
  };

  return (
    <div className="museo-page">
      <div className="museo-feed mp__feed">
        {/* Loading State */}
        <MuseoLoadingBox 
          show={isFetching} 
          message={MuseoLoadingBox.messages.profile} 
        />

        {/* Artist Profile Card */}
        {!isFetching && (
        <>
        <div className="museo-card mp__profile-card" style={{ marginBottom: '24px' }}>
          {/* Cover Image */}
          <div className="mp__cover" style={{
            backgroundImage: cover ? `url(${cover})` : `linear-gradient(135deg, var(--museo-primary) 0%, var(--museo-primary-dark) 100%), url(${FALLBACK_COVER})`
          }}>
            {/* Overlay for better text readability */}
            <div className="mp__cover-overlay" />
            
            {/* Artist Badge */}
            <div className="mp__role-badge">
              {role === 'admin' ? '👑 Admin' : '🎨 Artist'}
            </div>
          </div>

          {/* Avatar */}
          <div className="mp__avatar-container">
            <img
              className="museo-avatar mp__avatar"
              src={avatar || FALLBACK_AVATAR}
              alt={`${fullName || "Artist"} avatar`}
            />
          </div>

          <div className="museo-body mp__body">
            <h3 className="museo-title mp__title">
              {fullName || "Unknown Artist"}
            </h3>
            
            {bio && (
              <p className="museo-desc mp__bio">
                "{bio}"
              </p>
            )}

            {/* Artist Stats */}
            <div className="mp__stats">
              <div className="mp__stat-item">
                <div className="mp__stat-number">
                  {arts.length}
                </div>
                <div className="mp__stat-label">
                  Artworks
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
                <div className="mp__stat-number">
                  {role === 'admin' ? '👑' : '🎨'}
                </div>
                <div className="mp__stat-label">
                  {role === 'admin' ? 'Admin' : 'Artist'}
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
                  <strong className="mp__detail-label">Born:</strong> {age || '—'} years old ({new Date(birthdate).toLocaleDateString()})
                </div>
              )}
            </div>

            {about && (
              <div className="mp__about-section">
                <h4 className="mp__about-heading">
                  About the Artist
                </h4>
                <p className="mp__about-text">
                  {about}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Artist's Artwork Gallery */}
        <div className="museo-card">
          <div className="museo-body">
            <h1 className="museo-heading">Artist's Portfolio</h1>
            <ArtGallery
              enablePagination={true}
              fetchUrl="/api/profile/getUserArts"
              userId={id}
              title=""
              showStats={true}
              showActions={true}
              showUpload={false}
              onViewArt={handleViewArt}
              onLikeArt={handleLikeArt}
              onArtClick={handleArtClick}
              onModalClose={handleModalClose}
              fallbackImage={FALLBACK_COVER}
              currentUser={{
                id: id,
                name: [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Artist',
                avatar: avatar
              }}
            />
          </div>
        </div>
        </>)}
      </div>
    </div>
  );
}
