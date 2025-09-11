import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import SidePanel from "./SidePanel";
import SidePanel2 from "./SidePanel2";
import ScrollToTop from "./ScrollToTop";
import "./Layout.css";

export default function Layout() {
  const { pathname } = useLocation();
  const isMessage = pathname.startsWith("/message");

  return (
    <div className={`app ${isMessage ? "app--message" : ""}`}>
      <header className="app__header">
        <Navbar />
      </header>

      <aside className="app__side-left">
        <SidePanel />
      </aside>

      <main className="app__main" role="main">
        <ScrollToTop />
        <Outlet />
      </main>

      <aside className="app__side-right">
        <SidePanel2 />
      </aside>

      <footer className="app__footer" />
    </div>
  );
}
