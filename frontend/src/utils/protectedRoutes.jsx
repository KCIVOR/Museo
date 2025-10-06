import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
const API = import.meta.env.VITE_API_BASE;

const ProtectedRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); 
  const [profileStatus, setProfileStatus] = useState(null);     
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authRes = await fetch(`${API}/users/me`, {
          method: "GET",
          credentials: "include",
        });

        if (authRes.status !== 200) {
          setIsAuthenticated(false);
          setProfileStatus(null);
          return;
        }

        setIsAuthenticated(true);

        const statRes = await fetch(`${API}/profile/profileStatus`, {
          method: "GET",
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!statRes.ok) {
          setProfileStatus(false);
        } else {
          const json = await statRes.json(); // expects { profileStatus: boolean }
          setProfileStatus(Boolean(json?.profileStatus));
        }
      } catch (e) {
        setIsAuthenticated(false);
        setProfileStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  // 1) Block until checks complete to avoid rendering child routes early
  if (isLoading) return <div>Loading...</div>;

  // 2) Unauthenticated => login
  if (isAuthenticated === false) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 3) Authenticated but incomplete profile => redirect to Home (unless already on Home)
  if (isAuthenticated === true && profileStatus === false) {
    if (location.pathname !== "/Home") {
      return <Navigate to="/Home" replace />;
    }
    // Already on Home: render children so Home can show "complete profile" UI
    return <Outlet />;
  }

  // 4) Authenticated + complete profile => allow access
  return <Outlet />;
};

export default ProtectedRoutes;
