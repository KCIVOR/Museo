// src/components/SidePanel.jsx
import { NavLink } from "react-router-dom";
import "./Sidepanel.css"
import { HomeIcon, ArtistIcon, GalleryIcon, MarketplaceIcon, EventIcon, RequestIcon } from "./icons";
export default function SidePanel({ role }) {
  return (
    <nav className="side side--left" aria-label="Primary">
      <ul className="side__section">
        <li><NavLink to="/Home" className="side__link side__link--pill"><span className="side__icon"><HomeIcon className="w-5 h-5" /></span> Home</NavLink></li>
        <li><NavLink to="/Artist" className="side__link side__link--pill"><span className="side__icon"><ArtistIcon className="w-5 h-5" /></span> Artists</NavLink></li>
        <li><NavLink to="/Gallery" className="side__link side__link--pill"><span className="side__icon"><GalleryIcon className="w-5 h-5" /></span> Gallery</NavLink></li>
        <li><NavLink to="/Marketplace" className="side__link side__link--pill"><span className="side__icon"><MarketplaceIcon className="w-5 h-5" /></span> Marketplace</NavLink></li>
        <li><NavLink to="/Event" className="side__link side__link--pill"><span className="side__icon"><EventIcon className="w-5 h-5" /></span> Events</NavLink></li>
        {role === 'admin' && (
          <li><NavLink to="/requests" className="side__link side__link--pill"><span className="side__icon"><RequestIcon className="w-5 h-5" /></span> Manage</NavLink></li>
        )}
      </ul>

      <div className="side__heading">You Might Know</div>
      <ul className="side__people">
        {["Aria Bennett","Ron Iverson Roguel","James Morgan McGill","Mike Ehrmantraut","Gustavo Fring"].map(name => (
          <li key={name}>
            <a className="side__person">
              <img className="side__avatar" src={`https://i.pravatar.cc/40?u=${encodeURIComponent(name)}`} alt="" />
              <span>{name}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
