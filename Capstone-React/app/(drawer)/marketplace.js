import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../supabase/supabaseClient';
import Header from '../components/Header';
import DirectPurchaseModal from '../components/DirectPurchaseModal';
import AuctionModal from '../components/AuctionModal';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AndroidFooterSpacer from '../components/Footer';
const API_BASE = "http://192.168.18.79:3000/api";

const MarketplaceScreen = () => {
  // Get user data from UserContext
  const { userData } = useUser();
  const insets = useSafeAreaInsets();

  const navigation = useNavigation();
  const router = useRouter();
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [listingType, setListingType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [artworkType, setArtworkType] = useState({
    original: false,
    limited: false,
    open: false,
  });
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dropdown states
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Product states (Cart removed by P2P migration)
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // Store all items for pagination
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [sellerProfileId, setSellerProfileId] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Master collapse for entire Quick Actions section
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Reset filters to default values
  const resetFilters = () => {
    setListingType('all');
    setSelectedCategory('all');
    setPriceRange({ min: 0, max: 100000 });
    setArtworkType({
      original: false,
      limited: false,
      open: false,
    });
    setSortBy('newest');
    setSearchQuery('');
    setCurrentPage(1);
  };
  
  // Toggle entire Quick Actions section
  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions);
  };

  // Cart functionality removed by P2P migration

  // Fetch marketplace items from API
  const fetchMarketplaceItems = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      let currentSellerProfileId = null;
      try {
        const sellerRes = await fetch(`${API_BASE}/marketplace/seller/status`, {
          method: 'GET',
          credentials: 'include',
          headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
        });
        if (sellerRes.ok) {
          const sellerJson = await sellerRes.json();
          if (sellerJson?.isSeller && sellerJson?.sellerProfile?.sellerProfileId) {
            currentSellerProfileId = sellerJson.sellerProfile.sellerProfileId;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch seller status for marketplace:', e);
      }
      setSellerProfileId(currentSellerProfileId);

      const response = await fetch(`${API_BASE}/marketplace/items`, {
        method: 'GET',
        credentials: 'include',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });

      if (response.ok) {
        const result = await response.json();
        let items = result.data || [];
        
        // Ensure all items have a listingType
        items = items.map(item => ({
          ...item,
          listingType: item.listingType || 'buy-now'
        }));
        
        // Fetch active auctions and normalize them (matching web logic)
        let auctionsNormalized = [];
        try {
          const aRes = await fetch(`${API_BASE}/auctions?status=active&limit=100`, {
            method: 'GET',
            credentials: 'include',
            headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
          });
          
          if (aRes.ok) {
            const aJson = await aRes.json();
            const aList = Array.isArray(aJson?.data)
              ? aJson.data
              : Array.isArray(aJson?.auctions)
                ? aJson.auctions
                : Array.isArray(aJson)
                  ? aJson
                  : [];

            auctionsNormalized = aList.map((a) => {
              const aItem = a.auction_items;
              const title = aItem?.title || a.title || 'Untitled';
              const primary = aItem?.primary_image || a.primary_image;
              const imgs = Array.isArray(aItem?.images) ? aItem.images : [];
              const sellerData = aItem?.seller;
              const seller = sellerData ? { 
                shopName: sellerData.shopName || 'Unknown Artist',
                profilePicture: `https://ui-avatars.com/api/?name=${sellerData.shopName || 'Artist'}&background=d4b48a&color=fff&size=32`
              } : { shopName: 'Unknown Artist' };
              const sellerUserId =
                sellerData?.userId ||
                sellerData?.id ||
                aItem?.sellerUserId ||
                aItem?.sellerId ||
                aItem?.userId ||
                a?.sellerUserId ||
                a?.sellerId ||
                a?.userId ||
                a?.user_id ||
                a?.ownerId ||
                a?.owner_id;
              const categories = aItem?.categories || [];
              const current = a.currentBid ?? a.highestBid ?? null;
              const startPrice = a.startPrice ?? a.startingPrice ?? 0;
              const end = a.endAt ?? a.endTime;
              const price = (current ?? startPrice ?? 0);
              
              return {
                id: a.auctionId || a.id,
                auctionId: a.auctionId || a.id,
                marketItemId: a.auctionId || a.id,
                sellerUserId,
                sellerProfileId: a.sellerProfileId,
                title,
                description: aItem?.description || a.description || '',
                primary_image: primary,
                images: imgs,
                medium: aItem?.medium,
                dimensions: aItem?.dimensions,
                year_created: aItem?.year_created,
                is_original: aItem?.is_original,
                is_featured: aItem?.is_featured,
                seller,
                categories,
                listingType: 'auction',
                startingPrice: startPrice,
                endTime: end,
                currentBid: current,
                price,
                startAt: a.startAt ?? a.start_time ?? a.startsAt ?? null,
                endAt: end,
                startPrice: startPrice,
                minIncrement: a.minIncrement ?? a.min_increment ?? null,
                singleBidOnly: a.singleBidOnly ?? a.single_bid_only ?? false,
                allowBidUpdates: a.allowBidUpdates ?? a.allow_bid_updates ?? false
              };
            });
          }
        } catch (e) {
          console.warn('Failed to load auctions:', e);
        }

        // Combine auctions with regular items
        items = [...auctionsNormalized, ...items];
        
        // Apply client-side filters (matching web logic)
        
        // Search filter
        if (searchQuery.trim()) {
          items = items.filter(item => 
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.seller?.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.medium?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // Category filter
        if (selectedCategory !== 'all') {
          items = items.filter(item => 
            item.categories?.includes(selectedCategory) || 
            item.medium?.toLowerCase() === selectedCategory.toLowerCase()
          );
        }
        
        // Listing type filter
        if (listingType !== 'all') {
          items = items.filter(item => item.listingType === listingType);
        }
        
        // Price range filter (using dynamic range from state)
        const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
        const maxPrice = priceRange.max ? parseFloat(priceRange.max) : 100000;
        items = items.filter(item => 
          item.price >= minPrice && item.price <= maxPrice
        );
        
        // Sort items (matching web logic)
        switch (sortBy) {
          case 'price-low':
            items.sort((a, b) => a.price - b.price);
            break;
          case 'price-high':
            items.sort((a, b) => b.price - a.price);
            break;
          case 'newest':
            items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
          case 'popular':
            items.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
          default:
            break;
        }
        
        setAllItems(items);
        setCurrentPage(1); // Reset to first page
        // Set initial page items
        setMarketplaceItems(items.slice(0, itemsPerPage));
      } else {
        console.error('Failed to fetch marketplace items');
      }
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, listingType, sortBy, searchQuery, priceRange]);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchMarketplaceItems(true);
    // Cart disabled by P2P migration
  }, [fetchMarketplaceItems]);
  
  // Calculate total pages
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  
  // Handle page change
  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    setCurrentPage(pageNumber);
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setMarketplaceItems(allItems.slice(startIndex, endIndex));
  };
  
  // Update items when page changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setMarketplaceItems(allItems.slice(startIndex, endIndex));
  }, [currentPage, allItems]);

  // Derive if this is an auction and normalize product data
  const openProduct = (product) => {
    // Detect auction even when listingType is absent
    const isAuction = (product?.listingType === 'auction')
      || product?.isAuction
      || typeof product?.currentBid === 'number'
      || typeof product?.startingPrice === 'number'
      || !!product?.endTime || !!product?.endAt;

    const normalized = {
      ...product,
      listingType: isAuction ? 'auction' : (product?.listingType || 'buy-now')
    };

    setSelectedProduct(normalized);
    if (normalized.listingType === 'auction') {
      setShowAuctionModal(true);
    } else {
      setShowProductModal(true);
    }
  };

  // Buy Now -> go to checkout page with selected item & quantity (P2P migration)
  const handleAddToCart = async (item, quantityToAdd = 1) => {
    if (!userData) {
      Alert.alert('Login Required', 'Please login to continue');
      return;
    }
    
    // Direct purchase: go straight to checkout screen with query params
    const qty = Number(quantityToAdd) > 0 ? Number(quantityToAdd) : 1;
    const marketItemId = item.marketItemId || item.id;
    router.push(`/orderSummary?marketItemId=${marketItemId}&quantity=${qty}&directPurchase=true`);
  };

  // Handle place bid
  const handlePlaceBid = (item, bidAmount) => {
    Alert.alert(
      'Bid Placed',
      `Your sealed bid of ₱${bidAmount} has been placed successfully!\n\nYou will be notified when the auction ends.`,
      [{ text: 'OK' }]
    );
  };

  // Handle buy now (P2P migration - same as handleAddToCart)
  const handleBuyNow = async (item, quantityToAdd = 1) => {
    console.log('handleBuyNow called with:', { item, quantityToAdd });
    console.log('Item structure:', JSON.stringify(item, null, 2));
    
    if (!userData) {
      Alert.alert('Login Required', 'Please login to continue');
      return;
    }
    
    // Direct purchase: go straight to checkout screen with query params
    const qty = Number(quantityToAdd) > 0 ? Number(quantityToAdd) : 1;
    const marketItemId = item.marketItemId || item.id;
    
    console.log('Navigating with:', { marketItemId, qty });
    
    if (!marketItemId) {
      Alert.alert('Error', 'Item ID not found. Please try again.');
      return;
    }
    
    router.push(`/orderSummary?marketItemId=${marketItemId}&quantity=${qty}&directPurchase=true`);
  };

  useEffect(() => {
    fetchMarketplaceItems();
    // Cart disabled by P2P migration
  }, [fetchMarketplaceItems, userData, selectedCategory, listingType, priceRange, sortBy, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchMarketplaceItems();
      // Cart disabled by P2P migration
    }, [fetchMarketplaceItems, userData])
  );

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'painting', name: 'Paintings' },
    { id: 'sculpture', name: 'Sculptures' },
    { id: 'photography', name: 'Photography' },
    { id: 'digital', name: 'Digital Art' },
    { id: 'prints', name: 'Prints & Posters' },
    { id: 'mixed', name: 'Mixed Media' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Reusable Header */}
      <Header title="Marketplace" showSearch={false} />

      {/* Search Bar + Filter Button + Seller Dashboard */}
      <View style={styles.searchToolbar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artworks, artists..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={22} color="#A68C7B" />
        </TouchableOpacity>
      </View>

      {/* Quick Action Buttons - Collapsible */}
      <View style={styles.quickActionsWrapper}>
        {/* Master Collapse Header */}
        <TouchableOpacity 
          style={styles.masterCollapseHeader}
          onPress={toggleQuickActions}
        >
          <View style={styles.masterHeaderContent}>
            <Ionicons name="flash-outline" size={18} color="#A68C7B" />
            <Text style={styles.masterHeaderText}>Quick Actions</Text>
          </View>
          <Ionicons 
            name={showQuickActions ? "chevron-up" : "chevron-down"} 
            size={18} 
            color="#A68C7B" 
          />
        </TouchableOpacity>

        {/* Collapsible Content */}
        {showQuickActions && (
          <View style={styles.quickActionsContainer}>
            {/* My Orders Button */}
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/(drawer)/myOrders')}
            >
              <Ionicons name="receipt-outline" size={20} color="#A68C7B" />
              <Text style={styles.quickActionText}>My Orders</Text>
              <Ionicons name="chevron-forward" size={20} color="#A68C7B" />
            </TouchableOpacity>

            {/* Seller Dashboard Button - For sellers only */}
            {userData?.isSeller && (
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push('/(drawer)/sellerDashboard')}
              >
                <Ionicons name="storefront-outline" size={20} color="#A68C7B" />
                <Text style={styles.quickActionText}>Seller Dashboard</Text>
                <Ionicons name="chevron-forward" size={20} color="#A68C7B" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Scrollable Content - Dynamic Marketplace Grid */}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A68C7B" />
            <Text style={styles.loadingText}>Loading artworks...</Text>
          </View>
        ) : marketplaceItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Artworks Found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or check back later</Text>
          </View>
        ) : (
          <>
            <View style={styles.cardGrid}>
              {marketplaceItems.map((item) => (
                <MarketplaceCard
                  key={item.marketItemId || item.id}
                  item={item}
                  onPress={() => openProduct(item)}
                  onAddToCart={handleBuyNow}
                  currentSellerProfileId={sellerProfileId}
                />
              ))}
            </View>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                {/* Previous Button */}
                <TouchableOpacity
                  style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
                  onPress={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : '#A68C7B'} />
                </TouchableOpacity>

                {/* Page Numbers */}
                <View style={styles.pageNumbers}>
                  {/* First page */}
                  {currentPage > 2 && (
                    <>
                      <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(1)}>
                        <Text style={styles.pageText}>1</Text>
                      </TouchableOpacity>
                      {currentPage > 3 && <Text style={styles.pageDots}>...</Text>}
                    </>
                  )}

                  {/* Previous page */}
                  {currentPage > 1 && (
                    <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(currentPage - 1)}>
                      <Text style={styles.pageText}>{currentPage - 1}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Current page */}
                  <View style={[styles.pageBtn, styles.pageBtnActive]}>
                    <Text style={styles.pageTextActive}>{currentPage}</Text>
                  </View>

                  {/* Next page */}
                  {currentPage < totalPages && (
                    <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(currentPage + 1)}>
                      <Text style={styles.pageText}>{currentPage + 1}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && <Text style={styles.pageDots}>...</Text>}
                      <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(totalPages)}>
                        <Text style={styles.pageText}>{totalPages}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                  style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
                  onPress={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : '#A68C7B'} />
                </TouchableOpacity>
              </View>
            )}

            {/* Page Info */}
            {allItems.length > 0 && (
              <View style={styles.pageInfo}>
                <Text style={styles.pageInfoText}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, allItems.length)} of {allItems.length} items
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
              {/* Sort By - Dropdown */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Sort By</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {sortBy === 'newest' && 'Newest First'}
                    {sortBy === 'price-low' && 'Price: Low to High'}
                    {sortBy === 'price-high' && 'Price: High to Low'}
                    {sortBy === 'popular' && 'Most Popular'}
                  </Text>
                  <Ionicons 
                    name={showSortDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {/* Sort Options List */}
                {showSortDropdown && (
                  <View style={styles.dropdownOptions}>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'newest' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('newest'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'newest' && styles.dropdownOptionTextActive]}>
                        Newest First
                      </Text>
                      {sortBy === 'newest' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'price-low' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('price-low'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'price-low' && styles.dropdownOptionTextActive]}>
                        Price: Low to High
                      </Text>
                      {sortBy === 'price-low' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'price-high' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('price-high'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'price-high' && styles.dropdownOptionTextActive]}>
                        Price: High to Low
                      </Text>
                      {sortBy === 'price-high' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'popular' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('popular'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'popular' && styles.dropdownOptionTextActive]}>
                        Most Popular
                      </Text>
                      {sortBy === 'popular' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Listing Type */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Listing Type</Text>
                <View style={styles.listingTypes}>
                  <TouchableOpacity
                    style={[styles.listingTypeBtn, listingType === 'all' && styles.listingTypeBtnActive]}
                    onPress={() => setListingType('all')}
                  >
                    <Ionicons name="grid-outline" size={20} color={listingType === 'all' ? '#fff' : '#666'} />
                    <Text style={[styles.listingTypeText, listingType === 'all' && styles.listingTypeTextActive]}>
                      All Listings
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.listingTypeBtn, listingType === 'buy-now' && styles.listingTypeBtnActive]}
                    onPress={() => setListingType('buy-now')}
                  >
                    <Ionicons name="pricetag-outline" size={20} color={listingType === 'buy-now' ? '#fff' : '#666'} />
                    <Text style={[styles.listingTypeText, listingType === 'buy-now' && styles.listingTypeTextActive]}>
                      Buy Now
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.listingTypeBtn, listingType === 'auction' && styles.listingTypeBtnActive]}
                    onPress={() => setListingType('auction')}
                  >
                    <Ionicons name="trophy-outline" size={20} color={listingType === 'auction' ? '#fff' : '#666'} />
                    <Text style={[styles.listingTypeText, listingType === 'auction' && styles.listingTypeTextActive]}>
                      Auctions
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Categories - Dropdown */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Categories</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {categories.find(cat => cat.id === selectedCategory)?.name || 'Select Category'}
                  </Text>
                  <Ionicons 
                    name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {/* Category Options List */}
                {showCategoryDropdown && (
                  <View style={styles.dropdownOptions}>
                    {categories.map(cat => (
                      <TouchableOpacity 
                        key={cat.id}
                        style={[styles.dropdownOption, selectedCategory === cat.id && styles.dropdownOptionActive]}
                        onPress={() => { setSelectedCategory(cat.id); setShowCategoryDropdown(false); }}
                      >
                        <Text style={[styles.dropdownOptionText, selectedCategory === cat.id && styles.dropdownOptionTextActive]}>
                          {cat.name}
                        </Text>
                        {selectedCategory === cat.id && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Price Range */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Price Range</Text>
                <View style={styles.priceInputs}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={priceRange.min}
                    onChangeText={(text) => setPriceRange({ ...priceRange, min: text })}
                  />
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="100000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={priceRange.max}
                    onChangeText={(text) => setPriceRange({ ...priceRange, max: text })}
                  />
                </View>
              </View>

              {/* Artwork Type */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Artwork Type</Text>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtworkType({ ...artworkType, original: !artworkType.original })}
                >
                  <Ionicons 
                    name={artworkType.original ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <Text style={styles.checkboxLabel}>Original Artworks</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtworkType({ ...artworkType, limited: !artworkType.limited })}
                >
                  <Ionicons 
                    name={artworkType.limited ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <Text style={styles.checkboxLabel}>Limited Editions</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtworkType({ ...artworkType, open: !artworkType.open })}
                >
                  <Ionicons 
                    name={artworkType.open ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <Text style={styles.checkboxLabel}>Open Editions</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.resetButton} 
                onPress={() => {
                  resetFilters();
                }}
              >
                <Text style={styles.resetButtonText}>Reset Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cart UI removed by P2P migration */}

      {/* Product Detail Modal (Buy-Now) */}
      <DirectPurchaseModal
        visible={showProductModal && selectedProduct?.listingType !== 'auction'}
        onClose={() => setShowProductModal(false)}
        item={selectedProduct?.listingType !== 'auction' ? selectedProduct : null}
        onPlaceBid={handlePlaceBid}
        onBuyNow={handleBuyNow}
      />

      {/* Auction Modal */}
      <AuctionModal
        visible={showAuctionModal && selectedProduct?.listingType === 'auction'}
        onClose={() => setShowAuctionModal(false)}
        item={selectedProduct}
        onPlaceBid={handlePlaceBid}
      />

      <AndroidFooterSpacer />
    </SafeAreaView>
  );
};

// Marketplace Card Component
const MarketplaceCard = ({ item, onPress, onAddToCart, currentSellerProfileId }) => {
  const { userData } = useUser();

  const getTimeRemaining = (endTime) => {
    if (!endTime) return '';
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const isAuction = item.listingType === 'auction';
  const salePercentage = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;

  const currentUserId = userData?.id || userData?.userId || null;
  const currentShopName =
    userData?.shopName ||
    userData?.sellerProfile?.shopName ||
    userData?.sellerProfile?.storeName ||
    userData?.username ||
    userData?.fullName;

  const ownerId =
    item.sellerUserId ||
    item.seller?.userId ||
    item.seller?.id ||
    item.sellerId ||
    item.seller_id ||
    item.userId ||
    item.ownerId;
  const sellerName =
    item.seller?.shopName ||
    item.seller_name ||
    item.sellerName;

  const itemSellerProfileId =
    item.sellerProfileId ||
    item.sellerProfiles?.sellerProfileId ||
    item.seller?.sellerProfileId;

  const isOwnById =
    !!currentUserId &&
    !!ownerId &&
    String(currentUserId) === String(ownerId);

  const isOwnByName =
    !!sellerName &&
    !!currentShopName &&
    sellerName.toString().trim().toLowerCase() === currentShopName.toString().trim().toLowerCase();

  const isOwnBySellerProfile =
    !!currentSellerProfileId &&
    !!itemSellerProfileId &&
    String(currentSellerProfileId) === String(itemSellerProfileId);

  const isOwnListing = isOwnById || isOwnByName || isOwnBySellerProfile;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image Container */}
      <View style={styles.cardImageContainer}>
        <Image
          source={
            item.primary_image
              ? { uri: item.primary_image }
              : item.images?.[0]
              ? { uri: item.images[0] }
              : require('../../assets/pic1.jpg')
          }
          style={styles.cardImage}
        />
        
        {/* Badges */}
        <View style={styles.badgeRow}>
          {item.is_featured && (
            <View style={[styles.cardBadge, styles.featuredBadge]}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {salePercentage > 0 && !isAuction && (
            <View style={[styles.cardBadge, styles.saleBadge]}>
              <Text style={styles.badgeText}>{salePercentage}% OFF</Text>
            </View>
          )}
          {isAuction && (
            <View style={[styles.cardBadge, styles.auctionBadge]}>
              <Ionicons name="trophy" size={12} color="#fff" />
              <Text style={[styles.badgeText, { color: '#fff' }]}>Auction</Text>
            </View>
          )}
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          by {item.seller?.shopName || 'Unknown Artist'}
        </Text>
        
        <View style={styles.cardFooter}>
          {isAuction ? (
            <View style={styles.auctionInfo}>
              <Text style={styles.cardPrice}>₱{item.currentBid || item.startingPrice || item.price}</Text>
            </View>
          ) : (
            <View style={styles.priceInfo}>
              <Text style={styles.cardPrice}>₱{item.price}</Text>
            </View>
          )}
          
          {!isOwnListing && (
            <TouchableOpacity
              style={[styles.addToCartBtn, isAuction && styles.bidBtn]}
              onPress={(e) => {
                e.stopPropagation();
                isAuction ? onPress() : onAddToCart(item);
              }}
            >
              <Ionicons 
                name={isAuction ? 'trophy' : 'pricetag'} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.addToCartText}>
                {isAuction ? 'Bid' : 'Buy'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  searchToolbar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#A68C7B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Card Grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 15,
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
    flexDirection: 'column',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  cardImage: { 
    width: '100%', 
    height: '100%',
    backgroundColor: '#f0f0f0',
    resizeMode: 'cover',
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  saleBadge: {
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
  },
  auctionBadge: {
    backgroundColor: 'rgba(166, 140, 123, 0.95)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  cardContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'flex-start',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 11,
    color: '#A68C7B',
    fontWeight: '600',
  },
  cardYear: {
    fontSize: 11,
    color: '#999',
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
    marginBottom: 0,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  cardSize: {
    fontSize: 11,
    color: '#999',
    flex: 1,
  },
  originalTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originalTagText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
  },
  auctionInfo: {
    flex: 0,
  },
  bidLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  cardPrice: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#A68C7B',
  },
  timeLeft: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 2,
  },
  priceInfo: {
    flex: 0,
  },
  originalPrice: {
    fontSize: 11,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A68C7B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  bidBtn: {
    backgroundColor: '#8B7355',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  filterScrollView: {
    padding: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  
  // Sort Options (in filter modal)
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortOptionActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Listing Types
  listingTypes: {
    gap: 10,
  },
  listingTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  listingTypeBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  listingTypeText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  listingTypeTextActive: {
    color: '#fff',
  },
  
  // Categories
  categoryList: {
    gap: 8,
  },
  categoryBtn: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  categoryBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Price Range
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  
  // Checkboxes
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  
  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A68C7B',
  },
  resetButtonText: {
    color: '#A68C7B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Floating Action Button (Cart)
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
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  fabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Cart styles removed by P2P migration

  // Dropdown Styles
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  dropdownOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionActive: {
    backgroundColor: '#F5F0EB',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  dropdownOptionTextActive: {
    fontSize: 14,
    color: '#A68C7B',
    fontWeight: '600',
  },
  // Quick Actions
  quickActionsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  masterCollapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  masterHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  masterHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#A68C7B',
    gap: 8,
  },
  quickActionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  quickActionText: {
    flex: 1,
    color: '#A68C7B',
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionTextWhite: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Dropdown Styles
  dropdownContent: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  
  // Pagination Styles
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    gap: 10,
  },
  paginationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#A68C7B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationBtnDisabled: {
    borderColor: '#e0e0e0',
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  pageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  pageTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  pageDots: {
    fontSize: 16,
    color: '#999',
    paddingHorizontal: 4,
  },
  pageInfo: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  pageInfoText: {
    fontSize: 13,
    color: '#999',
  },
});

// Auction Modal Styles (Enhanced from React web ProductAuctionModal)
const auctionModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  breadcrumb: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  gallery: {
    position: 'relative',
    width: '100%',
    height: 280,
    backgroundColor: '#f5f5f5',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  navBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    marginTop: -22,
  },
  navPrev: {
    left: 12,
  },
  navNext: {
    right: 12,
  },
  thumbsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbActive: {
    borderColor: '#A68C7B',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  quickInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  artistSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  artistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e0e0',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#A68C7B',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#A68C7B',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  seeMoreBtn: {
    fontSize: 13,
    color: '#A68C7B',
    fontWeight: '600',
    marginTop: 8,
  },
  shipOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  shipValue: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  bidSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  auctionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5F0EB',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  bidFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginRight: 4,
  },
  bidInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  placeBidBtn: {
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  placeBidBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  placeBidBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bidNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default MarketplaceScreen;
