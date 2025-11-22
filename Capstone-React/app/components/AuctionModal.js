import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase/supabaseClient';
import { useUser } from '../contexts/UserContext';
import AddAddressModal from './AddAddressModal';
import EditAddressModal from './EditAddressModal';

const API_BASE = "http://192.168.18.79:3000/api";

export default function AuctionModal({ visible, onClose, item, onPlaceBid }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [showBidSuccess, setShowBidSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState('details');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [placingBid, setPlacingBid] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [pendingAddressId, setPendingAddressId] = useState('');
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [addressFormSubmitting, setAddressFormSubmitting] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [myBids, setMyBids] = useState([]);
  const [loadingMyBids, setLoadingMyBids] = useState(false);
  const [errorMyBids, setErrorMyBids] = useState('');
  const { userData } = useUser();

  const normalizeImageUri = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img.trim();
    if (typeof img === 'object') {
      const possible =
        img.uri ||
        img.url ||
        img.image_url ||
        img.imageUrl ||
        img.path ||
        img.location;
      return typeof possible === 'string' ? possible.trim() : null;
    }
    return null;
  };

  // Images from API (primary_image + images[]) with dedupe + normalization
  const images = item
    ? [
        normalizeImageUri(item.primary_image),
        ...(Array.isArray(item.images)
          ? item.images.map(normalizeImageUri)
          : []),
      ]
        .filter(Boolean)
        .filter((uri, index, arr) => arr.indexOf(uri) === index)
    : [];
  
  // Handle scroll end to update selected image index
  const onScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const viewSize = event.nativeEvent.layoutMeasurement.width;
    const selectedIndex = Math.round(contentOffset / viewSize);
    setSelectedImageIndex(selectedIndex);
  };

  // Handle swipe for image navigation
  const handleSwipe = (dx) => {
    if (Math.abs(dx) > 50) {
      if (dx > 0) {
        // Swiped right - go to previous image
        setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
      } else {
        // Swiped left - go to next image
        setSelectedImageIndex(prev => (prev + 1) % images.length);
      }
    }
  };

  // Handle image press (removed zoom functionality)
  const handleImagePress = () => {
    // No zoom functionality, just cycle to next image
    setSelectedImageIndex(prev => (prev + 1) % images.length);
  };

  // Auction-only fields with robust fallbacks (DB and legacy)
  const startPriceVal = item ? Number(
    item.startPrice ?? item.startingPrice ?? item.start_price ?? 0
  ) : 0;
  const minIncrementVal = item ? Number(
    item.minIncrement ?? item.min_increment ?? 0
  ) : 0;
  const startsAt = item ? (
    item.startAt ?? item.start_time ?? null
  ) : null;
  const endsAt = item ? (
    item.endAt ?? item.endTime ?? item.endsAt ?? null
  ) : null;
  const singleBidOnly = item ? (item.singleBidOnly ?? item.single_bid_only ?? false) : false;
  const allowBidUpdates = item ? (item.allowBidUpdates ?? item.allow_bid_updates ?? false) : false;
  const sellerUserId = item?.sellerUserId || item?.seller?.userId || item?.seller?.id || item?.seller_id || item?.sellerId;
  const currentUserId = userData?.id || userData?.userId || null;

  // Debug: log incoming item and derived auction fields
  useEffect(() => {
    if (visible && item) {
      console.debug('[AuctionModal] Item + derived fields', {
        item,
        startPriceVal,
        minIncrementVal,
        startsAt,
        endsAt,
        singleBidOnly,
        allowBidUpdates
      });
    }
  }, [visible, item]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedImageIndex(0);
      setBidAmount('');
      setShowBidSuccess(false);
      setSelectedTab('details');
      setIsDescriptionExpanded(false);
      fetchAddresses();
    }
  }, [visible]);
  
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);
  
  const fetchAddresses = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      setAccessToken(at);
      setRefreshToken(rt);
      const res = await fetch(`${API_BASE}/marketplace/addresses`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setUserAddresses([]);
        setSelectedAddressId('');
        setPendingAddressId('');
        return [];
      }
      const addresses = Array.isArray(json?.data) ? json.data : [];
      setUserAddresses(addresses);

      const chooseId = (currentId) => {
        if (currentId && addresses.some(a => a.userAddressId === currentId)) {
          return currentId;
        }
        return (
          addresses.find(a => a.isDefault)?.userAddressId ||
          (addresses[0]?.userAddressId || '')
        );
      };

      const nextSelectedId = chooseId(selectedAddressId);
      setSelectedAddressId(nextSelectedId);
      setPendingAddressId(prev => chooseId(prev || nextSelectedId));

      return addresses;
    } catch (e) {
      setUserAddresses([]);
      setSelectedAddressId('');
      setPendingAddressId('');
      return [];
    }
  };

  const handleAddressAddedFromModal = async () => {
    await fetchAddresses();
    setShowAddAddressModal(false);
    setShowAddressPicker(true);
  };

  const handleCloseAddAddressModal = () => {
    setShowAddAddressModal(false);
  };


  const openAddAddressForm = () => {
    setShowAddressPicker(false);
    setShowAddAddressModal(true);
  };

  const openEditAddressForm = (addr) => {
    if (!addr) return;
    setEditingAddress(addr);
    setShowAddressPicker(false);
    setShowEditAddressModal(true);
  };

  const handleAddressUpdated = async () => {
    await fetchAddresses();
    setShowEditAddressModal(false);
    setShowAddressPicker(true);
  };

  const handleDeleteAddress = async (addr) => {
    if (!addr?.userAddressId) return;

    Alert.alert(
      'Delete Address',
      'Delete this address? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const res = await fetch(`${API_BASE}/marketplace/addresses/${addr.userAddressId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                },
              });

              const json = await res.json().catch(() => ({}));
              if (!res.ok || json?.success === false) {
                const msg = json?.error || json?.message || 'Failed to delete address';
                Alert.alert('Error', msg);
                return;
              }

              await fetchAddresses();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const fetchMyBids = async () => {
    const auctionId = item?.auctionId || item?.id || item?.marketItemId;
    if (!auctionId) return;
    try {
      setLoadingMyBids(true);
      setErrorMyBids('');
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      
      let res = await fetch(`${API_BASE}/auctions/${auctionId}/my-bids`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
      });
      let json = await res.json().catch(() => ({}));
      
      if (!res.ok || json?.success === false) {
        // Fallback to single latest bid endpoint
        const res2 = await fetch(`${API_BASE}/auctions/${auctionId}/my-bid`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${at}; refresh_token=${rt}`,
          },
        });
        const json2 = await res2.json().catch(() => ({}));
        if (!res2.ok || json2?.success === false || (!Array.isArray(json2?.data) && !json2?.data)) {
          setErrorMyBids('Bid history not available yet.');
          setMyBids([]);
          return;
        }
        const arr = Array.isArray(json2?.data) ? json2.data : [json2.data];
        const sorted = [...arr].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
        setMyBids(sorted);
        return;
      }
      const arr = Array.isArray(json?.data) ? json.data : [];
      const sorted = [...arr].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      setMyBids(sorted);
    } catch (e) {
      setErrorMyBids(e?.message || 'Failed to load bid history');
    } finally {
      setLoadingMyBids(false);
    }
  };

  if (!visible || !item) return null;

  
  const beforeStart = startsAt ? nowTs < new Date(startsAt).getTime() : false;
  const afterEnd = endsAt ? nowTs >= new Date(endsAt).getTime() : false;
  const isPaused = item?.status === 'paused';
  const timeDisabled = beforeStart || afterEnd || isPaused;

  const formatDuration = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return '0s';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h || d) parts.push(`${h}h`);
    if (m || h || d) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const startMs = startsAt ? new Date(startsAt).getTime() : null;
  const endMs = endsAt ? new Date(endsAt).getTime() : null;
  let timerLabel = '';
  if (beforeStart && startMs) {
    timerLabel = `Starts in ${formatDuration(startMs - nowTs)}`;
  } else if (afterEnd && endMs) {
    timerLabel = `Ended ${formatDuration(nowTs - endMs)} ago`;
  } else if (isPaused && endMs) {
    timerLabel = `Paused — Ends in ${formatDuration(endMs - nowTs)}`;
  } else if (endMs) {
    timerLabel = `Ends in ${formatDuration(endMs - nowTs)}`;
  }

  const handlePlaceBid = async () => {
    const bid = parseFloat(bidAmount);
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please login to place a bid.');
      return;
    }
    if (sellerUserId && String(sellerUserId) === String(currentUserId)) {
      Alert.alert('Not Allowed', 'You cannot place a bid on your own auction.');
      return;
    }
    if (!selectedAddressId) {
      setErrorMsg('Please select a shipping address on the Shipping tab before placing a bid.');
      setSelectedTab('shipping');
      return;
    }
    if (isNaN(bid) || bid < startPriceVal) {
      Alert.alert('Invalid Bid', `Bid must be at least ₱${startPriceVal}`);
      return;
    }
    const auctionId = item?.auctionId || item?.id || item?.marketItemId;
    if (!auctionId) {
      setErrorMsg('Missing auction ID. Please try again later.');
      return;
    }
    setErrorMsg('');
    setPlacingBid(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || '';
      const refreshToken = data?.session?.refresh_token || '';
      let idempotencyKey = `bid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        const cryptoRef = globalThis && globalThis.crypto;
        if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
          idempotencyKey = cryptoRef.randomUUID();
        }
      } catch (e) {}

      const res = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amount: Number(bid),
          userAddressId: selectedAddressId,
          idempotencyKey,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const msg = json?.error || `Failed to place bid (HTTP ${res.status})`;
        setErrorMsg(msg);
        return;
      }
      try {
        onPlaceBid?.(item, bid, selectedAddressId);
      } catch (e) {}
      setShowBidSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to place bid');
    } finally {
      setPlacingBid(false);
    }
  };

  // Truncate description to fit available space
  const MAX_DESCRIPTION_LENGTH = 300;
  const description = item.description || 'No description provided.';
  const isTruncated = description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = isDescriptionExpanded 
    ? description 
    : description.substring(0, MAX_DESCRIPTION_LENGTH);
  const selectedAddress = userAddresses.find(a => a.userAddressId === selectedAddressId) || null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.breadcrumb}>Marketplace / Auction</Text>
              <Text style={styles.title}>{item.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Gallery with Swipe Support */}
            <View style={styles.gallery}>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => index.toString()}
                onMomentumScrollEnd={onScrollEnd}
                renderItem={({ item }) => (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: item }}
                      style={styles.mainImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                getItemLayout={(data, index) => ({
                  length: Dimensions.get('window').width,
                  offset: Dimensions.get('window').width * index,
                  index,
                })}
              />

              {/* Image Counter */}
              {images.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {selectedImageIndex + 1}/{images.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Info */}
            <View style={styles.quickInfo}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Medium</Text>
                <Text style={styles.infoValue}>{item.medium || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Dimensions</Text>
                <Text style={styles.infoValue}>{item.dimensions || 'N/A'}</Text>
              </View>
              {item.year_created && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Year</Text>
                  <Text style={styles.infoValue}>{item.year_created}</Text>
                </View>
              )}
            </View>

            {/* Artist Info */}
            <View style={styles.artistSection}>
              <Image
                source={{ uri: item.seller?.profilePicture || `https://ui-avatars.com/api/?name=${item.seller?.shopName || 'Artist'}&background=d4b48a&color=fff&size=40` }}
                style={styles.artistAvatar}
              />
              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>{item.seller?.shopName || 'Unknown Artist'}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.verifiedText}>Verified Seller</Text>
                </View>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              {['details', 'auction-info', 'my-bids', 'shipping'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, selectedTab === tab && styles.tabActive]}
                  onPress={() => {
                    setSelectedTab(tab);
                    if (tab === 'my-bids') {
                      fetchMyBids();
                    }
                  }}
                >
                  <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                    {tab === 'details' && 'Details'}
                    {tab === 'auction-info' && 'Auction Info'}
                    {tab === 'my-bids' && 'My Bids'}
                    {tab === 'shipping' && 'Shipping'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {selectedTab === 'details' && (
                <View>
                  <Text style={styles.description}>{displayDescription}</Text>
                  {isTruncated && (
                    <TouchableOpacity onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                      <Text style={styles.seeMoreBtn}>
                        {isDescriptionExpanded ? 'see less' : '... see more'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {selectedTab === 'auction-info' && (
                <View>
                  <View style={styles.shipOption}>
                    <Text style={styles.shipLabel}>Auction Type</Text>
                    <Text style={styles.shipValue}>Blind Auction - Sealed Bids</Text>
                  </View>
                  <View style={styles.shipOption}>
                    <Text style={styles.shipLabel}>Starting Price</Text>
                    <Text style={styles.shipValue}>₱{startPriceVal.toLocaleString()}</Text>
                  </View>
                  {minIncrementVal > 0 && (
                    <View style={styles.shipOption}>
                      <Text style={styles.shipLabel}>Minimum Bid Increment</Text>
                      <Text style={styles.shipValue}>₱{minIncrementVal.toLocaleString()}</Text>
                    </View>
                  )}
                  <View style={styles.shipOption}>
                    <Text style={styles.shipLabel}>Auction Starts</Text>
                    <Text style={styles.shipValue}>
                      {startsAt ? new Date(startsAt).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.shipOption}>
                    <Text style={styles.shipLabel}>Auction Ends</Text>
                    <Text style={styles.shipValue}>
                      {endsAt ? new Date(endsAt).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.shipOption}>
                    <Text style={styles.shipLabel}>Single Bid Only</Text>
                    <Text style={styles.shipValue}>{singleBidOnly ? '✅ Yes' : '❌ No'}</Text>
                  </View>
                </View>
              )}

              {selectedTab === 'my-bids' && (
                <View>
                  {loadingMyBids && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#A68C7B" />
                      <Text style={styles.loadingText}>Loading your bids…</Text>
                    </View>
                  )}
                  {errorMyBids && !loadingMyBids && (
                    <Text style={styles.errorText}>{errorMyBids}</Text>
                  )}
                  {!loadingMyBids && !errorMyBids && (
                    myBids.length > 0 ? (
                      <View>
                        {myBids.map((bid, index) => (
                          <View key={bid.bidId || bid.id || index} style={styles.bidHistoryRow}>
                            <View style={styles.bidHistoryAmount}>
                              <Text style={styles.bidHistoryAmountText}>₱{Number(bid.amount || 0).toLocaleString()}</Text>
                              {index === 0 && (
                                <View style={styles.latestBadge}>
                                  <Text style={styles.latestBadgeText}>Latest</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.bidHistoryTime}>
                              {new Date(bid.created_at || bid.createdAt).toLocaleString()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.infoText}>You haven't placed any bids for this auction yet.</Text>
                    )
                  )}
                </View>
              )}

              {selectedTab === 'shipping' && (
                <View>
                  <View style={[styles.shipOption, { paddingVertical: 12 }] }>
                    <Text style={styles.shipLabel}>Shipping Address</Text>
                    <TouchableOpacity
                      style={styles.manageAddressesButton}
                      onPress={() => {
                        // Open picker with a fresh address list and
                        // highlight whatever is currently selected
                        setPendingAddressId(selectedAddressId || '');
                        setShowAddressPicker(true);
                        fetchAddresses();
                      }}
                    >
                      <Ionicons name="location-outline" size={14} color="#A68C7B" style={{ marginRight: 4 }} />
                      <Text style={styles.manageAddressesButtonText}>Manage Addresses</Text>
                    </TouchableOpacity>
                  </View>

                  {userAddresses.length === 0 ? (
                    <View style={{ paddingVertical: 8 }}>
                      <Text style={styles.infoText}>No saved addresses found.</Text>
                    </View>
                  ) : !selectedAddress ? (
                    <View style={{ paddingVertical: 8 }}>
                      <Text style={styles.infoText}>No address selected. Tap Manage Addresses to choose one.</Text>
                    </View>
                  ) : (
                    <View style={[styles.addressCard, styles.addressCardSelected]}>
                      <Text style={styles.addressName}>
                        {selectedAddress.fullName}{selectedAddress.isDefault ? ' (Default)' : ''}
                      </Text>
                      <Text style={styles.addressLine}>
                        {selectedAddress.addressLine1}{selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}
                      </Text>
                      <Text style={styles.addressLine}>
                        {selectedAddress.barangayName}, {selectedAddress.cityMunicipalityName}, {selectedAddress.provinceName} {selectedAddress.postalCode}
                      </Text>
                      <Text style={styles.addressPhone}>
                        {selectedAddress.phoneNumber}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.shipOption, { marginTop: 8 }]}>
                    <Text style={styles.shipLabel}>Standard Shipping</Text>
                    <Text style={styles.shipValue}>3-7 business days, insured</Text>
                  </View>
                  <View style={styles.shipOption}>
                    <Text style={styles.shipLabel}>Express Shipping</Text>
                    <Text style={styles.shipValue}>1-3 business days, insured</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bid Section */}
            {!showBidSuccess && (
              <View style={styles.bidSection}>
                <View style={styles.auctionStats}>
                  {startPriceVal > 0 && (
                    <View style={[styles.statItem, (startsAt || endsAt || timerLabel) && styles.statItem]}>
                      <Text style={styles.statLabel}>Starting Price</Text>
                      <Text style={styles.statValue}>₱{startPriceVal.toLocaleString()}</Text>
                    </View>
                  )}
                  {startsAt && (
                    <View style={[styles.statItem, (endsAt || timerLabel) && styles.statItem]}>
                      <Text style={styles.statLabel}>Starts</Text>
                      <Text style={styles.statValue}>{new Date(startsAt).toLocaleDateString()}</Text>
                    </View>
                  )}
                  {endsAt && (
                    <View style={[styles.statItem, !!timerLabel && styles.statItem]}>
                      <Text style={styles.statLabel}>Ends</Text>
                      <Text style={styles.statValue}>{new Date(endsAt).toLocaleDateString()}</Text>
                    </View>
                  )}
                  {(startsAt || endsAt) && !!timerLabel && (
                    <View style={[styles.statItem, styles.statItemLast]}>
                      <Text style={styles.statLabel}>Time</Text>
                      <Text style={styles.statValue}>{timerLabel}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.bidFormLabel}>Your Sealed Bid</Text>
                <View style={styles.bidInputContainer}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.bidInput}
                    placeholder={`Min ₱${startPriceVal}`}
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={bidAmount}
                    onChangeText={setBidAmount}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.placeBidBtn,
                    (placingBid || !bidAmount || parseFloat(bidAmount) < startPriceVal || !selectedAddressId || timeDisabled) && styles.placeBidBtnDisabled
                  ]}
                  onPress={handlePlaceBid}
                  disabled={
                    placingBid ||
                    !bidAmount ||
                    parseFloat(bidAmount) < startPriceVal ||
                    !selectedAddressId ||
                    timeDisabled
                  }
                >
                  <Text style={styles.placeBidBtnText}>{placingBid ? 'Placing…' : 'Place Sealed Bid'}</Text>
                </TouchableOpacity>
                {timeDisabled && (
                  <Text style={styles.infoText}>
                    {beforeStart
                      ? `Bidding opens at ${startsAt ? new Date(startsAt).toLocaleString() : ''}`
                      : afterEnd
                        ? `Auction ended at ${endsAt ? new Date(endsAt).toLocaleString() : ''}`
                        : isPaused
                          ? `Auction is paused. Ends at ${endsAt ? new Date(endsAt).toLocaleString() : ''}`
                          : ''}
                  </Text>
                )}
                {!selectedAddressId && userAddresses.length > 0 && (
                  <Text style={styles.infoText}>
                    Select a shipping address in the Shipping tab to enable bidding.
                  </Text>
                )}
                {!!errorMsg && (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                )}
                <Text style={styles.bidNote}>
                  Bids are binding. You cannot see other participants' bids.
                </Text>
              </View>
            )}

            {/* Success Message */}
            {showBidSuccess && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                <Text style={styles.successText}>Bid Placed Successfully!</Text>
                <Text style={styles.successSubtext}>
                  Your sealed bid of ₱{bidAmount} has been placed. You'll be notified when the auction ends.
                </Text>
              </View>
            )}
          </ScrollView>

          <Modal
            visible={showAddressPicker}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAddressPicker(false)}
          >
            <View style={styles.addressPickerOverlay}>
              <View style={styles.addressPickerContent}>
                <View style={styles.addressPickerHeader}>
                  <Text style={styles.addressPickerTitle}>Select Shipping Address</Text>
                  <TouchableOpacity onPress={() => setShowAddressPicker(false)}>
                    <Ionicons name="close" size={22} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.addressPickerToolbar}>
                  <Text style={styles.addressPickerSubtitle}>My Addresses</Text>
                  <TouchableOpacity
                    style={styles.addAddressButton}
                    onPress={openAddAddressForm}
                    disabled={addressFormSubmitting}
                  >
                    <Ionicons name="add" size={16} color="#A68C7B" style={{ marginRight: 4 }} />
                    <Text style={styles.addAddressButtonText}>Add Address</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.addressPickerList}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  showsVerticalScrollIndicator={false}
                >
                  {userAddresses.length === 0 ? (
                    <View style={{ paddingVertical: 12 }}>
                      <Text style={styles.infoText}>No saved addresses found.</Text>
                    </View>
                  ) : (
                    userAddresses.map(addr => (
                      <View
                        key={addr.userAddressId}
                        style={[
                          styles.addressCard,
                          pendingAddressId === addr.userAddressId && styles.addressCardSelected,
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            // Only update the temporary selection; the
                            // real address is committed on the button below
                            setPendingAddressId(addr.userAddressId);
                          }}
                        >
                          <Text style={styles.addressName}>
                            {addr.fullName}{addr.isDefault ? ' (Default)' : ''}
                          </Text>
                          <Text style={styles.addressLine}>
                            {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                          </Text>
                          <Text style={styles.addressLine}>
                            {addr.barangayName}, {addr.cityMunicipalityName}, {addr.provinceName} {addr.postalCode}
                          </Text>
                          <Text style={styles.addressPhone}>{addr.phoneNumber}</Text>
                        </TouchableOpacity>

                        <View style={styles.addressActionsRow}>
                          <TouchableOpacity
                            onPress={() => openEditAddressForm(addr)}
                            style={{ marginRight: 12, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={18} color="#A68C7B" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteAddress(addr)}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.placeBidBtn, { marginTop: 4 }]}
                  onPress={() => {
                    if (!pendingAddressId) return;
                    setSelectedAddressId(pendingAddressId);
                    setShowAddressPicker(false);
                  }}
                  disabled={!pendingAddressId}
                >
                  <Text style={styles.placeBidBtnText}>Use Selected Address</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <EditAddressModal
            visible={showEditAddressModal}
            onClose={() => setShowEditAddressModal(false)}
            address={editingAddress}
            userData={userData}
            accessToken={accessToken}
            refreshToken={refreshToken}
            onAddressUpdated={handleAddressUpdated}
          />
          <AddAddressModal
            visible={showAddAddressModal}
            onClose={handleCloseAddAddressModal}
            onAddressAdded={handleAddressAddedFromModal}
            userData={userData}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  breadcrumb: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  gallery: {
    width: '100%',
    height: 300,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imageContainer: {
    width: Dimensions.get('window').width,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  closeZoomButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  imageCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  quickInfo: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  artistSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  artistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#A68C7B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#A68C7B',
  },
  tabContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  seeMoreBtn: {
    fontSize: 12,
    color: '#A68C7B',
    fontWeight: '600',
    marginTop: 6,
  },
  shipOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  shipValue: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  manageAddressesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A68C7B',
    backgroundColor: '#FFF5EB',
  },
  manageAddressesButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A68C7B',
  },
  bidSection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  auctionStats: {
    backgroundColor: '#FFF8F3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  statItemLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C1810',
    textAlign: 'right',
    flex: 1,
  },
  bidFormLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  bidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginRight: 4,
  },
  bidInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: '#333',
  },
  placeBidBtn: {
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  placeBidBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  placeBidBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  bidNote: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  bidHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bidHistoryAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidHistoryAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  latestBadge: {
    backgroundColor: '#A68C7B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  bidHistoryTime: {
    fontSize: 12,
    color: '#666',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  successText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
    marginBottom: 6,
  },
  successSubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 6,
    textAlign: 'center',
  },
  addressCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    paddingRight: 44,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  addressCardSelected: {
    borderColor: '#A68C7B',
    backgroundColor: '#FFF5EB',
  },
  addressName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 12,
    color: '#666',
  },
  addressPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginBottom: 2,
  },
  addressPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  addressPickerContent: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addressPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressPickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  addressPickerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressPickerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  addressPickerList: {
    marginTop: 4,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A68C7B',
  },
  addAddressButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A68C7B',
  },
  addressActionsRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressActionText: {
    fontSize: 12,
    color: '#A68C7B',
    fontWeight: '500',
  },
  addressActionDeleteText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
  },
});
