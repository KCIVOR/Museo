import { useEffect } from "react";
import { useUser } from "./contexts/UserContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Gallery from "./pages/Gallery";
import Event from "./pages/Event";
import Artist from "./pages/Artist";
import ArtistDetail from "./pages/subPages/artistProfile";
import Artwork from "./pages/subPages/artwork";
import MarketplaceItem from "./pages/subPages/marketPlaceItem";
import GalleryAll from "./pages/subPages/galleryAll";
import Layout from "../components/Layout";
import MyProfile from "./pages/MyProfile";
import MarketplaceAll from "./pages/subPages/marketplaceAll"
import { Routes, Route } from "react-router-dom";
import ProtectedRoutes from "./utils/protectedRoutes";
import AdminRoute from "./utils/AdminRoute";
import AuthCallback from "./pages/authCallback";
import BlindAuction from "./pages/subPages/blindAuction";
import UpcomingEvents from "./pages/subPages/upcomingEvents"
import TopArts from "./pages/subPages/topArts"
import Search from "./pages/subPages/Search";
import VisitMuseo from "./pages/VisitMuseo";
import ManagePage from "./pages/ManagePage";
import Register from "./pages/Register";

export default function App() {
  const { userData, isLoading, isAuthenticated } = useUser();
  
  // Log UserContext status to verify everything is working
  useEffect(() => {
    console.log('🏛️ App.jsx - UserContext Status:', {
      isAuthenticated,
      isLoading,
      userData: userData ? {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        avatar: userData.avatar ? 'Has avatar' : 'No avatar'
      } : 'No user data'
    });
  }, [userData, isLoading, isAuthenticated]);
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Auth gate */}
      <Route element={<ProtectedRoutes />}>
        {/* Default app layout */}
        <Route element={<Layout />}>
          <Route path="/Home" element={<Home />} />
          <Route path="/Marketplace" element={<Marketplace />} />
          <Route path="/Event" element={<Event />} />
          <Route path="/event/:eventId" element={<Event />} />
          <Route path="/Gallery" element={<Gallery />} />
          <Route path="/Artist" element={<Artist />} />
          <Route path="/Artist/:id" element={<ArtistDetail />} />
          <Route path="/Gallery/:id" element={<Artwork />} />
          <Route path="/Marketplace/:id" element={<MarketplaceItem />} />
          <Route path="/Gallery/category" element={<GalleryAll />} />
          <Route path="/MyProfile" element={<MyProfile />} />
          <Route path="/blindAuction" element={<BlindAuction />} />
          <Route path="/marketplace/category" element={<MarketplaceAll />} />
          <Route path="/upcomingEvents" element={<UpcomingEvents />} />
          <Route path="/topArts" element={<TopArts />} /> 
          <Route path="/Search" element={<Search/>}/>
          <Route path="/visit-museo" element={<VisitMuseo />} />
          
          {/* Admin-only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/requests" element={<ManagePage />} />
          </Route>
        </Route>

      </Route>
    </Routes>
  );
}
