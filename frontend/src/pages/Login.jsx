import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/Homepage'); 
    }
  }, []);


  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Login failed');
        return;
      }

      setMessage(`Welcome, ${data.user.email}`);

      localStorage.setItem('token', data.token); 
      localStorage.setItem('user', JSON.stringify(data.user));


      navigate('/Homepage'); 
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
          <label>Email</label><br />
          <input
            type="email"
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

        <button type="submit" style={{ marginTop: 15 }}>Login</button>
      </form>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
}

export default App;
