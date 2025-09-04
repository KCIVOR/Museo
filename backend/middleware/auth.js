import { createClient } from "@supabase/supabase-js";
import { jwtDecode } from 'jwt-decode';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const authMiddleware = async (req, res, next) => {
  try {
    // Prevent infinite refresh loops
    if (req.authProcessed) return next();
    req.authProcessed = true; // Mark this request as already processed

    // Kunin ang access at refresh token mula sa cookies
    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    // Kung walang access token(wala token sa cookie)
    if (!accessToken) {
      if (!refreshToken) {
        return res.status(401).json({ error: "No tokens provided" });
      }

      // Try i-refresh ang session gamit ang refresh token
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) {
        return res.status(401).json({ error: "Refresh token invalid or expired" });
      }

      // Kung successful, iupdate ang cookies
      res.cookie("access_token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 60 * 60 * 1000,
      });

      res.cookie("refresh_token", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      req.user = data.user;
      console.log("Access token refreshed via refresh_token");
      return next();
    }

    // Decode ang access token para i-check expiration
    let decoded;
    try {
      decoded = jwtDecode(accessToken);
    } catch (decodeError) {
      console.warn("Failed to decode access token, trying refresh...");
      decoded = null;
    }

    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 60; // 1 minute buffer bago actual expiry
    const isExpired = !decoded || decoded.exp <= (now + bufferSeconds);

    // Kung expired na or malapit nang mag-expire
    if (isExpired) {
      if (!refreshToken) {
        return res.status(401).json({ error: "Access token expired and no refresh token" });
      }

      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) {
        return res.status(401).json({ error: "Session expired. Please login again." });
      }

      res.cookie("access_token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 60 * 60 * 1000,
      });

      res.cookie("refresh_token", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      req.user = data.user;
      console.log("♻️ Token auto-refreshed due to expiry");
      return next();
    }

    // Access token valid pa — verify sa Supabase
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return res.status(401).json({ 
        error: "Authentication invalid",
        code: "AUTH_INVALID",
        redirect: true
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err);
    return res.status(500).json({ error: "Server error during authentication" });
  }
};
