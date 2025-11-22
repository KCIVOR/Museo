import { useEffect, useState, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import MuseoLoadingPage from "../components/MuseoLoadingPage";
const API = import.meta.env.VITE_API_BASE;

const ProtectedRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); 
  const [profileStatus, setProfileStatus] = useState(null);
  const [preferenceStatus, setPreferenceStatus] = useState(null);     
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  
  // Get refreshUserData from UserContext but don't use its state
  const { refreshUserData } = useUser();
  const hasRefreshed = useRef(false); // Track if we've refreshed for this SESSION (not per route)
  const hasCompletedInitialCheck = useRef(false); // Track if we've finished the very first auth check

  // DON'T reset hasRefreshed when location changes
  // This way, UserContext is only populated ONCE per session, not on every route change

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
        
        // After successful auth, refresh UserContext data ONCE
        if (!hasRefreshed.current) {
          hasRefreshed.current = true;
          console.log('🔒 ProtectedRoutes: Refreshing UserContext...');
          try {
            await refreshUserData(); // Populate UserContext with user data
            console.log('✅ ProtectedRoutes: UserContext refreshed successfully');
          } catch (err) {
            console.error('❌ ProtectedRoutes: Failed to refresh user data:', err);
            // Don't fail auth check if UserContext refresh fails
          }
        } else {
          console.log('ℹ️ ProtectedRoutes: UserContext already refreshed, skipping...');
        }
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
          setPreferenceStatus(null);
        } else {
          const json = await statRes.json(); // expects { profileStatus: boolean }
          setProfileStatus(Boolean(json?.profileStatus));

          // If profile is complete, check art preferences
          if (json?.profileStatus) {
            try {
              const prefRes = await fetch(`${API}/profile/artPreferenceStatus`, {
                method: "GET",
                credentials: "include",
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              });

              if (!prefRes.ok) {
                setPreferenceStatus(false);
              } else {
                const prefJson = await prefRes.json();
                setPreferenceStatus(Boolean(prefJson?.preferenceStatus));
              }
            } catch (prefError) {
              console.error("Error checking preferences:", prefError);
              setPreferenceStatus(false);
            }
          } else {
            setPreferenceStatus(null);
          }
        }
      } catch (e) {
        setIsAuthenticated(false);
        setProfileStatus(null);
      } finally {
        setIsLoading(false);
        // Mark that we have completed the first check; subsequent path changes
        // should not block rendering with a full-screen loading page.
        if (!hasCompletedInitialCheck.current) {
          hasCompletedInitialCheck.current = true;
        }
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Only re-run when pathname changes, not when refreshUserData changes

  // 1) Block until checks complete to avoid rendering child routes early
  // Show the full-screen loading page ONLY on the very first auth check.
  if (isLoading && !hasCompletedInitialCheck.current) return <MuseoLoadingPage />;

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

  // 4) Authenticated + complete profile but incomplete preferences => redirect to Home (unless already on Home)
  if (isAuthenticated === true && profileStatus === true && preferenceStatus === false) {
    if (location.pathname !== "/Home") {
      return <Navigate to="/Home" replace />;
    }
    // Already on Home: render children so Home can show "complete preferences" UI
    return <Outlet />;
  }

  // 5) Authenticated + complete profile + complete preferences => allow access
  return <Outlet />;
};

export default ProtectedRoutes;
