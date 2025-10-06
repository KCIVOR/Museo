// src/pages/MyProfile.jsx
import "../css/MyProfile.css";
import React, { useEffect, useState, useMemo } from "react";
import ArtistArtGallery from "./artistArtGallery";
import { useParams } from 'react-router-dom';
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
  const [isFetching, setIsFetching] = useState(false);
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
    if (isFetching) return;
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

      console.log("Fetched arts:", data);
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
            <ArtistArtGallery
              arts={arts}
              title="Artworks"
              showStats={true}
              showActions={true}
              showUpload={true} // This shows the upload buttons
              onViewArt={handleViewArt}
              onLikeArt={handleLikeArt}
              onArtClick={handleArtClick}
              fallbackImage={FALLBACK_COVER}
            />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
