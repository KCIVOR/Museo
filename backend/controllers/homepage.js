import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import supabase from '../database/db.js';
import { cache } from '../utils/cache.js';
import CACHE_DURATION from '../utils/cacheConfig.js';


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
    const files = req.files || {};
    const uploadedUrls = [];

    // Get user ID for folder creation
    const userId = req.user.id;

    // Helper function to upload a single file
    async function uploadOne(fieldName) {
      const file = files[fieldName]?.[0];
      if (!file) return null;
      
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
        console.error(`Supabase upload error for ${fieldName}:`, error);
        throw new Error(error.message);
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(data.path);

      console.log(`🖼️ Uploaded: ${file.originalname}`);
      console.log(`📍 Public URL: ${publicUrlData.publicUrl}`);

      return publicUrlData.publicUrl;
    }

    // Upload up to 4 files: file, file2, file3, file4
    const url1 = await uploadOne("file");
    const url2 = await uploadOne("file2");
    const url3 = await uploadOne("file3");
    const url4 = await uploadOne("file4");
    
    // Add non-null URLs to array
    if (url1) uploadedUrls.push(url1);
    if (url2) uploadedUrls.push(url2);
    if (url3) uploadedUrls.push(url3);
    if (url4) uploadedUrls.push(url4);

    // If no images uploaded, allow text-only post
    // Insert single post with all images in JSONB field
    const { data: postData, error: postError } = await supabase
      .from('post')
      .insert({
        userId: userId,
        description: description || '',
        image: uploadedUrls.length > 0 ? uploadedUrls : null, // Store array in JSONB
        datePosted: new Date().toISOString()
      })
      .select();
    if (postError) {
      console.error("Database insert error:", postError);
      throw new Error(`Failed to save post: ${postError.message}`);
    }

    console.log(`💾 Saved to database - Post ID: ${postData[0].postId}`);
    console.log(`✅ Successfully uploaded ${uploadedUrls.length} images and created 1 post for user: ${userId}`);

    // Invalidate posts cache (new post created)
    await cache.del('posts:*');
    console.log('🗑️ Posts cache invalidated');

    res.status(201).json({
      message: "Post created successfully",
      description,
      userId,
      images: uploadedUrls,
      post: postData[0] // Return the single post
    });

  } catch (err) {
    console.error("createPost error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const getPost = async (req, res) => {
  try {
    // Extract pagination parameters from query (Gallery style)
    const { page = 1, limit = 10 } = req.query;
    
    // Convert pagination params to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Include userId in cache key for user-specific data (liked posts)
    const userId = req.user?.id || 'anonymous';
    const cacheKey = `posts:${userId}:${pageNum}:${limitNum}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    
    console.log('❌ Cache MISS:', cacheKey);

    // Fetch posts with pagination (Gallery style)
    const { data: posts, error } = await supabase
      .from('post')
      .select('*')
      .order('datePosted', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error("❌ Error fetching posts:", error);
      return res.status(500).json({ error: error.message });
    }



    // Get unique user IDs to fetch user data
    const userIds = [...new Set(posts.map(post => post.userId))];
    const userMap = new Map();

    // Fetch profile records for these users instead of relying on auth meta fields
    if (userIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profile')
        .select('userId, firstName, lastName, profilePicture')
        .in('userId', userIds);

      if (profileError) {
        console.warn('Failed to fetch profiles:', profileError);
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

    // Ensure every userId has a fallback entry
    for (const uid of userIds) {
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          id: uid,
          name: 'Anonymous',
          avatar: 'https://via.placeholder.com/40',
        });
      }
    }


    // Optionally fetch events to enrich announcements missing eventId
    let eventIndex = new Map();
    try {
      const { data: evts, error: evtErr } = await supabase
        .from('event')
        .select('eventId, title, startsAt');
      if (!evtErr && Array.isArray(evts)) {
        for (const e of evts) {
          const key = `${String(e.title||'').toLowerCase()}|${new Date(e.startsAt).toISOString()}`;
          eventIndex.set(key, e.eventId);
        }
      }
    } catch {}

    // Process all posts (both regular and announcements) in the main posts array

    const formattedPosts = posts.map(post => {
      if (post.isAnnouncement === true) {
        // Format as announcement post
        let evId = post.eventId || null;
        if (!evId && post.title && post.date) {
          const k = `${String(post.title).toLowerCase()}|${new Date(post.date).toISOString()}`;
          evId = eventIndex.get(k) || null;
        }
        return {
          id: post.postId,
          userId: post.userId,  // Add userId at root level for permission checks
          eventId: evId,
          title: post.title,
          date: post.date,
          venueName: post.venueName,
          user: userMap.get(post.userId) || {
            id: post.userId,
            name: 'Anonymous',
            avatar: 'https://via.placeholder.com/40'
          },
          isAnnouncement: true,
          datePosted: post.datePosted,
          timestamp: new Date(post.datePosted).toLocaleString(),
          text: post.description || '',
          image: post.image || null,
          newsfeedId: post.newsfeedId || null,
        };
      } else {
        // Format as regular post
        return {
          id: post.postId,
          userId: post.userId,  // Add userId at root level for permission checks
          user: userMap.get(post.userId) || {
            id: post.userId,
            name: 'Anonymous',
            avatar: 'https://via.placeholder.com/40'
          },
          text: post.description,
          image: post.image,
          datePosted: post.datePosted,
          timestamp: new Date(post.datePosted).toLocaleString(),
          isAnnouncement: false,
        };
      }
    });

    // Separate announcements for the old announcements field (for backward compatibility)
    const formattedAnnouncements = formattedPosts.filter(p => p.isAnnouncement === true);

    // ✅ FIXED: Only fetch reactions and comments for the posts on this page
    const postIds = posts.map(p => p.id || p.postId).filter(Boolean);
    
    const {data: reacts, reactError} = await supabase
      .from('react')
      .select('*')
      .in('postId', postIds)  // Only fetch for current page posts

    if (reactError) {
      console.error("Error fetching react:", reactError);
      return res.status(500).json({ error: reactError.message });
    }

    // Get current user ID to check which posts they've liked
    const currentUserId = req.user?.id;

    const {data: comments, commentError} = await supabase
      .from('comment')
      .select('*')
      .in('postId', postIds)  // Only fetch for current page posts

      if (commentError) {
      console.error("Error fetching react:", commentError);
      return res.status(500).json({ error: commentError.message });
    }
    
    // Calculate pagination info (Gallery style)
    const hasMore = formattedPosts.length === limitNum;

    // Create user-specific liked posts array
    const userLikedPosts = {};
    if (currentUserId && reacts) {
      reacts.forEach(react => {
        if (react.userId === currentUserId && react.postId) {
          userLikedPosts[react.postId] = true;
        }
      });
    }


    const result = {
      message: "Posts fetched successfully",
      posts: formattedPosts, // Now includes both regular posts and announcements
      announcements: [], // Empty since announcements are now in posts array
      reacts,
      comments,
      userLikedPosts, // Add user's liked posts
      pagination: {
        page: pageNum,
        limit: limitNum,
        count: formattedPosts.length,
        hasMore
      }
    };

    // Cache the result (3 minutes for posts - they change frequently)
    await cache.set(cacheKey, result, CACHE_DURATION.POSTS);

    res.status(200).json(result);

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

      // Clear cache for this post's stats only
      await cache.del(`reactions:post:${postId}`);
      console.log(`🗑️ Cleared stats cache for post ${postId} after unlike`);

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

    // Clear cache for this post's stats only
    await cache.del(`reactions:post:${postId}`);
    console.log(`🗑️ Cleared stats cache for post ${postId} after like`);

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
      const userId = req.user.id;
      
      const { data: inserted, error: insertErr } = await supabase
        .from("comment")
        .insert([
          {
            userId: userId,
            datePosted: new Date().toISOString(),
            content: text,
            postId: postId,
          },
        ])
        .select()

        if (insertErr) throw insertErr;

        // Get user profile for the comment
        const { data: profile, error: profileError } = await supabase
          .from('profile')
          .select('userId, firstName, lastName, profilePicture')
          .eq('userId', userId)
          .single();

        const userName = profile 
          ? [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Anonymous'
          : 'Anonymous';

        // Format the comment for frontend
        const formattedComment = {
          id: inserted[0].commentId,
          text: inserted[0].content,
          timestamp: new Date(inserted[0].datePosted).toLocaleString(),
          user: {
            id: userId,
            name: userName,
            avatar: profile?.profilePicture || 'https://via.placeholder.com/40'
          }
        };

        // Invalidate all comment pages for this post
        await cache.del(`comments:post:${postId}:*`);
        console.log(`🗑️ Comment cache invalidated for post: ${postId}`);

        return res.status(201).json({
          message: "Comment added",
          comment: formattedComment
        });
  } catch (err) {
    console.error("comment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/homepage/deleteComment/:commentId
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

    // Invalidate cache for this post's comments
    await cache.del(`comments:post:${comment.postId}:*`);
    console.log(`🗑️ Cache invalidated for post: ${comment.postId}`);

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Delete comment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/homepage/updateComment/:commentId
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

    // Invalidate cache for this post's comments
    await cache.del(`comments:post:${comment.postId}:*`);
    console.log(`🗑️ Cache invalidated for post: ${comment.postId}`);

    return res.status(200).json({ 
      message: "Comment updated successfully",
      comment: updated[0]
    });
  } catch (err) {
    console.error("Update comment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/homepage/reportComment
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
      console.log("Comment report:", { commentId, userId, reason });
    }

    return res.status(200).json({ message: "Comment reported successfully" });
  } catch (err) {
    console.error("Report comment error:", err);
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

    // Check cache first (30 seconds for reactions - semi-real-time)
    const cacheKey = `reactions:post:${postId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    
    console.log('❌ Cache MISS:', cacheKey);

    const { data: reactions, error } = await supabase
      .from("react")
      .select("*")
      .eq("postId", postId)
      .order("reactTime", { ascending: false })
      .limit(100);

    if (error) throw error;

    const result = { reactions };
    
    // Cache for 30 seconds (short duration for near-real-time feel)
    await cache.set(cacheKey, result, 30);

    return res.status(200).json(result);
  } catch (err) {
    console.error("getReact error:", err);
    return res.status(500).json({ error: err.message });
  }
};


// GET /api/homepage/getComments?postId=123&page=1&limit=10
export const getComments = async (req, res) => {
  try {
    const { postId, page = 1, limit = 10 } = req.query;
    if (!postId) return res.status(400).json({ error: "postId is required" });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Check cache first
    const cacheKey = `comments:post:${postId}:${pageNum}:${limitNum}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    
    console.log('❌ Cache MISS:', cacheKey);

    // Pull comments for this post with pagination
    const { data: rows, error} = await supabase
      .from("comment")
      .select("*")
      .eq("postId", postId)
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
      text: r.content,
      timestamp: new Date(r.datePosted).toLocaleString(),
      updatedAt: r.updatedAt, // Include updatedAt to show "(edited)" indicator
      user: userMap.get(r.userId),
    }));

    // Check if there are more comments
    const hasMore = rows.length === limitNum;

    const result = { comments, hasMore };
    
    // Cache the result (duration from config)
    await cache.set(cacheKey, result, CACHE_DURATION.COMMENTS);

    return res.status(200).json(result);
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/homepage/posts/:postId
export const deletePost = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // First, check if the post exists and get its details
    const { data: existingPost, error: fetchError } = await supabase
      .from('post')
      .select('postId, userId, image')
      .eq('postId', postId)
      .single();

    if (fetchError) {
      console.error("Error fetching post:", fetchError);
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is authorized to delete (post owner or admin)
    console.log(`🔐 Delete authorization check for user ${req.user.id}:`);
    console.log(`🔐 Post owner: ${existingPost.userId}`);
    console.log(`🔐 User object:`, req.user);
    
    // Get user role from database to ensure we have the latest role
    const { data: userProfile, error: userError } = await supabase
      .from('profile')
      .select('role')
      .eq('userId', req.user.id)
      .single();
    
    const userRole = userProfile?.role || req.user.role || 'user';
    const isOwner = existingPost.userId === req.user.id;
    const isAdmin = userRole === 'admin';
    
    console.log(`🔐 User role: ${userRole}`);
    console.log(`🔐 Is owner: ${isOwner}`);
    console.log(`🔐 Is admin: ${isAdmin}`);

    if (!isOwner && !isAdmin) {
      console.log(`❌ Authorization failed: User ${req.user.id} cannot delete post ${postId}`);
      return res.status(403).json({ error: "Not authorized to delete this post" });
    }
    
    console.log(`✅ Authorization passed: User ${req.user.id} can delete post ${postId} (owner: ${isOwner}, admin: ${isAdmin})`);

    // Delete associated reactions first
    const { error: reactError } = await supabase
      .from('react')
      .delete()
      .eq('postId', postId);

    if (reactError) {
      console.warn("Error deleting reactions:", reactError);
    }

    // Delete associated comments
    const { error: commentError } = await supabase
      .from('comment')
      .delete()
      .eq('postId', postId);

    if (commentError) {
      console.warn("Error deleting comments:", commentError);
    }

    // Delete images from storage if they exist
    if (existingPost.image && Array.isArray(existingPost.image)) {
      console.log(`🗑️ Attempting to delete ${existingPost.image.length} images for post ${postId}`);
      
      for (const imageUrl of existingPost.image) {
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
            filePath = `pics/${existingPost.userId}/${fileName}`;
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
    } else if (existingPost.image && typeof existingPost.image === 'string') {
      // Handle single image as string
      console.log(`🗑️ Processing single image: ${existingPost.image}`);
      
      try {
        let filePath = '';
        
        if (existingPost.image.includes('/storage/v1/object/public/uploads/')) {
          const pathPart = existingPost.image.split('/storage/v1/object/public/uploads/')[1];
          filePath = pathPart;
        } else if (existingPost.image.includes('/uploads/')) {
          const pathPart = existingPost.image.split('/uploads/')[1];
          filePath = pathPart;
        } else {
          const fileName = existingPost.image.split('/').pop();
          filePath = `pics/${existingPost.userId}/${fileName}`;
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
    } else {
      console.log(`ℹ️ No images to delete for post ${postId}`);
    }

    // Finally, delete the post
    const { error: deleteError } = await supabase
      .from('post')
      .delete()
      .eq('postId', postId);

    if (deleteError) {
      console.error("Error deleting post:", deleteError);
      return res.status(500).json({ error: "Failed to delete post" });
    }

    console.log(`✅ Post ${postId} deleted successfully by user ${req.user.id}`);
    
    // Invalidate posts cache (post deleted)
    await cache.del('posts:*');
    console.log('🗑️ Posts cache invalidated');
    
    return res.status(200).json({ 
      message: "Post deleted successfully",
      postId: postId
    });

  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/homepage/posts/:postId
export const updatePost = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Use SERVICE_KEY client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { postId } = req.params;
    const { description, existingImages, imagesToRemove } = req.body;
    const files = req.files || [];

    console.log(`🔍 Updating post with ID: ${postId}`);
    console.log(`📝 Description: ${description}`);
    console.log(`📁 Files received: ${files.length}`);

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: "Description is required" });
    }

    // First, check if the post exists and get its details
    const { data: existingPost, error: fetchError } = await supabase
      .from('post')
      .select('postId, userId, description, image')
      .eq('postId', postId)
      .single();

    console.log(`🔍 Database query result:`, { existingPost, fetchError });

    if (fetchError) {
      console.error("Error fetching post:", fetchError);
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is authorized to update (post owner or admin)
    console.log(`🔐 Update authorization check for user ${req.user.id}:`);
    console.log(`🔐 Post owner: ${existingPost.userId}`);
    console.log(`🔐 User object:`, req.user);
    
    // Get user role from database to ensure we have the latest role
    const { data: userProfile, error: userError } = await supabase
      .from('profile')
      .select('role')
      .eq('userId', req.user.id)
      .single();
    
    const userRole = userProfile?.role || req.user.role || 'user';
    const isOwner = existingPost.userId === req.user.id;
    const isAdmin = userRole === 'admin';
    
    console.log(`🔐 User role: ${userRole}`);
    console.log(`🔐 Is owner: ${isOwner}`);
    console.log(`🔐 Is admin: ${isAdmin}`);

    if (!isOwner && !isAdmin) {
      console.log(`❌ Authorization failed: User ${req.user.id} cannot update post ${postId}`);
      return res.status(403).json({ error: "Not authorized to update this post" });
    }
    
    console.log(`✅ Authorization passed: User ${req.user.id} can update post ${postId} (owner: ${isOwner}, admin: ${isAdmin})`);

    // Handle image uploads
    const uploadedUrls = [];
    const userId = req.user.id;

    // Upload new images
    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `pics/${userId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from("uploads")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          console.error("Upload error:", error);
          continue; // Skip this file but continue with others
        }

        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }
    }

    // Process existing images and handle deletions
    let finalImages = [];
    const imagesToDelete = [];
    
    // Get original images from database
    const originalImages = existingPost.image && Array.isArray(existingPost.image) ? existingPost.image : [];
    
    // Determine which images to keep (sent from frontend as existingImages)
    if (existingImages) {
      const existingImagesArray = Array.isArray(existingImages) ? existingImages : [existingImages];
      finalImages = [...existingImagesArray];
      
      // Find images that were removed (in original but not in existingImages)
      imagesToDelete.push(...originalImages.filter(img => !existingImagesArray.includes(img)));
    } else {
      // If no existingImages sent, assume all original images were removed
      imagesToDelete.push(...originalImages);
    }

    // Add newly uploaded images
    finalImages = [...finalImages, ...uploadedUrls];

    // Remove duplicates
    finalImages = [...new Set(finalImages)];

    console.log(`🗑️ Images to delete from storage: ${imagesToDelete.length}`);
    console.log(`📁 Final images after update: ${finalImages.length}`);

    // Delete removed images from Supabase storage
    for (const imageUrl of imagesToDelete) {
      try {
        // Extract file path from URL
        // URL format: https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/userId/filename
        const urlParts = imageUrl.split('/uploads/');
        if (urlParts.length === 2) {
          const filePath = urlParts[1]; // e.g., "pics/userId/filename"
          
          const { error: deleteError } = await supabase.storage
            .from('uploads')
            .remove([filePath]);
            
          if (deleteError) {
            console.error(`❌ Failed to delete image from storage: ${filePath}`, deleteError);
          } else {
            console.log(`✅ Deleted image from storage: ${filePath}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing image deletion: ${imageUrl}`, error);
      }
    }

    // Update the post (use 'image' field like createPost)
    const { data: updatedPost, error: updateError } = await supabase
      .from('post')
      .update({
        description: description.trim(),
        image: finalImages.length > 0 ? finalImages : null
      })
      .eq('postId', postId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating post:", updateError);
      return res.status(500).json({ error: "Failed to update post" });
    }

    console.log(`✅ Post ${postId} updated successfully by user ${req.user.id}`);
    
    // Invalidate posts cache (post updated)
    await cache.del('posts:*');
    console.log('🗑️ Posts cache invalidated');
    
    return res.status(200).json({
      message: "Post updated successfully",
      postId: updatedPost.postId,
      description: updatedPost.description,
      images: updatedPost.image, // Use 'image' field from database
      datePosted: updatedPost.datePosted
    });

  } catch (err) {
    console.error("updatePost error:", err);
    return res.status(500).json({ error: err.message });
  }
};
