import multer from "multer";
import { createClient } from "@supabase/supabase-js";

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
    // Use SERVICE_KEY client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

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

    // Fetch user data for each unique user ID
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

    // Format the data for frontend
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

    res.status(200).json({
      message: "Posts fetched successfully",
      posts: formattedPosts
    });

  } catch (err) {
    console.error("getPost error:", err);
    res.status(500).json({ error: err.message });
  }
};
