import db from '../database/db.js';
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import supabase, { createAuthClient } from '../database/db.js';



export const loginUser = async (req, res) => {
  const { access_token, refresh_token } = req.body;

  if (!access_token || !refresh_token) {
    return res.status(400).json({ message: "Missing tokens" });
  }

  try {
    // ✅ Verify access token with a short-lived client to avoid mutating global state
    const authClient = createAuthClient(access_token);
    const { data: user, error } = await authClient.auth.getUser(access_token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // ✅ Store tokens in cookies (match middleware attributes)
    const isProd = process.env.NODE_ENV === "production";
    const base = {
      httpOnly: true,
      sameSite: isProd ? "None" : "Lax",
      secure: isProd ? true : false,
      path: "/",
    };
    res.cookie("access_token", access_token, { ...base, maxAge: 60 * 60 * 1000 });
    res.cookie("refresh_token", refresh_token, { ...base, maxAge: 14 * 24 * 60 * 60 * 1000 });
    return res.json({
      message: "Logged in successfully",
      user: user.user, 
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Change Email (requires authenticated user)
export const changeEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !newEmail.trim()) {
      return res.status(400).json({ message: "New email is required" });
    }

    // Get token from Authorization header (preferred), cookie, or body
    const bearer = req.headers?.authorization || "";
    const tokenFromHeader = bearer.startsWith("Bearer ") ? bearer.substring(7) : null;
    const tokenFromCookie = req.cookies?.access_token || null;
    const tokenFromBody = req.body?.access_token || null;
    const accessToken = tokenFromHeader || tokenFromCookie || tokenFromBody;

    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Resolve current user
    let userEmail = null;
    let userId = null;
    const { data: userRes, error: getUserErr } = await supabase.auth.getUser(accessToken);
    if (!getUserErr && userRes?.user) {
      userId = userRes.user.id;
      userEmail = userRes.user.email;
    } else {
      // Fallback decode JWT for user id
      try {
        const base64Url = accessToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
        userId = payload?.sub || null;
      } catch {}
    }

    // Optional: verify current password if provided
    if (currentPassword && userEmail) {
      try {
        const anonClient = createAuthClient();
        const { error: signInErr } = await anonClient.auth.signInWithPassword({ email: userEmail, password: currentPassword });
        if (signInErr) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      } catch (e) {
        // do not block if sign-in library fails unexpectedly
      }
    }

    // Use user-scoped client so Supabase sends verification to new email
    const authClient = createAuthClient(accessToken);
    const { error: updateErr } = await authClient.auth.updateUser({
      email: newEmail,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
      }
    });

    if (updateErr) {
      return res.status(400).json({ message: updateErr.message || "Failed to start email change" });
    }

    return res.json({
      message: "Verification sent to the new email. Please confirm to complete the change.",
      success: true
    });
  } catch (error) {
    console.error("changeEmail error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Change Password (requires authenticated user)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Get token
    const bearer = req.headers?.authorization || "";
    const tokenFromHeader = bearer.startsWith("Bearer ") ? bearer.substring(7) : null;
    const tokenFromCookie = req.cookies?.access_token || null;
    const tokenFromBody = req.body?.access_token || null;
    const accessToken = tokenFromHeader || tokenFromCookie || tokenFromBody;
    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Resolve user email/id
    let userEmail = null;
    let userId = null;
    const { data: userRes, error: getUserErr } = await supabase.auth.getUser(accessToken);
    if (!getUserErr && userRes?.user) {
      userId = userRes.user.id;
      userEmail = userRes.user.email;
    } else {
      try {
        const base64Url = accessToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
        userId = payload?.sub || null;
      } catch {}
    }

    // Require currentPassword verification
    if (!userEmail) {
      return res.status(401).json({ message: "Unable to resolve user for verification" });
    }
    const anonClient = createAuthClient();
    const { error: signInErr } = await anonClient.auth.signInWithPassword({ email: userEmail, password: currentPassword });
    if (signInErr) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Try user-scoped update first
    const userClient = createAuthClient(accessToken);
    const { error: updErr } = await userClient.auth.updateUser({ password: newPassword });
    if (updErr && updErr.message?.toLowerCase().includes('auth session')) {
      // Fallback to admin update without session
      if (!userId) {
        return res.status(401).json({ message: "Invalid session" });
      }
      const { error: adminErr } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
      if (adminErr) {
        return res.status(400).json({ message: adminErr.message || "Failed to change password" });
      }
    } else if (updErr) {
      return res.status(400).json({ message: updErr.message || "Failed to change password" });
    }

    return res.json({ message: "Password updated successfully", success: true });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "http://localhost:5173/" 
      }
    });

    if (error) {
      console.error("Supabase signUp error:", error.message);
      return res.status(400).json({ error: error.message });
    }


    return res.json({
      message: "User registered successfully",
      user: data.user, 
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Request Password Reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Rate limiting check (optional - can be enhanced with Redis)
    // For now, we'll just proceed with the request

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error.message);
      return res.status(400).json({ message: error.message || "Failed to send reset email" });
    }

    // ✅ Log password reset attempt (optional - for audit trail)
    console.log(`✅ Password reset email sent to: ${email}`);

    return res.json({
      message: "Password reset link sent to your email. Check your inbox!",
      success: true
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again." });
  }
};

// ✅ Reset Password (called after user clicks email link)
export const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    // Validate inputs
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // ✅ Accept access token from Authorization header (preferred),
    //    then fall back to cookies or body if provided.
    const bearer = req.headers?.authorization || "";
    const tokenFromHeader = bearer.startsWith("Bearer ") ? bearer.substring(7) : null;
    const tokenFromCookie = req.cookies?.access_token || null;
    const tokenFromBody = req.body?.access_token || null; // not recommended, but supported
    const accessToken = tokenFromHeader || tokenFromCookie || tokenFromBody;

    if (!accessToken) {
      console.error("❌ No access token provided (header/cookie/body)");
      return res.status(401).json({ message: "Invalid or expired reset link" });
    }

    console.log("✅ Access token provided, resolving user and updating password via admin API...");

    // Resolve user from access token (server-side pattern)
    let userId = null;
    const { data: userRes, error: getUserErr } = await supabase.auth.getUser(accessToken);
    if (!getUserErr && userRes?.user?.id) {
      userId = userRes.user.id;
    } else {
      // Fallback: decode JWT to extract sub (user id)
      try {
        const base64Url = accessToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
        userId = payload?.sub || null;
        if (!userId) throw new Error("sub missing in JWT payload");
        console.log("ℹ️ User ID resolved from JWT payload");
      } catch (e) {
        console.error("❌ Failed to resolve user from token:", getUserErr?.message || e?.message);
        return res.status(401).json({ message: "Invalid or expired reset link" });
      }
    }

    // Update password using Admin API (no session required)
    const { error: adminUpdateErr } = await supabase.auth.admin.updateUserById(userId, { password });
    if (adminUpdateErr) {
      console.error("❌ Password update error (admin):", adminUpdateErr.message);
      return res.status(400).json({ message: adminUpdateErr.message || "Failed to reset password" });
    }

    console.log("✅ Password reset successfully");

    return res.json({
      message: "Password reset successfully!",
      success: true
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again." });
  }
};

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

export async function logout(req, res) {
  const isProd = process.env.NODE_ENV === "production";

  const cookieBase = {
    httpOnly: true,
    path: "/",
    sameSite: isProd ? "None" : "Lax", 
    secure: isProd ? true : false,   
  };

  try {
    const accessToken = req.cookies?.[ACCESS_COOKIE] ?? null;
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? null;

    // Best-effort: bind session; ignore errors
    if (accessToken && refreshToken) {
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } catch (e) {
        // ignore (session may not map)
      }
    }

    // Best-effort revoke; ignore benign errors (e.g., missing session_id)
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      // ignore
    }

    // Always expire cookies; names and attributes must match how you set them at login
    res.cookie(ACCESS_COOKIE, "", { ...cookieBase, expires: new Date(0) });
    res.cookie(REFRESH_COOKIE, "", { ...cookieBase, expires: new Date(0) });

    return res.status(204).send();
  } catch (err) {
    // Still expire on unexpected errors and finish with 204
    res.cookie(ACCESS_COOKIE, "", { ...cookieBase, expires: new Date(0) });
    res.cookie(REFRESH_COOKIE, "", { ...cookieBase, expires: new Date(0) });
    return res.status(204).send();
  }
}

