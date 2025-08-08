import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Homepage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token) {
        navigate('/'); // Redirect to login if no token
        } else {
        setUser(JSON.parse(storedUser)); // Set user info
        }
    }, []);



    return (
        <div>
        <h1>Welcome to Homepage</h1>
        {user && (
            <p>
            Logged in as: <strong>{user.name || user.email}</strong>
            </p>
        )}
        </div>
    );
}

export default Homepage;