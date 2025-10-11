import React from 'react';
import './MuseoLoadingBox.css';

/**
 * Reusable loading component with museum-inspired styling
 * @param {Object} props
 * @param {string} props.message - Loading message to display
 * @param {boolean} props.show - Whether to show the loading box
 * @param {string} props.className - Additional CSS classes
 */
export default function MuseoLoadingBox({ 
  message = "Loading...", 
  show = true, 
  className = "" 
}) {
  if (!show) return null;

  return (
    <div className={`museo-loading-box ${className}`}>
      <div className="museo-loading-content">
        <div className="museo-loading-spinner"></div>
        <p className="museo-loading-message">{message}</p>
      </div>
    </div>
  );
}

// Predefined messages for common use cases
MuseoLoadingBox.messages = {
  artists: "Loading our curated artists…",
  events: "Loading our curated events…",
  gallery: "Loading gallery collection…",
  marketplace: "Loading marketplace items…",
  posts: "Loading posts…",
  profile: "Loading profile…",
  comments: "Loading comments…",
  default: "Loading…"
};
