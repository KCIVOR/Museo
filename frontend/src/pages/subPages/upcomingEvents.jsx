import React from "react";
import "./css/upcomingEvents.css";

const IMG =
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/random-l.jpg";

const EVENTS = [
  {
    id: "art-celebration",
    title: "Art Celebration",
    desc: "A joyful and memorable celebration that united everyone in festive spirit.",
    cover: IMG,
    start: "2025-09-20T18:00:00",
    end: "2025-09-20T21:00:00",
    venue: "Museo Main Hall, Manila",
  },
  {
    id: "ge",
    title: "Art Celebration",
    desc: "A joyful and memorable celebration that united everyone in festive spirit.",
    cover: IMG,
    start: "2025-09-20T18:00:00",
    end: "2025-09-20T21:00:00",
    venue: "Museo Main Hall, Manila",
  },

  {
    id: "crafted-emotion",
    title: "Crafted Emotion",
    desc: "A visual journey of feelings expressed through art.",
    cover: IMG,
    start: "2025-09-28T14:00:00",
    end: "2025-09-28T17:00:00",
    venue: "Atrium East, Quezon",
  },
  {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "An art showcase that transcends time and creativity.",
    cover: IMG,
    start: "2025-10-05T13:00:00",
    end: "2025-10-05T17:00:00",
    venue: "Gallery West, Makati",
  },
  {
    id: "test",
    title: "test",
    desc: "test.",
    cover: IMG,
    start: "2025-10-05T13:00:00",
    end: "2025-10-05T17:00:00",
    venue: "Gallery West, Makati",
  },
  {
    id: "a",
    title: "test",
    desc: "test.",
    cover: IMG,
    start: "2025-10-05T13:00:00",
    end: "2025-10-05T17:00:00",
    venue: "Gallery West, Makati",
  },
];

function fmtRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const dOpt = { weekday: "short", month: "short", day: "numeric" };
  const tOpt = { hour: "2-digit", minute: "2-digit" };

  if (sameDay) {
    return `${s.toLocaleDateString(undefined, dOpt)} · ${s.toLocaleTimeString(
      undefined,
      tOpt
    )}–${e.toLocaleTimeString(undefined, tOpt)}`;
  }
  return `${s.toLocaleDateString(
    undefined,
    dOpt
  )} ${s.toLocaleTimeString(undefined, tOpt)} – ${e.toLocaleDateString(
    undefined,
    dOpt
  )} ${e.toLocaleTimeString(undefined, tOpt)}`;
}

function bucketLabel(date) {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 14) return "Next Week";
  return "Later";
}

const grouped = EVENTS.reduce((acc, ev) => {
  const b = bucketLabel(ev.start);
  acc[b] = acc[b] || [];
  acc[b].push(ev);
  return acc;
}, {});

export default function UpcomingEvents() {
  const total = EVENTS.length;

  return (
    <div className="uePage">
      <div className="ueFeed">
        {/* Header */}
        <div className="ueHead">
          <div className="ueTitle">
            <h1>Upcoming Events</h1>
            <span className="ueCount">{total} saved</span>
          </div>
          <div className="ueActions">
            <div className="ueFilters">
              <button className="ueChip is-active">All</button>
              <button className="ueChip">This Week</button>
              <button className="ueChip">Next Week</button>
              <button className="ueChip">Next Month</button>
            </div>
            <select className="ueSort" defaultValue="dateAsc">
              <option value="dateAsc">Soonest first</option>
              <option value="dateDesc">Latest first</option>
              <option value="nameAsc">A–Z</option>
              <option value="nameDesc">Z–A</option>
            </select>
          </div>
        </div>

        {/* Buckets */}
        {Object.entries(grouped).map(([label, list]) => (
          <section key={label} className="ueBucket">
            <h2 className="ueBucketTitle">{label}</h2>
            <div className="ueGrid">
              {list.map((ev) => (
                <article key={ev.id} className="ueCard">
                  <div className="ueImgWrap">
                    <img src={ev.cover} alt="" />
                    <span className="ueTag">Added</span>
                  </div>

                  <div className="ueBody">
                    <div className="ueName" title={ev.title}>{ev.title}</div>
                    <div className="ueMeta">
                      <span className="ueDate">{fmtRange(ev.start, ev.end)}</span>
                      <span className="ueDot">•</span>
                      <span className="ueVenue">{ev.venue}</span>
                    </div>
                    <p className="ueDesc">{ev.desc}</p>

                    {/* spacer to push buttons down */}
                    <div className="ueGrow" />

                    <div className="ueBtns">
                      <a className="ueBtnGhost" href={`/events/${ev.id}`}>View details</a>
                      <button className="ueBtn">Open in Calendar</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
