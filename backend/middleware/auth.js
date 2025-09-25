import { jwtDecode } from "jwt-decode";
import supabase, { createAuthClient } from "../database/db.js";

const isProd = process.env.NODE_ENV === "production";

function setSessionCookies(res, { access_token, refresh_token }) {
  const isProd = process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    sameSite: isProd ? "None" : "Lax",
    secure: isProd ? true : false,
    path: "/",
  };
  res.cookie("access_token", access_token, {
    ...base,
    maxAge: 60 * 60 * 1000,
  });
  if (refresh_token) {
    res.cookie("refresh_token", refresh_token, {
      ...base,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
  }
}

async function resolveUserFromAccess(accessToken) {
  const authClient = createAuthClient(accessToken);
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data?.user) throw new Error(error?.message || "User not found");
  return data.user;
}

export const authMiddleware = async (req, res, next) => {
  try {
    if (req.authProcessed) return next();
    req.authProcessed = true;

    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    // No access token
    if (!accessToken) {
      if (!refreshToken) {
        return res.status(401).json({ error: "No tokens provided" });
      }
      // Refresh session
      const authClient = createAuthClient();
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data?.session) {
        return res.status(401).json({ error: "Refresh token invalid or expired" });
      }
      const session = data.session;
      setSessionCookies(res, session);
      const user = await resolveUserFromAccess(session.access_token);
      req.user = user;
      console.log("Auth: refreshed via missing access token; user:", user.id);
      return next();
    }

    // Check expiry
    let decoded = null;
    try {
      decoded = jwtDecode(accessToken);
    } catch (e) {
      console.warn("Auth: decode failed; will attempt refresh");
    }
    const now = Math.floor(Date.now() / 1000);
    const buffer = 60;
    const expiring = !decoded || decoded.exp <= (now + buffer);

    if (expiring) {
      if (!refreshToken) {
        return res.status(401).json({ error: "Access token expired and no refresh token" });
      }
      const authClient = createAuthClient();
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data?.session) {
        return res.status(401).json({ error: "Session expired. Please login again." });
      }
      const session = data.session;
      setSessionCookies(res, session);
      const user = await resolveUserFromAccess(session.access_token);
      req.user = user;
      console.log("♻️ Auth: token auto-refreshed; user:", user.id);
      return next();
    }

    // Access token valid; verify user
    const user = await resolveUserFromAccess(accessToken);
    req.user = user;
    // console.log("Auth: valid access; user:", user.id);
    return next();

  } catch (err) {
    console.error("❌ Auth middleware error:", err);
    return res.status(500).json({ error: "Server error during authentication" });
  }
};
