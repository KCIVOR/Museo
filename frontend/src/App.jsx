import { useEffect } from "react";
import { useUser } from "./contexts/UserContext";
import Login from "./pages/Auth/Login";
import Home from "./pages/Home/Home";
import Marketplace from "./pages/Marketplace/Marketplace";
import Gallery from "./pages/Gallery/Gallery";
import Event from "./pages/Events/Event";
import Artist from "./pages/Artist/Artist";
import ArtistDetail from "./pages/Artist/artistProfile";
import Artwork from "./pages/Gallery/artwork";
import MarketplaceItem from "./pages/Marketplace/marketPlaceItem";
import GalleryAll from "./pages/Gallery/galleryAll";
import Layout from "../components/Layout";
import MyProfile from "./pages/Profile/MyProfile";
import MarketplaceAll from "./pages/Marketplace/marketplaceAll"
import { Routes, Route } from "react-router-dom";
import ProtectedRoutes from "./utils/protectedRoutes";
import AdminRoute from "./utils/AdminRoute";
import AuthCallback from "./pages/Auth/authCallback";
import BlindAuction from "./pages/Marketplace/blindAuction";
import UpcomingEvents from "./pages/Events/upcomingEvents"
import TopArts from "./pages/Gallery/topArts"
import Search from "./pages/Shared/Search";
import VisitMuseo from "./pages/Shared/VisitMuseo";
import ManagePage from "./pages/Shared/ManagePage";
import Register from "./pages/Auth/Register";
import Checkout from "./pages/Marketplace/checkout"
import SellerDashboard from "./pages/Marketplace/SellerDashboard"
import Settings from "./pages/Settings/Settings"

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
          <Route path="/marketplace/checkout" element={<Checkout />} />
          <Route path="/marketplace/seller-dashboard" element={<SellerDashboard />} />
          <Route path="/settings" element={<Settings />} />
          {/* Admin-only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/requests" element={<ManagePage />} />
          </Route>
        </Route>

      </Route>
    </Routes>
  );
}
