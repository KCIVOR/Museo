import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import supabase from '../database/db.js';


// Multer middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

export { upload };

export const createPost = async (req, res) => {
  try {
    // User is already validated by authMiddleware
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Use SERVICE_KEY client (same as authMiddleware)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // Use SERVICE_KEY like authMiddleware
    );

    const { description, createdAt } = req.body;
    const files = req.files || [];
    const uploadedFiles = [];
    const createdPosts = [];

    // Get user ID for folder creation
    const userId = req.user.id;

    for (const file of files) {
      const fileName = `${Date.now()}-${file.originalname}`;
      // Create user-specific folder path
      const filePath = `pics/${userId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(error.message);
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(data.path);

      // Console log the newly uploaded file URL
      console.log(`🖼️ Uploaded: ${file.originalname}`);
      console.log(`📍 Public URL: ${publicUrlData.publicUrl}`);

      // Store file info
      uploadedFiles.push({
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      });

      // Insert into database post table (postId auto-generated)
      const { data: postData, error: postError } = await supabase
        .from('post')
        .insert({
          userId: userId,
          description: description || '',
          image: publicUrlData.publicUrl, // Store the public URL
          datePosted: new Date().toISOString()
        })
        .select();

      if (postError) {
        console.error("Database insert error:", postError);
        throw new Error(`Failed to save post: ${postError.message}`);
      }

      console.log(`💾 Saved to database - Post ID: ${postData[0].postId}`);
      createdPosts.push(postData[0]);
    }

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files and created ${createdPosts.length} posts for user: ${userId}`);

    res.status(201).json({
      message: "Post created successfully",
      description,
      userId,
      files: uploadedFiles,
      posts: createdPosts // Include database records
    });

  } catch (err) {
    console.error("createPost error:", err);
    res.status(500).json({ error: err.message });
  }
};

// FIXED: Get posts function - simpler approach without complex joins
export const getPost = async (req, res) => {
  try {

    // Fetch posts only - no complex joins
    const { data: posts, error } = await supabase
      .from('post')
      .select('*')
      .order('datePosted', { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      return res.status(500).json({ error: error.message });
    }


    // Get unique user IDs to fetch user data
    const userIds = [...new Set(posts.map(post => post.userId))];
    const userMap = new Map();


    for (const userId of userIds) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (!userError && userData.user) {
          userMap.set(userId, {
            id: userData.user.id,
            name: userData.user.user_metadata?.name || 
                  userData.user.user_metadata?.full_name || 
                  userData.user.email?.split('@')[0] || 
                  'Anonymous',
            avatar: userData.user.user_metadata?.avatar_url || 
                   userData.user.user_metadata?.picture || 
                   'https://via.placeholder.com/40'
          });
        } else {
          // Fallback user data
          userMap.set(userId, {
            id: userId,
            name: 'Anonymous',
            avatar: 'https://via.placeholder.com/40'
          });
        }
      } catch (userFetchError) {
        console.warn(`Failed to fetch user ${userId}:`, userFetchError);
        userMap.set(userId, {
          id: userId,
          name: 'Anonymous',
          avatar: 'https://via.placeholder.com/40'
        });
      }
    }


    const formattedPosts = posts.map(post => ({
      id: post.postId,
      user: userMap.get(post.userId) || {
        id: post.userId,
        name: 'Anonymous',
        avatar: 'https://via.placeholder.com/40'
      },
      text: post.description,
      image: post.image,
      datePosted: post.datePosted,
      timestamp: new Date(post.datePosted).toLocaleString()
    }));

    console.log(`📋 Fetched ${formattedPosts.length} posts`);

    const {data: reacts, reactError} = await supabase
      .from('react')
      .select('*')
      .not('postId', 'is', null)

    if (reactError) {
      console.error("Error fetching react:", reactError);
      return res.status(500).json({ error: reactError.message });
    }

    console.log('react length', reacts.length)

    const {data: comments, commentError} = await supabase
      .from('comment')
      .select('*')
      .not('postId', 'is', null)

      if (commentError) {
      console.error("Error fetching react:", commentError);
      return res.status(500).json({ error: commentError.message });
    }

    console.log('comment length', comments.length)

    res.status(200).json({
      message: "Posts fetched successfully",
      posts: formattedPosts, 
      reacts, 
      comments
    });

  } catch (err) {
    console.error("getPost error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const createReact = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { postId } = req.body;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // 1️⃣ Check if the user already reacted to this post
    const { data: existing, error: checkErr } = await supabase
      .from("react")
      .select("reactId")
      .eq("userId", req.user.id)
      .eq("postId", postId)
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
          postId: postId,
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


export const createComment = async (req, res) => {
  try{
      const { postId, text } = req.body;
      const { data: inserted, error: insertErr } = await supabase
        .from("comment")
        .insert([
          {
            userId: req.user.id,
            datePosted: new Date().toISOString(),
            content: text,
            postId: postId,
            
          },
        ])
        .select()

        if (insertErr) throw insertErr;

        return res.status(201).json({message: "Comment added",});
  } catch (err) {
    console.error("comment error:", err);
    return res.status(500).json({ error: err.message });
  }
};


export const getReact = async (req, res) => {
  try {
    // get postId from query string
    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    const { data: reactions, error } = await supabase
      .from("react")
      .select("*")
      .eq("postId", postId)
      .order("reactTime", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ reactions });
  } catch (err) {
    console.error("getReact error:", err);
    return res.status(500).json({ error: err.message });
  }
};


// GET /api/homepage/getComments?postId=123
export const getComments = async (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ error: "postId is required" });

    // Pull comments for this post
    const { data: rows, error } = await supabase
      .from("comment")
      .select("*")
      .eq("postId", postId)
      .order("datePosted", { ascending: false });

    if (error) throw error;

    // Gather unique userIds, fetch minimal profile for each
    const userIds = [...new Set(rows.map(r => r.userId))];
    const userMap = new Map();

    for (const uid of userIds) {
      try {
        const { data: u, error: ue } = await supabase.auth.admin.getUserById(uid);
        if (!ue && u.user) {
          userMap.set(uid, {
            id: u.user.id,
            name: u.user.user_metadata?.name ||
                  u.user.user_metadata?.full_name ||
                  u.user.email?.split("@")[0] ||
                  "Anonymous",
            avatar: u.user.user_metadata?.avatar_url ||
                    u.user.user_metadata?.picture ||
                    "https://via.placeholder.com/40",
          });
        } else {
          userMap.set(uid, {
            id: uid, name: "Anonymous", avatar: "https://via.placeholder.com/40",
          });
        }
      } catch {
        userMap.set(uid, {
          id: uid, name: "Anonymous", avatar: "https://via.placeholder.com/40",
        });
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
