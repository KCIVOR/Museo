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
// Accepts multipart/form-data with file field: image; text: title, description, medium
export const uploadArt = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const f = req.file;
    const { title = "", description = "", medium = "" } = req.body || {};
    if (!f) return res.status(400).json({ error: "image is required" });

    const userId = req.user.id;
    const svc = serviceClient();

    const safeName = f.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = `pics/${userId}/${fileName}`;

    const { data: up, error: upErr } = await svc.storage
      .from("uploads")
      .upload(filePath, f.buffer, { contentType: f.mimetype, upsert: false });
    if (upErr) return res.status(500).json({ error: upErr.message });

    const pub = svc.storage.from("uploads").getPublicUrl(up.path);
    const imageUrl = pub?.data?.publicUrl;

    const { data: inserted, error: insertErr } = await supabase
      .from("art")
      .insert([
        {
          userId,
          title,
          description,
          medium,
          image: imageUrl,
          datePosted: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(201).json({ message: "Art uploaded", art: inserted });
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


export const getArts = async (req, res) =>{
  try{
    const userId = req.user.id;

    // Fetch this user's arts (profile page scope)
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
      artId: art.artId,
      user: userMap.get(art.userId) || {
        id: art.userId,
        name: 'Anonymous',
        avatar: 'https://via.placeholder.com/40',
      },
      title: art.title || null,
      description: art.description || null,
      medium: art.medium || null,
      image: art.image,
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
