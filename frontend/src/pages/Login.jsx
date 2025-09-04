import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supabase/supabaseClient";
import './css/LogReg.css'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setMessage(error?.message || "Login failed.");
      return;
    }

    const { access_token, refresh_token } = data.session;
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ access_token, refresh_token }),
    });


    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(result.message || "Failed to store session");
      return;
    }

    alert("Logged in!");
    localStorage.removeItem('sb-ddkkbtijqrgpitncxylx-auth-token');
    navigate('/home')

  };

  // Google OAuth login
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: "http://localhost:5173/auth/callback", // redirect after login, di kana babalikan
      },
    });

    if (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="login-container">
      {/* Left side - Login form */}
      <div className="login-form-section">
        <div className="logo">
          <img
            src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/logo.png"
            alt="Museo Logo"
          />
        </div>

        <h1>LOGIN</h1>
        <form onSubmit={handleLogin}>
          <label>Email Address</label>
          <input
            type="email"
            placeholder="yourname@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

          <div className="forgot-password">Forgot your password?</div>

          <div className="button-group">
            <button type="submit">Login with Email</button>
            <button type="button" onClick={handleGoogleLogin}>
              Continue with Google
            </button>
          </div>
        </form>

        {message && <p className="error-msg">{message}</p>}

        <div className="signup-text">
          Create Account? <span onClick={() => navigate('/Register')}>Register</span>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="login-image-section">
        <img
          src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/login.png"
          alt="Museum"
        />
      </div>
    </div>
  );
}
