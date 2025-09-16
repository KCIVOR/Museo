import "./Sidepanel.css"
import { useNavigate } from "react-router-dom";


export default function SidePanel2() {
  const navigate = useNavigate();
  return (
    <aside className="side side--right" aria-label="Right rail widgets">
     <div
        className="card"
        onClick={() => navigate("/upcomingevents")}
        style={{ cursor: "pointer" }}
      >
        <div className="card__title">Upcoming Events</div>
      </div>

      <div className="event">
        <div className="event__date">
          <div className="event__month">April</div>
          <div className="event__day">8</div>
        </div>
        <div className="event__body">
          <div className="event__title">Global Showcase</div>
          <div className="event__time">8:00AM - 1:00PM</div>
        </div>
      </div>

      <div className="event">
        <div className="event__date">
          <div className="event__month">May</div>
          <div className="event__day">8</div>
        </div>
        <div className="event__body">
          <div className="event__title">Digital Summit</div>
          <div className="event__time">10:00AM - 4:00PM</div>
        </div>
      </div>
        <div
          className="card"
          onClick={() => navigate("/toparts")}
          style={{ cursor: "pointer" }}
        >
          <div className="card__title">Top Arts Of The Week</div>
        </div>
      <div className="card">
        
        <img className="card__image" src="https://picsum.photos/seed/art1/600/240" alt="" />
        <div className="card__caption">“Lovers” by Aria Bennett</div>
      </div>

      <div className="card">
        <img className="card__image" src="https://picsum.photos/seed/art2/600/240" alt="" />
        <div className="card__caption">“Green Forest” by Gustavo Fring</div>
      </div>
    </aside>
  );
}
