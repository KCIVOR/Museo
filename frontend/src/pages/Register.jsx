import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import "./css/LogReg.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== password2) {
      setMessage("Passwords must match");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setMessage("Email already registered. Please login instead.");
        } else {
          setMessage(data.error || "Registration failed");
        }
        return;
      }

      setMessage("Confirmation email sent!");
    } catch (err) {
      setMessage("Something went wrong");
    }
  };

  // Google OAuth signup/login
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "http://localhost:5173/auth/callback" }
    });
    if (error) setMessage(error.message);
  };

  return (
    <div className="loginShell">
      <div className="loginCard2">
        {/* Left column: form */}
        <div className="loginLeft">
          <div className="logo">
            <img
              src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/logo.png"
              alt="Museo Logo"
            />
          </div>

          <h1>Create account</h1>

          <form onSubmit={handleRegister}>
            <label>Email</label>
            <input
              type="email"
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Username</label>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label>Confirm password</label>
            <input
              type="password"
              placeholder="********"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />

            <div className="button-group">
              <button type="submit">Create account</button>
            </div>
            <div className="or-txt">or</div>
            <button className="lrGoogleBtn" type="button" onClick={handleGoogleLogin}>
              <span className="gIcon" aria-hidden="true">
                {/* Google SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.62 32.659 29.17 36 24 36 16.82 36 11 30.18 11 23S16.82 10 24 10c3.59 0 6.84 1.37 9.31 3.6l5.66-5.66C35.89 4.05 30.28 2 24 2 11.85 2 2 11.85 2 24s9.85 22 22 22c11 0 21-8 21-22 0-1.33-.14-2.62-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.676 16.112 18.961 13 24 13c3.59 0 6.84 1.37 9.31 3.6l5.66-5.66C35.89 4.05 30.28 2 24 2 16.318 2 9.656 6.098 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 46c5.09 0 9.76-1.94 13.28-5.12l-6.14-5.17C29.79 37.37 27.05 38.5 24 38.5 18.86 38.5 14.43 35.19 12.71 30.82l-6.49 5.01C9.51 42.91 16.23 46 24 46z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.64 4.659-6.09 8-11.303 8-5.14 0-9.57-3.31-11.29-7.68l-6.49 5.01C9.51 42.91 16.23 46 24 46c11 0 21-8 21-22 0-1.33-.14-2.62-.389-3.917z"/>
                </svg>
              </span>
              <span>Continue with Google</span>
            </button>

            {message && <div className="error-msg">{message}</div>}
          </form>

          <div className="signup-text">
            Already have an account?{" "}
            <span onClick={() => navigate("/")}>Sign in</span>
          </div>
        </div>

        {/* Right column: image */}
        <div className="loginRight">
          <img
            src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/login.png"
            alt="Welcome"
          />
        </div>
      </div>
    </div>
  );
}
