import Login from "./pages/Login";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Gallery from "./pages/Gallery";
import Event from "./pages/Event";
import Artist from "./pages/Artist";
import ArtistDetail from "./pages/subPages/artistProfile";
import Artwork from "./pages/subPages/artwork";
import MarketplaceItem from "./pages/subPages/marketPlaceItem";
import RegisterArtist from "./pages/subPages/registerArtist";
import GalleryAll from "./pages/subPages/galleryAll";
import Layout from "../components/Layout";
import MyProfile from "./pages/MyProfile";
import MarketplaceAll from "./pages/subPages/marketplaceAll"
import { Routes, Route } from "react-router-dom";
import ProtectedRoutes from "./utils/protectedRoutes";
import AuthCallback from "./pages/authCallback";
import Register from "./pages/Register";
import BlindAuction from "./pages/subPages/blindAuction";
import UpcomingEvents from "./pages/subPages/upcomingEvents"
import TopArts from "./pages/subPages/topArts"
import Search from "./pages/subPages/Search";
function App() {
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
          <Route path="/Gallery" element={<Gallery />} />
          <Route path="/Artist" element={<Artist />} />
          <Route path="/Artist/:id" element={<ArtistDetail />} />
          <Route path="/Gallery/:id" element={<Artwork />} />
          <Route path="/Marketplace/:id" element={<MarketplaceItem />} />
          <Route path="/RegisterAsArtist" element={<RegisterArtist />} />
          <Route path="/Gallery/category" element={<GalleryAll />} />
          <Route path="/MyProfile" element={<MyProfile />} />
          <Route path="/blindAuction" element={<BlindAuction />} />
          <Route path="/marketplace/category" element={<MarketplaceAll />} />
          <Route path="/upcomingEvents" element={<UpcomingEvents />} />
          <Route path="/topArts" element={<TopArts />} />
          <Route path="/Search" element={<Search/>}/>
        </Route>

      </Route>
    </Routes>
  );
}

export default App;
