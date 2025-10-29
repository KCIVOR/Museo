import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Navbar from "./Navbar";
import SidePanel from "./SidePanel";
import SidePanel2 from "./SidePanel2";
import ScrollToTop from "./ScrollToTop";
import "./Layout.css";
const API = import.meta.env.VITE_API_BASE;
import RequestsModal from "../src/pages/subPages/RequestsModal";
import ToastNotification from "./ToastNotification";

export default function Layout() {
  const { pathname } = useLocation();
  const isMessage = pathname.startsWith("/message");
  const isGallery = pathname === "/Gallery" || pathname === "/gallery";
  const isArtistProfile = pathname.startsWith("/artist/");
  const isMyProfile = pathname === "/MyProfile";
  const [role, setRole] = useState(null);
  const [requestsOpen, setRequestsOpen] = useState(false);

  // Centralized user data state
  const [userData, setUserData] = useState({
    avatar: null,
    username: null,
    fullName: null
  });

  // Centralized sidebar data state
  const [topArts, setTopArts] = useState([]);
  const [sidebarEvents, setSidebarEvents] = useState([]);
  const [loadingTopArts, setLoadingTopArts] = useState(false);
  const [loadingSidebarEvents, setLoadingSidebarEvents] = useState(false);

  // Fetch user role
  useEffect(() => {
    let abort = false;
    const fetchRole = async () => {
      try {
        const res = await fetch(`${API}/users/role`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const cleanRole = typeof data === 'string' ? data.trim() : data;
        if (!abort) setRole(cleanRole);
      } catch (_) {
        if (!abort) setRole(null);
      }
    };
    fetchRole();
    return () => { abort = true; };
  }, []);

  // Fetch user data (avatar, username, fullName)
  useEffect(() => {
    let abort = false;
    const fetchUserData = async () => {
      try {
        // Fetch profile picture
        const pictureRes = await fetch(`${API}/users/picture`, {
          method: "GET",
          credentials: "include",
        });
        
        // Fetch user info
        const userRes = await fetch(`${API}/users/me`, {
          method: "GET",
          credentials: "include",
        });

        let profilePicture = null;
        let userInfo = {};

        if (pictureRes.ok) {
          profilePicture = await pictureRes.json();
        }

        if (userRes.ok) {
          userInfo = await userRes.json();
        }

        if (!abort) {
          setUserData({
            avatar: profilePicture,
            username: userInfo.username || null,
            fullName: userInfo.fullName || userInfo.name || null
          });
        }
      } catch (error) {
        console.log('Failed to fetch user data:', error);
        if (!abort) {
          setUserData({
            avatar: null,
            username: null,
            fullName: null
          });
        }
      }
    };
    
    // Listen for profile updates from other components
    const handleProfileUpdate = (event) => {
      const { avatar, firstName, lastName, username } = event.detail;
      setUserData(prev => ({
        ...prev,
        avatar: avatar || prev.avatar,
        username: username || prev.username,
        fullName: `${firstName || ''} ${lastName || ''}`.trim() || prev.fullName
      }));
    };
    
    fetchUserData();
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => { 
      abort = true; 
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Fetch top arts for sidebar
  const fetchTopArts = useCallback(async () => {
    try {
      setLoadingTopArts(true);
      
      // Fetch top arts data
      const topArtsRes = await fetch(`${API}/gallery/top-arts-weekly`, {
        credentials: 'include'
      });
      
      if (!topArtsRes.ok) {
        throw new Error(`Failed to fetch top arts: ${topArtsRes.status}`);
      }
      
      const topArtsData = await topArtsRes.json();
      
      if (!topArtsData.topArts || !Array.isArray(topArtsData.topArts) || topArtsData.topArts.length === 0) {
        setTopArts([]);
        return;
      }

      // Fetch artwork details
      const queryParams = new URLSearchParams();
      queryParams.append('page', '1');
      queryParams.append('limit', '100');
      
      const artworksRes = await fetch(`${API}/gallery/artworks?${queryParams}`, {
        method: "GET",
        credentials: 'include'
      });
      
      if (!artworksRes.ok) {
        throw new Error(`Failed to fetch artworks: ${artworksRes.status}`);
      }
      
      const artworksData = await artworksRes.json();
      const allArtworks = (artworksData.success && artworksData.artworks) 
        ? artworksData.artworks 
        : (Array.isArray(artworksData) ? artworksData : []);
      
      if (allArtworks.length === 0) {
        const directTopArts = topArtsData.topArts.map(topArt => ({
          id: topArt.galleryArtId,
          title: `Top Art #${topArt.rank_position}`,
          image: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png',
          rank_position: topArt.rank_position,
          total_score: topArt.total_score,
          views_count: topArt.views_count,
          likes_count: topArt.likes_count,
          comments_count: topArt.comments_count
        }));
        setTopArts(directTopArts.slice(0, 6));
        return;
      }
      
      const topArtsWithDetails = topArtsData.topArts
        .map(topArt => {
          const artwork = allArtworks.find(art => art.id === topArt.galleryArtId);
          if (!artwork) return null;
          
          return {
            ...artwork,
            rank_position: topArt.rank_position,
            total_score: topArt.total_score,
            views_count: topArt.views_count,
            likes_count: topArt.likes_count,
            comments_count: topArt.comments_count
          };
        })
        .filter(Boolean)
        .slice(0, 6);
      
      setTopArts(topArtsWithDetails);
    } catch (error) {
      console.error('Error fetching top arts:', error);
      setTopArts([]);
    } finally {
      setLoadingTopArts(false);
    }
  }, []);

  // Fetch sidebar events
  const fetchSidebarEvents = useCallback(async () => {
    try {
      setLoadingSidebarEvents(true);
      const res = await fetch(`${API}/event/myEvents`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!res.ok) throw new Error('Failed to fetch events');
      
      const data = await res.json();
      setSidebarEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching sidebar events:', error);
      setSidebarEvents([]);
    } finally {
      setLoadingSidebarEvents(false);
    }
  }, []);

  // Fetch sidebar data on mount
  useEffect(() => {
    fetchTopArts();
    fetchSidebarEvents();
  }, [fetchTopArts, fetchSidebarEvents]);

  return (
    <div className={`app ${isMessage ? "app--message" : ""} ${isGallery ? "app--gallery" : ""} ${isArtistProfile ? "app--artist-profile" : ""} ${isMyProfile ? "app--my-profile" : ""}`}>
      <header className="app__header">
        <Navbar role={role} userData={userData} />
      </header>

      <aside className="app__side-left">
        <SidePanel role={role} onOpenRequests={() => setRequestsOpen(true)} />
      </aside>

      <main className="app__main" role="main">
        <ScrollToTop />
        <Outlet />
      </main>

      {!isGallery && !isArtistProfile && !isMyProfile && (
        <aside className="app__side-right">
          <SidePanel2 
            role={role} 
            topArts={topArts}
            events={sidebarEvents}
            loadingTopArts={loadingTopArts}
            loadingEvents={loadingSidebarEvents}
          />
        </aside>
      )}

      <footer className="app__footer" />
      <RequestsModal open={requestsOpen} onClose={() => setRequestsOpen(false)} />
      <ToastNotification />
    </div>
  );
}
