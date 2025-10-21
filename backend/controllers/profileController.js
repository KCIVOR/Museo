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

// POST /api/profile/uploadArt
// Accepts multipart/form-data with files field: images; text: title, description, medium, categories
export const uploadArt = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const files = req.files || [];
    const { title = "", description = "", medium = "", categories = "[]" } = req.body || {};
    if (files.length === 0) return res.status(400).json({ error: "At least one image is required" });

    const userId = req.user.id;
    const svc = serviceClient();

    // Parse categories
    let parsedCategories;
    try {
      parsedCategories = JSON.parse(categories);
    } catch (error) {
      parsedCategories = ["Digital Art"]; // Default fallback
    }

    // Upload all images to Supabase storage
    const uploadedUrls = [];
    
    for (const file of files) {
      const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";
      const fileName = `${Date.now()}-${Math.random()}-${safeName}`;
      const filePath = `pics/${userId}/${fileName}`;

      const { data: up, error: upErr } = await svc.storage
        .from("uploads")
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (upErr) return res.status(500).json({ error: upErr.message });

      const pub = svc.storage.from("uploads").getPublicUrl(up.path);
      const imageUrl = pub?.data?.publicUrl;
      
      if (imageUrl) {
        uploadedUrls.push(imageUrl);
      }
    }

    // Use art table with correct schema (no categories field)
    const artworkData = {
      title: title.trim(),
      description: description.trim(),
      medium: medium.trim(),
      userId: userId,
      image: uploadedUrls, // JSONB array for multiple images
      datePosted: new Date().toISOString(),
    };

    console.log('Inserting profile artwork data:', artworkData);
    
    const { data: inserted, error: insertErr } = await supabase
      .from("art")
      .insert(artworkData)
      .select()
      .single();

    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(201).json({ message: "Art uploaded", artwork: inserted });
  } catch (err) {
    console.error("uploadArt error:", err);
    return res.status(500).json({ error: err.message });
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
// Also accepts text fields: firstName, middleName, lastName, bio, about, birthdate, address, sex, username

export const uploadProfileMedia = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.id;
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


    const {
      firstName,
      middleName,
      lastName,
      bio,
      about,
      birthdate,
      address,
      sex,
      username,
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
      username,
      profileStatus: true,
    };
    if (uploaded.avatarUrl) patch.profilePicture = uploaded.avatarUrl;
    if (uploaded.coverUrl) patch.coverPicture = uploaded.coverUrl;

    // Normalize and validate username uniqueness if provided
    const desiredUsername = (username || '').trim();
    if (desiredUsername) {
      // Check if another user's profile already uses this username
      const { data: existingWithUsername, error: usernameCheckError } = await supabase
        .from('profile')
        .select('userId')
        .ilike('username', desiredUsername)
        .neq('userId', userId)
        .maybeSingle();

      if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
        console.error('Username check error:', usernameCheckError);
        return res.status(500).json({ error: usernameCheckError.message });
      }

      if (existingWithUsername) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }



    const { data: existingProfile, error: updateError } = await supabase
      .from("profile")
      .update(patch)
      .eq("userId", userId)
      .select()
      .single();
    
    if (updateError && updateError.code === '23505') {
      // Unique violation at DB level
      return res.status(409).json({ error: 'Username is already taken' });
    }

    if (updateError && updateError.code === 'PGRST116') {
      // No existing profile found, create new one

      const { data: newProfile, error: insertError } = await supabase
        .from("profile")
        .insert({ ...patch, userId })
        .select()
        .single();
      
      if (insertError) {
        if (insertError.code === '23505' || /duplicate key value/i.test(insertError.message || '')) {
          return res.status(409).json({ error: 'Username is already taken' });
        }
        console.error("Profile insert error:", insertError);
        throw insertError;
      }
      
      return res.status(200).json({ message: "Profile created", profile: newProfile, uploaded });
    } else if (updateError) {
      console.error("Profile update error:", updateError);
      throw updateError;
    }
  

    return res.status(200).json({ message: "Profile updated", profile: existingProfile, uploaded });
  } catch (err) {
    console.error("uploadProfileMedia error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const profileStatus = async (req, res) => {
  try{

    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.id;
    const { data: profile, error } = await supabase
      .from("profile")
      .select("profileStatus")
      .eq("userId", userId)
      .maybeSingle(); // Use maybeSingle instead of single to handle no records


    if (error) {
      console.error("profileStatus - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // If no profile exists, return false
    if (!profile) {
      return res.status(200).json({ profileStatus: false });
    }

    const result = { profileStatus: profile.profileStatus || false };
    return res.status(200).json(result);
    
  }catch(err){
    console.error("profileStatus error:", err);
    return res.status(500).json({ error: err.message });
  }
}


export const artPreferenceStatus = async (req, res) => {
  try{

    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.id;
    const { data: profile, error } = await supabase
      .from("profile")
      .select("preferenceStatus")
      .eq("userId", userId)
      .maybeSingle(); // Use maybeSingle instead of single to handle no records


    if (error) {
      console.error("preferenceStatus - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // If no profile exists, return false
    if (!profile) {
      return res.status(200).json({ preferenceStatus: false });
    }

    const result = { preferenceStatus: profile.preferenceStatus || false };
    return res.status(200).json(result);
    
  }catch(err){
    console.error("preferenceStatus error:", err);
    return res.status(500).json({ error: err.message });
  }
}

export const saveArtPreferences = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = req.user.id;
    const {
      classicalArt,
      contemporaryArt,
      impressionist,
      abstractArt,
      sculpture,
      photography,
      digitalArt,
      streetArt,
      minimalist,
      surrealist,
      landscape,
      portrait,
      miniature,
      expressionist,
      realism,
      conceptual
    } = req.body;

    // First, check if art preferences record exists
    const { data: existingPrefsArray, error: checkError } = await supabase
      .from("artPreference")
      .select("*")
      .eq("userId", userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    const existingPrefs = existingPrefsArray && existingPrefsArray.length > 0 ? existingPrefsArray[0] : null;

    if (checkError) {
      console.error("Error checking existing art preferences:", checkError);
      return res.status(500).json({ error: checkError.message });
    }

    const preferencesData = {
      userId,
      classicalArt: classicalArt || false,
      contemporaryArt: contemporaryArt || false,
      impressionist: impressionist || false,
      abstractArt: abstractArt || false,
      sculpture: sculpture || false,
      photography: photography || false,
      digitalArt: digitalArt || false,
      streetArt: streetArt || false,
      minimalist: minimalist || false,
      surrealist: surrealist || false,
      landscape: landscape || false,
      portrait: portrait || false,
      miniature: miniature || false,
      expressionist: expressionist || false,
      realism: realism || false,
      conceptual: conceptual || false
    };

    let result;
    if (existingPrefs) {
      // Update ALL existing preferences for this user (handles duplicates)
      console.log(`Updating art preferences for user ${userId}`);
      const { data, error } = await supabase
        .from("artPreference")
        .update(preferencesData)
        .eq("userId", userId)
        .select();

      if (error) {
        console.error("Error updating art preferences:", error);
        return res.status(500).json({ error: error.message });
      }
      
      // Log if multiple records were updated
      if (data && data.length > 1) {
        console.warn(`⚠️  Updated ${data.length} duplicate art preference records for user ${userId}`);
      }
      
      result = data;
    } else {
      // Insert new preferences
      console.log(`Creating new art preferences for user ${userId}`);
      const { data, error } = await supabase
        .from("artPreference")
        .insert([preferencesData])
        .select();

      if (error) {
        console.error("Error inserting art preferences:", error);
        return res.status(500).json({ error: error.message });
      }
      result = data;
    }

    // Update profile to mark preferences as set
    const { error: profileUpdateError } = await supabase
      .from("profile")
      .update({ preferenceStatus: true })
      .eq("userId", userId);

    if (profileUpdateError) {
      console.error("Error updating profile preference status:", profileUpdateError);
      return res.status(500).json({ error: profileUpdateError.message });
    }

    console.log("Art preferences saved successfully for user:", userId);
    return res.status(200).json({ 
      message: "Art preferences saved successfully",
      preferences: result[0]
    });

  } catch (err) {
    console.error("saveArtPreferences error:", err);
    return res.status(500).json({ error: err.message });
  }
}



export const getArts = async (req, res) =>{
  try{
    const userId = req.user.id;

    // Fetch this user's arts from art table
    const { data: arts, error } = await supabase
      .from("art")
      .select("*")
      .eq("userId", userId)
      .order("datePosted", { ascending: false });

    if (error) {
      console.error("getArts - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Build user map from profile like homepage.getPost
    const userIds = [...new Set((arts || []).map(a => a.userId))];
    const userMap = new Map();

    if (userIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profile')
        .select('userId, firstName, lastName, profilePicture')
        .in('userId', userIds);

      if (profileError) {
        console.warn('getArts: failed to fetch profiles', profileError);
      } else if (profiles && profiles.length) {
        for (const pr of profiles) {
          const fullName = [pr.firstName, pr.lastName].filter(Boolean).join(' ').trim() || 'Anonymous';
          userMap.set(pr.userId, {
            id: pr.userId,
            name: fullName,
            avatar: pr.profilePicture || 'https://via.placeholder.com/40',
          });
        }
      }
    }

    for (const uid of userIds) {
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          id: uid,
          name: 'Anonymous',
          avatar: 'https://via.placeholder.com/40',
        });
      }
    }

    const formattedArts = (arts || []).map(art => ({
      artId: art.artId, // art table uses artId
      user: userMap.get(art.userId) || {
        id: art.userId,
        name: 'Anonymous',
        avatar: 'https://via.placeholder.com/40',
      },
      title: art.title || null,
      description: art.description || null,
      medium: art.medium || null,
      image: art.image, // JSONB array of images
      datePosted: art.datePosted,
      timestamp: art.datePosted ? new Date(art.datePosted).toLocaleString() : null,
    }));

    return res.status(200).json(formattedArts);

  }catch(error){
    console.error("getArts error:", error);
    return res.status(500).json({ error: error.message });
  }
}



export const createComment = async (req, res) => {
  try{
    const { artId, text } = req.body;

    const userId = req.user.id;

    
    const { data: inserted, error: insertErr } = await supabase
      .from("comment")
      .insert([
        {
          userId: req.user.id,
          datePosted: new Date().toISOString(),
          content: text,
          artId: artId,
          
        },
      ])
      .select()
    
      if (insertErr) throw insertErr;

      return res.status(201).json({message: "Comment added",});


  }catch(error){
    console.error("createComment error:", error);
    return res.status(500).json({ error: error.message });
  }
}



export const getComments = async (req, res) => {
  try {
    const artId = (req.body && req.body.artId) || (req.query && req.query.artId);
    if (!artId) return res.status(400).json({ error: "artId is required" });

    // Pull comments for this post
    const { data: rows, error } = await supabase
      .from("comment")
      .select("*")
      .eq("artId", artId)
      .order("datePosted", { ascending: false });

    if (error) throw error;

    // Gather unique userIds, fetch minimal profile for each from profile table
    const userIds = [...new Set(rows.map(r => r.userId))];
    const userMap = new Map();

    if (userIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profile')
        .select('userId, firstName, lastName, profilePicture')
        .in('userId', userIds);

      if (profileError) {
        console.warn('getComments: failed to fetch profiles', profileError);
      } else if (profiles && profiles.length) {
        for (const pr of profiles) {
          const name = [pr.firstName, pr.lastName].filter(Boolean).join(' ').trim() || 'Anonymous';
          userMap.set(pr.userId, {
            id: pr.userId,
            name,
            avatar: pr.profilePicture || 'https://via.placeholder.com/40',
          });
        }
      }
    }

    // Ensure fallback entries
    for (const uid of userIds) {
      if (!userMap.has(uid)) {
        userMap.set(uid, { id: uid, name: 'Anonymous', avatar: 'https://via.placeholder.com/40' });
      }
    }

    const comments = rows.map(r => ({
      id: r.commentId,
      text: r.content,
      timestamp: new Date(r.datePosted).toLocaleString(),
      user: userMap.get(r.userId),
    }));

    return res.status(200).json({ comments });
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ error: err.message });
  }
};



export const getReact = async (req, res) => {
  try {
    // Accept artId from POST body or fallback to query string
    const artId = (req.body && req.body.artId) || (req.query && req.query.artId);

    if (!artId) {
      return res.status(400).json({ error: "artId is required" });
    }

    const { data: reactions, error } = await supabase
      .from("react")
      .select("*")
      .eq("artId", artId)
      .order("reactTime", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ reactions });
  } catch (err) {
    console.error("getReact error:", err);
    return res.status(500).json({ error: err.message });
  }
};


export const createReact = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { artId } = req.body;
    if (!artId) {
      return res.status(400).json({ error: "artId is required" });
    }

    // 1️⃣ Check if the user already reacted to this post
    const { data: existing, error: checkErr } = await supabase
      .from("react")
      .select("reactId")
      .eq("userId", req.user.id)
      .eq("artId", artId)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      // 2️⃣ If reaction exists, delete it (unlike)
      const { error: deleteErr } = await supabase
        .from("react")
        .delete()
        .eq("reactId", existing.reactId);

      if (deleteErr) throw deleteErr;

      return res.status(200).json({ message: "Reaction removed", removed: true });
    }

    // 3️⃣ If no reaction, insert new one (like)
    const { data: inserted, error: insertErr } = await supabase
      .from("react")
      .insert([
        {
          userId: req.user.id,
          artId: artId,
          reactTime: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertErr) throw insertErr;

    return res.status(201).json({
      message: "Reaction added",
      removed: false,
      react: inserted,
      
    });
  } catch (err) {
    console.error("createReact error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// GET user profile by userId (for artwork modal artist info)
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { data: profile, error } = await supabase
      .from("profile")
      .select("userId, firstName, middleName, lastName, profilePicture")
      .eq("userId", userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return res.status(404).json({ error: "Profile not found" });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error("getUserProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Track artwork view for artist artworks
export const trackView = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { artId } = req.body;
    if (!artId) {
      return res.status(400).json({ error: "artId is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const userId = req.user.id;

    // Get current artwork views from art table
    const { data: artwork, error: fetchError } = await supabaseClient
      .from('art')
      .select('views')
      .eq('artId', artId)
      .single();

    if (fetchError) {
      console.error("trackView - fetch error:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // Parse existing views (JSONB array of user IDs)
    let currentViews = artwork.views || [];
    
    // Check if user has already viewed this artwork
    if (currentViews.includes(userId)) {
      // User already viewed, just return current count
      return res.status(200).json({ 
        message: "Already viewed",
        viewCount: currentViews.length,
        alreadyViewed: true
      });
    }

    // Add user to views array
    const updatedViews = [...currentViews, userId];

    // Update artwork with new views
    const { error: updateError } = await supabaseClient
      .from('art')
      .update({ views: updatedViews })
      .eq('artId', artId);

    if (updateError) {
      console.error("trackView - update error:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log(`📊 View tracked for artist artwork ${artId}: ${updatedViews.length} total views`);

    return res.status(200).json({
      message: "View tracked successfully",
      viewCount: updatedViews.length,
      alreadyViewed: false
    });

  } catch (err) {
    console.error("trackView error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get artwork view count for artist artworks
export const getViews = async (req, res) => {
  try {
    const { artId } = req.body;
    
    if (!artId) {
      return res.status(400).json({ error: "artId is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: artwork, error } = await supabaseClient
      .from('art')
      .select('views')
      .eq('artId', artId)
      .single();

    if (error) {
      console.error("getViews error:", error);
      return res.status(500).json({ error: error.message });
    }

    const viewCount = artwork.views ? artwork.views.length : 0;

    return res.status(200).json({ viewCount });
  } catch (err) {
    console.error("getViews error:", err);
    return res.status(500).json({ error: err.message });
  }
};
