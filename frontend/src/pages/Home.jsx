import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeJWT } from '../utils/auth';

function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const token = localStorage.getItem("token");
    
    useEffect(() => {
        const token = localStorage.getItem("token");
        const decodedUser = decodeJWT(token);
        setUser(decodedUser);
    }, [navigate]); //checks if user is authenticated(utils/auth)

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

export default Home;