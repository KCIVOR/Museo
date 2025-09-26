// controllers/artist.js
import supabase from "../database/db.js";

// GET /api/artist/getArtist
export const getArtist = async (req, res) => {
  try {
    // 1) Pull artist profiles
    const { data: profs, error } = await supabase
      .from("profile")
      .select("profileId:profileId, profilePicture, userId, role")
      .eq("role", "artist");

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
      let name = "Untitled Artist";
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
        // ignore; keep default name
      }

      const hero = toPublicUrl(p.profilePicture) || "/assets/artist-placeholder.jpg";

      artists.push({
        id: p.profileId || p.userId,
        name,
        hero,
      });
    }

    return res.status(200).json({ artists });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
