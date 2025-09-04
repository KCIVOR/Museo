import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/home.css";

export default function Home() {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/users/", {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/");
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  return (
    <div className="museo-shell">
      {/* Left Sidebar */}
      <aside className="museo-left">
        <div className="logo-row">
          <div className="logo-circle" />
          <strong className="logo-text">Museo</strong>
        </div>

        <nav className="nav-group">
          <a className="nav-item active">Home</a>
          <a className="nav-item">Artists</a>
          <a className="nav-item">Gallery</a>
          <a className="nav-item">Marketplace</a>
          <a className="nav-item">Events</a>
          <a className="nav-item">Community</a>
        </nav>

        <div className="section-title">Your Community</div>
        <div className="list">
          <div className="list-item">
            <span className="dot" /> DemakinArts
          </div>
          <div className="list-item">
            <span className="dot orange" /> Ripple Realms
          </div>
        </div>

        <div className="section-title">Your Virtual Gallery</div>
        <div className="list">
          <div className="list-item">
            <span className="dot deep" /> Deep Blue Gallery
          </div>
        </div>

        <div className="section-title">You Might Know</div>
        <div className="people-list">
          {[
            "Aria Bennett",
            "Ron Iverson Roguel",
            "James Morgan McGill",
            "Mike Ehrmantraut",
          ].map((name) => (
            <div key={name} className="person">
              <div className="avatar" />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="museo-main">
        {/* Topbar */}
        <header className="topbar">
          <div className="search">
            <span className="icon">🔎</span>
            <input placeholder="Search" />
          </div>
          <div className="top-actions">
            <div className="coins">
              <span className="coin" /> 5042
            </div>
            <button className="icon-btn">🔔</button>
            <button className="icon-btn">💬</button>
            <div className="avatar sm" />
          </div>
        </header>

        {/* Feed */}
        <div className="feed">
          <article className="card">
            <div className="card-head">
              <div className="avatar sm" />
              <div>
                <div className="title">m/Inkspire/Kcivor</div>
                <div className="sub">
                  Van Gogh’s swirling night sky turns emotion into a timeless
                  masterpiece.
                </div>
              </div>
            </div>
            <div className="card-media">
              <div className="media-sample">SAMPLE</div>
            </div>
            <div className="card-foot">
              <span>❤️ 334</span>
              <span>💬</span>
            </div>
          </article>

          <article className="card">
            <div className="card-head">
              <div className="avatar sm" />
              <div>
                <div className="title">m/DemakinArts/Mike Ehrmantraut</div>
                <div className="sub">A silent witness to time and life.</div>
              </div>
            </div>
            <div className="card-media">
              <div className="media-sample">SAMPLE</div>
            </div>
            <div className="card-foot">
              <span className="like-red">❤️ 1.5k</span>
              <span>💬</span>
            </div>
          </article>
        </div>
      </main>

        {/* Right Sidebar */}
        <aside className="museo-right">
        <div className="widget">
            <div className="widget-title">Upcoming Events</div>

            {/* Events as bars */}
            <div className="events-list">
            {[
                { month: "April", day: "8", title: "Art Celebration", time: "8:00AM - 1:00PM" },
                { month: "May", day: "8", title: "Global Showcase", time: "10:00AM - 4:00PM" },
                { month: "March", day: "8", title: "Digital Summit", time: "1:00AM - 6:00PM" },
            ].map((e, i) => (
                <article key={i} className="event-row">
                <div className="date-badge">
                    <div className="m">{e.month}</div>
                    <div className="d">{e.day}</div>
                </div>
                <div className="event-info">
                    <div className="event-title">{e.title}</div>
                    <div className="event-time">{e.time}</div>
                </div>
                </article>
            ))}
            </div>
        </div>

        <div className="widget">
          <div className="widget-title">Top Arts of the Week</div>
          <div className="thumb">
            <div className="thumb-img">SAMPLE</div>
            <div className="thumb-caption">“Lovers” by Aria Bennett</div>
          </div>
          <div className="thumb">
            <div className="thumb-img">SAMPLE</div>
            <div className="thumb-caption">“Green Forest” by Gustavo Fring</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
