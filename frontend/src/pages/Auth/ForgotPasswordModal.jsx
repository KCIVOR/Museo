import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import "../../styles/components/auth-pages.css";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: Success message

  const handleSendReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const API = import.meta.env.VITE_API_BASE;
      const response = await fetch(`${API}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to send reset email");
        setMessageType("error");
      } else {
        setMessage(data.message || "Password reset link sent to your email. Check your inbox!");
        setMessageType("success");
        setStep(2);
        setEmail("");
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("An error occurred. Please try again.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setMessage("");
    setMessageType("");
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="forgot-password-modal" onClick={handleClose}>
      <div className="forgot-password-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="forgot-password-modal-close" onClick={handleClose}>
          ✕
        </button>

        {step === 1 ? (
          <>
            <h2 className="forgot-password-modal-title">Reset Password</h2>
            <p className="forgot-password-modal-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSendReset} className="auth-form">
              <div className="auth-form-field">
                <label className="museo-label">Email Address</label>
                <input
                  type="email"
                  className="museo-input"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {message && (
                <div className={`auth-message ${messageType === "error" ? "auth-message--error" : "auth-message--success"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ width: "100%" }}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: "100%" }}
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="forgot-password-success">
              <div className="forgot-password-success-icon">✓</div>
              <h2 className="forgot-password-success-title">Check Your Email</h2>
              <p className="forgot-password-success-message">
                We've sent a password reset link to your email. Click the link to create a new password.
              </p>
              <p className="forgot-password-success-note">
                The link expires in 24 hours.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ width: "100%", marginTop: "var(--museo-space-6)" }}
              onClick={handleClose}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
