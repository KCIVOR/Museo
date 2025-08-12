import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoutes = () => {
  const [isValidToken, setIsValidToken] = useState(null); 

  useEffect(() => {
    const verifyToken = async () => {
      let accessToken = localStorage.getItem("accessToken");

      // If no access token, try refreshing
      if (!accessToken) {
        try {
          const refreshResponse = await fetch(
            "http://localhost:3000/api/auth/refresh",
            {
              method: "GET",
              credentials: "include", // send httpOnly cookie
            }
          );

          if (!refreshResponse.ok) {
            setIsValidToken(false);
            return;
          }

          const refreshData = await refreshResponse.json();
          accessToken = refreshData.accessToken;
          localStorage.setItem("accessToken", accessToken);
        } catch (error) {
          console.error("Refresh token error:", error);
          setIsValidToken(false);
          return;
        }
      }

      // Now verify the (new or old) access token
      try {
        const response = await fetch("http://localhost:3000/api/auth/verify", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValidToken(true);
        } else {
          // Token invalid, remove it and try to refresh once more
          localStorage.removeItem("accessToken");

          try {
            const refreshResponse = await fetch(
              "http://localhost:3000/api/auth/refresh",
              {
                method: "GET",
                credentials: "include",
              }
            );

            if (!refreshResponse.ok) {
              setIsValidToken(false);
              return;
            }

            const refreshData = await refreshResponse.json();
            accessToken = refreshData.accessToken;
            localStorage.setItem("accessToken", accessToken);

            // Verify again with the new token
            const verifyResponse = await fetch(
              "http://localhost:3000/api/auth/verify",
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                credentials: "include",
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.valid) {
              setIsValidToken(true);
            } else {
              setIsValidToken(false);
              localStorage.removeItem("accessToken");
            }
          } catch (refreshError) {
            console.error("Refresh token error:", refreshError);
            setIsValidToken(false);
            return;
          }
        }
      } catch (error) {
        console.error("Token verification failed:", error);
        setIsValidToken(false);
        localStorage.removeItem("accessToken");
      }
    };

    verifyToken();
  }, []);

  if (isValidToken === null) {
    return;
  }

  return isValidToken ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoutes;
