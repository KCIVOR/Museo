import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../../supabase/supabaseClient";
import Header from '../components/Header';
import UploadGalleryModal from '../components/UploadGalleryModal';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AndroidFooterSpacer from '../components/Footer';
const API_BASE = "http://192.168.18.79:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const GalleryScreen = () => {
  // Get user data from UserContext
  const { userData } = useUser();
  const role = userData?.role || null;
  const insets = useSafeAreaInsets();
  
  const navigation = useNavigation();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [curatedArtworks, setCuratedArtworks] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalArtworks, setTotalArtworks] = useState(0);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [userPreferences, setUserPreferences] = useState([]);
  const [recentlyAddedPage, setRecentlyAddedPage] = useState(0);
  const [curatedPage, setCuratedPage] = useState(0);
  const itemsPerPage = 6;

  const loadSession = async () => {
    const { data } = await supabase.auth.getSession();
    return {
      at: data?.session?.access_token || null,
      rt: data?.session?.refresh_token || null,
    };
  };

  const fetchCategories = async () => {
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/getCategories`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      const data = await res.json();
      if (data.success && data.categories) {
        const allCategory = { field: 'all', name: 'All', count: data.totalCount || 0 };
        setCategories([allCategory, ...data.categories]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArtworks = async (categoryFilter = 'all') => {
    try {
      const { at, rt } = await loadSession();
      const queryParams = new URLSearchParams();
      if (categoryFilter !== 'all') {
        queryParams.append('categories', categoryFilter);
      }
      queryParams.append('page', '1');
      queryParams.append('limit', '100');
      
      const res = await fetch(`${API_BASE}/gallery/artworks?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      const data = await res.json();
      
      if (data.success && data.artworks) {
        // Curated Collection: Featured artworks first, then remaining artworks
        const featured = data.artworks.filter(art => art.featured === true);
        const nonFeatured = data.artworks.filter(art => art.featured !== true);
        setCuratedArtworks(featured.length > 0 ? [...featured, ...nonFeatured] : data.artworks);
        
        // Recently Added: Latest artworks (using datePosted from controller)
        const sorted = [...data.artworks].sort((a, b) => 
          new Date(b.datePosted || 0) - new Date(a.datePosted || 0)
        );
        setRecentlyAdded(sorted);
        
        // Store total count
        setTotalArtworks(data.totalCount || data.artworks.length);
      }
    } catch (error) {
      console.error('Error fetching artworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/getArtPreference`, {
        method: 'GET',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences && Array.isArray(data.preferences)) {
          setUserPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  // Role now comes from UserContext - no need to fetch separately

  useEffect(() => {
    fetchCategories();
    fetchArtworks();
    fetchUserPreferences();
  }, []);

  const handleCategoryChange = (categoryField, categoryName) => {
    setSelectedCategory(categoryField);
    setLoading(true);
    // Reset pagination when changing categories
    setRecentlyAddedPage(0);
    setCuratedPage(0);
    // If "All" is selected, send 'all', otherwise send the category name
    const filterValue = categoryField === 'all' ? 'all' : categoryName;
    fetchArtworks(filterValue);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset pagination on refresh
    setRecentlyAddedPage(0);
    setCuratedPage(0);
    try {
      await Promise.all([
        fetchCategories(),
        fetchArtworks(selectedCategory === 'all' ? 'all' : categories.find(c => c.field === selectedCategory)?.name)
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const resolveImageUrl = (imageData) => {
    if (!imageData) return null;
    // Handle array of images (get first image)
    const imageUrl = Array.isArray(imageData) ? imageData[0] : imageData;
    if (!imageUrl) return null;
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_ORIGIN}${imageUrl}`;
    // Add cache busting parameter to force reload of watermarked images
    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}_=${Date.now()}`;
  };

  const renderArtworkCard = (item) => (
    <TouchableOpacity 
      style={styles.card} 
      key={item.id}
      onPress={() => {
        router.push({ pathname: 'viewGallery', params: { artworkId: item.id } });
      }}
    >
      <Image 
        source={{ uri: resolveImageUrl(item.image), cache: 'reload' }} 
        style={styles.cardImage}
        defaultSource={require('../../assets/icon.png')}
      />
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
      <Text style={styles.cardAuthor} numberOfLines={1}>by {item.artist || 'Unknown Artist'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Gallery" showSearch={false} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A68C7B']}
            tintColor="#A68C7B"
          />
        }
      >
        {/* Filter Collection (Categories) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Filter Collection</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {categories.map((category) => {
              const isPreferred = userPreferences.includes(category.field) || userPreferences.includes(category.name);
              return (
                <TouchableOpacity
                  key={category.field}
                  style={[
                    styles.filterChip,
                    selectedCategory === category.field && styles.filterChipActive,
                    isPreferred && selectedCategory !== category.field && styles.filterChipPreferred
                  ]}
                  onPress={() => handleCategoryChange(category.field, category.name)}
                >
                  {isPreferred && (
                    <Ionicons name="star" size={14} color="#FFD700" style={{ marginRight: 4 }} />
                  )}
                  <Text style={[
                    styles.filterChipText,
                    selectedCategory === category.field && styles.filterChipTextActive,
                    isPreferred && selectedCategory !== category.field && styles.filterChipTextPreferred
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A68C7B" />
          </View>
        ) : (
          <>
            {/* Empty State */}
            {recentlyAdded.length === 0 && curatedArtworks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="image-outline" size={64} color="#A68C7B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyTitle}>No Artworks Found</Text>
                <Text style={styles.emptyMessage}>
                  There are no artworks in this category yet.
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => handleCategoryChange('all', 'All')}
                >
                  <Text style={styles.emptyButtonText}>View All Artworks</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Recently Added */}
                {recentlyAdded.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Recently Added</Text>
                      <Text style={styles.sectionCount}>
                        {Math.min((recentlyAddedPage + 1) * itemsPerPage, recentlyAdded.length)} of {recentlyAdded.length}
                      </Text>
                    </View>
                    <View style={styles.cardGrid}>
                      {recentlyAdded
                        .slice(recentlyAddedPage * itemsPerPage, (recentlyAddedPage + 1) * itemsPerPage)
                        .map(renderArtworkCard)}
                    </View>
                    {recentlyAdded.length > itemsPerPage && (
                      <View style={styles.paginationContainer}>
                        <TouchableOpacity
                          style={[styles.paginationButton, recentlyAddedPage === 0 && styles.paginationButtonDisabled]}
                          onPress={() => setRecentlyAddedPage(prev => Math.max(0, prev - 1))}
                          disabled={recentlyAddedPage === 0}
                        >
                          <Ionicons name="chevron-back" size={20} color={recentlyAddedPage === 0 ? '#ccc' : '#A68C7B'} />
                        </TouchableOpacity>
                        <View style={styles.paginationDots}>
                          {Array.from({ length: Math.ceil(recentlyAdded.length / itemsPerPage) }).map((_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.paginationDot,
                                index === recentlyAddedPage && styles.paginationDotActive
                              ]}
                            />
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.paginationButton,
                            recentlyAddedPage >= Math.ceil(recentlyAdded.length / itemsPerPage) - 1 && styles.paginationButtonDisabled
                          ]}
                          onPress={() => setRecentlyAddedPage(prev => 
                            Math.min(Math.ceil(recentlyAdded.length / itemsPerPage) - 1, prev + 1)
                          )}
                          disabled={recentlyAddedPage >= Math.ceil(recentlyAdded.length / itemsPerPage) - 1}
                        >
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={recentlyAddedPage >= Math.ceil(recentlyAdded.length / itemsPerPage) - 1 ? '#ccc' : '#A68C7B'} 
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Curated Collection */}
                {curatedArtworks.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Curated Collection</Text>
                      <Text style={styles.sectionCount}>
                        {Math.min((curatedPage + 1) * itemsPerPage, curatedArtworks.length)} of {curatedArtworks.length}
                      </Text>
                    </View>
                    <View style={styles.cardGrid}>
                      {curatedArtworks
                        .slice(curatedPage * itemsPerPage, (curatedPage + 1) * itemsPerPage)
                        .map(renderArtworkCard)}
                    </View>
                    {curatedArtworks.length > itemsPerPage && (
                      <View style={styles.paginationContainer}>
                        <TouchableOpacity
                          style={[styles.paginationButton, curatedPage === 0 && styles.paginationButtonDisabled]}
                          onPress={() => setCuratedPage(prev => Math.max(0, prev - 1))}
                          disabled={curatedPage === 0}
                        >
                          <Ionicons name="chevron-back" size={20} color={curatedPage === 0 ? '#ccc' : '#A68C7B'} />
                        </TouchableOpacity>
                        <View style={styles.paginationDots}>
                          {Array.from({ length: Math.ceil(curatedArtworks.length / itemsPerPage) }).map((_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.paginationDot,
                                index === curatedPage && styles.paginationDotActive
                              ]}
                            />
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.paginationButton,
                            curatedPage >= Math.ceil(curatedArtworks.length / itemsPerPage) - 1 && styles.paginationButtonDisabled
                          ]}
                          onPress={() => setCuratedPage(prev => 
                            Math.min(Math.ceil(curatedArtworks.length / itemsPerPage) - 1, prev + 1)
                          )}
                          disabled={curatedPage >= Math.ceil(curatedArtworks.length / itemsPerPage) - 1}
                        >
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={curatedPage >= Math.ceil(curatedArtworks.length / itemsPerPage) - 1 ? '#ccc' : '#A68C7B'} 
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
                
                {/* Gallery Collection Info */}
                <View style={styles.galleryHeader}>
                  <Text style={styles.galleryHeaderTitle}>Gallery Collection</Text>
                  <Text style={styles.galleryHeaderDescription}>
                    Featuring {totalArtworks} carefully curated masterpieces spanning multiple centuries and artistic movements. Each piece represents a significant moment in art history, from classical Renaissance works to modern abstract expressions.
                  </Text>
                </View>

                {/* End of Collection Message */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.endOfCollection}>
                  <Ionicons name="checkmark-circle" size={48} color="#A68C7B" />
                  <Text style={styles.endTitle}>You've reached the end of the collection</Text>
                  <Text style={styles.endMessage}>Showing all {totalArtworks} {totalArtworks === 1 ? 'artwork' : 'artworks'}</Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Add Button - Only for Artists & Admins */}
      {(role === 'artist' || role === 'admin') && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 30 }]}
          onPress={() => setUploadModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Upload Modal */}
      <UploadGalleryModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        categories={categories}
        onUploadSuccess={() => {
          fetchArtworks(selectedCategory === 'all' ? 'all' : categories.find(c => c.field === selectedCategory)?.name);
          fetchCategories();
        }}
        loadSession={loadSession}
      />
      <AndroidFooterSpacer backgroundColor="#fff" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  galleryHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  galleryHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A68C7B',
    textAlign: 'center',
    marginBottom: 12,
  },
  galleryHeaderDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterScroll: {
    paddingHorizontal: 15,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  filterChipPreferred: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterChipTextPreferred: {
    color: '#B8860B',
    fontWeight: '700',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 15,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#A68C7B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#A68C7B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    paddingHorizontal: 30,
    marginTop: 20,
    marginBottom: 10,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  endOfCollection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  endTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  endMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#A68C7B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paginationButtonDisabled: {
    backgroundColor: '#fafafa',
    borderColor: '#f0f0f0',
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#A68C7B',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  imagesSection: {
    marginBottom: 20,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#A68C7B',
    fontWeight: '600',
  },
  imagesPreview: {
    flexDirection: 'row',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
    paddingTop: 10,
    paddingRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 13,
  },
});

export default GalleryScreen;
