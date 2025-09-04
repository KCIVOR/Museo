
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api", // your backend API
  withCredentials: true // allows cookies (refresh token)
});



// Axios interceptor for handling 401 and refreshing token
api.interceptors.response.use(
  res => res, async err => {
    const originalRequest = err.config;

    // If token expired and request hasn't been retried yet
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint
        const { data } = await axios.get("http://localhost:3000/api/auth/refresh", { withCredentials: true });

        // Save the new access token
        localStorage.setItem("accessToken", data.accessToken);

        // Retry the original request with the new token
        originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        console.error("Refresh token invalid or expired. Redirecting to login...");
        window.location.href = "/";
      }
    }

    return Promise.reject(err);
  }
);

export default api;
