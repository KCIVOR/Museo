import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
const API = import.meta.env.VITE_API_BASE;

/**
 * AdminRoute - Protects routes that require admin access
 * Checks if user is authenticated AND has admin role
 */
const AdminRoute = () => {
  const [isAdmin, setIsAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch(`${API}/users/role`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          // Not authenticated or error
          setIsAdmin(false);
          return;
        }

        const role = await response.json();
        setIsAdmin(role === 'admin');
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [location.pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '18px',
        color: 'var(--museo-text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  // Not admin - show access denied message
  if (isAdmin === false) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--museo-space-6)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(244, 67, 54, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--museo-space-5)'
        }}>
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#f44336" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>
        
        <h1 style={{
          fontSize: 'var(--museo-font-size-3xl)',
          fontWeight: 'var(--museo-font-weight-bold)',
          color: 'var(--museo-text-primary)',
          marginBottom: 'var(--museo-space-3)',
          fontFamily: 'var(--museo-font-family-display)'
        }}>
          Access Denied
        </h1>
        
        <p style={{
          fontSize: 'var(--museo-font-size-lg)',
          color: 'var(--museo-text-secondary)',
          marginBottom: 'var(--museo-space-2)',
          maxWidth: '500px'
        }}>
          You don't have permission to access this page.
        </p>
        
        <p style={{
          fontSize: 'var(--museo-font-size-base)',
          color: 'var(--museo-text-muted)',
          marginBottom: 'var(--museo-space-6)'
        }}>
          This area is restricted to administrators only.
        </p>

        <button 
          onClick={() => navigate('/Home')}
          className="btn btn-primary"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Is admin - allow access
  return <Outlet />;
};

export default AdminRoute;
