import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import ForgotPasswordModal from "./ForgotPasswordModal";
import "../../styles/components/auth-pages.css";
const API = import.meta.env.VITE_API_BASE;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      setMessage(error?.message || "Login failed.");
      return;
    }

    const { access_token, refresh_token } = data.session;
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ access_token, refresh_token })
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(result.message || "Failed to store session");
      return;
    }

    // ✅ Session stored successfully
    // Note: ProtectedRoutes will populate UserContext automatically
    console.log('✅ Login: Session stored, navigating to home...');

    localStorage.removeItem("sb-ddkkbtijqrgpitncxylx-auth-token");
    navigate("/home");
  };

  // Google OAuth login
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "http://localhost:5173/auth/callback" }
    });
    if (error) setMessage(error.message);
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

          <h1 className="auth-title">Sign in</h1>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-form-field">
              <label className="museo-label">Email</label>
              <input
                type="email"
                className="museo-input"
                placeholder="yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-form-field">
              <label className="museo-label">Password</label>
              <input
                type="password"
                className="museo-input"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div 
              onClick={() => setShowForgotPassword(true)}
              className="auth-link"
            >
              Forgot your password?
            </div>

            <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
              Sign in
            </button>

            <div className="auth-divider">or</div>

            <button 
              className="btn btn-secondary btn-sm" 
              type="button" 
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.62 32.659 29.17 36 24 36 16.82 36 11 30.18 11 23S16.82 10 24 10c3.59 0 6.84 1.37 9.31 3.6l5.66-5.66C35.89 4.05 30.28 2 24 2 11.85 2 2 11.85 2 24s9.85 22 22 22c11 0 21-8 21-22 0-1.33-.14-2.62-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.676 16.112 18.961 13 24 13c3.59 0 6.84 1.37 9.31 3.6l5.66-5.66C35.89 4.05 30.28 2 24 2 16.318 2 9.656 6.098 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 46c5.09 0 9.76-1.94 13.28-5.12l-6.14-5.17C29.79 37.37 27.05 38.5 24 38.5 18.86 38.5 14.43 35.19 12.71 30.82l-6.49 5.01C9.51 42.91 16.23 46 24 46z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.64 4.659-6.09 8-11.303 8-5.14 0-9.57-3.31-11.29-7.68l-6.49 5.01C9.51 42.91 16.23 46 24 46c11 0 21-8 21-22 0-1.33-.14-2.62-.389-3.917z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {message && (
              <div className="auth-message auth-message--error">
                {message}
              </div>
            )}
          </form>

          <div className="auth-footer">
            Don't have an account?{" "}
            <span 
              onClick={() => navigate("/register")}
              className="auth-footer-link"
            >
              Register
            </span>
          </div>
        </div>

        {/* Right column: image */}
        <div 
          className="auth-image-section"
          style={{
            backgroundImage: `url('https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/login.png')`
          }}
        />
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </div>
  );
}
