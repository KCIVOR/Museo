import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeJWT } from "../utils/auth";
import './css/LogReg.css'; 



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decodedUser = decodeJWT(token);
      if (decodedUser) {
        navigate("/Home");
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('token', data.token);
      navigate('/Home');
    } catch (err) {
      setMessage('Something went wrong');
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      {/* Left side - Login form */}
      <div className="login-form-section">
        <div className="logo">
          <img
            src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/assets/logo.png"
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
            <button type="submit">Login</button>
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
          src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/assets/login.png"
          alt="Museum"
        />
      </div>
    </div>
  );
}
