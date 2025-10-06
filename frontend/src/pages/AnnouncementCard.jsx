import React from "react";
import { useNavigate } from "react-router-dom";
import "./css/home.css";

function fmtDate(ts) {
  try {
    const d = new Date(ts);
    if (isNaN(d)) return String(ts ?? "");
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(ts ?? "");
  }
}

function createICS({ title, start, venueName }) {
  const dt = new Date(start);
  if (isNaN(dt)) return;
  const pad = (n) => String(n).padStart(2, "0");
  const startStr = `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
  const end = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
  const endStr = `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}00Z`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Museo//Announcements//EN",
    "BEGIN:VEVENT",
    `DTSTAMP:${startStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${(title || "Museo Event").replace(/\n/g, " ")}`,
    venueName ? `LOCATION:${venueName.replace(/\n/g, " ")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "event").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnnouncementCard({ post, onClose }) {
  const navigate = useNavigate();
  const title = post?.title || "Upcoming Event";
  const venue = post?.venueName || "";
  const dateStr = fmtDate(post?.date);

  const handleView = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const openKey = post?.eventId || post?.newsfeedId; // prefer eventId to avoid title collisions
    // Router is case-sensitive; your App.jsx route is "/Event"
    if (openKey) navigate('/Event', { state: { open: openKey } });
    else navigate('/Event');
  };
  const handleIcs = () => createICS({ title, start: post?.date, venueName: venue });

  return (
    <section className="announce" onClick={(e) => e.stopPropagation()}>
      <div className="announce__left">
        <div className="announce__eyebrow">MUSEO EVENT</div>
        <div className="announce__title">Upcoming “{title}”</div>
        <div className="announce__meta">{dateStr}{venue ? ` • ${venue}` : ""}</div>
        <div className="announce__ctaRow">
          <button className="btnPrimary" type="button" onClick={handleView}>View details</button>
          <button className="btnGhost" type="button" onClick={handleIcs}>Add to Calendar</button>
        </div>
      </div>
      {onClose && (
        <button className="announce__close" aria-label="Dismiss" onClick={onClose}>✕</button>
      )}
    </section>
  );
}
