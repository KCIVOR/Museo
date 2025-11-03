import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "../src/contexts/UserContext";
import Navbar from "./Navbar";
import SidePanel from "./SidePanel";
import SidePanel2 from "./SidePanel2";
import ScrollToTop from "./ScrollToTop";
import "./Layout.css";
const API = import.meta.env.VITE_API_BASE;
import ToastNotification from "./ToastNotification";

export default function Layout() {
  const { pathname } = useLocation();
  const isMessage = pathname.startsWith("/message");
  const isGallery = pathname === "/Gallery" || pathname === "/gallery";
  const isArtistProfile = pathname.startsWith("/artist/");
  const isMyProfile = pathname === "/MyProfile";
  const isVisitMuseo = pathname === "/visit-museo";
  const isRequestsPage = pathname === "/requests";
  
  // Get user data from UserContext instead of fetching
  const { userData, isLoading } = useUser();
  const role = userData?.role || null;
  
  // Log UserContext data to verify it's working
  useEffect(() => {
    console.log('📐 Layout: UserContext data:', {
      userData,
      role,
      isLoading
    });
    console.log('📐 Layout: Will pass to Navbar:', { role, userData: userData ? 'exists' : 'null' });
  }, [userData, role, isLoading]);

  // Centralized sidebar data state
  const [topArts, setTopArts] = useState([]);
  const [sidebarEvents, setSidebarEvents] = useState([]);
  const [loadingTopArts, setLoadingTopArts] = useState(false);
  const [loadingSidebarEvents, setLoadingSidebarEvents] = useState(false);

  // UserContext already provides:
  // - userData.role (user's role)
  // - userData.avatar (profile picture)
  // - userData.username
  // - userData.fullName
  // - userData.firstName, lastName, etc.
  // No need to fetch these separately anymore!

  // Fetch top arts for sidebar
  const fetchTopArts = useCallback(async () => {
    try {
      setLoadingTopArts(true);
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

  // Create a userData object that matches Navbar's expected format
  // UserContext provides all these fields directly
  const navbarUserData = userData ? {
    avatar: userData.avatar,
    username: userData.username,
    fullName: userData.fullName
  } : null;

  return (
    <div className={`app ${isMessage ? "app--message" : ""} ${isGallery ? "app--gallery" : ""} ${isArtistProfile ? "app--artist-profile" : ""} ${isMyProfile ? "app--my-profile" : ""} ${isVisitMuseo ? "app--visit-museo" : ""} ${isRequestsPage ? "app--requests" : ""}`}>
      <header className="app__header">
        <Navbar role={role} userData={navbarUserData} />
      </header>

      {!isVisitMuseo && (
        <aside className="app__side-left">
          <SidePanel role={role} />
        </aside>
      )}

      <main className="app__main" role="main">
        <ScrollToTop />
        <Outlet />
      </main>

      {!isGallery && !isArtistProfile && !isMyProfile && !isVisitMuseo && !isRequestsPage && (
        <aside className="app__side-right">
          <SidePanel2 
            userData={userData} 
            role={role} 
            topArts={topArts}
            events={sidebarEvents}
            loadingTopArts={loadingTopArts}
            loadingEvents={loadingSidebarEvents}
          />
        </aside>
      )}

      <footer className="app__footer" />
      <ToastNotification />
    </div>
  );
}
