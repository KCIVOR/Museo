import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/LogReg.css'; 



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isValid, setIsValidToken] = useState('')
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('accessToken');
      if(!token){
        try {
          const refreshResponse = await fetch(
            "http://localhost:3000/api/auth/refresh",
            {
              method: "GET",
              credentials: "include", // send httpOnly cookie
            }
          );

          if (!refreshResponse.ok) {
            setIsValidToken(false);
            return;
          }

          navigate('/home')
        } catch (error) {
          console.error("Refresh token error:", error);
          setIsValidToken(false);
          return;
        }
      }
      navigate("/home")
    }
    checkToken();
  }, [navigate]);


  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email }),
        credentials: 'include',
      });


      

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      
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