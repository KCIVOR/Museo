import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import MuseoLoadingPage from "../../components/MuseoLoadingPage";
const API = import.meta.env.VITE_API_BASE;

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing login...");

  useEffect(() => {
    const finishLogin = async () => {
      const { data, error } = await supabase.auth.getSession();

      // Handle errors or no session
      if (error || !data.session) {
        setMessage("Authentication failed or session expired. Please try logging in again.");
        // Optional: Redirect to login after a delay
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      const { access_token, refresh_token } = data.session;

      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token, refresh_token }),
      });

      if (!response.ok) {
        setMessage("Failed to establish session with server. Please try again.");
        return;
      }

      // ✅ Session stored successfully
      // Note: ProtectedRoutes will populate UserContext automatically
      console.log("✅ OAuth Callback: Session stored, navigating to home...");
      
      localStorage.removeItem('sb-ddkkbtijqrgpitncxylx-auth-token');
      navigate("/home");
    };

    finishLogin();
  }, [navigate]);

  // Show loading page while processing auth
  return <MuseoLoadingPage />;
}