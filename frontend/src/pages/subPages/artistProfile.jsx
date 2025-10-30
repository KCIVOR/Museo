// src/pages/subPages/artistProfile.jsx
import "../css/MyProfile.css";
import React, { useEffect, useState, useMemo } from "react";
import ArtGallery from "./artGallery";
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
      <div className="museo-feed" style={{ gap: '24px' }}>
        {/* Loading State */}
        <MuseoLoadingBox 
          show={isFetching} 
          message={MuseoLoadingBox.messages.profile} 
        />

        {/* Artist Profile Card */}
        {!isFetching && (
        <>
        <div className="museo-card museo-card--artist" style={{ position: 'relative', overflow: 'hidden', padding: '0', marginBottom: '24px' }}>
          {/* Cover Image */}
          <div style={{
            position: 'relative',
            height: '200px',
            background: `linear-gradient(135deg, var(--museo-primary) 0%, var(--museo-primary-dark) 100%)`,
            backgroundImage: `url(${cover || FALLBACK_COVER})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '16px 16px 0 0',
            margin: '0',
            width: '100%'
          }}>
            {/* Overlay for better text readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
              borderRadius: '16px 16px 0 0'
            }} />
            
            {/* Artist Badge */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'var(--museo-accent)',
              color: 'var(--museo-white)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              {role === 'admin' ? '👑 Admin' : '🎨 Artist'}
            </div>
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
            <img
              className="museo-avatar"
              src={avatar || FALLBACK_AVATAR}
              alt={`${fullName || "Artist"} avatar`}
              style={{
                border: '4px solid var(--museo-white)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
            />
          </div>

          <div className="museo-body" style={{ textAlign: 'center', padding: '0 24px 24px' }}>
            <h3 className="museo-title" style={{ 
              fontSize: '32px', 
              marginBottom: '8px',
              color: 'var(--museo-primary)',
              fontWeight: '800'
            }}>
              {fullName || "Unknown Artist"}
            </h3>
            
            {bio && (
              <p className="museo-desc" style={{
                fontSize: '18px',
                fontStyle: 'italic',
                color: 'var(--museo-text-secondary)',
                marginBottom: '24px',
                lineHeight: '1.5',
                fontWeight: '500'
              }}>
                "{bio}"
              </p>
            )}

            {/* Artist Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              marginBottom: '24px',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--museo-accent)',
                  marginBottom: '4px'
                }}>
                  {arts.length}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--museo-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Artworks
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--museo-accent)',
                  marginBottom: '4px'
                }}>
                  {age || '—'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--museo-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Years Old
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--museo-accent)',
                  marginBottom: '4px'
                }}>
                  {role === 'admin' ? '👑' : '🎨'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--museo-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {role === 'admin' ? 'Admin' : 'Artist'}
                </div>
              </div>
            </div>

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
                  padding: '8px 12px',
                  background: 'var(--museo-gray-50)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--museo-text-secondary)'
                }}>
                  <strong>Gender:</strong> {sex}
                </div>
              )}
              {address && (
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--museo-gray-50)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--museo-text-secondary)'
                }}>
                  <strong>Location:</strong> {address}
                </div>
              )}
              {birthdate && (
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--museo-gray-50)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--museo-text-secondary)'
                }}>
                  <strong>Born:</strong> {new Date(birthdate).toLocaleDateString()}
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
                  About the Artist
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
          </div>
        </div>

        {/* Artist's Artwork Gallery */}
        <div className="museo-card">
          <div className="museo-body">
            <h1 className="museo-heading" style={{ marginBottom: '20px' }}>Artist's Portfolio</h1>
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
