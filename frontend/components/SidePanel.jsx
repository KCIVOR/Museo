// src/components/SidePanel.jsx
import { NavLink } from "react-router-dom";
import "./Sidepanel.css"
import { HomeIcon, ArtistIcon, GalleryIcon, MarketplaceIcon, EventIcon, RequestIcon } from "./icons";
export default function SidePanel({ role, onOpenRequests }) {
  return (
    <nav className="side side--left" aria-label="Primary">
      <ul className="side__section">
        <li><NavLink to="/home" className="side__link"><span className="side__icon"><HomeIcon className="w-5 h-5" /></span> Home</NavLink></li>
        <li><NavLink to="/artist" className="side__link"><span className="side__icon"><ArtistIcon className="w-5 h-5" /></span> Artists</NavLink></li>
        <li><NavLink to="/gallery" className="side__link"><span className="side__icon"><GalleryIcon className="w-5 h-5" /></span> Gallery</NavLink></li>
        <li><NavLink to="/marketplace" className="side__link"><span className="side__icon"><MarketplaceIcon className="w-5 h-5" /></span> Marketplace</NavLink></li>
        <li><NavLink to="/event" className="side__link"><span className="side__icon"><EventIcon className="w-5 h-5" /></span> Events</NavLink></li>
        {(role === 'admin' || role?.role === 'admin') && (
          <li>
            <a
              href="#"
              className="side__link"
              onClick={(e) => { e.preventDefault(); onOpenRequests?.(); }}
            >
              <span className="side__icon"><RequestIcon className="w-5 h-5" /></span> Requests
            </a>
          </li>
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
