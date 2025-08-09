import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeJWT } from "../utils/auth";


export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (token){
        const decodedUser = decodeJWT(token);
        if (decodedUser){
          navigate("/Home")
        }
      }
    }, [navigate]); 
  

    const handleLogin = async (e) => {
        e.preventDefault();

    try {
        
        if (password != password2){
            setMessage(data.error || 'Password must match');
            return;
        }

        const res = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username,password,email }),
        });

        const data = await res.json();

        if (!res.ok) {
            setMessage(data.error || 'Login failed');
            return;
        }


        
        navigate('/'); 
    } catch (err) {
      setMessage('Something went wrong');
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <div>
          <label>username</label><br />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Email</label><br />
          <input
            type="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Password</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Confirm Password</label><br />
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
        </div>

        <button type="submit" style={{ marginTop: 15 }}>Register</button>
      </form>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
}
