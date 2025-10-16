import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import SidePanel from "./SidePanel";
import SidePanel2 from "./SidePanel2";
import ScrollToTop from "./ScrollToTop";
import "./Layout.css";
const API = import.meta.env.VITE_API_BASE;
import RequestsModal from "./RequestsModal";
import ToastNotification from "./ToastNotification";

export default function Layout() {
  const { pathname } = useLocation();
  const isMessage = pathname.startsWith("/message");
  const isGallery = pathname === "/Gallery" || pathname === "/gallery";
  const [role, setRole] = useState(null);
  const [requestsOpen, setRequestsOpen] = useState(false);

  useEffect(() => {
    let abort = false;
    const fetchRole = async () => {
      try {
        const res = await fetch(`${API}/users/role`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const cleanRole = typeof data === 'string' ? data.trim() : data;
        if (!abort) setRole(cleanRole);
      } catch (_) {
        if (!abort) setRole(null);
      }
    };
    fetchRole();
    return () => { abort = true; };
  }, []);

  return (
    <div className={`app ${isMessage ? "app--message" : ""} ${isGallery ? "app--gallery" : ""}`}>
      <header className="app__header">
        <Navbar role={role} />
      </header>

      <aside className="app__side-left">
        <SidePanel role={role} onOpenRequests={() => setRequestsOpen(true)} />
      </aside>

      <main className="app__main" role="main">
        <ScrollToTop />
        <Outlet />
      </main>

      {!isGallery && (
        <aside className="app__side-right">
          <SidePanel2 role={role} />
        </aside>
      )}

      <footer className="app__footer" />
      <RequestsModal open={requestsOpen} onClose={() => setRequestsOpen(false)} />
      <ToastNotification />
    </div>
  );
}
