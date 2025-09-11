import { useEffect, useRef } from "react";
import "./Notifications.css";

export default function NotificationsPopover({ onClose }) {
  const popRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const onClick = (e) => { if (!popRef.current?.contains(e.target)) onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  useEffect(() => {
    popRef.current?.querySelector("[tabindex]")?.focus();
  }, []);

  return (
    <div className="notif" role="dialog" aria-label="Notifications" ref={popRef}>
      <div className="notif__header">Notification</div>

      <button className="notif__item" tabIndex={0}>
        <div className="notif__row">
          <div className="notif__title">Transaction Alert</div>
          <div className="notif__time">now</div>
        </div>
        <div className="notif__body">
          Your payment of M1000 for “The Mountains” was successful on 02/14/24.
        </div>
      </button>

      <button className="notif__item" tabIndex={0}>
        <div className="notif__row">
          <div className="notif__title">Auction Reminder</div>
          <div className="notif__time">14:24 PM</div>
        </div>
        <div className="notif__body">
          Place your bid for “Golden Silence” closing in 04:50:23. Don’t miss out!
        </div>
      </button>

      <button className="notif__item" tabIndex={0}>
        <div className="notif__row">
          <div className="notif__title">Event Reminder</div>
          <div className="notif__time">16:36 PM</div>
        </div>
        <div className="notif__body">
          Don’t miss “Art Celebration” on 04/08/24 at Lucena, City. See you there!
        </div>
      </button>
    </div>
  );
}
