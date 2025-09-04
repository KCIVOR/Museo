import { useEffect, useState } from "react"; // Import useState
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing login..."); // Add state for message

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

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token, refresh_token }),
      });

      if (!response.ok) {
        setMessage("Failed to establish session with server. Please try again.");
        return;
      }

      console.log("Login process complete");
      localStorage.removeItem('sb-ddkkbtijqrgpitncxylx-auth-token');
      navigate("/home");
    };

    finishLogin();
  }, [navigate]);

  // Show a more informative message
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>{message}</p>
      {/* You can add a spinner or a "Click here" link here */}
    </div>
  );
}