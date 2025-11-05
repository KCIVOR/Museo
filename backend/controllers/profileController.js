// controllers/profileController.js
// ✅ REMOVED: import { createClient } from "@supabase/supabase-js";
import supabase from "../database/db.js"; // Using singleton instance!
import { cache } from '../utils/cache.js';
import { addUserWatermark, addTextWatermark } from '../utils/watermark.js';


// GET profile (unchanged behavior)
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check cache first (5 minutes - profile data doesn't change frequently)
    const cacheKey = `profile:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);
    
    const { data: profile, error } = await supabase
      .from("profile")
      .select("*")
      .eq("userId", userId)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    
    const result = { profile };
    
    // Cache for 5 minutes (profile data)
    await cache.set(cacheKey, result, 300);
    console.log('💾 CACHED:', cacheKey);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/profile/uploadArt
// Accepts multipart/form-data with files field: images; text: title, description, medium, categories, applyWatermark
export const uploadArt = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const files = req.files || [];
    const { 
      title = "", 
      description = "", 
      medium = "", 
      categories = "[]",
      applyWatermark = "true", // Default to true for protection
      watermarkText = "" // Custom watermark text (optional)
    } = req.body || {};
    
    if (files.length === 0) return res.status(400).json({ error: "At least one image is required" });

    const userId = req.user.id;
    // ✅ Using singleton supabase instead of serviceClient
    const svc = supabase;

    // Parse categories
    let parsedCategories;
    try {
      parsedCategories = JSON.parse(categories);
    } catch (error) {
      parsedCategories = ["Digital Art"]; // Default fallback
    }

    // Get user info for watermark
    const { data: userProfile } = await supabase
      .from('profile')
      .select('username, firstName, lastName')
      .eq('userId', userId)
      .single();
    
    const displayName = userProfile?.username || 
                        `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 
                        'Museo Artist';

    // Upload all images to Supabase storage
    const uploadedUrls = [];
    const shouldWatermark = applyWatermark === 'true' || applyWatermark === true;
    
    console.log(`🎨 Processing ${files.length} images (watermark: ${shouldWatermark})`);
    
    for (const file of files) {
      try {
        let imageBuffer = file.buffer;
        
        // Apply watermark if requested
        if (shouldWatermark) {
          console.log(`💧 Adding watermark to ${file.originalname}...`);
          
          // Use custom text if provided, otherwise use default user watermark
          if (watermarkText && watermarkText.trim()) {
            console.log(`📝 Using custom watermark: "${watermarkText}"`);
            imageBuffer = await addTextWatermark(imageBuffer, {
              text: watermarkText.trim(),
              position: 'bottom-right',
              opacity: 0.7  // Increased for better clarity
            });
          } else {
            console.log(`👤 Using default user watermark for: ${displayName}`);
            imageBuffer = await addUserWatermark(imageBuffer, {
              username: displayName,
              userId: userId,
              date: new Date().getFullYear()
            });
          }
          
          console.log(`✅ Watermark applied to ${file.originalname}`);
        }
        
        const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";
        const prefix = shouldWatermark ? 'watermarked-' : '';
        const fileName = `${prefix}${Date.now()}-${Math.random()}-${safeName}`;
        const filePath = `pics/${userId}/${fileName}`;

        const { data: up, error: upErr } = await svc.storage
          .from("uploads")
          .upload(filePath, imageBuffer, { contentType: file.mimetype, upsert: false });
        
        if (upErr) {
          console.error(`❌ Upload error for ${file.originalname}:`, upErr);
          return res.status(500).json({ error: upErr.message });
        }

        const pub = svc.storage.from("uploads").getPublicUrl(up.path);
        const imageUrl = pub?.data?.publicUrl;
        
        if (imageUrl) {
          uploadedUrls.push(imageUrl);
          console.log(`✅ Uploaded: ${imageUrl}`);
        }
      } catch (fileError) {
        console.error(`❌ Error processing ${file.originalname}:`, fileError);
        return res.status(500).json({ error: `Failed to process ${file.originalname}` });
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
    
    // Clear user's artworks cache (both private and public)
    await cache.del(`userArts:${userId}:*`);
    await cache.del(`artistArts:${userId}:*`);
    console.log(`🗑️ Cleared artworks cache for user ${userId} after upload`);
    
    return res.status(201).json({ message: "Art uploaded", artwork: inserted });
  } catch (err) {
    console.error("uploadArt error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Helper: privileged client for Storage uploads (mirrors homepage.js)
// ✅ REMOVED: serviceClient function - now using singleton
// Using supabase from import instead of creating new clients

// POST /api/profile/updateProfile
// Accepts multipart/form-data with optional files: avatar, cover
// Also accepts text fields: firstName, middleName, lastName, bio, about, birthdate, address, sex, username

export const uploadProfileMedia = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.id;
    // ✅ Using singleton supabase instead of serviceClient
    const svc = supabase;
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
      
      // Clear profile cache (both private and public)
      await cache.del(`profile:${userId}`);
      await cache.del(`publicProfile:${userId}`);
      // Clear artist page caches (by username and userId)
      if (newProfile.username) {
        await cache.del(`artistProfile:${newProfile.username}`);
        await cache.del(`artistRole:${newProfile.username}`);
      }
      await cache.del(`artistProfile:${userId}`);
      await cache.del(`artistRole:${userId}`);
      // Clear artists list cache
      await cache.del('artists:all');
      console.log(`🗑️ Profile cache cleared for user ${userId} after create`);
      
      return res.status(200).json({ message: "Profile created", profile: newProfile, uploaded });
    } else if (updateError) {
      console.error("Profile update error:", updateError);
      throw updateError;
    }
  

    // Clear profile cache (both private and public)
    await cache.del(`profile:${userId}`);
    await cache.del(`publicProfile:${userId}`);
    // Clear artist page caches (by username and userId)
    if (existingProfile.username) {
      await cache.del(`artistProfile:${existingProfile.username}`);
      await cache.del(`artistRole:${existingProfile.username}`);
    }
    await cache.del(`artistProfile:${userId}`);
    await cache.del(`artistRole:${userId}`);
    // Clear artists list cache
    await cache.del('artists:all');
    console.log(`🗑️ Profile cache cleared for user ${userId} after update`);
    
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
      preferences: result[0],
      success: true
    });

  } catch (error) {
    console.error("Error in saveArtPreferences:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getArts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    
    // Convert pagination params to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Check cache first (3 minutes - user's artworks)
    const cacheKey = `userArts:${userId}:${pageNum}:${limitNum}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

    // Fetch this user's arts from art table with pagination
    const { data: arts, error } = await supabase
      .from("art")
      .select("*")
      .eq("userId", userId)
      .order("datePosted", { ascending: false })
      .range(offset, offset + limitNum - 1);

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
      id: art.artId, // Add id field for React keys
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

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from("art")
      .select("*", { count: 'exact', head: true })
      .eq("userId", userId);

    if (countError) {
      console.warn("getArts - Count error:", countError);
    }

    // Calculate pagination info
    const hasMore = formattedArts.length === limitNum;

    const result = {
      success: true,
      artworks: formattedArts,
      arts: formattedArts, // Backward compatibility
      total: totalCount || formattedArts.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        count: formattedArts.length,
        hasMore
      }
    };

    // Cache for 3 minutes (user's artworks)
    await cache.set(cacheKey, result, 180);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);

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

      // Clear comments cache for this artwork
      await cache.del(`comments:art:${artId}:*`);
      console.log(`🗑️ Cleared comments cache for art ${artId}`);

      return res.status(201).json({message: "Comment added",});


  }catch(error){
    console.error("createComment error:", error);
    return res.status(500).json({ error: error.message });
  }
}



export const getComments = async (req, res) => {
  try {
    const artId = (req.body && req.body.artId) || (req.query && req.query.artId);
    const { page = 1, limit = 10 } = req.query;
    
    if (!artId) return res.status(400).json({ error: "artId is required" });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Check cache first (3 minutes - comments)
    const cacheKey = `comments:art:${artId}:${pageNum}:${limitNum}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

    // Pull comments for this artwork with pagination
    const { data: rows, error } = await supabase
      .from("comment")
      .select("*")
      .eq("artId", artId)
      .order("datePosted", { ascending: false })
      .range(offset, offset + limitNum - 1);

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
      text: r.content || r.comment, // Support both column names
      timestamp: new Date(r.datePosted).toLocaleString(),
      updatedAt: r.updatedAt, // Include updatedAt to show "(edited)" indicator
      user: userMap.get(r.userId),
    }));

    // Check if there are more comments
    const hasMore = rows.length === limitNum;

    const result = { comments, hasMore };
    
    // Cache for 3 minutes (comments)
    await cache.set(cacheKey, result, 180);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/profile/deleteComment/:commentId
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // First check if comment exists
    const { data: comment, error: fetchError } = await supabase
      .from("comment")
      .select("*")
      .eq("commentId", commentId)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Get user role from profile table
    const { data: userProfile, error: userError } = await supabase
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();
    
    const userRole = userProfile?.role || req.user.role || 'user';
    const isOwner = comment.userId === userId;
    const isAdmin = userRole === 'admin';

    // Check if user is admin or owns the comment
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from("comment")
      .delete()
      .eq("commentId", commentId);

    if (deleteError) throw deleteError;

    // Clear comments cache for this artwork
    await cache.del(`comments:art:${comment.artId}:*`);
    console.log(`🗑️ Cleared comments cache for art ${comment.artId}`);

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Delete comment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/profile/updateComment/:commentId
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    // First check if comment exists
    const { data: comment, error: fetchError } = await supabase
      .from("comment")
      .select("*")
      .eq("commentId", commentId)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Get user role from profile table
    const { data: userProfile, error: userError } = await supabase
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();
    
    const userRole = userProfile?.role || req.user.role || 'user';
    const isOwner = comment.userId === userId;
    const isAdmin = userRole === 'admin';

    // Check if user is admin or owns the comment
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to edit this comment" });
    }

    // Update the comment
    const { data: updated, error: updateError } = await supabase
      .from("comment")
      .update({ 
        content: text.trim(),
        updatedAt: new Date().toISOString() // Set updatedAt timestamp
      })
      .eq("commentId", commentId)
      .select();

    if (updateError) throw updateError;

    // Clear comments cache for this artwork
    await cache.del(`comments:art:${comment.artId}:*`);
    console.log(`🗑️ Cleared comments cache for art ${comment.artId}`);

    return res.status(200).json({ 
      message: "Comment updated successfully",
      comment: updated[0]
    });
  } catch (err) {
    console.error("Update comment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/profile/reportComment
export const reportComment = async (req, res) => {
  try {
    const { commentId, reason } = req.body;
    const userId = req.user.id;

    if (!commentId || !reason) {
      return res.status(400).json({ error: "Comment ID and reason are required" });
    }

    // Check if comment exists
    const { data: comment, error: fetchError } = await supabase
      .from("comment")
      .select("*")
      .eq("commentId", commentId)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Insert report (you'll need to create a 'comment_reports' table)
    const { error: insertError } = await supabase
      .from("comment_reports")
      .insert([{
        commentId: commentId,
        reportedBy: userId,
        reason: reason,
        dateReported: new Date().toISOString()
      }]);

    if (insertError) {
      console.error("Report insert error:", insertError);
      // If table doesn't exist, just log it for now
      console.log("Artwork comment report:", { commentId, userId, reason });
    }

    return res.status(200).json({ message: "Comment reported successfully" });
  } catch (err) {
    console.error("Report comment error:", err);
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

    // Check cache first (30 seconds - reactions)
    const cacheKey = `reactions:art:${artId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

    const { data: reactions, error } = await supabase
      .from("react")
      .select("*")
      .eq("artId", artId)
      .order("reactTime", { ascending: false })
      .limit(100);

    if (error) throw error;

    const result = { reactions };
    
    // Cache for 30 seconds (reactions - near real-time)
    await cache.set(cacheKey, result, 30);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);
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

      // Clear reactions cache for this artwork
      await cache.del(`reactions:art:${artId}`);
      console.log(`🗑️ Cleared reactions cache for art ${artId}`);

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

    // Clear reactions cache for this artwork
    await cache.del(`reactions:art:${artId}`);
    console.log(`🗑️ Cleared reactions cache for art ${artId}`);

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

    // Check cache first (5 minutes - public profile data)
    const cacheKey = `publicProfile:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

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

    const result = { profile };
    
    // Cache for 5 minutes (public profile data)
    await cache.set(cacheKey, result, 300);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);
  } catch (error) {
    console.error("getUserProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// GET specific user's artworks with pagination (for artist profile pages)
export const getUserArts = async (req, res) => {
  try {
    const { userId: username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }
    
    // First, get the actual userId from the username
    const { data: userProfile, error: profileError } = await supabase
      .from('profile')
      .select('userId')
      .eq('username', username)
      .single();
    
    if (profileError || !userProfile) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const actualUserId = userProfile.userId;
    
    // Extract pagination parameters from query
    const { page = 1, limit = 10 } = req.query;
    
    // Convert pagination params to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Check cache first (3 minutes - artist's public artworks)
    const cacheKey = `artistArts:${actualUserId}:${pageNum}:${limitNum}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

    // Fetch specific user's arts from art table with pagination
    const { data: arts, error } = await supabase
      .from("art")
      .select("*")
      .eq("userId", actualUserId)
      .order("datePosted", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error("getUserArts - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Build user map from profile
    const userIds = [...new Set((arts || []).map(a => a.userId))];
    const userMap = new Map();

    if (userIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profile')
        .select('userId, firstName, lastName, profilePicture')
        .in('userId', userIds);

      if (profileError) {
        console.warn('getUserArts: failed to fetch profiles', profileError);
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
      id: art.artId,
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

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from("art")
      .select("*", { count: 'exact', head: true })
      .eq("userId", actualUserId);

    if (countError) {
      console.warn("getUserArts - Count error:", countError);
    }

    const result = {
      success: true,
      artworks: formattedArts,
      arts: formattedArts,
      total: totalCount || formattedArts.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        count: formattedArts.length,
        hasMore: formattedArts.length === limitNum
      }
    };

    // Cache for 3 minutes (artist's public artworks)
    await cache.set(cacheKey, result, 180);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);

  } catch (error) {
    console.error("getUserArts error:", error);
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

    // ✅ USING SINGLETON: No new client creation!
    // Using supabase from import instead

    const userId = req.user.id;

    // Get current artwork views from art table
    const { data: artwork, error: fetchError } = await supabase
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
    const { error: updateError } = await supabase
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

    // ✅ USING SINGLETON: No new client creation!
    // Using supabase from import instead

    const { data: artwork, error } = await supabase
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

// Update artwork
export const updateArt = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { artId } = req.params;
    const { 
      title, 
      description, 
      medium, 
      existingImages, 
      imagesToRemove,
      applyWatermark = "false", // Default to false for edits (don't re-watermark)
      watermarkText = ""
    } = req.body;
    const newImageFiles = req.files || [];

    // Get user role to check admin permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    const userRole = userProfile?.role || 'user';

    // Verify artwork exists and get current data
    const { data: artwork, error: fetchError } = await supabase
      .from('art')
      .select('userId, image')
      .eq('artId', artId)
      .single();

    if (fetchError || !artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Allow if user is admin OR artwork owner
    if (artwork.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this artwork' });
    }

    // Handle image updates
    let finalImages = [];
    
    // Add existing images that weren't removed
    if (existingImages) {
      const existingArray = Array.isArray(existingImages) ? existingImages : [existingImages];
      finalImages = [...existingArray];
    }

    // Upload new images if any
    if (newImageFiles && newImageFiles.length > 0) {
      const shouldWatermark = applyWatermark === 'true' || applyWatermark === true;
      
      // Get user info for watermark if needed
      let displayName = 'Museo Artist';
      if (shouldWatermark) {
        const { data: profile } = await supabase
          .from('profile')
          .select('username, firstName, lastName')
          .eq('userId', userId)
          .single();
        
        displayName = profile?.username || 
                      `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 
                      'Museo Artist';
      }
      
      console.log(`🎨 Processing ${newImageFiles.length} new images for edit (watermark: ${shouldWatermark})`);
      
      for (const file of newImageFiles) {
        try {
          let imageBuffer = file.buffer;
          
          // Apply watermark if requested
          if (shouldWatermark) {
            console.log(`💧 Adding watermark to ${file.originalname}...`);
            
            // Use custom text if provided, otherwise use default user watermark
            if (watermarkText && watermarkText.trim()) {
              console.log(`📝 Using custom watermark: "${watermarkText}"`);
              imageBuffer = await addTextWatermark(imageBuffer, {
                text: watermarkText.trim(),
                position: 'bottom-right',
                opacity: 0.7
              });
            } else {
              console.log(`👤 Using default user watermark for: ${displayName}`);
              imageBuffer = await addUserWatermark(imageBuffer, {
                username: displayName,
                userId: userId,
                date: new Date().getFullYear()
              });
            }
            
            console.log(`✅ Watermark applied to ${file.originalname}`);
          }
          
          const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";
          const prefix = shouldWatermark ? 'watermarked-' : '';
          const fileName = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2)}-${safeName}`;
          const filePath = `pics/${userId}/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, imageBuffer, {
              contentType: file.mimetype,
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);

          finalImages.push(urlData.publicUrl);
          console.log(`✅ Uploaded: ${urlData.publicUrl}`);
        } catch (uploadErr) {
          console.error('Error uploading image:', uploadErr);
        }
      }
    }

    // Delete removed images from storage
    if (imagesToRemove && imagesToRemove.length > 0) {
      const imagesToDeleteArray = Array.isArray(imagesToRemove) ? imagesToRemove : [imagesToRemove];
      
      for (const imageUrl of imagesToDeleteArray) {
        try {
          let filePath = '';
          if (imageUrl.includes('/storage/v1/object/public/uploads/')) {
            const pathPart = imageUrl.split('/storage/v1/object/public/uploads/')[1];
            filePath = pathPart;
          } else if (imageUrl.includes('/uploads/')) {
            const pathPart = imageUrl.split('/uploads/')[1];
            filePath = pathPart;
          } else {
            const fileName = imageUrl.split('/').pop();
            filePath = `pics/${artwork.userId}/${fileName}`;
          }

          const { error: storageError } = await supabase.storage
            .from('uploads')
            .remove([filePath]);

          if (storageError) {
            console.error(`Error deleting image ${filePath}:`, storageError);
          } else {
            console.log(`Successfully deleted image: ${filePath}`);
          }
        } catch (imageError) {
          console.error("Error processing image deletion:", imageError);
        }
      }
    }

    // Update artwork
    const { data, error } = await supabase
      .from('art')
      .update({
        title: title || null,
        description: description || null,
        medium: medium || null,
        image: finalImages.length > 0 ? finalImages : null,
        datePosted: new Date().toISOString()
      })
      .eq('artId', artId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update artwork' });
    }

    // Clear user's artworks cache (both private and public)
    await cache.del(`userArts:${userId}:*`);
    await cache.del(`artistArts:${userId}:*`);
    console.log(`🗑️ Cleared artworks cache for user ${userId} after update`);
    
    res.json({ success: true, artwork: data });
  } catch (err) {
    console.error('Update artwork error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete artwork
export const deleteArt = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { artId } = req.params;

    // Get user role to check admin permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    const userRole = userProfile?.role || 'user';

    // Verify artwork exists and get artwork data including images
    const { data: artwork, error: fetchError } = await supabase
      .from('art')
      .select('userId, image')
      .eq('artId', artId)
      .single();

    if (fetchError || !artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Allow if user is admin OR artwork owner
    if (artwork.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this artwork' });
    }

    // Delete images from storage if they exist
    if (artwork.image && Array.isArray(artwork.image)) {
      console.log(`🗑️ Attempting to delete ${artwork.image.length} images for artwork ${artId}`);
      
      for (const imageUrl of artwork.image) {
        try {
          console.log(`🗑️ Processing image URL: ${imageUrl}`);
          
          // Extract file path from URL - handle different URL formats
          let filePath = '';
          
          if (imageUrl.includes('/storage/v1/object/public/uploads/')) {
            // Full Supabase URL format
            const pathPart = imageUrl.split('/storage/v1/object/public/uploads/')[1];
            filePath = pathPart;
          } else if (imageUrl.includes('/uploads/')) {
            // Relative URL format
            const pathPart = imageUrl.split('/uploads/')[1];
            filePath = pathPart;
          } else {
            // Fallback: assume it's just the filename and construct path
            const fileName = imageUrl.split('/').pop();
            filePath = `pics/${artwork.userId}/${fileName}`;
          }
          
          console.log(`🗑️ Attempting to delete file path: ${filePath}`);

          const { error: storageError } = await supabase.storage
            .from('uploads')
            .remove([filePath]);

          if (storageError) {
            console.error(`❌ Error deleting image ${filePath}:`, storageError);
          } else {
            console.log(`✅ Successfully deleted image: ${filePath}`);
          }
        } catch (imageError) {
          console.error("❌ Error processing image deletion:", imageError);
        }
      }
    } else if (artwork.image && typeof artwork.image === 'string') {
      // Handle single image as string
      try {
        console.log(`🗑️ Processing single image: ${artwork.image}`);
        
        let filePath = '';
        if (artwork.image.includes('/storage/v1/object/public/uploads/')) {
          const pathPart = artwork.image.split('/storage/v1/object/public/uploads/')[1];
          filePath = pathPart;
        } else if (artwork.image.includes('/uploads/')) {
          const pathPart = artwork.image.split('/uploads/')[1];
          filePath = pathPart;
        } else {
          const fileName = artwork.image.split('/').pop();
          filePath = `pics/${artwork.userId}/${fileName}`;
        }
        
        console.log(`🗑️ Attempting to delete single image path: ${filePath}`);

        const { error: storageError } = await supabase.storage
          .from('uploads')
          .remove([filePath]);

        if (storageError) {
          console.error(`❌ Error deleting single image ${filePath}:`, storageError);
        } else {
          console.log(`✅ Successfully deleted single image: ${filePath}`);
        }
      } catch (imageError) {
        console.error("❌ Error processing single image deletion:", imageError);
      }
    }

    // Delete artwork from database
    const { error } = await supabase
      .from('art')
      .delete()
      .eq('artId', artId);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to delete artwork' });
    }

    // Clear user's artworks cache (both private and public)
    await cache.del(`userArts:${userId}:*`);
    await cache.del(`artistArts:${userId}:*`);
    console.log(`🗑️ Cleared artworks cache for user ${userId} after delete`);
    
    res.json({ success: true, message: 'Artwork deleted successfully' });
  } catch (err) {
    console.error('Delete artwork error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
