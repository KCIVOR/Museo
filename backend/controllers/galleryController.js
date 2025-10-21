import db from "../database/db.js";
import { createClient } from '@supabase/supabase-js';


// Get available art categories from the database
export const getCategories = async (req, res) => {
  try {
    const categoryDefinitions = [
      { field: 'classicalArt', name: 'Classical Art' },
      { field: 'abstractArt', name: 'Abstract Art' },
      { field: 'impressionist', name: 'Impressionist' },
      { field: 'contemporaryArt', name: 'Contemporary Art' },
      { field: 'digitalArt', name: 'Digital Art' },
      { field: 'photography', name: 'Photography' },
      { field: 'sculpture', name: 'Sculpture' },
      { field: 'streetArt', name: 'Street Art' },
      { field: 'landscape', name: 'Landscape' },
      { field: 'surrealist', name: 'Surrealist' },
      { field: 'minimalist', name: 'Minimalist' },
      { field: 'portrait', name: 'Portrait' },
      { field: 'expressionist', name: 'Expressionist' },
      { field: 'realism', name: 'Realism' },
      { field: 'conceptual', name: 'Conceptual' }
    ];
    
    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get all artworks to count categories
    const { data: allArtworks, error } = await supabaseClient
      .from('galleryart')
      .select('categories');
    
    if (error) {
      console.error('Error fetching artworks for category count:', error);
      // Return categories with 0 counts if database error
      const categoriesWithZeroCounts = categoryDefinitions.map(cat => ({
        ...cat,
        count: 0
      }));
      
      return res.json({
        success: true,
        categories: categoriesWithZeroCounts
      });
    }
    
    // Calculate counts for each category
    const categoriesWithCounts = categoryDefinitions.map(categoryDef => {
      const count = allArtworks.filter(artwork => {
        if (!artwork.categories || !Array.isArray(artwork.categories)) {
          return false;
        }
        return artwork.categories.includes(categoryDef.name);
      }).length;
      
      return {
        ...categoryDef,
        count: count
      };
    });
    
    // Get total count for "All" category
    const totalCount = allArtworks.length;
    
    res.json({
      success: true,
      categories: categoriesWithCounts,
      totalCount: totalCount
    });

  } catch (error) {
    console.error('Error fetching art categories:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

// Get filtered artworks based on categories
export const getFilteredArtworks = async (req, res) => {
  try {
    const { categories, page = 1, limit = 20 } = req.query;
    
    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Convert pagination params to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    console.log(`📄 Fetching artworks: page ${pageNum}, limit ${limitNum}, offset ${offset}`);
    
    // Query galleryart table first
    let query = supabaseClient
      .from('galleryart')
      .select(`
        galleryArtId,
        title,
        description,
        medium,
        image,
        categories,
        datePosted,
        userId,
        featured,
        top_art_week
      `)
      .order('datePosted', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    // Filter by categories if specified
    if (categories && categories !== 'all') {
      const requestedCategories = categories.split(',');
      
      // Use JSONB contains for category filtering
      const categoryFilters = requestedCategories.map(cat => 
        `categories.cs.["${cat.trim()}"]`
      ).join(',');
      
      query = query.or(categoryFilters);
    }

    const { data: artworks, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Get unique user IDs from artworks
    const userIds = [...new Set(artworks?.map(art => art.userId).filter(Boolean))];
    
    // Fetch user profiles separately
    let userProfiles = {};
    if (userIds.length > 0) {

      
      const { data: profiles, error: profileError } = await supabaseClient
        .from('profile')
        .select('userId, firstName, middleName, lastName, profilePicture')
        .in('userId', userIds);

      
      if (!profileError && profiles) {
        // Create a lookup map with combined name
        userProfiles = profiles.reduce((acc, profile) => {
          // Combine firstName, middleName, lastName into full name
          const nameParts = [
            profile.firstName,
            profile.middleName,
            profile.lastName
          ].filter(Boolean); // Remove null/undefined/empty values
          
          const fullName = nameParts.length > 0 ? nameParts.join(' ') : null;
          acc[profile.userId] = {
            name: fullName,
            profilePicture: profile.profilePicture
          };
          return acc;
        }, {});

      }
    }


    // Format artworks for frontend compatibility
    const formattedArtworks = artworks?.map(artwork => {
      const userProfile = userProfiles[artwork.userId];
      const artistName = userProfile?.name || 'Gallery Artist';
      const artistProfilePicture = userProfile?.profilePicture || null;
      
     
      return {
        id: artwork.galleryArtId,
        title: artwork.title,
        description: artwork.description,
        medium: artwork.medium,
        image: artwork.image, // JSONB array of URLs
        categories: artwork.categories, // JSONB array of categories
        datePosted: artwork.datePosted,
        userId: artwork.userId,
        featured: artwork.featured || false, // Featured status
        top_art_week: artwork.top_art_week, // Top art of the week identifier
        artist: artistName, // Real artist name from profile lookup
        artistProfilePicture: artistProfilePicture, // Artist's profile picture
        category: artwork.categories?.[0] || 'Uncategorized' // First category for compatibility
      };
    }) || [];
 


    // Get total count for pagination info (only on first page to avoid extra queries)
    let totalCount = null;
    if (pageNum === 1) {
      let countQuery = supabaseClient
        .from('galleryart')
        .select('galleryArtId', { count: 'exact', head: true });
      
      // Apply same category filter for count
      if (categories && categories !== 'all') {
        const requestedCategories = categories.split(',');
        const categoryFilters = requestedCategories.map(cat => 
          `categories.cs.["${cat.trim()}"]`
        ).join(',');
        countQuery = countQuery.or(categoryFilters);
      }
      
      const { count } = await countQuery;
      totalCount = count;
    }

    const hasMore = formattedArtworks.length === limitNum;
    
    console.log(`✅ Returning ${formattedArtworks.length} artworks for page ${pageNum}${totalCount ? `, total: ${totalCount}` : ''}, hasMore: ${hasMore}`);

    res.json({
      success: true,
      artworks: formattedArtworks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        count: formattedArtworks.length,
        hasMore,
        ...(totalCount !== null && { total: totalCount })
      }
    });

  } catch (error) {
    console.error('Error fetching filtered artworks:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

// Upload new artwork
export const uploadArtwork = async (req, res) => {
  try {
    // User is already validated by authMiddleware
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Use SERVICE_KEY client (same as homepage)
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { title, description, medium, categories } = req.body;
    const userId = req.user.id;
    const files = req.files || [];

    // Validate required fields
    if (!title || !description || !medium || !categories) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title, description, medium, and categories are required'
      });
    }

    // Validate images
    if (files.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'At least one image is required'
      });
    }

    // Parse categories from JSON string
    let parsedCategories;
    try {
      parsedCategories = JSON.parse(categories);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid categories format',
        message: 'Categories must be a valid JSON array'
      });
    }

    // Upload images to Supabase storage
    const uploadedUrls = [];
    
    for (const file of files) {
      const fileName = `${Date.now()}-${file.originalname}`;
      // Create user-specific folder path for gallery
      const filePath = `gallery/${userId}/${fileName}`;

      const { data, error } = await supabaseClient.storage
        .from("uploads")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error(`Supabase upload error:`, error);
        return res.status(500).json({
          error: 'Failed to upload image',
          message: error.message
        });
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabaseClient.storage
        .from("uploads")
        .getPublicUrl(data.path);


      uploadedUrls.push(publicUrlData.publicUrl);
    }

    // Insert artwork into database using galleryart table
    const artworkData = {
      title: title.trim(),
      description: description.trim(),
      medium: medium.trim(),
      userId: userId,
      image: uploadedUrls, // JSONB array of Supabase URLs
      categories: parsedCategories, // JSONB array of categories
      featured: true, // Auto-feature all new uploads
      featured_date: new Date().toISOString() // Track when it was featured
      // datePosted will be handled by database default or trigger
    };

    console.log('🎨 Inserting artwork data with featured=true:', {
      ...artworkData,
      featured: artworkData.featured,
      featured_date: artworkData.featured_date
    });

    const { data: artwork, error: insertError } = await supabaseClient
      .from('galleryart')
      .insert({
        ...artworkData,
        featured: true,  // Explicitly set featured to true
        featured_date: new Date().toISOString()  // Explicitly set featured_date
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting artwork:', insertError);
      return res.status(500).json({
        error: 'Failed to save artwork',
        message: insertError.message
      });
    }

    // Verify the featured status was actually saved
    console.log('✅ Artwork inserted successfully:', {
      id: artwork.galleryArtId,
      title: artwork.title,
      featured: artwork.featured,
      featured_date: artwork.featured_date
    });

    // Double-check by fetching the artwork again
    const { data: verifyArtwork, error: verifyError } = await supabaseClient
      .from('galleryart')
      .select('galleryArtId, title, featured, featured_date')
      .eq('galleryArtId', artwork.galleryArtId)
      .single();
    
    if (verifyArtwork) {
      console.log('🔍 Verification - Artwork featured status in DB:', {
        id: verifyArtwork.galleryArtId,
        title: verifyArtwork.title,
        featured: verifyArtwork.featured,
        featured_date: verifyArtwork.featured_date
      });
      
      // If for any reason the artwork is not featured, force update it
      if (!verifyArtwork.featured) {
        console.log('⚠️ Artwork not featured after insert, forcing update...');
        const { data: updateData, error: updateError } = await supabaseClient
          .from('galleryart')
          .update({
            featured: true,
            featured_date: new Date().toISOString()
          })
          .eq('galleryArtId', artwork.galleryArtId)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Failed to force featured status:', updateError);
        } else {
          console.log('✅ Successfully forced featured status:', updateData);
          artwork.featured = true;
          artwork.featured_date = updateData.featured_date;
        }
      }
    }

    // Skip rotation check for newly uploaded artworks to ensure they stay featured
    console.log('⏭️ Skipping rotation check for new upload to keep it featured');
    // await simpleRotation(); // Commented out to preserve featured status
    
    res.status(201).json({
      success: true,
      message: 'Artwork uploaded successfully',
      artwork: artwork,
      images: uploadedUrls
    });

  } catch (error) {
    console.error('Error uploading artwork:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

export const getArtPreference = async (req, res) => {
  try{
    console.log("waw")
    const userId = req.user?.id;
    console.log(userId)

    const { data: artPreference, error: artPreferenceError } = await db
      .from("artPreference")
      .select("*")
      .eq("userId", userId)
      .maybeSingle();
    
 
    if (artPreferenceError) {
      console.error('Error getting art preference:', artPreferenceError);
      return res.status(500).json({
        error: 'Internal server error',
        message: artPreferenceError.message
      });
    }
    
    res.json({
      success: true,
      artPreference: artPreference
    });

  }catch(error){
    console.error('Error getting art preference:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Create or remove like for gallery artwork
export const createGalleryReact = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { galleryArtId } = req.body;
    if (!galleryArtId) {
      return res.status(400).json({ error: "galleryArtId is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if the user already reacted to this artwork
    const { data: existing, error: checkErr } = await supabaseClient
      .from("react")
      .select("reactId")
      .eq("userId", req.user.id)
      .eq("galleryArtId", galleryArtId)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      // If reaction exists, delete it (unlike)
      const { error: deleteErr } = await supabaseClient
        .from("react")
        .delete()
        .eq("reactId", existing.reactId);

      if (deleteErr) throw deleteErr;

      return res.status(200).json({ message: "Reaction removed", removed: true });
    }

    // If no reaction, insert new one (like)
    const { data: inserted, error: insertErr } = await supabaseClient
      .from("react")
      .insert([
        {
          userId: req.user.id,
          galleryArtId: galleryArtId,
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
    console.error("createGalleryReact error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get likes for gallery artwork
export const getGalleryReact = async (req, res) => {
  try {
    const galleryArtId = (req.body && req.body.galleryArtId) || (req.query && req.query.galleryArtId);
    
    if (!galleryArtId) {
      return res.status(400).json({ error: "galleryArtId is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: reactions, error } = await supabaseClient
      .from("react")
      .select("*")
      .eq("galleryArtId", galleryArtId)
      .order("reactTime", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ reactions });
  } catch (err) {
    console.error("getGalleryReact error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Create comment for gallery artwork
export const createGalleryComment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { galleryArtId, content } = req.body;
    
    if (!galleryArtId || !content) {
      return res.status(400).json({ error: "galleryArtId and content are required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: inserted, error: insertErr } = await supabaseClient
      .from("comment")
      .insert([
        {
          userId: req.user.id,
          galleryArtId: galleryArtId,
          content: content.trim(),
          datePosted: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertErr) throw insertErr;

    return res.status(201).json({
      message: "Comment added successfully",
      comment: inserted,
    });
  } catch (err) {
    console.error("createGalleryComment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get comments for gallery artwork
export const getGalleryComments = async (req, res) => {
  try {
    const galleryArtId = (req.body && req.body.galleryArtId) || (req.query && req.query.galleryArtId);
    
    if (!galleryArtId) {
      return res.status(400).json({ error: "galleryArtId is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: comments, error } = await supabaseClient
      .from("comment")
      .select(`
        commentId,
        content,
        datePosted,
        userId,
        galleryArtId
      `)
      .eq("galleryArtId", galleryArtId)
      .order("datePosted", { ascending: false });

    if (error) throw error;

    // Get user profiles for comments
    const userIds = [...new Set(comments?.map(comment => comment.userId).filter(Boolean))];
    let userProfiles = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseClient
        .from('profile')
        .select('userId, firstName, middleName, lastName, profilePicture')
        .in('userId', userIds);
      
      if (!profileError && profiles) {
        userProfiles = profiles.reduce((acc, profile) => {
          const nameParts = [
            profile.firstName,
            profile.middleName,
            profile.lastName
          ].filter(Boolean);
          
          const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Anonymous User';
          acc[profile.userId] = {
            name: fullName,
            profilePicture: profile.profilePicture
          };
          return acc;
        }, {});
      }
    }

    // Format comments with user names and avatars
    const formattedComments = comments?.map(comment => {
      const userProfile = userProfiles[comment.userId];
      
      // Format timestamp to show exact time
      const commentDate = new Date(comment.datePosted);
      const exactTime = commentDate.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return {
        id: comment.commentId,
        user: userProfile?.name || 'Anonymous User',
        avatar: userProfile?.profilePicture || null,
        comment: comment.content,
        timestamp: exactTime
      };
    }) || [];

    return res.status(200).json({ comments: formattedComments });
  } catch (err) {
    console.error("getGalleryComments error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Track artwork view
export const trackArtworkView = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { galleryArtId } = req.body;
    if (!galleryArtId) {
      return res.status(400).json({ error: "galleryArtId is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const userId = req.user.id;

    // Get current artwork views
    const { data: artwork, error: fetchError } = await supabaseClient
      .from('galleryart')
      .select('views')
      .eq('galleryArtId', galleryArtId)
      .single();

    if (fetchError) throw fetchError;

    // Parse existing views (array of user IDs)
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
      .from('galleryart')
      .update({ views: updatedViews })
      .eq('galleryArtId', galleryArtId);

    if (updateError) throw updateError;

    return res.status(200).json({
      message: "View tracked successfully",
      viewCount: updatedViews.length,
      alreadyViewed: false
    });

  } catch (err) {
    console.error("trackArtworkView error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get artwork view count
export const getArtworkViews = async (req, res) => {
  try {
    const { galleryArtId } = req.query;
    
    if (!galleryArtId) {
      return res.status(400).json({ error: "galleryArtId is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: artwork, error } = await supabaseClient
      .from('galleryart')
      .select('views')
      .eq('galleryArtId', galleryArtId)
      .single();

    if (error) {
      console.error("getArtworkViews error:", error);
      return res.status(500).json({ error: error.message });
    }

    const viewCount = artwork.views ? artwork.views.length : 0;

    return res.status(200).json({ viewCount });
  } catch (err) {
    console.error("getArtworkViews error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Batch stats endpoint - get stats for multiple artworks in one call
export const getBatchArtworkStats = async (req, res) => {
  try {
    const { artworkIds } = req.body;
    
    if (!artworkIds || !Array.isArray(artworkIds) || artworkIds.length === 0) {
      return res.status(400).json({ error: "artworkIds array is required" });
    }

    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log(`📊 Batch fetching stats for ${artworkIds.length} artworks`);

    // Get all stats in parallel with optimized queries
    const [artworksData, likesData, commentsData] = await Promise.all([
      // Get views for all artworks
      supabaseClient
        .from('galleryart')
        .select('"galleryArtId", views')
        .in('"galleryArtId"', artworkIds),
      
      // Get likes count for all artworks
      supabaseClient
        .from('react')
        .select('"galleryArtId"')
        .in('"galleryArtId"', artworkIds),
      
      // Get comments count for all artworks
      supabaseClient
        .from('comment')
        .select('"galleryArtId"')
        .in('"galleryArtId"', artworkIds)
    ]);

    if (artworksData.error) throw artworksData.error;
    if (likesData.error) throw likesData.error;
    if (commentsData.error) throw commentsData.error;

    // Process the data
    const stats = {};
    
    // Initialize stats for all artworks
    artworkIds.forEach(id => {
      stats[id] = { views: 0, likes: 0, comments: 0 };
    });

    // Count views
    artworksData.data?.forEach(artwork => {
      const views = artwork.views ? (Array.isArray(artwork.views) ? artwork.views.length : 0) : 0;
      stats[artwork.galleryArtId].views = views;
    });

    // Count likes
    likesData.data?.forEach(like => {
      if (stats[like.galleryArtId]) {
        stats[like.galleryArtId].likes++;
      }
    });

    // Count comments
    commentsData.data?.forEach(comment => {
      if (stats[comment.galleryArtId]) {
        stats[comment.galleryArtId].comments++;
      }
    });

    console.log(`✅ Batch stats completed for ${artworkIds.length} artworks`);
    return res.status(200).json({ success: true, stats });

  } catch (err) {
    console.error("getBatchArtworkStats error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Calculate engagement score for an artwork using separate tables
const calculateEngagementScore = async (artwork, supabaseClient) => {
  try {
    // Get views from artwork.views JSONB field
    const views = artwork.views ? (Array.isArray(artwork.views) ? artwork.views.length : 0) : 0;
    
    // Get likes from react table
    const { data: likes, error: likesError } = await supabaseClient
      .from('react')
      .select('reactId')
      .eq('galleryArtId', artwork.galleryArtId);
    
    const likesCount = likesError ? 0 : (likes ? likes.length : 0);
    
    // Get comments from comment table
    const { data: comments, error: commentsError } = await supabaseClient
      .from('comment')
      .select('commentId')
      .eq('galleryArtId', artwork.galleryArtId);
    
    const commentsCount = commentsError ? 0 : (comments ? comments.length : 0);
    
    // Weighted scoring: comments worth more than likes, likes worth more than views
    const score = (views * 1) + (likesCount * 5) + (commentsCount * 10);
    
    console.log(`📊 Artwork "${artwork.title}": ${views} views, ${likesCount} likes, ${commentsCount} comments = ${score} points`);
    return score;
  } catch (error) {
    console.error(`Error calculating engagement for ${artwork.title}:`, error);
    return 0; // Return 0 if there's an error
  }
};

// Smart rotation function - keep 6 featured artworks with minimum featured time + engagement
export const simpleRotation = async () => {
  try {
    console.log('🔄 Running smart rotation...');
    
    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get all featured artworks with basic data
    const { data: featuredArtworks, error } = await supabaseClient
      .from('galleryart')
      .select('"galleryArtId", title, "datePosted", featured_date, views')
      .eq('featured', true)
      .order('"datePosted"', { ascending: true }); // Oldest first
    
    if (error) {
      console.error('Error getting featured artworks:', error);
      return;
    }
    
    console.log(`📊 Found ${featuredArtworks.length} featured artworks`);
    
    // Log all featured artworks for debugging
    console.log('🌟 Currently featured artworks:', featuredArtworks.map(art => ({
      title: art.title,
      featured_date: art.featured_date
    })));
    
    // If we have more than 6, use smart engagement-based removal
    if (featuredArtworks.length > 6) {
      const now = new Date();
      const minFeaturedTime = 5 * 60 * 1000; // 5 minutes minimum
      const highEngagementTime = 30 * 60 * 1000; // 30 minutes for high engagement
      
      // Calculate engagement scores and determine removal eligibility
      const artworksWithScores = await Promise.all(
        featuredArtworks.map(async (artwork) => {
          const engagementScore = await calculateEngagementScore(artwork, supabaseClient);
          const featuredTime = artwork.featured_date ? new Date(artwork.featured_date) : new Date(artwork.datePosted);
          const timeElapsed = now - featuredTime;
          
          // High engagement artworks get more time
          const requiredTime = engagementScore > 50 ? highEngagementTime : minFeaturedTime;
          const eligibleForRemoval = timeElapsed >= requiredTime;
          
          return {
            ...artwork,
            engagementScore,
            timeElapsed,
            requiredTime,
            eligibleForRemoval
          };
        })
      );
      
      // Sort by engagement score (lowest first) for fair removal
      const eligibleForRemoval = artworksWithScores
        .filter(artwork => artwork.eligibleForRemoval)
        .sort((a, b) => a.engagementScore - b.engagementScore);
      
      if (eligibleForRemoval.length > 0) {
        const excessCount = featuredArtworks.length - 6;
        const toRemove = eligibleForRemoval.slice(0, excessCount);
        
        console.log('🎯 Engagement-based removal analysis:');
        artworksWithScores.forEach(artwork => {
          const status = artwork.eligibleForRemoval ? '✅ Eligible' : '⏳ Protected';
          const timeMin = Math.floor(artwork.timeElapsed / (60 * 1000));
          const requiredMin = Math.floor(artwork.requiredTime / (60 * 1000));
          console.log(`   ${status} "${artwork.title}": ${artwork.engagementScore} points, ${timeMin}/${requiredMin}min`);
        });
        
        for (const artwork of toRemove) {
          const { error: updateError } = await supabaseClient
            .from('galleryart')
            .update({ featured: false, featured_date: null })
            .eq('"galleryArtId"', artwork.galleryArtId);
          
          if (updateError) {
            console.error('Error unfeaturing artwork:', updateError);
          } else {
            const timeMin = Math.floor(artwork.timeElapsed / (60 * 1000));
            console.log(`🗑️ Unfeatured "${artwork.title}": ${artwork.engagementScore} points, ${timeMin} minutes featured`);
          }
        }
        
        console.log(`✅ Smart engagement rotation: removed ${toRemove.length} low-engagement artworks`);
      } else {
        console.log(`⏳ ${featuredArtworks.length} featured artworks, but all protected by engagement or time`);
        
        // Show protection details
        artworksWithScores.forEach(artwork => {
          const timeMin = Math.floor(artwork.timeElapsed / (60 * 1000));
          const requiredMin = Math.floor(artwork.requiredTime / (60 * 1000));
          const reason = artwork.engagementScore > 50 ? 'high engagement' : 'too new';
          console.log(`   🛡️ "${artwork.title}": ${artwork.engagementScore} points, ${timeMin}/${requiredMin}min (${reason})`);
        });
      }
    } else {
      console.log(`✅ ${featuredArtworks.length} featured artworks - no rotation needed`);
      
      // If we have fewer than 6 featured artworks, try to feature recent uploads
      if (featuredArtworks.length < 6) {
        console.log(`⚠️ Only ${featuredArtworks.length} featured artworks, trying to feature recent uploads...`);
        
        const needed = 6 - featuredArtworks.length;
        const { data: recentUnfeatured, error: recentError } = await supabaseClient
          .from('galleryart')
          .select('"galleryArtId", title')
          .eq('featured', false)
          .order('"datePosted"', { ascending: false })
          .limit(needed);
        
        if (!recentError && recentUnfeatured?.length > 0) {
          for (const artwork of recentUnfeatured) {
            const { error: featureError } = await supabaseClient
              .from('galleryart')
              .update({ 
                featured: true, 
                featured_date: new Date().toISOString() 
              })
              .eq('"galleryArtId"', artwork.galleryArtId);
            
            if (!featureError) {
              console.log(`🆕 Auto-featured recent upload: "${artwork.title}"`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Smart rotation failed:', error);
  }
};

// Promote popular old posts back to featured status
export const promotePopularOldPosts = async () => {
  try {
    console.log('🔍 Checking for popular old posts to re-feature...');
    
    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get unfeatured posts from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: oldArtworks, error } = await supabaseClient
      .from('galleryart')
      .select('"galleryArtId", title, "datePosted", views')
      .eq('featured', false)  // Only unfeatured posts
      .gte('"datePosted"', thirtyDaysAgo.toISOString())  // Last 30 days
      .limit(50);  // Don't check too many at once
    
    if (error) {
      console.error('Error getting old artworks:', error);
      return;
    }
    
    if (!oldArtworks?.length) {
      console.log('📊 No unfeatured artworks found in last 30 days');
      return;
    }
    
    let reFeatureCount = 0;
    
    // Check each old artwork for high engagement
    for (const artwork of oldArtworks) {
      const engagementScore = await calculateEngagementScore(artwork, supabaseClient);
      
      // High threshold for re-featuring (prevents spam)
      if (engagementScore >= 75) {
        const { error: updateError } = await supabaseClient
          .from('galleryart')
          .update({ 
            featured: true, 
            featured_date: new Date().toISOString() 
          })
          .eq('"galleryArtId"', artwork.galleryArtId);
        
        if (!updateError) {
          console.log(`🌟 Re-featured popular old post: "${artwork.title}" (${engagementScore} points)`);
          reFeatureCount++;
          
          // Limit re-featuring to prevent overwhelming the system
          if (reFeatureCount >= 2) {
            console.log('⚠️ Limited to 2 re-features per check to prevent system overload');
            break;
          }
        } else {
          console.error('Error re-featuring artwork:', updateError);
        }
      }
    }
    
    if (reFeatureCount === 0) {
      console.log('📊 No old posts qualified for re-featuring (need 75+ engagement points)');
    } else {
      console.log(`✅ Re-featured ${reFeatureCount} popular old posts`);
    }
    
  } catch (error) {
    console.error('❌ Error promoting old posts:', error);
  }
};

export const maintenanceRotation = async (req, res) => {
  try {
    console.log('🔧 Running maintenance rotation...');
    await simpleRotation();
    res.json({ success: true, message: 'Maintenance completed' });
  } catch (error) {
    console.error('❌ Maintenance failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Calculate Top Arts of the Week - runs every Sunday 11:59 PM
export const calculateTopArtsWeekly = async () => {
  try {
    console.log('🏆 Starting weekly Top Arts calculation...');
    
    // Use SERVICE_KEY client for database access
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get Philippine timezone date
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    
    // Calculate current week (Sunday to Saturday)
    const weekStart = new Date(phTime);
    weekStart.setDate(phTime.getDate() - phTime.getDay()); // Go to Sunday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    weekEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Calculating top arts for week: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);

    // Get ALL artworks and calculate their engagement scores (same as featured art logic)
    const { data: artworks, error: artworksError } = await supabaseClient
      .from('galleryart')
      .select(`
        galleryArtId,
        title,
        image,
        userId,
        datePosted,
        views,
        top_art_week
      `);

    if (artworksError) {
      console.error('❌ Error fetching artworks:', artworksError);
      return;
    }

    console.log(`📊 Analyzing ${artworks?.length || 0} total artworks for weekly engagement`);

    if (!artworks || artworks.length === 0) {
      console.log('ℹ️ No artworks found');
      return;
    }

    // Calculate engagement scores for all artworks (same logic as featured art system)
    const scoredArtworks = await Promise.all(
      artworks.map(async (artwork) => {
        const engagementScore = await calculateEngagementScore(artwork, supabaseClient);
        return {
          ...artwork,
          engagementScore
        };
      })
    );

    // Sort by engagement score (highest first) and take top 6
    const topArtworks = scoredArtworks
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 6);

    console.log('🏆 Top 6 artworks by engagement this week:', topArtworks.map(art => ({
      title: art.title,
      score: art.engagementScore
    })));

    // First, clear all previous top_art_week flags
    const { error: clearError } = await supabaseClient
      .from('galleryart')
      .update({ top_art_week: null })
      .not('top_art_week', 'is', null);

    if (clearError) {
      console.error('❌ Error clearing previous top arts:', clearError);
    }

    // Set new top arts with week identifier
    const weekId = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)}`;
    
    for (const [index, artwork] of topArtworks.entries()) {
      const { error: updateError } = await supabaseClient
        .from('galleryart')
        .update({ top_art_week: weekId })
        .eq('galleryArtId', artwork.galleryArtId);
      
      if (updateError) {
        console.error('Error marking top art:', updateError);
      } else {
        console.log(`🌟 #${index + 1} Top Art: "${artwork.title}" (${artwork.engagementScore} points)`);
      }
    }

    console.log(`✅ Weekly top arts updated: ${topArtworks.length} artworks marked for week ${weekId}`);

  } catch (error) {
    console.error('❌ Error in calculateTopArtsWeekly:', error);
  }
};


const getCurrentTopArts = async (req, res) => {
  try {
    // Use SERVICE_KEY client for database access
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get start of current week (Sunday to Saturday - same as generateWeeklyTopArts)
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    
    // Calculate current week (Sunday to Saturday)
    const weekStart = new Date(phTime);
    weekStart.setDate(phTime.getDate() - phTime.getDay()); // Go to Sunday
    weekStart.setHours(0, 0, 0, 0);

    // Query topArtsWeekly data for current week
    
    const { data: topArts, error } = await supabase
      .from('topArtsWeekly')
      .select('*')  // ← Just get topArtsWeekly data
      .eq('weekStartDate', weekStart.toISOString())
      .order('rank_position', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    res.json({
      success: true,
      topArts: topArts || [],
      weekStart: weekStart.toISOString()
    });
  } catch (error) {
    console.error('❌ Error in getCurrentTopArts:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top arts',
      error: error.message
    });
  }
};



const generateWeeklyTopArts = async () => {
  try {
    console.log('🎯 Starting weekly top arts generation...');
    
    // Use SERVICE_KEY client for database access
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get Philippine timezone date (same as your logic)
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    
    // Calculate current week (Sunday to Saturday)
    const weekStart = new Date(phTime);
    weekStart.setDate(phTime.getDate() - phTime.getDay()); // Go to Sunday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    weekEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Calculating top arts for week: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);

    // Check if top arts already exist for this week
    const { data: existing } = await supabase
      .from('topArtsWeekly')
      .select('topArtsWeeklyId')
      .eq('weekStartDate', weekStart.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('✅ Top arts already exist for this week');
      return;
    }

    // Get ALL artworks (same as your logic)
    const { data: artworks, error: artworksError } = await supabase
      .from('galleryart')
      .select(`
        galleryArtId,
        title,
        image,
        userId,
        datePosted,
        views
      `);

    if (artworksError) {
      console.error('❌ Error fetching artworks:', artworksError);
      return;
    }

    console.log(`📊 Analyzing ${artworks?.length || 0} total artworks for weekly engagement`);

    if (!artworks || artworks.length === 0) {
      console.log('ℹ️ No artworks found');
      return;
    }

    // Get recent winners (4-week cooldown)
    const fourWeeksAgo = new Date(weekStart.getTime() - 4 * 7 * 24 * 60 * 60 * 1000); // 4 weeks * 7 days * 24 hours * 60 minutes * 60 seconds * 1000ms
    const { data: recentWinners } = await supabase
      .from('topArtsWeekly')
      .select('galleryArtId')
      .gte('weekStartDate', fourWeeksAgo.toISOString());

    const recentWinnerIds = new Set(recentWinners?.map(w => w.galleryArtId) || []);

    // Filter out recent winners
    const eligibleArtworks = artworks.filter(art => !recentWinnerIds.has(art.galleryartid));

    // Calculate engagement scores for all eligible artworks (same logic as your featured art system)
    const scoredArtworks = await Promise.all(
      eligibleArtworks.map(async (artwork) => {
        const engagementScore = await calculateEngagementScore(artwork, supabase);
        return {
          ...artwork,
          engagementScore
        };
      })
    );

    // Sort by engagement score (highest first) and take top 6
    const topArtworks = scoredArtworks
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 6);

    console.log('🏆 Top 6 artworks by engagement this week:', topArtworks.map(art => ({
      title: art.title,
      score: art.engagementScore
    })));

    if (topArtworks.length === 0) {
      console.log('⚠️ No eligible artworks found for this week');
      return;
    }

    // Prepare data for topArtsWeekly table
    const topArtsData = topArtworks.map((artwork, index) => ({
      galleryArtId: artwork.galleryArtId,
      weekStartDate: weekStart.toISOString(),
      weekEndDate: weekEnd.toISOString(),
      rank_position: index + 1,
      engagementScore: artwork.engagementScore,
      viewsCount: Array.isArray(artwork.views) ? artwork.views.length : 0,
      likesCount: 0, // Will be calculated by calculateEngagementScore
      commentCount: 0, // Will be calculated by calculateEngagementScore
      createdAt: new Date().toISOString()
    }));


    // Insert top arts into topArtsWeekly table
    const { data: insertedArts, error: insertError } = await supabase
      .from('topArtsWeekly')
      .insert(topArtsData);

    if (insertError) throw insertError;

    // Log results (same format as your existing function)
    for (const [index, artwork] of topArtworks.entries()) {
      console.log(`🌟 #${index + 1} Top Art: "${artwork.title}" (${artwork.engagementScore} points)`);
    }

    console.log(`✅ Generated ${topArtworks.length} top arts for week starting ${weekStart.toISOString()}`);
    
  } catch (error) {
    console.error('❌ Error generating weekly top arts:', error);
  }
};

// Export the new functions
export { getCurrentTopArts, generateWeeklyTopArts };