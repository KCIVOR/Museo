import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import "../../styles/components/auth-pages.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [isLoading, setIsLoading] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [resetAccessToken, setResetAccessToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid session from the reset link
    const checkSession = async () => {
      try {
        // ✅ Get the current session (Supabase sets this when user clicks email link)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("❌ Session error:", error);
          setMessage("Invalid or expired reset link. Please request a new one.");
          setMessageType("error");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (data?.session) {
          // ✅ Session exists - user clicked valid email link
          console.log("✅ Valid session found for password reset");
          setIsValidLink(true);
          
          // ✅ Store session in Supabase client so it's available for API calls
          await supabase.auth.setSession(data.session);
          setResetAccessToken(data.session.access_token);
        } else {
          // ❌ No session - try to extract token from URL hash
          const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
          const params = new URLSearchParams(hash);
          const at = params.get('access_token');
          const rt = params.get('refresh_token');
          const type = params.get('type');
          if (at) {
            console.log("ℹ️ Using access_token from URL hash");
            setResetAccessToken(at);
            setIsValidLink(true);
            // Try to establish Supabase session if refresh token is present
            if (rt) {
              try {
                await supabase.auth.setSession({ access_token: at, refresh_token: rt });
              } catch (e) {
                console.warn("setSession from hash failed (continuing with header token)", e);
              }
            }
          } else {
            console.error("❌ No session/token found in URL");
            setMessage("Invalid or expired reset link. Please request a new one.");
            setMessageType("error");
            setTimeout(() => navigate("/login"), 3000);
          }
        }
      } catch (err) {
        console.error("❌ Session check error:", err);
        setMessage("Invalid or expired reset link. Please request a new one.");
        setMessageType("error");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    checkSession();
  }, [navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");

    // Validation
    if (!password || !confirmPassword) {
      setMessage("Please fill in all fields");
      setMessageType("error");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long");
      setMessageType("error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    try {
      const API = import.meta.env.VITE_API_BASE;
      // ✅ Get access token from current Supabase session
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token || resetAccessToken || null;

      const headers = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const response = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers,
        credentials: "include",
        // Also send token in body as fallback for non-header environments
        body: JSON.stringify({ password, confirmPassword, access_token: accessToken })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to reset password");
        setMessageType("error");
      } else {
        setMessage("Password reset successfully! Redirecting to login...");
        setMessageType("success");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("An error occurred. Please try again.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Left column: form */}
        <div className="auth-form-section">
          <div className="auth-logo">
            <img
              src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/Museo.png"
              alt="Museo Logo"
            />
          </div>

          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your new password below</p>

          {isValidLink ? (
            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="auth-form-field">
                <label className="museo-label">New Password</label>
                <input
                  type="password"
                  className="museo-input"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="auth-form-field">
                <label className="museo-label">Confirm Password</label>
                <input
                  type="password"
                  className="museo-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: "100%" }}
                onClick={() => navigate("/login")}
                disabled={isLoading}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <div className="auth-message auth-message--error">
              {message}
            </div>
          )}
        </div>

        {/* Right column: image */}
        <div
          className="auth-image-section"
          style={{
            backgroundImage: `url('https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/login.png')`,
          }}
        />
      </div>
    </div>
  );
}
