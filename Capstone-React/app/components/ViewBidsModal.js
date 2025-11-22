import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase/supabaseClient';

const API_BASE = 'http://192.168.18.79:3000/api';

export default function ViewBidsModal({
  open = false,
  onClose = () => {},
  auctionId,
  title = 'Auction',
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bids, setBids] = useState([]);
  const [topBid, setTopBid] = useState(null);
  const [displayCount, setDisplayCount] = useState(6);
  const BIDS_PER_PAGE = 6;

  useEffect(() => {
    if (!open || !auctionId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        // Get Supabase session tokens (same pattern as sellerDashboard.js)
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';
        const refreshToken = sessionData?.session?.refresh_token || '';

        // Attempt to fetch bids history. If API doesn't exist yet, show friendly message.
        const res = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false || !Array.isArray(data.data)) {
          setError('Bid history endpoint is not available yet. Please ask admin to enable /auctions/:id/bids.');
          return;
        }
        const sorted = [...data.data].sort((a, b) => b.amount - a.amount || new Date(b.created_at) - new Date(a.created_at));
        if (!cancelled) {
          setBids(sorted);
          setTopBid(sorted[0] || null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load bids');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, auctionId]);

  // Helper function to format bidder name
  const formatBidderName = (bidder) => {
    if (!bidder) return 'Anonymous';
    const firstName = bidder.firstName || bidder.first_name || '';
    const lastName = bidder.lastName || bidder.last_name || '';
    return [firstName, lastName].filter(Boolean).join(' ') || 'Anonymous';
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bids — {title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#A68C7B" />
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!loading && !error && bids.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bids yet.</Text>
              </View>
            )}

            {!loading && !error && bids.length > 0 && (
              <>
                {/* Top Bid Section */}
                {topBid && (
                  <View style={styles.topBidContainer}>
                    <Text style={styles.topBidLabel}>Top Bid</Text>
                    <View style={styles.bidRow}>
                      <Image
                        source={{
                          uri:
                            topBid.bidder?.profilePicture ||
                            'https://via.placeholder.com/40',
                        }}
                        style={styles.bidderAvatar}
                      />
                      <View style={styles.bidderInfo}>
                        <Text style={styles.bidderName}>
                          {formatBidderName(topBid.bidder)}
                        </Text>
                        <Text style={styles.bidTime}>
                          {formatDate(topBid.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.topBidAmount}>
                        ₱
                        {Number(topBid.amount || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>
                )}

                {/* All Bids List */}
                {bids.length > 0 && (
                  <View style={styles.allBidsContainer}>
                    <Text style={styles.allBidsLabel}>All Bids</Text>
                    {bids.slice(0, displayCount).map((bid, index) => (
                      <View key={bid.bidId || index} style={styles.bidItem}>
                        <Image
                          source={{
                            uri:
                              bid.bidder?.profilePicture ||
                              'https://via.placeholder.com/36',
                          }}
                          style={styles.bidItemAvatar}
                        />
                        <View style={styles.bidItemInfo}>
                          <Text style={styles.bidItemName}>
                            {formatBidderName(bid.bidder)}
                          </Text>
                          <Text style={styles.bidItemTime}>
                            {formatDate(bid.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.bidItemAmount}>
                          ₱
                          {Number(bid.amount || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                    ))}
                    
                    {/* Load More / Show Less Buttons */}
                    <View style={styles.paginationContainer}>
                      {displayCount < bids.length && (
                        <TouchableOpacity
                          style={styles.loadMoreButton}
                          onPress={() => setDisplayCount(displayCount + BIDS_PER_PAGE)}
                        >
                          <Text style={styles.loadMoreText}>Load More Bids</Text>
                        </TouchableOpacity>
                      )}
                      {displayCount > BIDS_PER_PAGE && (
                        <TouchableOpacity
                          style={styles.showLessButton}
                          onPress={() => setDisplayCount(BIDS_PER_PAGE)}
                        >
                          <Text style={styles.showLessText}>Show Less</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '95%',
    paddingTop: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },

  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 220,
  },

  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 14,
    color: '#999',
  },

  topBidContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },

  topBidLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  bidderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },

  bidderInfo: {
    flex: 1,
    minWidth: 0,
  },

  bidderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  bidTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  topBidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  allBidsContainer: {
    marginTop: 8,
  },

  allBidsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  bidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderStyle: 'dashed',
  },

  bidItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },

  bidItemInfo: {
    flex: 1,
    minWidth: 0,
  },

  bidItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },

  bidItemTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },

  bidItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  paginationContainer: {
    marginTop: 16,
    marginBottom: 100,
    gap: 8,
  },

  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF5EB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A68C7B',
    alignItems: 'center',
  },

  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
  },

  showLessButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },

  showLessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
