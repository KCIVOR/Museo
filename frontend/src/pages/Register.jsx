import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supabase/supabaseClient"; 

import './css/LogReg.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

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
        body: JSON.stringify({ email, password, username }),
      });

      const data = await res.json();

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
      <div className="login-form-section">
        <div className="logo">
          <img
            src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/logo.png"
            alt="Museo Logo"
          />
        </div>

        <h1>Register</h1>
        <form onSubmit={handleRegister}>
          <label>Username</label>
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

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

          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="********"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />

          <div className="button-group">
            <button type="submit">Register</button>
            <button type="button" onClick={handleGoogleLogin}>
              Continue with Google
            </button>
          </div>
        </form>

        {message && <p className="error-msg">{message}</p>}

        <div className="signup-text">
          Already have an account? <span onClick={() => navigate('/')}>Login</span>
        </div>
      </div>

      {/* Right side - image */}
      <div className="login-image-section">
        <img
          src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/login.png"
          alt="Museum"
        />
      </div>
    </div>
  );
}
