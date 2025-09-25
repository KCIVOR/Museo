import { useState, useEffect, useRef } from "react";
import "./css/events.css";

const IMG = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg";

const EVENTS = {
  artCelebration: {
    id: "art-celebration",
    title: "Art Celebration",
    desc: "A joyful and memorable celebration that united everyone in festive spirit.",
    src: IMG
  },
  craftedEmotion: {
    id: "crafted-emotion",
    title: "Crafted Emotion",
    desc: "A visual journey of feelings expressed through art.",
    src: IMG
  },
  ac: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  timelessCreation: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  a: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  b: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  c: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  m: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  n: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  v: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  },
  z: {
    id: "timeless-creation",
    title: "Timeless Creation",
    desc: "Join for a captivating art showcase that transcends time and creativity.",
    src: IMG
  }
};

function EventModal({ open, event, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !event) return null;

  const pad = (n) => String(n).padStart(2, "0");
  const toICSDate = (dt) => {
    const d = new Date(dt);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const esc = (s) => String(s||"").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");
  const buildICS = (e) => [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Museo//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@museo.app`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(e.start)}`,
    `DTEND:${toICSDate(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.lead)}`,
    `LOCATION:${esc(`${e.venueName||""} ${e.venueAddress||""}`.trim())}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const addToCalendar = () => {
    const ics = buildICS(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(event.slug || event.title || "event").replace(/\s+/g,"-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (dt) => new Date(dt).toLocaleString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  return (
    <div
      className="evmOverlay"
      ref={overlayRef}
      onMouseDown={(e) => e.target === overlayRef.current && onClose?.()}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="evmDialog"
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="evmClose"
        >✕</button>

        <div className="evmHeroWrap">
          <img src={event.hero} alt="" className="evmHero" />
        </div>

        <div className="evmHeader">
          <h1 className="evmTitle">{event.title}</h1>
          <button onClick={addToCalendar} className="evmCalBtn">
            Add to Calendar
          </button>
        </div>

        <section className="evmSection">
          <p className="evmP">{event.lead}</p>

          {event.activities?.length > 0 && (
            <div>
              <div className="evmSectionTitle">🎨 Activities Include:</div>
              <ul className="evmList">
                {event.activities.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {event.admission && (
            <div>
              <div className="evmSectionTitle">🎟️ Admission:</div>
              <p className="evmP">{event.admission}</p>
              {event.admissionNote && <p className="evmP">{event.admissionNote}</p>}
            </div>
          )}
        </section>

        <section className="evmSection">
          <div className="evmSectionTitle">📍 Venue:</div>
          <p className="evmP">
            {event.venueName}<br />{event.venueAddress}
          </p>
        </section>

        <section className="evmSection">
          <div className="evmSectionTitle">🗓️ Date & Time:</div>
          <p className="evmP"><b>Start:</b> {fmt(event.start)}</p>
          <p className="evmP"><b>End:</b> {fmt(event.end)}</p>
        </section>
      </article>
    </div>
  );
}

export default function Event() {
  const items = Object.values(EVENTS);
  const [selected, setSelected] = useState(null);

  const openEvent = (card) => setSelected({
    slug: card.id,
    title: card.title,
    hero: card.src,
    lead:
      "Join us for a vibrant and inspiring Celebration of the Arts, a one-day event that brings together the best of visual arts, music, dance, theater, and creative expression under one roof.",
    activities: [
      "Live art painting demos",
      "Music and spoken word performances",
      "Local artisan booths and exhibits",
      "Hands-on art workshops for kids and adults",
      "Food trucks and local cuisine",
    ],
    admission: "Free for all ages!",
    admissionNote: "(Some workshops may require pre-registration)",
    venueName: "Albuquerque Convention Center – Grand Ballroom",
    venueAddress: "401 2nd St NW, Albuquerque, NM 87102",
    start: "2025-08-16T10:00:00",
    end: "2025-08-16T19:00:00",
  });

  return (
    <div className="eventsPage">
      <div className="eventsFeed">
        <div className="eventsGrid">
          {items.map((e) => (
            <article
              key={e.id}
              className="eCard"
              onClick={() => openEvent(e)}
            >
              <img src={e.src} alt="" className="eMedia" />
              <div className="eBody">
                <div className="eTitle">{e.title}</div>
                <div className="eDesc">{e.desc}</div>
              </div>
            </article>
          ))}
        </div>

        <EventModal open={!!selected} event={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
