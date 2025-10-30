// controllers/artist.js
import supabase from "../database/db.js";
import { cache } from '../utils/cache.js';

// GET /api/artist/getArtist
export const getArtist = async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'artists:all';
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);
    
    // 1) Pull artist profiles
    const { data: profs, error } = await supabase
      .from("profile")
      .select("profileId:profileId, profilePicture, userId, role, username, firstName, lastName, middleName")
      .in("role", ["artist", "admin"]);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // 2) For names, fetch Auth users in a loop (admin API)
    const toPublicUrl = (url) => {
      if (!url) return null;
      if (/^https?:\/\//i.test(url) || url.startsWith("/")) return url;
      // If profilePicture is a storage path, convert to public URL from 'uploads' bucket
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(url);
      return pub?.publicUrl || null;
    };

    const artists = [];
    for (const p of profs || []) {
      // Prefer profile table full name; fallback to username; final fallback to auth metadata
      let name = [p.firstName, p.middleName, p.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || p.username || "Untitled Artist";

      if (!name || name === "Untitled Artist") {
        try {
          const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(p.userId);
          if (!authErr && authUser?.user) {
            name =
              authUser.user.user_metadata?.full_name ||
              authUser.user.user_metadata?.name ||
              authUser.user.email?.split("@")[0] ||
              name;
          }
        } catch {
          // ignore; keep current name
        }
      }

      const hero = toPublicUrl(p.profilePicture) || "/assets/artist-placeholder.jpg";

      artists.push({
        id: p.username || p.profileId || p.userId, // prefer username for public URLs
        username: p.username || null,
        name,
        hero,
      });
    }

    const result = { artists };
    
    // Cache the result (5 minutes - artists don't change frequently)
    await cache.set(cacheKey, result, 300);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Server error" });
}
};

export const getArtistById = async (req, res) => {
  try{
    const { id } = req.params;
    
    // Check cache first (5 minutes - artist profile)
    const cacheKey = `artistProfile:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const orFilter = isUuid
      ? `profileId.eq.${id},userId.eq.${id},username.eq.${id}`
      : `username.eq.${id}`;

    const { data: profile, error } = await supabase
      .from("profile")
      .select("*")
      .or(orFilter)
      .in("role", ["artist", "admin"]) 
      .maybeSingle();

    if (error) {
      console.error("getArtistById - supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const result = { profile };
    
    // Cache for 5 minutes (artist profile)
    await cache.set(cacheKey, result, 300);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
};


export const getRole = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check cache first (5 minutes - user role)
    const cacheKey = `artistRole:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const orFilter = isUuid
      ? `profileId.eq.${id},userId.eq.${id},username.eq.${id}`
      : `username.eq.${id}`;

    const { data: profile, error } = await supabase
      .from('profile')
      .select('role')
      .or(orFilter)
      .maybeSingle(); 
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (!profile) {
      // Return default role if no profile exists
      const result = 'user';
      await cache.set(cacheKey, result, 300);
      return res.json(result);
    }
    
    const result = profile.role || 'user';
    
    // Cache for 5 minutes (user role)
    await cache.set(cacheKey, result, 300);
    console.log('💾 CACHED:', cacheKey);
    
    res.json(result);
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}


export const getArts = async (req, res) =>{
  try{
    const { id } = req.params;

    // Resolve incoming :id (can be profileId or userId or username) to a concrete userId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const orFilter = isUuid
      ? `profileId.eq.${id},userId.eq.${id},username.eq.${id}`
      : `username.eq.${id}`;

    const { data: prof, error: profErr } = await supabase
      .from('profile')
      .select('userId')
      .or(orFilter)
      .maybeSingle();
    if (profErr) {
      console.error('getArts - profile lookup error:', profErr);
      return res.status(500).json({ error: profErr.message });
    }
    if (!prof) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const targetUserId = prof.userId;

    // Check cache first (3 minutes - artist artworks)
    const cacheKey = `artistArtworks:${targetUserId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

    // Fetch this user's arts (profile page scope)
    const { data: arts, error } = await supabase
      .from("art")
      .select("*")
      .eq("userId", targetUserId)
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
    
    // Cache for 3 minutes (artist artworks)
    await cache.set(cacheKey, formattedArts, 180);
    console.log('💾 CACHED:', cacheKey);
    
    return res.status(200).json(formattedArts);

  }catch(error){
    console.error("getArts error:", error);
    return res.status(500).json({ error: error.message });
  }
}