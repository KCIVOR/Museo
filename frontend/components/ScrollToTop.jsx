// src/components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset scroll for the whole window
    window.scrollTo(0, 0);

    // If you want only the center main to reset:
    const main = document.querySelector(".app__main");
    if (main) {
      main.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
