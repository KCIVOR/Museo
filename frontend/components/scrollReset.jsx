// src/components/ScrollReset.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the scroll position of a container on route change.
 * getEl: function returning the scrollable element (e.g., .app__main)
 * also: optional array of extra elements or getters to reset too (e.g., side rails)
 */
export default function ScrollReset({ getEl, also = [] }) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // main container
    const target = (typeof getEl === "function" && getEl()) ||
                   document.scrollingElement ||
                   document.documentElement;
    if (target?.scrollTo) target.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else if (target) target.scrollTop = 0;

    // optional extras (left/right rails if they scroll)
    for (const refOrFn of also) {
      try {
        const el = typeof refOrFn === "function" ? refOrFn() : refOrFn;
        if (!el) continue;
        if (el.scrollTo) el.scrollTo({ top: 0, left: 0, behavior: "auto" });
        else el.scrollTop = 0;
      } catch {}
    }
  }, [pathname, search]); // fire on route change

  return null;
}
