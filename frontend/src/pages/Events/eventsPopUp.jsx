import { useEffect, useRef } from "react";
import "./css/eventsPopUp.css";

export default function EventModal({ open, event, onClose }) {
  const overlayRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // lock scroll
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !event) return null;

  const addToCalendar = () => {
    const ics = buildICS(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(event.slug || event.title || "event").replace(/\s+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="evmOverlay"
      ref={overlayRef}
      onMouseDown={(e) => {
        // close on outside click
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <article className="evmDialog" role="dialog" aria-modal="true" aria-label={event.title}>
        <button className="evmClose" aria-label="Close" onClick={onClose}>✕</button>

        {/* Hero */}
        <div className="evmHeroWrap">
          <img className="evmHeroImg" src={event.hero} alt="" />
        </div>

        {/* Title + CTA */}
        <div className="evmTitleRow">
          <h1 className="evmTitle">{event.title}</h1>
          <button className="evmCta" onClick={addToCalendar}>Add to Calendar</button>
        </div>

        {/* Description block */}
        <section className="evmCard">
          <p className="evmP">{event.lead}</p>

          {/* Activities */}
          {event.activities?.length > 0 && (
            <div className="evmGroup">
              <div className="evmLabel">🎨 Activities Include:</div>
              <ul className="evmBullets">
                {event.activities.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {/* Admission */}
          {event.admission && (
            <div className="evmGroup">
              <div className="evmLabel">🎟️ Admission:</div>
              <p className="evmP">{event.admission}</p>
              {event.admissionNote && <p className="evmP">{event.admissionNote}</p>}
            </div>
          )}
        </section>

        {/* Venue */}
        <section className="evmCard">
          <div className="evmGroup">
            <div className="evmLabel">📍 Venue:</div>
            <p className="evmP">
              {event.venueName}<br />
              {event.venueAddress}
            </p>
          </div>
        </section>

        {/* Date & Time */}
        <section className="evmCard">
          <div className="evmGroup">
            <div className="evmLabel">🗓️ Date & Time:</div>
            <p className="evmP"><b>Start:</b> {formatDT(event.start)}</p>
            <p className="evmP"><b>End:</b> {formatDT(event.end)}</p>
          </div>
        </section>
      </article>
    </div>
  );
}

/* Helpers */
function pad(n){return String(n).padStart(2,"0");}
function toICSDate(dt){
  const d = new Date(dt);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function formatDT(dt){
  const d = new Date(dt);
  return d.toLocaleString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
function buildICS(e){
  const uid = `${Date.now()}@museo.app`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Museo//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(e.start)}`,
    `DTEND:${toICSDate(e.end)}`,
    `SUMMARY:${escapeICS(e.title)}`,
    `DESCRIPTION:${escapeICS(e.lead || "")}`,
    `LOCATION:${escapeICS(`${e.venueName || ""} ${e.venueAddress || ""}`.trim())}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}
function escapeICS(s){return String(s).replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");}
