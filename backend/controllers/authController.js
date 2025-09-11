import db from '../database/db.js';
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY );


export const loginUser = async (req, res) => {
  const { access_token, refresh_token } = req.body;

  if (!access_token || !refresh_token) {
    return res.status(400).json({ message: "Missing tokens" });
  }

  try {
    // ✅ Verify access token with Supabase
    const { data: user, error } = await supabase.auth.getUser(access_token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // ✅ Store tokens in cookies
    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 14 * 24 * 60 * 60 * 1000, 
    });
    return res.json({
      message: "Logged in successfully",
      user: user.user, 
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const registerUser = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
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


const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

export async function logout(req, res) {
  const isProd = process.env.NODE_ENV === "production";

  // If FE is on a different origin/port, use SameSite=None;Secure and proper CORS
  const cookieBase = {
    httpOnly: true,
    path: "/",
    sameSite: isProd ? "None" : "Lax", // set to "None" when cross-site
    secure: isProd ? true : false,     // must be true with SameSite=None over HTTPS
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