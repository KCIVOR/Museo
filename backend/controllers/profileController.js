// controllers/profileController.js
import { createClient } from "@supabase/supabase-js";
import supabase from "../database/db.js";


// GET profile (unchanged behavior)
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: profile, error } = await supabase
      .from("profile")
      .select("*")
      .eq("userId", userId)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ profile });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Helper: privileged client for Storage uploads (mirrors homepage.js)
function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key);
}

// POST /api/profile/updateProfile
// Accepts multipart/form-data with optional files: avatar, cover
// Also accepts text fields: firstName, middleName, lastName, bio, about, birthdate, address, sex
export const uploadProfileMedia = async (req, res) => {
  try {
    console.log("uploadProfileMedia - req.user:", req.user);
    console.log("uploadProfileMedia - req.files:", req.files);
    console.log("uploadProfileMedia - req.body:", req.body);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.id;
    console.log("uploadProfileMedia - userId:", userId);
    const svc = serviceClient();
    const files = req.files || {};
    const uploaded = { avatarUrl: null, coverUrl: null };

    async function uploadOne(fieldName, targetKey) {
      const f = files[fieldName]?.[0];
      if (!f) return;
      const safeName = f.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `pics/${userId}/${fileName}`;
      const { data, error } = await svc.storage
        .from("uploads")
        .upload(filePath, f.buffer, { contentType: f.mimetype, upsert: false });
      if (error) throw error;
      const pub = svc.storage.from("uploads").getPublicUrl(data.path);
      uploaded[targetKey] = pub?.data?.publicUrl || null;
    }

    // Do uploads if provided
    await uploadOne("avatar", "avatarUrl");
    await uploadOne("cover", "coverUrl");

    // Collect text fields
    console.log("uploadProfileMedia - req.body:", req.body);
    const {
      firstName,
      middleName,
      lastName,
      bio,
      about,
      birthdate,
      address,
      sex,
    } = req.body;

    // Build patch (only include URLs when new uploads exist)
    const patch = {
      firstName,
      middleName,
      lastName,
      bio,
      about,
      birthdate,
      address,
      sex,
      profileStatus: true,
    };
    if (uploaded.avatarUrl) patch.profilePicture = uploaded.avatarUrl;
    if (uploaded.coverUrl) patch.coverPicture = uploaded.coverUrl;

    // Update or create profile
    console.log("Profile update data:", { ...patch, userId });
    
    // First try to update existing profile
    const { data: existingProfile, error: updateError } = await supabase
      .from("profile")
      .update(patch)
      .eq("userId", userId)
      .select()
      .single();
    
    if (updateError && updateError.code === 'PGRST116') {
      // No existing profile found, create new one
      console.log("No existing profile found, creating new one");
      const { data: newProfile, error: insertError } = await supabase
        .from("profile")
        .insert({ ...patch, userId })
        .select()
        .single();
      
      if (insertError) {
        console.error("Profile insert error:", insertError);
        throw insertError;
      }
      
      console.log("Profile created successfully:", newProfile);
      return res.status(200).json({ message: "Profile created", profile: newProfile, uploaded });
    } else if (updateError) {
      console.error("Profile update error:", updateError);
      throw updateError;
    }
    
    console.log("Profile updated successfully:", existingProfile);

    return res.status(200).json({ message: "Profile updated", profile: existingProfile, uploaded });
  } catch (err) {
    console.error("uploadProfileMedia error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const profileStatus = async (req, res) => {
  try{
    console.log("profileStatus - req.user:", req.user);
    console.log("profileStatus - req.user.id:", req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.id;
    const { data: profile, error } = await supabase
      .from("profile")
      .select("profileStatus")
      .eq("userId", userId)
      .maybeSingle(); // Use maybeSingle instead of single to handle no records

    console.log("profileStatus - Supabase response:", { data: profile, error });

    if (error) {
      console.error("profileStatus - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // If no profile exists, return false
    if (!profile) {
      console.log("profileStatus - No profile found, returning false");
      return res.status(200).json({ profileStatus: false });
    }

    const result = { profileStatus: profile.profileStatus || false };
    console.log("profileStatus - Final result:", result);
    return res.status(200).json(result);
    
  }catch(err){
    console.error("profileStatus error:", err);
    return res.status(500).json({ error: err.message });
  }
}