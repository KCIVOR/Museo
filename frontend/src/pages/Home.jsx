import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode"; 

function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        const token = localStorage.getItem("accessToken");

        try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        } catch (err) {
        console.error("Invalid token:", err);
        navigate("/");
        }
    }, [navigate]);


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