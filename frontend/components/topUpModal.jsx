import { useEffect, useRef, useState } from "react";
import "./TopUpModal.css";

export default function TopUpModal({ onClose, onConfirm }) {
  const dialogRef = useRef(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("ewallet"); // 'ewallet' | 'card'
  const [wallet, setWallet] = useState("gcash");   // 'gcash' | 'paymaya' | 'paypal'

  // Close on Esc
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus first input
  useEffect(() => {
    dialogRef.current?.querySelector("input, button")?.focus();
  }, []);

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    onConfirm({ amount: value, method, wallet });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="topup modal-content" role="dialog" aria-modal="true" aria-labelledby="topup-title" ref={dialogRef}>
        <div className="topup__header">
          <h2 id="topup-title">Top Up Credits</h2>
          <button className="topup__close" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div className="topup__group">
          <label className="topup__label">Enter amount</label>
          <input
            className="topup__input"
            type="number"
            min="1"
            step="1"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="topup__group">
          <label className="topup__label">Choose payment method</label>
          <div className="topup__tabs">
            <button
              className={`topup__tab ${method === "ewallet" ? "is-active" : ""}`}
              onClick={() => setMethod("ewallet")}
              type="button"
            >
              E‑Wallet
            </button>
            <button
              className={`topup__tab ${method === "card" ? "is-active" : ""}`}
              onClick={() => setMethod("card")}
              type="button"
            >
              Credit Card
            </button>
          </div>
        </div>

        {method === "ewallet" ? (
          <div className="topup__list">
            <button className={`topup__option ${wallet === "gcash" ? "is-selected" : ""}`} onClick={() => setWallet("gcash")}>
              <span className="topup__brand topup__brand--gcash">G</span>
              <span className="topup__name">Gcash</span>
              <span className="topup__masked">09••••••66</span>
            </button>
            <button className={`topup__option ${wallet === "paymaya" ? "is-selected" : ""}`} onClick={() => setWallet("paymaya")}>
              <span className="topup__brand topup__brand--paymaya">P</span>
              <span className="topup__name">Paymaya</span>
              <span className="topup__masked">09••••••66</span>
            </button>
            <button className={`topup__option ${wallet === "paypal" ? "is-selected" : ""}`} onClick={() => setWallet("paypal")}>
              <span className="topup__brand topup__brand--paypal">P</span>
              <span className="topup__name">PayPal</span>
              <span className="topup__masked">••••</span>
            </button>
          </div>
        ) : (
          <div className="topup__card">
            <input className="topup__input" placeholder="Card number" inputMode="numeric" />
            <div className="topup__row">
              <input className="topup__input" placeholder="MM/YY" />
              <input className="topup__input" placeholder="CVC" />
            </div>
            <input className="topup__input" placeholder="Name on card" />
          </div>
        )}

        <div className="topup__footer">
          <button className="topup__confirm" type="button" onClick={submit} disabled={!amount || Number(amount) <= 0}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
