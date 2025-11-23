import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_BASE;

// SVG Icons
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const LoadingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 2a10 10 0 0 1 10 10"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
  </svg>
);

export default function ContentPreview({ targetType, targetId }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError("");
      console.log(`[Search] Fetching targetType="${targetType}" with ID: ${targetId}`);
      try {
        let data = null;
        const normalizedType = targetType?.toLowerCase().trim();
        console.log(`[Search] Normalized type: "${normalizedType}"`);

        switch (normalizedType) {
          case "post":
          case "homepage_post":
          case "homepagepost":
            // For posts, we need to fetch from homepage and search through pages
            try {
              let found = false;
              let page = 1;
              const maxPages = 10; // Search up to 10 pages
              
              while (!found && page <= maxPages) {
                const postsRes = await fetch(`${API}/homepage/getPost?page=${page}&limit=50`, {
                  credentials: "include"
                });
                
                if (!postsRes.ok) break;
                
                const postsData = await postsRes.json();
                console.log(`[Posts] Page ${page}: ${postsData.posts?.length} items`);
                const post = postsData.posts?.find(p => p.id === targetId || p.postId === targetId);
                
                if (post) {
                  console.log(`[Success] Found post:`, post);
                  data = {
                    type: "post",
                    title: "Post",
                    image: post.image,
                    description: post.text || post.description,
                    author: post.user?.name || "Unknown",
                    createdAt: post.datePosted,
                    updatedAt: post.timestamp
                  };
                  found = true;
                } else if (!postsData.pagination?.hasMore) {
                  break;
                }
                page++;
              }
              
              if (!found) {
                setError("Post not found or has been deleted");
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Error fetching post:", err);
              setError("Failed to fetch post");
              setLoading(false);
              return;
            }
            break;

          case "art":
          case "artist_post":
          case "artist_art":
          case "artist":
          case "artprofile":
            // For artist portfolio posts (from 'art' table)
            // Since there's no direct endpoint, we need to search through all artists' arts
            try {
              let found = false;
              
              // First, get all artists
              const artistsRes = await fetch(`${API}/artist/getArtist`, {
                credentials: "include"
              });
              
              if (!artistsRes.ok) {
                setError("Failed to fetch artists");
                setLoading(false);
                return;
              }
              
              const artistsData = await artistsRes.json();
              const artists = artistsData.artists || [];
              
              console.log(`[Artists] Found ${artists.length} artists, searching for art ID: ${targetId}`);
              
              // Search through each artist's arts
              for (const artist of artists) {
                if (found) break;
                
                const artsRes = await fetch(`${API}/artist/getArts/${artist.id}`, {
                  credentials: "include"
                });
                
                if (!artsRes.ok) continue;
                
                const artsData = await artsRes.json();
                const arts = Array.isArray(artsData) ? artsData : [];
                
                console.log(`[Arts] Artist ${artist.name}: ${arts.length} items`);
                
                const art = arts.find(a => a.artId === targetId);
                
                if (art) {
                  console.log(`[Success] Found art:`, art);
                  
                  // Handle image which can be a string or array
                  let imageUrl = null;
                  if (Array.isArray(art.image)) {
                    imageUrl = art.image[0];
                  } else if (typeof art.image === 'string') {
                    imageUrl = art.image;
                  }
                  
                  data = {
                    type: "art",
                    title: art.title || "Untitled",
                    image: imageUrl,
                    description: art.description,
                    author: art.user?.name || artist.name || "Unknown",
                    medium: art.medium,
                    createdAt: art.datePosted,
                    updatedAt: art.datePosted
                  };
                  found = true;
                }
              }
              
              if (!found) {
                setError("Artist post not found or has been deleted");
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Error fetching artist post:", err);
              setError("Failed to fetch artist post");
              setLoading(false);
              return;
            }
            break;

          case "comment":
            // Comments are harder to fetch without post ID
            // Try to fetch from database directly if endpoint exists
            try {
              const commentRes = await fetch(`${API}/homepage/getComments?postId=${targetId}`, {
                credentials: "include"
              });
              
              if (commentRes.ok) {
                const commentData = await commentRes.json();
                const comment = commentData.comments?.find(c => c.commentId === targetId);
                
                if (comment) {
                  data = {
                    type: "comment",
                    title: "Comment",
                    description: comment.content || comment.text,
                    author: comment.user?.name || "Unknown",
                    createdAt: comment.datePosted,
                    updatedAt: comment.updatedAt
                  };
                }
              }
            } catch (err) {
              console.error("Error fetching comment:", err);
            }
            
            if (!data) {
              setError("Comment not found or has been deleted");
              setLoading(false);
              return;
            }
            break;

          case "artwork":
          case "gallery":
            // Fetch from gallery artworks first, then try artist arts if not found
            try {
              let found = false;
              let page = 1;
              const maxPages = 10;
              
              // First, try gallery artworks
              console.log(`[Artwork] Searching gallery artworks for ID: ${targetId}`);
              while (!found && page <= maxPages) {
                const artRes = await fetch(`${API}/gallery/artworks?page=${page}&limit=50`, {
                  credentials: "include"
                });
                
                if (!artRes.ok) break;
                
                const artData = await artRes.json();
                console.log(`[Artworks] Page ${page}: ${artData.artworks?.length} items`);
                const artwork = artData.artworks?.find(a => a.id === targetId || a.galleryArtId === targetId);
                
                if (artwork) {
                  console.log(`[Success] Found gallery artwork:`, artwork);
                  // Handle image which can be a string or array
                  let imageUrl = null;
                  if (Array.isArray(artwork.image)) {
                    imageUrl = artwork.image[0];
                  } else if (typeof artwork.image === 'string') {
                    imageUrl = artwork.image;
                  }
                  
                  data = {
                    type: "artwork",
                    title: artwork.title,
                    image: imageUrl,
                    description: artwork.description,
                    artist: artwork.artist,
                    medium: artwork.medium,
                    year: artwork.year,
                    price: artwork.price,
                    createdAt: artwork.datePosted,
                    updatedAt: artwork.datePosted
                  };
                  found = true;
                } else if (!artData.pagination?.hasMore) {
                  break;
                }
                page++;
              }
              
              // If not found in gallery, try artist arts
              if (!found) {
                console.log(`[Artwork] Not found in gallery, searching artist arts for ID: "${targetId}" (type: ${typeof targetId})`);
                const artistsRes = await fetch(`${API}/artist/getArtist`, {
                  credentials: "include"
                });
                
                if (artistsRes.ok) {
                  const artistsData = await artistsRes.json();
                  const artists = artistsData.artists || [];
                  console.log(`[Artists] Found ${artists.length} artists, searching for art ID: ${targetId}`);
                  
                  for (const artist of artists) {
                    if (found) break;
                    
                    const artsRes = await fetch(`${API}/artist/getArts/${artist.id}`, {
                      credentials: "include"
                    });
                    
                    if (!artsRes.ok) continue;
                    
                    const artsData = await artsRes.json();
                    const arts = Array.isArray(artsData) ? artsData : [];
                    console.log(`[Arts] Artist ${artist.name}: ${arts.length} items`);
                    
                    // Log all art IDs to help debug
                    if (arts.length > 0) {
                      console.log(`[Arts] Sample art IDs:`, arts.slice(0, 3).map(a => ({ artId: a.artId, id: a.id, title: a.title })));
                      console.log(`[Arts] Looking for targetId: "${targetId}"`);
                    }
                    
                    // Try multiple matching strategies
                    const art = arts.find(a => 
                      a.artId === targetId || 
                      a.id === targetId ||
                      String(a.artId) === String(targetId) ||
                      String(a.id) === String(targetId)
                    );
                    
                    if (art) {
                      console.log(`[Success] Found artist art:`, art);
                      
                      // Handle image which can be a string or array
                      let imageUrl = null;
                      if (Array.isArray(art.image)) {
                        imageUrl = art.image[0];
                      } else if (typeof art.image === 'string') {
                        imageUrl = art.image;
                      }
                      
                      data = {
                        type: "artwork",
                        title: art.title || "Untitled",
                        image: imageUrl,
                        description: art.description,
                        artist: art.user?.name || artist.name || "Unknown",
                        medium: art.medium,
                        createdAt: art.datePosted,
                        updatedAt: art.datePosted
                      };
                      found = true;
                    }
                  }
                }
              }
              
              if (!found) {
                setError("Artwork not found or has been deleted");
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Error fetching artwork:", err);
              setError("Failed to fetch artwork");
              setLoading(false);
              return;
            }
            break;

          case "marketplace_item":
          case "marketplace":
            // Fetch single marketplace item
            try {
              const itemRes = await fetch(`${API}/marketplace/items/${targetId}`, {
                credentials: "include"
              });
              
              if (itemRes.ok) {
                const itemData = await itemRes.json();
                data = {
                  type: "marketplace_item",
                  title: itemData.title,
                  image: itemData.images?.[0],
                  description: itemData.description,
                  price: itemData.price,
                  condition: itemData.condition,
                  createdAt: itemData.createdAt,
                  updatedAt: itemData.updatedAt
                };
              } else {
                setError("Marketplace item not found or has been deleted");
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Error fetching marketplace item:", err);
              setError("Failed to fetch marketplace item");
              setLoading(false);
              return;
            }
            break;

          case "user":
          case "profile":
            // Fetch user profile
            try {
              const profileRes = await fetch(`${API}/profile/${targetId}`, {
                credentials: "include"
              });
              
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                data = {
                  type: "profile",
                  title: profileData.username || profileData.name,
                  image: profileData.profilePicture,
                  description: profileData.bio,
                  email: profileData.email,
                  role: profileData.role,
                  createdAt: profileData.createdAt,
                  updatedAt: profileData.updatedAt
                };
              } else {
                setError("User profile not found or has been deleted");
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Error fetching profile:", err);
              setError("Failed to fetch user profile");
              setLoading(false);
              return;
            }
            break;

          default:
            console.log(`[Error] Unknown content type: "${normalizedType}" (original: "${targetType}")`);
            setError(`Unknown content type: ${targetType}. Please check the report data.`);
            setLoading(false);
            return;
        }

        if (data) {
          setContent(data);
        } else {
          setError("Content not found or has been deleted");
        }
      } catch (err) {
        console.error("Error fetching content:", err);
        setError(err.message || "Failed to fetch content");
      } finally {
        setLoading(false);
      }
    };

    if (targetType && targetId) {
      fetchContent();
    }
  }, [targetType, targetId]);

  if (loading) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "var(--museo-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <LoadingIcon />
        Loading content preview...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "16px",
          backgroundColor: "#ffe0e0",
          color: "#c92a2a",
          borderRadius: "6px",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <AlertIcon />
        {error}
      </div>
    );
  }

  if (!content) {
    return (
      <div style={{ padding: "16px", color: "var(--museo-text-muted)" }}>
        No content available
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div
        style={{
          border: "1px solid var(--museo-border)",
          borderRadius: "8px",
          padding: "16px",
          backgroundColor: "var(--museo-bg-secondary)",
          marginBottom: "24px"
        }}
      >
      <h3
        style={{
          margin: "0 0 12px 0",
          fontSize: "14px",
          fontWeight: "600",
          color: "var(--museo-text-muted)",
          textTransform: "uppercase"
        }}
      >
        Reported Content
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: content.image ? "100px 1fr" : "1fr",
          gap: "16px"
        }}
      >
        {content.image && (
          <img
            src={content.image}
            alt={content.title}
            onError={(e) => {
              console.error("[Error] Failed to load image:", content.image);
              e.target.style.display = "none";
            }}
            style={{
              width: "100px",
              height: "100px",
              objectFit: "cover",
              borderRadius: "6px",
              backgroundColor: "var(--museo-bg-tertiary)"
            }}
          />
        )}

        <div>
          <h4
            style={{
              margin: "0 0 8px 0",
              fontSize: "15px",
              fontWeight: "600",
              color: "var(--museo-text)"
            }}
          >
            {content.title || "Untitled"}
          </h4>

          {content.description && (
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "13px",
                color: "var(--museo-text)",
                lineHeight: "1.4",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }}
            >
              {content.description}
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "8px",
              fontSize: "12px",
              color: "var(--museo-text-muted)"
            }}
          >
            {content.artist && (
              <div>
                <span style={{ fontWeight: "600" }}>Artist:</span> {content.artist}
              </div>
            )}
            {content.author && (
              <div>
                <span style={{ fontWeight: "600" }}>Author:</span> {content.author}
              </div>
            )}
            {content.price && (
              <div>
                <span style={{ fontWeight: "600" }}>Price:</span> ₱{parseFloat(content.price).toFixed(2)}
              </div>
            )}
            {content.medium && (
              <div>
                <span style={{ fontWeight: "600" }}>Medium:</span> {content.medium}
              </div>
            )}
            {content.year && (
              <div>
                <span style={{ fontWeight: "600" }}>Year:</span> {content.year}
              </div>
            )}
            {content.condition && (
              <div>
                <span style={{ fontWeight: "600" }}>Condition:</span> {content.condition}
              </div>
            )}
            {content.role && (
              <div>
                <span style={{ fontWeight: "600" }}>Role:</span> {content.role}
              </div>
            )}
            {content.email && (
              <div>
                <span style={{ fontWeight: "600" }}>Email:</span> {content.email}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid var(--museo-border)",
              fontSize: "11px",
              color: "var(--museo-text-muted)"
            }}
          >
            {content.createdAt && (
              <div>
                Posted: {new Date(content.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
            )}
            {content.updatedAt && content.updatedAt !== content.createdAt && (
              <div>
                Updated: {new Date(content.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
