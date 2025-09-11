// src/components/SidePanel.jsx
import { NavLink } from "react-router-dom";
import "./Sidepanel.css"
export default function SidePanel() {
  return (
    <nav className="side side--left" aria-label="Primary">
      <ul className="side__section">
        <li><NavLink to="/home" className="side__link"><span className="side__icon">🔲</span> Home</NavLink></li>
        <li><NavLink to="/artist" className="side__link"><span className="side__icon">🎨</span> Artists</NavLink></li>
        <li><NavLink to="/gallery" className="side__link"><span className="side__icon">🖼️</span> Gallery</NavLink></li>
        <li><NavLink to="/marketplace" className="side__link"><span className="side__icon">🛍️</span> Marketplace</NavLink></li>
        <li><NavLink to="/event" className="side__link"><span className="side__icon">📅</span> Events</NavLink></li>
      </ul>

      <div className="side__heading">You Might Know</div>
      <ul className="side__people">
        {["Aria Bennett","Ron Iverson Roguel","James Morgan McGill","Mike Ehrmantraut","Gustavo Fring"].map(name => (
          <li key={name}>
            <button className="side__person">
              <img className="side__avatar" src={`https://i.pravatar.cc/40?u=${encodeURIComponent(name)}`} alt="" />
              <span>{name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
