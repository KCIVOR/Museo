import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, 
  ActivityIndicator, RefreshControl, Modal, TextInput, Image, Alert, 
  StatusBar, KeyboardAvoidingView, Platform, BackHandler 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AddAuctionProduct from '../components/AddAuctionProduct';
import AddMarketProduct from '../components/AddMarketProduct';
import EditProductModal from '../components/EditProductModal';
import EditPriceScheduleAuction from '../components/EditPriceScheduleAuction';
import AuctionOptionModal from '../components/AuctionOptionModal.js';
import AndroidFooterSpacer from '../components/Footer';
const API_BASE = "http://192.168.18.79:3000/api";

export default function SellerDashboardScreen() {
  const router = useRouter();
  const { userData } = useUser();
  const insets = useSafeAreaInsets();

  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [overviewStatsCollapsed, setOverviewStatsCollapsed] = useState(false);

  // Products state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Auction state
  const [productView, setProductView] = useState('inventory');
  const [auctionsTab, setAuctionsTab] = useState('items');
  const [auctionItems, setAuctionItems] = useState([]);
  const [auctionItemsLoading, setAuctionItemsLoading] = useState(false);
  const [sellerAuctions, setSellerAuctions] = useState([]);
  const [sellerAuctionsLoading, setSellerAuctionsLoading] = useState(false);
  const [auctionStatusFilter, setAuctionStatusFilter] = useState('');
  
  // Advanced auction features
  const [nowTs, setNowTs] = useState(Date.now());
  const [participantsByAuction, setParticipantsByAuction] = useState({});
  const [actionsModalOpen, setActionsModalOpen] = useState(false);
  const [actionsAuction, setActionsAuction] = useState(null);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    toShip: 0,
    shipping: 0,
    completed: 0,
    cancelled: 0
  });

  // Returns state
  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnFilter, setReturnFilter] = useState('all');
  const [showAllReturns, setShowAllReturns] = useState(false);
  const [returnStats, setReturnStats] = useState({
    totalReturns: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  });

  // Return details modal state
  const [returnDetailsModal, setReturnDetailsModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnDetails, setReturnDetails] = useState(null);
  const [returnDetailsLoading, setReturnDetailsLoading] = useState(false);
  const [showEvidenceViewer, setShowEvidenceViewer] = useState(false);
  const [currentEvidenceIndex, setCurrentEvidenceIndex] = useState(0);

  // Message/conversation state
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    earnings: {
      gross: 0,
      net: 0,
      platformFee: 0
    },
    pendingOrders: 0,
    pendingShipments: 0
  });

  // Payout balance state
  const [payoutBalance, setPayoutBalance] = useState({
    available: 0,
    pending: 0,
    totalPaidOut: 0,
    canWithdraw: false,
    minimumPayout: 100
  });

  // Modal states
  const [shippingModal, setShippingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  // Shipping Preferences state
  const [shippingPrefs, setShippingPrefs] = useState({
    couriers: {
      'J&T Express': { standard: false, express: false },
      'LBC': { standard: false, express: false }
    }
  });
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  

  // Payment method data
  const [paymentMethod, setPaymentMethod] = useState({
    method: null,
    gcashNumber: null,
    bankAccountName: null,
    bankAccountNumber: null,
    bankName: null
  });

  // Add Product Modal states
  const [addProductModal, setAddProductModal] = useState(false);
  const [addAuctionProductModal, setAddAuctionProductModal] = useState(false);

  // Edit Product Modal states
  const [editModal, setEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Edit Auction Modal state
  const [editAuctionModalOpen, setEditAuctionModalOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);

  // Fetch payout balance
  const fetchPayoutBalance = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/payouts/balance`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPayoutBalance({
          available: parseFloat(result.data.available || 0),
          pending: parseFloat(result.data.pending || 0),
          totalPaidOut: parseFloat(result.data.totalPaidOut || 0),
          canWithdraw: result.data.canWithdraw || false,
          minimumPayout: result.data.minimumPayout || 100
        });
      }
    } catch (error) {
      console.error('Error fetching payout balance:', error);

    }

  };



  // Fetch payment method
  const fetchPaymentMethod = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/payouts/payment-info`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.data) {
        setPaymentMethod({
          method: result.data.paymentMethod,
          gcashNumber: result.data.gcashNumber,
          bankAccountName: result.data.bankAccountName,
          bankAccountNumber: result.data.bankAccountNumber,
          bankName: result.data.bankName
        });
      }
    } catch (error) {
      console.error('Error fetching payment method:', error);
    }
  };

  // Toggle shipping preference
  const togglePref = (courier, service) => {
    setShippingPrefs(prev => ({
      ...prev,
      couriers: {
        ...prev.couriers,
        [courier]: {
          ...prev.couriers[courier],
          [service]: !prev.couriers[courier][service]
        }
      }
    }));
  };

  // Fetch shipping preferences
  const fetchShippingPrefs = async () => {
    try {
      setPrefsLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/seller/shipping-prefs`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.data) {
        setShippingPrefs(result.data);
        console.log('Fetched shipping preferences:', result.data);
      }
    } catch (error) {
      console.error('Error fetching shipping preferences:', error);
    } finally {
      setPrefsLoading(false);
    }
  };

  // Save shipping preferences
  const saveShippingPrefs = async () => {
    try {
      setPrefsSaving(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/seller/shipping-prefs`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: JSON.stringify({ couriers: shippingPrefs?.couriers || {} })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local state from server response
        if (result.data) setShippingPrefs(result.data);
        Alert.alert('Success', 'Shipping preferences saved successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving shipping preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setPrefsSaving(false);
    }
  };

  // Handle withdraw funds
  const handleWithdraw = async () => {
    const paymentMethodName = paymentMethod.method === 'gcash' ? 
      `GCash (${paymentMethod.gcashNumber})` : 
      paymentMethod.method === 'bank' ?
      `${paymentMethod.bankName} (${paymentMethod.bankAccountNumber})` :
      paymentMethod.method;

    Alert.alert(
      'Withdraw Funds',
      `Withdraw ₱${payoutBalance.available.toLocaleString()} to your ${paymentMethodName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const response = await fetch(`${API_BASE}/payouts/withdraw`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  'Authorization': `Bearer ${at}`,
                },
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert(
                  'Success',
                  `${result.message}\n\nAmount: ₱${result.data.amount}\nReference: ${result.data.reference}\nMethod: ${result.data.paymentMethod}`
                );
                // Refresh balances
                fetchPayoutBalance();
                fetchStats(selectedPeriod);
              } else {
                Alert.alert('Error', result.error || 'Failed to process withdrawal');
              }
            } catch (error) {
              console.error('Error processing withdrawal:', error);
              Alert.alert('Error', 'Failed to process withdrawal');
            }
          }
        }
      ]
    );
  };



  // Fetch stats
  const fetchStats = async (period = 'weekly') => {
    try {
      setStatsLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/seller/stats?period=${period}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setStats(result.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };
  // Fetch products
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      const response = await fetch(`${API_BASE}/marketplace/seller/my-items`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };


  // Fetch auction items owned by seller (mirrors web dashboard)
  const fetchAuctionItems = async () => {
    try {
      setAuctionItemsLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/auctions/items/my-items`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setAuctionItems(result.data || []);
      } else {
        setAuctionItems([]);
      }
    } catch (error) {
      console.error('Error fetching auction items:', error);
      setAuctionItems([]);
    } finally {
      setAuctionItemsLoading(false);
    }
  };

  // Fetch auctions created by the seller (scheduled/active/ended)
  const fetchSellerAuctions = async (status = '') => {
    try {
      setSellerAuctionsLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const url = status
        ? `${API_BASE}/auctions/seller/my-auctions?status=${encodeURIComponent(status)}`
        : `${API_BASE}/auctions/seller/my-auctions`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSellerAuctions(result.data || []);
      } else {
        setSellerAuctions([]);
      }
    } catch (error) {
      console.error('Error fetching seller auctions:', error);
      setSellerAuctions([]);
    } finally {
      setSellerAuctionsLoading(false);
    }
  };

  // Open edit auction modal
  const handleEditAuction = (auction) => {
    if (!auction) return;
    setSelectedAuction(auction);
    setEditAuctionModalOpen(true);
  };

  const activateAuctionNow = async (auctionId) => {
    if (!auctionId) return;

    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/auctions/${auctionId}/activate-now`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to activate auction');
      }

      Alert.alert('Auction Activated', 'The auction is now live.');
      fetchSellerAuctions(auctionStatusFilter);
    } catch (error) {
      console.error('Error activating auction:', error);
      Alert.alert('Error', error.message || 'Failed to activate auction');
    }
  };

  // Pause an active auction
  const pauseAuction = async (auctionId) => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/auctions/${auctionId}/pause`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Pause endpoint not available');
      }

      Alert.alert('Success', 'Auction paused');
      fetchSellerAuctions(auctionStatusFilter);
      closeActionsModal();
    } catch (error) {
      console.error('Error pausing auction:', error);
      Alert.alert('Error', error.message || 'Failed to pause auction');
    }
  };

  // Resume a paused auction
  const resumeAuction = async (auctionId) => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/auctions/${auctionId}/resume`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Resume endpoint not available');
      }

      Alert.alert('Success', 'Auction resumed');
      fetchSellerAuctions(auctionStatusFilter);
      closeActionsModal();
    } catch (error) {
      console.error('Error resuming auction:', error);
      Alert.alert('Error', error.message || 'Failed to resume auction');
    }
  };

  // Cancel an auction
  const cancelAuction = async (auctionId) => {
    Alert.alert(
      'Cancel Auction',
      'Cancel this auction? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const response = await fetch(`${API_BASE}/auctions/${auctionId}/cancel`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  Authorization: `Bearer ${at}`,
                },
              });

              const result = await response.json();

              if (!response.ok || !result.success) {
                throw new Error(result.error || 'Cancel endpoint not available');
              }

              Alert.alert('Success', 'Auction cancelled');
              fetchSellerAuctions(auctionStatusFilter);
              closeActionsModal();
            } catch (error) {
              console.error('Error cancelling auction:', error);
              Alert.alert('Error', error.message || 'Failed to cancel auction');
            }
          }
        }
      ]
    );
  };

  // Extend auction duration
  const extendAuction = async (auctionId, minutes = 5) => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/auctions/${auctionId}/extend?minutes=${minutes}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Extend endpoint not available');
      }

      Alert.alert('Success', `Auction extended by ${minutes} minutes`);
      fetchSellerAuctions(auctionStatusFilter);
      closeActionsModal();
    } catch (error) {
      console.error('Error extending auction:', error);
      Alert.alert('Error', error.message || 'Failed to extend auction');
    }
  };

  // Actions modal handlers
  const openActionsModal = (auction) => {
    console.log('openActionsModal called with auction:', auction?.auctionId);
    setActionsAuction(auction);
    setActionsModalOpen(true);
  };

  const closeActionsModal = () => {
    console.log('closeActionsModal called');
    setActionsModalOpen(false);
    setActionsAuction(null);
  };

  // Format countdown timer
  const formatCountdown = (nowTs, startAt, endAt) => {
    const now = new Date(nowTs);
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (now < start) {
      const ms = start - now;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return { label: `Starts in ${d}d ${h}h ${m}m ${s}s`, state: 'scheduled' };
    }

    if (now >= start && now < end) {
      const ms = end - now;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return { label: `Ends in ${d}d ${h}h ${m}m ${s}s`, state: 'active' };
    }

    const ms = now - end;
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return { label: `Ended ${d}d ${h}h ${m}m ago`, state: 'ended' };
  };

  // Fetch order stats (always get full stats regardless of filter)
const fetchOrderStats = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const at = data?.session?.access_token || '';
    const rt = data?.session?.refresh_token || '';
    const response = await fetch(`${API_BASE}/marketplace/orders/seller`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Cookie: `access_token=${at}; refresh_token=${rt}`,
        'Authorization': `Bearer ${at}`,
      },
    });
    const result = await response.json();
    if (response.ok && result.success && result.stats) setOrderStats(result.stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
  }
};

const fetchOrders = async (status = null) => {
  try {
    setOrdersLoading(true);
    const { data } = await supabase.auth.getSession();
    const at = data?.session?.access_token || '';
    const rt = data?.session?.refresh_token || '';
    const url = status && status !== 'all'
      ? `${API_BASE}/marketplace/orders/seller?status=${status}`
      : `${API_BASE}/marketplace/orders/seller`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Cookie: `access_token=${at}; refresh_token=${rt}`,
        'Authorization': `Bearer ${at}`,
      },
    });
    const result = await response.json();
    if (response.ok && result.success) {
      setOrders(result.data || []);
      await fetchOrderStats();
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
  } finally {
    setOrdersLoading(false);
  }
};



  // Fetch returns - Using web-compatible approach with mobile auth

 const fetchReturns = async (status = null) => {
  try {
    setReturnsLoading(true);

    // Get auth tokens for mobile
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData?.session?.access_token || '';
    const rt = sessionData?.session?.refresh_token || '';

    // Use same URL pattern as web version
    const url = status && status !== 'all'
      ? `${API_BASE}/returns/seller?status=${encodeURIComponent(status)}`
      : `${API_BASE}/returns/seller`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Cookie: `access_token=${at}; refresh_token=${rt}`,
        Authorization: `Bearer ${at}`,
      }
    });

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error('Invalid response format from server');
    }

    if (!response.ok || result.success === false) {
      throw new Error(result.error || result.message || `Request failed (${response.status})`);
    }

    // Set returns data
    setReturns(result.data || []);

    // Calculate stats
    const returnsData = result.data || [];
    const stats = {
      totalReturns: returnsData.length,
      pending: returnsData.filter(r => r.status === 'pending').length,
      approved: returnsData.filter(r => r.status === 'approved').length,
      rejected: returnsData.filter(r => r.status === 'rejected').length,
      completed: returnsData.filter(r => r.status === 'refunded' || r.status === 'completed').length
    };
    setReturnStats(stats);

  } catch (error) {
    console.error('Failed to load returns:', error);
    setReturns([]);
    setReturnStats({ totalReturns: 0, pending: 0, approved: 0, rejected: 0, completed: 0 });
  } finally {
    setReturnsLoading(false);
  }
};




 // Mark as Processing
const handleMarkAsProcessing = async (order) => {
  Alert.alert(
    'Mark as Processing',
    'Mark this order as processing? This means you are preparing the items for shipment.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark as Processing',
        onPress: async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const at = data?.session?.access_token || '';

            const response = await fetch(`${API_BASE}/marketplace/orders/${order.orderId}/process`, {
              method: 'PUT',
              credentials: 'include',
              headers: { 
                Cookie: `access_token=${at}`, 
                Authorization: `Bearer ${at}` 
              },
            });
            const result = await response.json();

            if (response.ok && result.success) {
              Alert.alert('Success', 'Order marked as processing!');
              fetchOrders(orderFilter === 'all' ? null : orderFilter);
              fetchStats(selectedPeriod);
            } else {
              Alert.alert('Error', result.error || 'Failed to update order');
            }
          } catch (error) {
            console.error('Error updating order:', error);
            Alert.alert('Error', 'Failed to update order');
          }
        }
      }
    ]
  );
};

// Mark as Shipped
const handleMarkAsShipped = (order) => {
  setSelectedOrder(order);
  setShippingModal(true);
  setTrackingNumber('');
};

// Submit Tracking
const submitTracking = async () => {
  if (!trackingNumber.trim()) {
    Alert.alert('Error', 'Please enter a tracking number');
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const at = data?.session?.access_token || '';

    const response = await fetch(`${API_BASE}/marketplace/orders/${selectedOrder.orderId}/ship`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${at}`,
        Authorization: `Bearer ${at}`,
      },
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });

    const result = await response.json();
    if (response.ok && result.success) {
      Alert.alert('Success', 'Order marked as shipped!');
      setShippingModal(false);
      setSelectedOrder(null);
      setTrackingNumber('');
      fetchOrders(orderFilter === 'all' ? null : orderFilter);
      fetchStats(selectedPeriod);
    } else {
      Alert.alert('Error', result.error || 'Failed to update order');
    }
  } catch (error) {
    console.error('Error updating order:', error);
    Alert.alert('Error', 'Failed to update order');
  }
};

// Fetch Return Details
const fetchReturnDetails = async (returnId) => {
  try {
    setReturnDetailsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData?.session?.access_token || '';

    const response = await fetch(`${API_BASE}/returns/${returnId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Cookie: `access_token=${at}`,
        Authorization: `Bearer ${at}`,
      },
    });

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error('Invalid response format from server');
    }

    if (!response.ok || result.success === false) {
      throw new Error(result.error || result.message || 'Failed to fetch return details');
    }

    setReturnDetails(result.data);
  } catch (error) {
    console.error('Error fetching return details:', error);
    Alert.alert('Error', error.message || 'Failed to load return details');
  } finally {
    setReturnDetailsLoading(false);
  }
};

// Handle View Return Details
const handleViewReturnDetails = (returnRequest) => {
  setSelectedReturn(returnRequest);
  setReturnDetailsModal(true);
  setNewMessage('');
  fetchReturnDetails(returnRequest.returnId);
};




// Send message in return conversation
const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedReturn) return;

  try {
    setSendingMessage(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData?.session?.access_token || '';

    const response = await fetch(`${API_BASE}/returns/${selectedReturn.returnId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${at}`,
        Authorization: `Bearer ${at}`,
      },
      body: JSON.stringify({ message: newMessage.trim() }),
    });

    const result = await response.json();
    if (!response.ok || result.success === false) {
      throw new Error(result.error || result.message || 'Failed to send message');
    }

    setNewMessage('');
    await fetchReturnDetails(selectedReturn.returnId);

  } catch (error) {
    console.error('Error sending message:', error);
    Alert.alert('Error', error.message || 'Failed to send message');
  } finally {
    setSendingMessage(false);
  }
};

// Approve return request
const handleApproveReturn = async (returnRequest) => {
  Alert.alert(
    'Approve Return',
    `Approve return request for "${returnRequest.itemTitle || 'this item'}"? This will initiate the refund process.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const at = sessionData?.session?.access_token || '';

            const response = await fetch(`${API_BASE}/returns/${returnRequest.returnId}/approve`, {
              method: 'PUT',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                Cookie: `access_token=${at}`,
                Authorization: `Bearer ${at}`,
              },
              body: JSON.stringify({ sellerResponse: 'Return approved by seller' }),
            });

            const result = await response.json();
            if (!response.ok || result.success === false) {
              throw new Error(result.error || result.message || 'Failed to approve return');
            }

            Alert.alert('Success', 'Return request approved!');
            fetchReturns(returnFilter === 'all' ? null : returnFilter);
            fetchStats(selectedPeriod);

          } catch (error) {
            console.error('Error approving return:', error);
            Alert.alert('Error', error.message || 'Failed to approve return');
          }
        },
      },
    ]
  );
};

// Reject return request
const handleRejectReturn = async (returnRequest) => {
  Alert.alert(
    'Reject Return',
    `Reject return request for "${returnRequest.itemTitle || 'this item'}"?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const at = sessionData?.session?.access_token || '';

            const response = await fetch(`${API_BASE}/returns/${returnRequest.returnId}/reject`, {
              method: 'PUT',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                Cookie: `access_token=${at}`,
                Authorization: `Bearer ${at}`,
              },
              body: JSON.stringify({ sellerResponse: 'Seller rejected the return request' }),
            });

            const result = await response.json();
            if (!response.ok || result.success === false) {
              throw new Error(result.error || result.message || 'Failed to reject return');
            }

            Alert.alert('Success', 'Return request rejected!');
            fetchReturns(returnFilter === 'all' ? null : returnFilter);
            fetchStats(selectedPeriod);

          } catch (error) {
            console.error('Error rejecting return:', error);
            Alert.alert('Error', error.message || 'Failed to reject return');
          }
        },
      },
    ]
  );
};

  const handleAddAuctionProduct = () => {
    setAddAuctionProductModal(true);
  };

  // Delete product

const handleDeleteProduct = (product) => {
  Alert.alert(
    'Delete Product',
    `Are you sure you want to delete "${product.title}"?`,
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
            const response = await fetch(`${API_BASE}/marketplace/items/${product.marketItemId}`, {
              method: 'DELETE',
              credentials: 'include',
              headers: {
                Cookie: `access_token=${at}; refresh_token=${rt}`,
                'Authorization': `Bearer ${at}`,
              },
            });
            const result = await response.json();
            if (response.ok && result.success) {
              Alert.alert('Success', 'Product deleted successfully!');
              fetchProducts();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete product');
            }
          } catch (error) {
            console.error('Error deleting product:', error);
            Alert.alert('Error', 'Failed to delete product');
          }
        }
      }
    ]
  );
};




  // Edit product

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setEditModal(true);
  };

  // Initial load

 useEffect(() => {
  if (userData?.isSeller) {
    setLoading(true);
    Promise.all([
      fetchStats(selectedPeriod),
      fetchProducts(),
      fetchPayoutBalance(),
      fetchPaymentMethod(),
      activeTab === 'orders' ? fetchOrders(orderFilter === 'all' ? null : orderFilter) : Promise.resolve(),
      activeTab === 'returns' ? fetchReturns(returnFilter === 'all' ? null : returnFilter) : Promise.resolve()
    ]).finally(() => setLoading(false));
  }
}, [userData, selectedPeriod, activeTab, orderFilter, returnFilter, productView, auctionsTab, auctionStatusFilter]);

  // Fetch shipping preferences when settings tab is opened
  useEffect(() => {
    if (userData?.isSeller && activeTab === 'settings') {
      fetchShippingPrefs();
    }
  }, [userData, activeTab, productView, auctionsTab, auctionStatusFilter]);

  // Dedicated watcher for auction data (avoids blocking entire dashboard)
  useEffect(() => {
    if (userData?.isSeller && activeTab === 'products' && productView === 'auctions') {
      if (auctionsTab === 'items') {
        fetchAuctionItems();
      } else {
        fetchSellerAuctions(auctionStatusFilter);
      }
    }
  }, [userData, activeTab, productView, auctionsTab, auctionStatusFilter]);



  // Refresh on focus

  useFocusEffect(

    useCallback(() => {

      if (userData?.isSeller) {

        fetchStats(selectedPeriod);

        fetchProducts();

        fetchPayoutBalance();

        fetchPaymentMethod();

        if (activeTab === 'orders') {

          fetchOrders(orderFilter === 'all' ? null : orderFilter);

        }

        if (activeTab === 'returns') {

          fetchReturns(returnFilter === 'all' ? null : returnFilter);

        }

        if (activeTab === 'products' && productView === 'auctions') {
          if (auctionsTab === 'items') {
            fetchAuctionItems();
          } else {
            fetchSellerAuctions(auctionStatusFilter);
      }
        }
      }
    }, [userData, selectedPeriod, activeTab, orderFilter, returnFilter, productView, auctionsTab, auctionStatusFilter])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchStats(selectedPeriod),
      fetchProducts(),
      fetchPayoutBalance(),
      fetchPaymentMethod(),
      activeTab === 'orders' ? fetchOrders(orderFilter === 'all' ? null : orderFilter) : Promise.resolve(),
      activeTab === 'returns' ? fetchReturns(returnFilter === 'all' ? null : returnFilter) : Promise.resolve(),
      activeTab === 'products' && productView === 'auctions'
        ? (auctionsTab === 'items'
            ? fetchAuctionItems()
            : fetchSellerAuctions(auctionStatusFilter))
        : Promise.resolve()
    ]).finally(() => setRefreshing(false));
  }, [selectedPeriod, activeTab, orderFilter, returnFilter, productView, auctionsTab, auctionStatusFilter]);
  // Check if user is seller
  if (!userData?.isSeller) {
    useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        try { router.replace('/(drawer)/marketplace'); } catch {}
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => { try { sub.remove(); } catch {} };
    }, [router])
  );


  return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 56 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.replace('/(drawer)/marketplace')}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Seller Dashboard</Text>
          </View>
        </View>
        <View style={styles.notSellerContainer}>
          <Ionicons name="storefront-outline" size={80} color="#ccc" />
          <Text style={styles.notSellerTitle}>Not a Seller Yet</Text>
          <Text style={styles.notSellerText}>
            You need to be a verified seller to access this feature.
          </Text>
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => router.push('/(drawer)/settings')}
          >
            <Text style={styles.applyButtonText}>Apply as Seller</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Ensure hardware back navigates to marketplace on Seller Dashboard
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        try { router.replace('/(drawer)/marketplace'); } catch {}
        return true;
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => { try { sub.remove(); } catch {} };
    }, [router])
  );



  return (

    <SafeAreaView style={styles.safeArea}>

      {/* Header */}

      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 56 }]}> 

        <View style={styles.headerLeft}>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/(drawer)/marketplace')}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Dashboard</Text>
        </View>
      </View>

      {loading ? (

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (

        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#A68C7B']}
              tintColor="#A68C7B"
            />
          }

        >

          {/* Tabs */}

          <View style={styles.tabsContainer}>

            <TouchableOpacity

              style={[styles.tab, activeTab === 'overview' && styles.tabActive]}

              onPress={() => setActiveTab('overview')}

            >

              <View style={styles.tabIconContainer}>
                <Ionicons name="grid-outline" size={24} color={activeTab === 'overview' ? '#A68C7B' : '#999'} />
              </View>
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]} numberOfLines={2}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'products' && styles.tabActive]}
              onPress={() => setActiveTab('products')}
            >

              <View style={styles.tabIconContainer}>
                <Ionicons name="pricetags-outline" size={24} color={activeTab === 'products' ? '#A68C7B' : '#999'} />
              </View>
              <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]} numberOfLines={2}>
                Products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity

              style={[styles.tab, activeTab === 'orders' && styles.tabActive]}

              onPress={() => setActiveTab('orders')}

            >

              <View style={styles.tabIconContainer}>

                <Ionicons name="list-outline" size={24} color={activeTab === 'orders' ? '#A68C7B' : '#999'} />
                {orderStats.toShip > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{orderStats.toShip}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]} numberOfLines={2}>
                Orders
              </Text>
            </TouchableOpacity>

            <TouchableOpacity

              style={[styles.tab, activeTab === 'returns' && styles.tabActive]}

              onPress={() => setActiveTab('returns')}

            >

              <View style={styles.tabIconContainer}>

                <Ionicons name="return-up-back-outline" size={24} color={activeTab === 'returns' ? '#A68C7B' : '#999'} />

                {returnStats.pending > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{returnStats.pending}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabText, activeTab === 'returns' && styles.tabTextActive]} numberOfLines={2}>
                Returns
              </Text>
            </TouchableOpacity>

            <TouchableOpacity

              style={[styles.tab, activeTab === 'payouts' && styles.tabActive]}

              onPress={() => setActiveTab('payouts')}

            >
              <View style={styles.tabIconContainer}>
                <Ionicons name="wallet-outline" size={24} color={activeTab === 'payouts' ? '#A68C7B' : '#999'} />
              </View>
              <Text style={[styles.tabText, activeTab === 'payouts' && styles.tabTextActive]} numberOfLines={2}>
                Payouts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity

              style={[styles.tab, activeTab === 'settings' && styles.tabActive]}

              onPress={() => setActiveTab('settings')}

            >
              <View style={styles.tabIconContainer}>
                <Ionicons name="settings-outline" size={24} color={activeTab === 'settings' ? '#A68C7B' : '#999'} />
              </View>
              <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]} numberOfLines={2}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab 
              stats={stats} 
              router={router} 
              setActiveTab={setActiveTab}
              statsCollapsed={overviewStatsCollapsed}
              setStatsCollapsed={setOverviewStatsCollapsed}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
            />
          )}
          {activeTab === 'payouts' && (
            <PayoutsTab 
              payoutBalance={payoutBalance}
              paymentMethod={paymentMethod}
              stats={stats}
              onWithdraw={handleWithdraw}
              router={router}
            />
          )}
          {activeTab === 'products' && (
            <ProductsTab 
              products={products} 
              loading={productsLoading}
              router={router}

              onDelete={handleDeleteProduct}

              onEdit={handleEditProduct}

              showAllProducts={showAllProducts}
              setShowAllProducts={setShowAllProducts}

              onAddProduct={() => setAddProductModal(true)}

              onAddAuctionProduct={handleAddAuctionProduct}
            productView={productView}
            setProductView={setProductView}
            auctionsTab={auctionsTab}
            setAuctionsTab={setAuctionsTab}
            auctionItems={auctionItems}
            auctionItemsLoading={auctionItemsLoading}
            sellerAuctions={sellerAuctions}
            sellerAuctionsLoading={sellerAuctionsLoading}
            auctionStatusFilter={auctionStatusFilter}
            setAuctionStatusFilter={setAuctionStatusFilter}
            onRefreshAuctions={() => {
              if (auctionsTab === 'items') {
                fetchAuctionItems();
              } else {
                fetchSellerAuctions(auctionStatusFilter);
              }
            }}
            onActivateAuction={activateAuctionNow}
            onOpenActionsModal={openActionsModal}
            />

          )}

          {activeTab === 'orders' && (

            <OrdersTab 
              orders={orders} 
              loading={ordersLoading}
              orderFilter={orderFilter}
              setOrderFilter={setOrderFilter}
              orderStats={orderStats}
              onMarkAsProcessing={handleMarkAsProcessing}
              onMarkAsShipped={handleMarkAsShipped}
              showAllOrders={showAllOrders}
              setShowAllOrders={setShowAllOrders}
            />

          )}

          {activeTab === 'returns' && (
            <ReturnsTab 
              returns={returns} 
              loading={returnsLoading}
              returnFilter={returnFilter}
              setReturnFilter={setReturnFilter}
              returnStats={returnStats}
              onViewDetails={handleViewReturnDetails}
              showAllReturns={showAllReturns}
              setShowAllReturns={setShowAllReturns}
            />
          )}

          {activeTab === 'settings' && (
            <View style={styles.settingsTabContainer}>
              {/* Shipping Preferences */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Shipping Preferences</Text>
                <Text style={styles.settingsDescription}>Choose which couriers and services you support in your area.</Text>
                <View style={styles.settingsCard}>
                  {prefsLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#A68C7B" />
                      <Text style={styles.loadingText}>Loading preferences…</Text>
                    </View>
                  ) : (
                    <>
                      {/* J&T Express */}
                      <View style={styles.courierSection}>
                        <Text style={styles.courierLabel}>J&T Express</Text>
                        <View style={styles.checkboxGroup}>
                          <TouchableOpacity 
                            style={styles.checkboxItem}
                            onPress={() => togglePref('J&T Express', 'standard')}
                          >
                            <View style={[styles.checkbox, shippingPrefs?.couriers?.['J&T Express']?.standard && styles.checkboxChecked]}>
                              {shippingPrefs?.couriers?.['J&T Express']?.standard && (
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel}>Standard</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.checkboxItem}
                            onPress={() => togglePref('J&T Express', 'express')}
                          >
                            <View style={[styles.checkbox, shippingPrefs?.couriers?.['J&T Express']?.express && styles.checkboxChecked]}>
                              {shippingPrefs?.couriers?.['J&T Express']?.express && (
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel}>Express</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* LBC */}
                      <View style={styles.courierSection}>
                        <Text style={styles.courierLabel}>LBC</Text>
                        <View style={styles.checkboxGroup}>
                          <TouchableOpacity 
                            style={styles.checkboxItem}
                            onPress={() => togglePref('LBC', 'standard')}
                          >
                            <View style={[styles.checkbox, shippingPrefs?.couriers?.LBC?.standard && styles.checkboxChecked]}>
                              {shippingPrefs?.couriers?.LBC?.standard && (
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel}>Standard</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.checkboxItem}
                            onPress={() => togglePref('LBC', 'express')}
                          >
                            <View style={[styles.checkbox, shippingPrefs?.couriers?.LBC?.express && styles.checkboxChecked]}>
                              {shippingPrefs?.couriers?.LBC?.express && (
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel}>Express</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Save Button */}
                      <TouchableOpacity 
                        style={[styles.saveButton, (prefsSaving || prefsLoading) && styles.saveButtonDisabled]}
                        onPress={saveShippingPrefs}
                        disabled={prefsSaving || prefsLoading}
                      >
                        <Text style={styles.saveButtonText}>
                          {prefsSaving ? 'Saving…' : 'Save Preferences'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {/* Payment Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Payment Settings</Text>
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsLabel}>Payment Method</Text>
                  {paymentMethod.method ? (
                    <>
                      <Text style={styles.settingsValue}>{paymentMethod.method}</Text>
                      <TouchableOpacity style={styles.settingsButton}>
                        <Text style={styles.settingsButtonText}>Update</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.settingsValue}>No payment method set</Text>
                      <TouchableOpacity style={styles.settingsButton}>
                        <Text style={styles.settingsButtonText}>Add Payment Method</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

      )}



      {/* Shipping Modal */}

      {shippingModal && selectedOrder && (
        <Modal
          visible={shippingModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShippingModal(false)}
        >

          <KeyboardAvoidingView 

            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

            style={styles.modalOverlay}

          >

            <TouchableOpacity 

              style={styles.modalOverlayTouchable}

              activeOpacity={1}

              onPress={() => setShippingModal(false)}

            >

              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Tracking Number</Text>
                  <TouchableOpacity onPress={() => setShippingModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>



                <ScrollView 
                  style={styles.modalBody}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 3 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >

                  {/* Order Summary */}

                  <View style={styles.orderSummaryBox}>

                    <View style={styles.summaryRow}>

                      <Text style={styles.summaryLabel}>Order ID:</Text>

                      <Text style={styles.summaryValue}>#{selectedOrder.orderId.slice(0, 8)}</Text>

                    </View>

                    <View style={styles.summaryRow}>

                      <Text style={styles.summaryLabel}>Total:</Text>

                      <Text style={styles.summaryValue}>₱{selectedOrder.totalAmount.toLocaleString()}</Text>

                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Items:</Text>
                      <Text style={styles.summaryValue}>{selectedOrder.items?.length || 0}</Text>
                    </View>
                  </View>
                  {/* Tracking Input Section */}

                  <Text style={styles.inputLabel}>Tracking Number</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter tracking number (e.g., 420612345678)"
                    value={trackingNumber}
                    onChangeText={setTrackingNumber}
                    autoCapitalize="characters"
                    returnKeyType="done"
                  />
                  <Text style={styles.inputHint}>
                    Enter the tracking number provided by your courier service
                  </Text>
                  {/* Shipping Tips */}

                  <View style={styles.trackingTips}>

                    <Text style={styles.tipsHeader}>Shipping Tips:</Text>
                    <Text style={styles.tipText}>• Pack items securely to prevent damage</Text>
                    <Text style={styles.tipText}>• Include invoice and packing slip</Text>
                    <Text style={styles.tipText}>• Use tracking service for valuable items</Text>
                    <Text style={styles.tipText}>• Update buyer with tracking information</Text>                  </View>
                  {/* Submit Button */}

                  <TouchableOpacity 

                    style={[styles.submitBtn, !trackingNumber.trim() && styles.submitBtnDisabled]}

                    onPress={submitTracking}

                    disabled={!trackingNumber.trim()}

                  >
                    <Text style={styles.submitBtnText}>Confirm Shipment</Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

      )}



      <EditProductModal
        visible={editModal}
        product={selectedProduct}
        onClose={() => {
          setEditModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={() => {
          fetchProducts();
          fetchStats(selectedPeriod);
        }}
        styles={styles}
      />
      {/* Return Details Modal */}
      {returnDetailsModal && selectedReturn && (
        <Modal
          visible={returnDetailsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setReturnDetailsModal(false);
            setSelectedReturn(null);
            setReturnDetails(null);
          }}

        >

          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.modalContent}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Return Details</Text>
                  <TouchableOpacity onPress={() => {
                    setReturnDetailsModal(false);
                    setSelectedReturn(null);
                    setReturnDetails(null);
                  }}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.modalBody}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 3 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {returnDetailsLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#A68C7B" />
                      <Text style={styles.loadingText}>Loading return details...</Text>
                    </View>
                  ) : returnDetails ? (
                    <>

                      {/* Return Summary */}
                      <View style={styles.returnSummaryBox}>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Return ID:</Text>
                          <Text style={styles.summaryValue}>#{selectedReturn.returnId.slice(0, 8)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Status:</Text>
                          <View style={[styles.returnStatusBadge, styles[`returnStatus${selectedReturn.status.charAt(0).toUpperCase() + selectedReturn.status.slice(1)}`]]}>
                            <Text style={styles.returnStatusText}>
                              {selectedReturn.status.charAt(0).toUpperCase() + selectedReturn.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Requested:</Text>
                          <Text style={styles.summaryValue}>{new Date(selectedReturn.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Refund Amount:</Text>
                          <Text style={styles.summaryValue}>₱{selectedReturn.refundAmount?.toLocaleString() || '0'}</Text>
                        </View>
                      </View>
                      {/* Return Reason */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Return Reason</Text>
                        <Text style={styles.detailText}>
                          {selectedReturn.reason?.replaceAll('_', ' ') || 'No reason provided'}
                        </Text>
                        {selectedReturn.description && (
                          <Text style={styles.detailDescription}>{selectedReturn.description}</Text>
                        )}
                      </View>
                      {/* Customer Information */}
                      {returnDetails.customerInfo && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>Customer Information</Text>
                          <Text style={styles.detailText}>Name: {returnDetails.customerInfo.name}</Text>
                          <Text style={styles.detailText}>Email: {returnDetails.customerInfo.email}</Text>
                        </View>
                      )}
                      {/* Order Information */}
                      {returnDetails.orderInfo && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>Order Information</Text>
                          <Text style={styles.detailText}>Order ID: #{returnDetails.orderInfo.orderId?.slice(0, 8)}</Text>
                          <Text style={styles.detailText}>Order Date: {new Date(returnDetails.orderInfo.createdAt).toLocaleDateString()}</Text>
                        </View>
                      )}
                      {/* Evidence Images */}
                      {returnDetails.evidenceImages && returnDetails.evidenceImages.length > 0 && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>Evidence</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {returnDetails.evidenceImages.map((imageUrl, index) => (
                              <TouchableOpacity
                                key={index}
                                onPress={() => {
                                  setCurrentEvidenceIndex(index);
                                  setShowEvidenceViewer(true);
                                }}
                              >
                                <Image 
                                  source={{ uri: imageUrl }}
                                  style={styles.evidenceImage}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      {/* Divider */}
                      <View style={styles.divider} />
                      {/* Conversation */}
                      <View style={styles.conversationSection}>
                        <Text style={styles.sectionTitle}>Conversation</Text>
                        <ScrollView
                          style={styles.conversationContainer}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {returnDetails.messages && returnDetails.messages.length > 0 ? (
                            returnDetails.messages.map((msg, index) => {
                              let senderName = 'User';

                              if (msg.isAdmin) {
                                senderName = 'Admin';
                              } else if (msg.senderId === returnDetails.buyerId) {
                                senderName = returnDetails.buyer?.username || 'Buyer';
                              } else if (returnDetails.sellerProfile && msg.senderId === returnDetails.sellerProfile.userId) {
                                senderName = returnDetails.sellerProfile?.shopName || 'Seller';
                              }

                              return (
                                <View key={index} style={styles.conversationItem}>
                                  <View style={styles.messageHeader}>
                                    <View style={styles.messageMetaRow}>
                                      <Text style={styles.messageDate}>
                                        {new Date(msg.createdAt).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.messageSender,
                                          msg.isAdmin && styles.messageSenderAdmin,
                                        ]}
                                      >
                                        {senderName}
                                      </Text>
                                    </View>
                                    {msg.isAdmin && (
                                      <View style={styles.adminBadge}>
                                        <Text style={styles.adminBadgeText}>Admin</Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={styles.messageText}>{msg.message}</Text>
                                </View>
                              );
                            })
                          ) : (
                            <Text style={styles.noMessagesText}>No messages yet.</Text>
                          )}
                        </ScrollView>
                        <View style={styles.messageInputRow}>
                          <TextInput
                            style={styles.messageInput}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholder="Write a message..."
                            multiline={false}
                          />
                          <TouchableOpacity
                            style={[
                              styles.sendButton, 
                              (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled
                            ]}
                            onPress={handleSendMessage}
                            disabled={!newMessage.trim() || sendingMessage}
                          >
                            {sendingMessage ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.sendButtonText}>Send</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Action Buttons for Pending Returns */}
                      {selectedReturn.status === 'pending' && (
                        <View style={styles.modalActionsContainer}>
                          <TouchableOpacity 
                            style={styles.modalRejectBtn}
                            onPress={async () => {
                              setReturnDetailsModal(false);
                              setSelectedReturn(null);
                              setReturnDetails(null);
                              setNewMessage('');
                              await handleRejectReturn(selectedReturn);
                            }}

                          >

                            <Text style={styles.modalRejectBtnText}>Reject Return</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.modalApproveBtn}
                            onPress={async () => {
                              setReturnDetailsModal(false);
                              setSelectedReturn(null);
                              setReturnDetails(null);
                              setNewMessage('');
                              await handleApproveReturn(selectedReturn);
                            }}
                          >

                            <Text style={styles.modalApproveBtnText}>Approve Return</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                    </>

                  ) : (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>Failed to load return details</Text>
                    </View>
                  )}
                  {/* Bottom Spacer */}
                  <View style={styles.bottomSpacer} />
                </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      {showEvidenceViewer && returnDetails?.evidenceImages && returnDetails.evidenceImages.length > 0 && (
        <Modal
          visible={showEvidenceViewer}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEvidenceViewer(false)}
        >
          <View style={styles.evidenceViewerOverlay}>
            <TouchableOpacity
              style={styles.evidenceViewerBackdrop}
              activeOpacity={1}
              onPress={() => setShowEvidenceViewer(false)}
            >
              <Image
                source={{ uri: returnDetails.evidenceImages[currentEvidenceIndex] }}
                style={styles.evidenceFullscreenImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.evidenceViewerClose}
              onPress={() => setShowEvidenceViewer(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Add Product Modal */}

      <AddMarketProduct
        visible={addProductModal}
        onClose={() => setAddProductModal(false)}
        onSuccess={() => {
          fetchProducts();
          fetchStats(selectedPeriod);
        }}
        styles={styles}
      />

      <AddAuctionProduct
        visible={addAuctionProductModal}
        onClose={() => setAddAuctionProductModal(false)}
        onSuccess={() => {
          if (productView === 'auctions') {
            if (auctionsTab === 'items') {
              fetchAuctionItems();
            } else {
              fetchSellerAuctions(auctionStatusFilter);
            }
          }
        }}
        styles={styles}
      />

      {/* Edit Auction Modal */}
      {selectedAuction && (
        <EditPriceScheduleAuction
          visible={editAuctionModalOpen}
          onClose={() => {
            setEditAuctionModalOpen(false);
            setSelectedAuction(null);
          }}
          auction={selectedAuction}
          onSaved={() => {
            setEditAuctionModalOpen(false);
            setSelectedAuction(null);
            fetchSellerAuctions(auctionStatusFilter);
          }}
          styles={styles}
        />
      )}

      {/* Auction Actions Modal */}
      <AuctionOptionModal
        visible={actionsModalOpen}
        onClose={closeActionsModal}
        auction={actionsAuction}
        onEditAuction={handleEditAuction}
        onActivateNow={(auction) => {
          closeActionsModal();
          activateAuctionNow(auction.auctionId || auction.id);
        }}
        onViewBids={async (auction) => {
          closeActionsModal();
          try {
            const auctionId = auction.auctionId || auction.id;
            const response = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
              credentials: 'include',
            });
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              const bids = data.data.sort((a, b) => b.amount - a.amount);
              const topBid = bids[0];
              let message = 'Bid History:\n\n';
              if (topBid) {
                message += `Top Bid: ₱${Number(topBid.amount).toLocaleString()}\n`;
                message += `Bidder: ${topBid.bidder_name || 'Anonymous'}\n\n`;
              }
              message += `Total Bids: ${bids.length}`;
              Alert.alert('View Bids', message);
            } else {
              Alert.alert('View Bids', 'No bids yet for this auction');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to load bids: ' + error.message);
          }
        }}
        onPause={pauseAuction}
        onResume={resumeAuction}
        onCancel={cancelAuction}
      />
        <AndroidFooterSpacer />
    </SafeAreaView>

  );

}

// Overview Tab Component

const OverviewTab = ({ stats, router, setActiveTab, statsCollapsed, setStatsCollapsed, selectedPeriod, setSelectedPeriod }) => (
  <View style={styles.overviewContainer}>
    {/* Quick Actions */}
    <Text style={styles.sectionTitle}>Quick Actions</Text>

    <View style={styles.quickActions}>
  <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('products')}>
    <Ionicons name="pricetags" size={32} color="#A68C7B" />
    <Text style={styles.actionText}>Manage Products</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('orders')}>
    <Ionicons name="list" size={32} color="#A68C7B" />
    <Text style={styles.actionText}>View Orders</Text>
  </TouchableOpacity>
</View>



    {/* Period Selector */}
    <View style={styles.overviewPeriodContainer}>
      <TouchableOpacity
        style={[styles.overviewPeriodBtn, selectedPeriod === 'daily' && styles.overviewPeriodBtnActive]}
        onPress={() => setSelectedPeriod('daily')}
      >
        <Text style={[styles.overviewPeriodText, selectedPeriod === 'daily' && styles.overviewPeriodTextActive]}>
          Daily
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.overviewPeriodBtn, selectedPeriod === 'weekly' && styles.overviewPeriodBtnActive]}
        onPress={() => setSelectedPeriod('weekly')}
      >
        <Text style={[styles.overviewPeriodText, selectedPeriod === 'weekly' && styles.overviewPeriodTextActive]}>
          Weekly
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.overviewPeriodBtn, selectedPeriod === 'monthly' && styles.overviewPeriodBtnActive]}
        onPress={() => setSelectedPeriod('monthly')}
      >

        <Text style={[styles.overviewPeriodText, selectedPeriod === 'monthly' && styles.overviewPeriodTextActive]}>
          Monthly
        </Text>
      </TouchableOpacity>
    </View>
    {/* Sales Statistics - Moved from above tabs */}
    <View style={styles.statsContainer}>
      {/* Stats Header with Collapse Toggle */}
      <TouchableOpacity 
        style={styles.statsHeader}
        onPress={() => setStatsCollapsed(!statsCollapsed)}
        activeOpacity={0.7}
      >

        <Text style={styles.statsHeaderTitle}>Sales Statistics</Text>
        <Ionicons 
          name={statsCollapsed ? "chevron-down" : "chevron-up"} 
          size={24} 
          color="#A68C7B" 
        />
      </TouchableOpacity>



      {/* Stats Content */}
      {!statsCollapsed && (
        <>
          {/* Top Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={28} color="#A68C7B" />
              <Text style={styles.statValue}>₱{stats.totalSales.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statCard}>
              <Ionicons name="receipt-outline" size={28} color="#A68C7B" />
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
              {stats.pendingOrders > 0 && (
                <Text style={styles.statBadge}>{stats.pendingOrders} pending</Text>
              )}
            </View>
          </View>
          {/* Horizontal Divider */}
          <View style={styles.horizontalDivider} />
          {/* Bottom Row */}

          <View style={styles.statsRow}>

            <View style={styles.statCard}>

              <Ionicons name="cube-outline" size={28} color="#A68C7B" />

              <Text style={styles.statValue}>{stats.totalProducts}</Text>

              <Text style={styles.statLabel}>Product Listed</Text>

            </View>

            <View style={styles.verticalDivider} />
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={28} color="#A68C7B" />
              <Text style={styles.statValue}>₱{stats.earnings.net.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Net Earnings</Text>
              <Text style={styles.statSubLabel}>
                After {((stats.earnings.platformFee / stats.earnings.gross) * 100 || 0).toFixed(0)}% fees
              </Text>
            </View>
          </View>

        </>

      )}

    </View>

  </View>

);


const PayoutsTab = ({ payoutBalance, paymentMethod, stats, onWithdraw, router }) => {
  return (
    <View style={styles.payoutsContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={20} color="#A68C7B" style={{marginRight: 8}} />
            <Text style={styles.balanceTitle}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>₱{payoutBalance.available.toLocaleString()}</Text>
          {payoutBalance.pending > 0 && (
            <View style={styles.pendingContainer}>
              <Ionicons name="time-outline" size={16} color="#FF9800" />
              <Text style={styles.pendingText}>
                Pending (Escrow): ₱{payoutBalance.pending.toLocaleString()}
              </Text>
            </View>
          )}
          <Text style={styles.minimumText}>
            Minimum withdrawal: ₱{payoutBalance.minimumPayout}
          </Text>
          {!paymentMethod.method && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#FF9800" />
              <Text style={styles.warningText}>Set up payment method first</Text>
            </View>
          )}
          {/* Withdraw Button */}
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              (!payoutBalance.canWithdraw || !paymentMethod.method) && styles.withdrawBtnDisabled
            ]}
            onPress={onWithdraw}
            disabled={!payoutBalance.canWithdraw || !paymentMethod.method}
          >
            <Ionicons name="cash-outline" size={20} color="#fff" />
            <Text style={styles.withdrawBtnText}>
              {!paymentMethod.method
                ? 'Set Up Payment Method'
                : !payoutBalance.canWithdraw
                ? `Minimum ₱${payoutBalance.minimumPayout} Required`
                : 'Withdraw Funds'}
            </Text>
          </TouchableOpacity>
          {!paymentMethod.method && (
            <TouchableOpacity
              style={styles.setupPaymentBtn}
              onPress={() => router.push('/(drawer)/settings')}
            >
              <Text style={styles.setupPaymentBtnText}>Go to Settings</Text>
            </TouchableOpacity>
          )}

        </View>



        {/* Earnings Breakdown */}

        <View style={styles.earningsBreakdownCard}>

          <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>

          

          <View style={styles.breakdownRow}>

            <Text style={styles.breakdownLabel}>Gross Sales</Text>

            <Text style={styles.breakdownValue}>₱{stats.earnings.gross.toLocaleString()}</Text>

          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee (4%)</Text>
            <Text style={styles.breakdownValueRed}>-₱{stats.earnings.platformFee.toLocaleString()}</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabelBold}>Net Earnings</Text>
            <Text style={styles.breakdownValueBold}>₱{stats.earnings.net.toLocaleString()}</Text>
          </View>
        </View>



        {/* Payout Stats */}

        <View style={styles.payoutStatsCard}>

          <Text style={styles.breakdownTitle}>Payout History</Text>

          

          <View style={styles.statRow}>

            <View style={styles.statItem}>
              <Ionicons name="wallet" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>₱{payoutBalance.totalPaidOut.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Paid Out</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#FF9800" />
              <Text style={styles.statValue}>₱{payoutBalance.pending.toLocaleString()}</Text>
              <Text style={styles.statLabel}>In Escrow</Text>
            </View>
          </View>
        </View>



        {/* How It Works */}
        <View style={styles.infoCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <Ionicons name="bulb" size={20} color="#A68C7B" style={{marginRight: 8}} />
            <Text style={styles.infoTitle}>How Payouts Work</Text>
          </View>

          

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>24-Hour Escrow</Text>
              <Text style={styles.infoItemText}>
                Funds are held for 24 hours after delivery for buyer protection
              </Text>
            </View>
          </View>

          

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="card-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>GCash Payout</Text>
              <Text style={styles.infoItemText}>
                Receive money directly to your GCash account
              </Text>
            </View>
          </View>

          

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="stats-chart-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>4% Platform Fee</Text>
              <Text style={styles.infoItemText}>
                Low fees to help artists earn more
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="flash-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Fast Processing</Text>
              <Text style={styles.infoItemText}>
                Withdrawals processed within minutes
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Products Tab Component

const ProductsTab = ({
  products,
  loading,
  router,
  onDelete,
  onEdit,
  showAllProducts,
  setShowAllProducts,
  onAddProduct,
  onAddAuctionProduct,
  productView,
  setProductView,
  auctionsTab,
  setAuctionsTab,
  auctionItems,
  auctionItemsLoading,
  sellerAuctions,
  sellerAuctionsLoading,
  auctionStatusFilter,
  setAuctionStatusFilter,
  onRefreshAuctions,
  onActivateAuction,
  onOpenActionsModal,
}) => {
  const formatDateTime = (value) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleString();
  };

  const renderInventorySection = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
        </View>
      );
    }
  
    if (products.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetags-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Products Yet</Text>
          <Text style={styles.emptyText}>Add your first product to start selling</Text>
          <TouchableOpacity style={styles.addProductBtnHeader} onPress={onAddProduct}>
            <Ionicons name="add-circle-outline" size={20} color="#A68C7B" />
            <Text style={styles.addProductBtnHeaderText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      );
    }
  
    const displayedProducts = showAllProducts ? products : products.slice(0, 6);
  
    return (
      <>
        {displayedProducts.map((product) => (
          <View key={product.marketItemId} style={styles.productCard}>
            <Image 
              source={{ uri: product.primary_image || 'https://via.placeholder.com/100' }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <View style={styles.productTitleRow}>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {product.title}
                </Text>
              </View>
              <View style={styles.productBadges}>
                <View
  
    style={[
      styles.conditionBadge,
      styles[
        `condition${
          (product.condition || 'excellent').charAt(0).toUpperCase() +
          (product.condition || 'excellent').slice(1)
        }`
      ],
    ]}
  >
    <Text style={styles.conditionBadgeText}>
      {(product.condition || 'excellent').charAt(0).toUpperCase() +
        (product.condition || 'excellent').slice(1)}
    </Text>
  </View>
  <View
    style={[
      styles.productStatusBadge,
      styles[
        `productStatus${
          (product.status || 'active').charAt(0).toUpperCase() +
          (product.status || 'active').slice(1)
        }`
      ],
    ]}
  >
    <Text style={styles.productStatusBadgeText}>
      {(product.status || 'active').charAt(0).toUpperCase() +
        (product.status || 'active').slice(1)}
    </Text>
  </View>
</View>
<Text style={styles.productPrice}>₱{product.price?.toLocaleString() || '0'}</Text>
<View style={styles.stockContainer}>
  <Text style={[styles.productStock, (product.quantity || 0) < 3 && styles.lowStock]}>
    Stock: {product.quantity || 0}
  </Text>
  {(product.quantity || 0) < 3 && (
    <View style={styles.lowStockBadge}>
      <Ionicons name="warning" size={12} color="#FF9800" />
      <Text style={styles.lowStockText}>Low</Text>
    </View>
  )}
</View>
</View>
<View style={styles.productActions}>
  <TouchableOpacity 
    style={styles.actionIconBtn}
    onPress={() => router.push(`/marketplace/item/${product.marketItemId}`)}
  >
    <Ionicons name="eye-outline" size={20} color="#666" />
  </TouchableOpacity>
  <TouchableOpacity style={styles.actionIconBtn} onPress={() => onEdit(product)}>
    <Ionicons name="create-outline" size={20} color="#A68C7B" />
  </TouchableOpacity>
  <TouchableOpacity style={styles.actionIconBtn} onPress={() => onDelete(product)}>
    <Ionicons name="trash-outline" size={20} color="#F44336" />
  </TouchableOpacity>
</View>
</View>
))}

      {products.length > 6 && (
        <TouchableOpacity 
          style={styles.loadMoreBtn}
          onPress={() => setShowAllProducts(!showAllProducts)}
        >

          <Text style={styles.loadMoreText}>

            {showAllProducts ? 'Show Less' : `Load More (${products.length - 6} more)`}

          </Text>

            <Ionicons name={showAllProducts ? 'chevron-up' : 'chevron-down'} size={20} color="#A68C7B" />
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderAuctionItemsSection = () => {
    if (auctionItemsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
        </View>
      );
    }

    if (auctionItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Auction Items Yet</Text>
          <Text style={styles.emptyText}>Submit artwork for auction to see them here</Text>
        </View>
      );
    }

    return auctionItems.map((item) => (
      <View key={item.auctionItemId || item.id} style={styles.productCard}>
        <Image
          source={{ uri: item.primary_image || 'https://via.placeholder.com/100' }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.productMedium}>{item.medium || 'Medium not set'}</Text>
          <Text style={styles.productDimensions}>{item.dimensions || 'Dimensions not set'}</Text>
        </View>
      </View>
    ));
  };

  const renderSellerAuctionsSection = () => {
    if (sellerAuctionsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
        </View>
      );
    }

    const statusOptions = [
      { label: 'All', value: '' },
      { label: 'Scheduled', value: 'scheduled' },
      { label: 'Active', value: 'active' },
      { label: 'Ended', value: 'ended' },
    ];

    return (
      <>
        <View style={styles.auctionStatusFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.auctionFiltersScrollView}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value || 'all'}
                style={[
                  styles.auctionStatusFilterBtn,
                  auctionStatusFilter === option.value && styles.auctionStatusFilterBtnActive,
                ]}
                onPress={() => setAuctionStatusFilter(option.value)}
              >
                <Text
                  style={[
                    styles.auctionStatusFilterText,
                    auctionStatusFilter === option.value && styles.auctionStatusFilterTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.auctionRefreshBtn} onPress={onRefreshAuctions}>
              <Ionicons name="refresh" size={16} color="#A68C7B" />
              <Text style={styles.auctionRefreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {sellerAuctions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Auctions Found</Text>
            <Text style={styles.emptyText}>Create an auction schedule to manage it here</Text>
          </View>
        ) : (
          <>
            {sellerAuctions.map((auction) => {
          const statusKey = auction.status
            ? auction.status.charAt(0).toUpperCase() + auction.status.slice(1)
            : 'Pending';
          const statusStyle = styles[`status${statusKey}`] || styles.statusPending;
          const item = auction.auction_items || {};

          return (
            <View key={auction.auctionId || auction.id} style={styles.auctionCard}>
              <View style={styles.auctionCardHeader}>
                <View style={styles.auctionHeaderLeft}>
                  <Image
                    source={{ uri: item.primary_image || 'https://via.placeholder.com/80' }}
                    style={styles.auctionItemImage}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auctionCardTitle} numberOfLines={1}>
                      {item.title || 'Untitled Artwork'}
                    </Text>
                    <Text style={styles.auctionCardSubtitle} numberOfLines={1}>
                      Start ₱{Number(auction.startPrice || 0).toLocaleString()} · Min Inc. ₱
                      {Number(auction.minIncrement || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.auctionActionBtn}
                  onPress={() => onOpenActionsModal?.(auction)}
                >
                  <Text style={styles.auctionActionBtnText}>Action</Text>
                  <Ionicons name="chevron-forward" size={16} color="#A68C7B" />
                </TouchableOpacity>
              </View>

              <View style={styles.auctionMetaRow}>
                <View style={styles.auctionMetaItem}>
                  <Text style={styles.auctionMetaLabel}>Start</Text>
                  <Text style={styles.auctionMetaValue}>{formatDateTime(auction.startAt)}</Text>
                </View>
                <View style={styles.auctionMetaDivider} />
                <View style={styles.auctionMetaItem}>
                  <Text style={styles.auctionMetaLabel}>End</Text>
                  <Text style={styles.auctionMetaValue}>{formatDateTime(auction.endAt)}</Text>
                </View>
              </View>

              <View style={styles.auctionCardActions}>
                <View style={[styles.statusBadge, statusStyle]}>
                  <Text style={styles.statusText}>{(auction.status || 'pending').toUpperCase()}</Text>
                </View>
                {auction.status === 'scheduled' && (
                  <TouchableOpacity
                    style={styles.auctionActivateBtn}
                    onPress={() => onActivateAuction?.(auction.auctionId || auction.id)}
                  >
                    <Text style={styles.auctionActivateBtnText}>Activate Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
            </>
          )
        }
      </>
    );
  };

  const renderAuctionsSection = () => (
    <View style={styles.auctionsSection}>
      <View style={styles.productsHeader}>
        <Text style={styles.myProductTitle}>Auctions</Text>
        <TouchableOpacity style={styles.addProductBtnHeader} onPress={onAddAuctionProduct}>
          <Ionicons name="add-circle-outline" size={20} color="#A68C7B" />
          <Text style={styles.addProductBtnHeaderText}>Add Product</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sectionDivider} />

      <View style={styles.auctionTabsContainer}>
        <TouchableOpacity
          style={[styles.auctionTab, auctionsTab === 'items' && styles.auctionTabActive]}
          onPress={() => setAuctionsTab('items')}
        >
          <Text style={[styles.auctionTabText, auctionsTab === 'items' && styles.auctionTabTextActive]}>
            Auction Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.auctionTab, auctionsTab === 'auctions' && styles.auctionTabActive]}
          onPress={() => setAuctionsTab('auctions')}
        >
          <Text style={[styles.auctionTabText, auctionsTab === 'auctions' && styles.auctionTabTextActive]}>
            My Auctions
          </Text>
        </TouchableOpacity>
      </View>

      {auctionsTab === 'items' ? renderAuctionItemsSection() : renderSellerAuctionsSection()}
    </View>
  );

  return (
    <View style={styles.productsContainer}>
      <View style={styles.productViewTabs}>
        <TouchableOpacity
          style={[styles.productViewTab, productView === 'inventory' && styles.productViewTabActive]}
          onPress={() => setProductView('inventory')}
        >
          <Text
            style={[
              styles.productViewTabText,
              productView === 'inventory' && styles.productViewTabTextActive,
            ]}
          >
            Product Inventory
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.productViewTab, productView === 'auctions' && styles.productViewTabActive]}
          onPress={() => setProductView('auctions')}
        >
          <Text
            style={[
              styles.productViewTabText,
              productView === 'auctions' && styles.productViewTabTextActive,
            ]}
          >
            Auctions
          </Text>
        </TouchableOpacity>
      </View>

      {productView === 'inventory' ? (
        <>
          <View style={styles.productsHeader}>
            <Text style={styles.myProductTitle}>My Products</Text>
            <TouchableOpacity style={styles.addProductBtnHeader} onPress={onAddProduct}>
              <Ionicons name="add-circle-outline" size={20} color="#A68C7B" />
              <Text style={styles.addProductBtnHeaderText}>Add Product</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionDivider} />
          {renderInventorySection()}
        </>
      ) : (
        renderAuctionsSection()
      )}

    </View>

  );

};


// Orders Tab Component

const OrdersTab = ({ orders, loading, orderFilter, setOrderFilter, orderStats, onMarkAsProcessing, onMarkAsShipped, showAllOrders, setShowAllOrders }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };


  return (
    <View style={styles.ordersContainer}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('all')}
        >
          <Text style={[styles.filterText, orderFilter === 'all' && styles.filterTextActive]}>
            All ({orderStats.totalOrders})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'paid' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('paid')}
        >
          <Text style={[styles.filterText, orderFilter === 'paid' && styles.filterTextActive]}>
            To Ship ({orderStats.toShip})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'shipped' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('shipped')}
        >
          <Text style={[styles.filterText, orderFilter === 'shipped' && styles.filterTextActive]}>
            Shipping ({orderStats.shipping})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'delivered' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('delivered')}
        >
          <Text style={[styles.filterText, orderFilter === 'delivered' && styles.filterTextActive]}>
            Completed ({orderStats.completed})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity

          style={[styles.filterBtn, orderFilter === 'cancelled' && styles.filterBtnActive]}

          onPress={() => setOrderFilter('cancelled')}

        >

          <Text style={[styles.filterText, orderFilter === 'cancelled' && styles.filterTextActive]}>

            Cancelled ({orderStats.cancelled})

          </Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
        </View>

      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Orders Found</Text>
        </View>

      ) : (

        <>

        {(showAllOrders ? orders : orders.slice(0, 6)).map(order => (

          <View key={order.orderId} style={styles.orderCard}>

            <View style={styles.orderHeader}>

              <View style={styles.orderHeaderLeft}>

                <Text style={styles.orderId}>Order #{order.orderId.slice(0, 8)}</Text>

                <View style={[styles.statusBadge, styles[`status${
                  order.status === 'cancelled' ? 'Cancelled' :
                  (order.status === 'pending' && order.paymentStatus === 'paid') ? 'ToShip' :
                  order.status === 'processing' ? 'Processing' :
                  order.status === 'shipped' ? 'Shipping' : 
                  order.status === 'delivered' ? 'Completed' : 
                  'Pending'
                }`]]}>
                  <Text style={styles.statusText}>
                    {order.status === 'cancelled' ? 'Cancelled' :
                     (order.status === 'pending' && order.paymentStatus === 'paid') ? 'To Ship' :
                     order.status === 'processing' ? 'Processing' :
                     order.status === 'shipped' ? 'Shipping' : 
                     order.status === 'delivered' ? 'Completed' : 
                     order.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderTotal}>₱{order.totalAmount.toLocaleString()}</Text>
            </View>
            <Text style={styles.orderDate}>{formatDate(order.paidAt || order.createdAt)}</Text>
          
            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <View style={styles.orderItemsContainer}>
                {order.items.map((item, idx) => (
                  <View key={idx} style={styles.orderItem}>
                    <Image 
                      source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                      style={styles.orderItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.orderItemQty}>
                        Qty: {item.quantity} × ₱{item.priceAtPurchase?.toLocaleString() || '0'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {order.trackingNumber && (
              <View style={styles.trackingContainer}>
                <Ionicons name="cube-outline" size={16} color="#666" />
                <Text style={styles.trackingText}>Tracking: {order.trackingNumber}</Text>
              </View>
            )}
            {/* Show both buttons for paid orders */}
            {(order.status === 'pending' && order.paymentStatus === 'paid') && (
              <View style={styles.orderButtonsContainer}>
                <TouchableOpacity 
                  style={styles.processingBtn}
                  onPress={() => onMarkAsProcessing(order)}
                >
                  <Text style={styles.processingBtnText}>Mark as Processing</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.shipBtn}
                  onPress={() => onMarkAsShipped(order)}
                >
                  <Text style={styles.shipBtnText}>Mark as Shipped</Text>
                </TouchableOpacity>
              </View>
            )}


            {/* Show only ship button for processing orders */}
            {order.status === 'processing' && (
              <TouchableOpacity 
                style={[styles.shipBtn, styles.shipBtnFull]}
                onPress={() => onMarkAsShipped(order)}
              >
                <Text style={styles.shipBtnText}>Mark as Shipped</Text>
              </TouchableOpacity>
            )}

            {/* Show waiting status for shipped orders */}
            {order.status === 'shipped' && (
              <View style={styles.waitingContainer}>
                <Text style={styles.waitingText}>Waiting for Delivery</Text>
              </View>
            )}

            {/* Show completed status */}
            {order.status === 'delivered' && (
              <View style={styles.completedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}

            {/* Show cancelled status */}
            {order.status === 'cancelled' && (
              <View style={styles.cancelledContainer}>
                <Ionicons name="close-circle" size={20} color="#F44336" />
                <Text style={styles.cancelledText}>Cancelled</Text>
              </View>
            )}

          </View>
        ))}

        {/* Load More/Less Button */}
        {orders.length > 6 && (
          <TouchableOpacity 
            style={styles.loadMoreBtn}
            onPress={() => setShowAllOrders(!showAllOrders)}
          >
            <Text style={styles.loadMoreText}>
              {showAllOrders ? 'Show Less' : `Load More (${orders.length - 6} more)`}
            </Text>
            <Ionicons 
              name={showAllOrders ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#A68C7B" 
            />
          </TouchableOpacity>
        )}
        </>
      )}
    </View>
  );
};


// Returns Tab Component
const ReturnsTab = ({ returns, loading, returnFilter, setReturnFilter, returnStats, onViewDetails, showAllReturns, setShowAllReturns }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };



  return (
    <View style={styles.returnsContainer}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, returnFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setReturnFilter('all')}
        >
          <Text style={[styles.filterText, returnFilter === 'all' && styles.filterTextActive]}>
            All ({returnStats.totalReturns})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, returnFilter === 'pending' && styles.filterBtnActive]}
          onPress={() => setReturnFilter('pending')}
        >
          <Text style={[styles.filterText, returnFilter === 'pending' && styles.filterTextActive]}>
            Pending ({returnStats.pending})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, returnFilter === 'approved' && styles.filterBtnActive]}
          onPress={() => setReturnFilter('approved')}
        >
          <Text style={[styles.filterText, returnFilter === 'approved' && styles.filterTextActive]}>
            Approved ({returnStats.approved})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, returnFilter === 'rejected' && styles.filterBtnActive]}
          onPress={() => setReturnFilter('rejected')}
        >
          <Text style={[styles.filterText, returnFilter === 'rejected' && styles.filterTextActive]}>
            Rejected ({returnStats.rejected})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, returnFilter === 'refunded' && styles.filterBtnActive]}
          onPress={() => setReturnFilter('refunded')}
        >

          <Text style={[styles.filterText, returnFilter === 'refunded' && styles.filterTextActive]}>
            Refunded ({returnStats.completed})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Returns List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
        </View>
      ) : returns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="return-up-back-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Returns Found</Text>
          <Text style={styles.emptyText}>Return requests will appear here</Text>
        </View>
      ) : (
        <>
        {(showAllReturns ? returns : returns.slice(0, 6)).map(returnRequest => (
          <View key={returnRequest.returnId} style={styles.returnCard}>
            <View style={styles.returnHeader}>
              <View style={styles.returnHeaderLeft}>
                <Text style={styles.returnId}>Return #{returnRequest.returnId.slice(0, 8)}</Text>
                <View style={[styles.returnStatusBadge, styles[`returnStatus${returnRequest.status.charAt(0).toUpperCase() + returnRequest.status.slice(1)}`]]}>
                  <Text style={styles.returnStatusText}>
                    {returnRequest.status.charAt(0).toUpperCase() + returnRequest.status.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={styles.returnAmount}>₱{returnRequest.refundAmount?.toLocaleString() || '0'}</Text>
            </View>
            <Text style={styles.returnDate}>Requested: {formatDate(returnRequest.createdAt)}</Text>
            {/* Return Reason and Description */}

            <View style={styles.returnReasonContainer}>

              <Text style={styles.returnReason}>

                Reason: {returnRequest.reason?.replaceAll('_', ' ') || 'No reason provided'}

              </Text>

              {returnRequest.description && (

                <Text style={styles.returnDescription} numberOfLines={2}>

                  {returnRequest.description}

                </Text>

              )}

            </View>



            {/* View Details Button */}
            <View style={styles.returnActionsContainer}>
              <TouchableOpacity 
                style={styles.viewDetailsBtn}
                onPress={() => onViewDetails(returnRequest)}
              >
                <Ionicons name="eye-outline" size={16} color="#A68C7B" />
                <Text style={styles.viewDetailsBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
            {/* Status Messages */}
            {returnRequest.status === 'approved' && (
              <View style={styles.approvedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.approvedText}>Approved - Refund Processing</Text>
              </View>
            )}
            {returnRequest.status === 'rejected' && (
              <View style={styles.rejectedContainer}>
                <Ionicons name="close-circle" size={20} color="#F44336" />
                <Text style={styles.rejectedText}>Rejected</Text>
                {returnRequest.sellerResponse && (
                  <Text style={styles.rejectionReason}>Response: {returnRequest.sellerResponse}</Text>
                )}
              </View>
            )}
            {returnRequest.status === 'refunded' && (
              <View style={styles.completedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.completedText}>Refunded - Process Complete</Text>
              </View>
            )}
            {returnRequest.status === 'disputed' && (
              <View style={styles.disputedContainer}>
                <Ionicons name="warning" size={20} color="#FF9800" />
                <Text style={styles.disputedText}>Disputed - Under Review</Text>
              </View>
            )}
          </View>
        ))}
        {/* Load More/Less Button */}
        {returns.length > 6 && (
          <TouchableOpacity 
            style={styles.loadMoreBtn}
            onPress={() => setShowAllReturns(!showAllReturns)}
          >
            <Text style={styles.loadMoreText}>
              {showAllReturns ? 'Show Less' : `Load More (${returns.length - 6} more)`}
            </Text>
            <Ionicons 
              name={showAllReturns ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#A68C7B" 
            />
          </TouchableOpacity>
        )}
        </>
      )}
    </View>
  );
};



const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    backgroundColor: '#fff',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    padding: 12,
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  notSellerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  notSellerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },

  notSellerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },

  applyButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
  },

  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    gap: 8,
  },
  periodBtn: {
  flex: 1,
  paddingVertical: 10,
  alignItems: 'center',
  borderRadius: 8,
},
periodBtnActive: {
  backgroundColor: '#A68C7B',
},
periodText: {
  fontSize: 14,
  color: '#666',
  fontWeight: '500',
},
periodTextActive: {
  color: '#fff',
  fontWeight: '600',
},
// Stats Cards
statsContainer: {
  backgroundColor: '#fff',
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  overflow: 'hidden',
  marginTop: 20,
},
statsHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#e8e8e8',
},
statsHeaderTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
},
statsRow: {
  flexDirection: 'row',
},
statCard: {
  flex: 1,
  padding: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
verticalDivider: {
  width: 1,
  backgroundColor: '#e8e8e8',
},
horizontalDivider: {
  height: 1,
  backgroundColor: '#e8e8e8',
},
statValue: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#333',
  marginTop: 8,
},
statLabel: {
  fontSize: 12,
  color: '#666',
  marginTop: 4,
},
statSubLabel: {
  fontSize: 10,
  color: '#999',
  marginTop: 2,
  textAlign: 'center',
},
statBadge: {
  fontSize: 11,
  color: '#FF9800',
  fontWeight: '600',
  marginTop: 4,
  textAlign: 'center',
},
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    minHeight: 75,

  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIconContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  tabText: {
    fontSize: 9,
    color: '#999',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
    width: 45,
    flexWrap: 'wrap',
  },
  tabTextActive: {
    color: '#A68C7B',
    fontWeight: '600',
  },
badge: {
  position: 'absolute',
  top: -6,
  right: -8,
  backgroundColor: '#F44336',
  borderRadius: 10,
  minWidth: 18,
  height: 18,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#fff',
},
badgeText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: 'bold',
},
// Overview Tab
overviewContainer: {
  padding: 16,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#A68C7B',
  marginBottom: 12,
},
quickActions: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 20,
},
actionCard: {
  flex: 1,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
},
actionText: {
  fontSize: 13,
  color: '#A68C7B',
  fontWeight: '600',
  marginTop: 10,
  textAlign: 'center',
},
earningsCard: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
},
earningsTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 12,
},
earningsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 10,
},
earningsLabel: {
  fontSize: 14,
  color: '#666',
},
earningsValue: {
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
},
earningsFee: {
  fontSize: 14,
  fontWeight: '600',
  color: '#F44336',
},
earningsTotal: {
  borderTopWidth: 1,
  borderTopColor: '#e8e8e8',
  paddingTop: 12,
  marginTop: 8,
},
earningsTotalLabel: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
},
earningsTotalValue: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#A68C7B',
},
// Overview Period Selector
overviewPeriodContainer: {
  flexDirection: 'row',
  backgroundColor: '#fff',
  padding: 4,
  borderRadius: 12,
  gap: 8,
  marginTop: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
},
overviewPeriodBtn: {
  flex: 1,
  paddingVertical: 10,
  alignItems: 'center',
  borderRadius: 8,
},
overviewPeriodBtnActive: {
  backgroundColor: '#A68C7B',
},
overviewPeriodText: {
  fontSize: 14,
  color: '#666',
  fontWeight: '500',
},
overviewPeriodTextActive: {
  color: '#fff',
  fontWeight: '600',
},


  // Products Tab

  productsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  productViewTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  productViewTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  productViewTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  productViewTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
  productViewTabTextActive: {
    color: '#A68C7B',
  },

  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A68C7B',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  addProductBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 16,
  },
  productsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A68C7B',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#A68C7B',
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productMedium: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
  },
  productDimensions: {
    fontSize: 12,
    color: '#999',
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  
  productBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  
  conditionExcellent: {
    backgroundColor: '#E8F5E9',
  },
  
  conditionGood: {
    backgroundColor: '#FFF9C4',
  },
  
  conditionFair: {
    backgroundColor: '#FFE0B2',
  },
  
  conditionPoor: {
    backgroundColor: '#FFCDD2',
  },
  
  conditionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  
  productStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  
  productStatusActive: {
    backgroundColor: '#E3F2FD',
  },
  
  productStatusPending: {
    backgroundColor: '#FFF3E0',
  },
  
  productStatusInactive: {
    backgroundColor: '#F5F5F5',
  },
  
  productStatusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  

  auctionsSection: {
    marginTop: 8,
  },
  auctionTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  auctionTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  auctionTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  auctionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
  auctionTabTextActive: {
    color: '#A68C7B',
  },
  auctionStatusFiltersContainer: {
    marginBottom: 12,
  },
  auctionFiltersScrollView: {
    marginBottom: 8,
  },
  auctionStatusFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  auctionStatusFilterBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  auctionStatusFilterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  auctionStatusFilterTextActive: {
    color: '#fff',
  },
  auctionRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  auctionRefreshBtnText: {
    marginLeft: 6,
    color: '#A68C7B',
    fontWeight: '600',
    fontSize: 12,
  },
  auctionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0E6DC',
  },
  auctionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  auctionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  auctionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  auctionCardSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  auctionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    marginTop: 4,
    marginBottom: 4,
  },
  auctionMetaItem: {
    flex: 1,
    paddingVertical: 2,
  },
  auctionMetaLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  auctionMetaValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  auctionMetaDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#EEE',
  },
  auctionItemImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  auctionActivateBtn: {
    marginTop: 10,
    backgroundColor: '#A68C7B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  auctionActivateBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productStock: {
    fontSize: 13,
    color: '#666',
  },
  lowStock: {
    color: '#F44336',
    fontWeight: '600',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
  },
  productActions: {
    justifyContent: 'center',
    gap: 10,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  ordersContainer: {
    padding: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  filterBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusToShip: {
    backgroundColor: '#FFF3E0',
  },
  statusProcessing: {
    backgroundColor: '#E3F2FD',
  },
  statusShipping: {
    backgroundColor: '#E8F5E9',
  },
  statusCompleted: {
    backgroundColor: '#F1F8E9',
  },

  statusCancelled: {
    backgroundColor: '#FFEBEE',
  },
  statusPending: {
    backgroundColor: '#F5F5F5',
  },
  statusScheduled: {
    backgroundColor: '#EDE7F6',
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusEnded: {
    backgroundColor: '#FBE9E7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  orderItemsContainer: {
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    gap: 12,
  },
  
  orderItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#e8e8e8',
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,

  },
  orderItemQty: {
    fontSize: 13,
    color: '#666',
  },
  trackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  trackingText: {
    fontSize: 13,
    color: '#666',
  },
  orderButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  processingBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  processingBtnText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '600',
  },
  shipBtn: {
    flex: 1,
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',

  },
  shipBtnFull: {
    flex: 0,
    marginTop: 12,
  },
  shipBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  waitingContainer: {
    backgroundColor: '#FFF5EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  waitingText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '600',
  },
  completedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelledContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  cancelledText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '70%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalBodyScroll: {
    flexGrow: 1,
  },
  orderInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    marginTop: -8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A68C7B',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#A68C7B',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  imagePickerScrollView: {
    marginBottom: 16,
    paddingTop: 10,
  },
  imagePreviewItem: {
    marginRight: 10,
    position: 'relative',
    paddingTop: 10,
    paddingRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 13,
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#A68C7B',
    marginTop: 4,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  
  dropdownBtnText: {
    fontSize: 15,
    color: '#999',
  },
  
  dropdownBtnTextSelected: {
    fontSize: 15,
    color: '#333',
  },
  
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  
  submitBtn: {
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  
  submitBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  orderSummaryBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: -8,
    marginBottom: 12,
  },
  
  trackingTips: {
    backgroundColor: '#FFF5EB',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  
  tipsHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 12,
  },
  
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  
  payoutsContainer: {
    flex: 1,
    padding: 16,
  },
  
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  balanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 12,
  },
  
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  
  pendingText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  
  minimumText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  
  withdrawBtn: {
    flexDirection: 'row',
    backgroundColor: '#A68C7B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  
  withdrawBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  
  withdrawBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  setupPaymentBtn: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  
  setupPaymentBtnText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '600',
  },
  
  earningsBreakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  
  breakdownValueRed: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  
  breakdownDivider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 8,
  },
  
  breakdownLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  
  breakdownValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  
  payoutStatsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e8e8e8',
  },
  
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  infoContent: {
    flex: 1,
  },
  
  infoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  
  infoItemText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  
  myProductTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  
  addProductBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A68C7B',
  },
  
  addProductBtnHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
    marginLeft: 6,
  },
  
  returnsContainer: {
    padding: 16,
  },
  
  returnCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  
  returnHeaderLeft: { flex: 1 },
  
  returnId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  
  returnStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  
  returnStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  
  returnStatusPending: { backgroundColor: '#FF9800' },
  returnStatusApproved: { backgroundColor: '#4CAF50' },
  returnStatusRejected: { backgroundColor: '#F44336' },
  returnStatusCompleted: { backgroundColor: '#2196F3' },
  returnStatusRefunded: { backgroundColor: '#2196F3' },
  returnStatusDisputed: { backgroundColor: '#FF9800' },
  
  returnAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  
  returnDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  
  returnItemContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  
  returnItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  
  returnItemDetails: { flex: 1 },
  
  returnItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  
  returnItemQty: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  
  returnReasonContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  
  returnReason: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  
  returnDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  customerText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  
  returnActionsContainer: { marginTop: 8 },
  
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A68C7B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
  },
  

  viewDetailsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  approvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  
  approvedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  rejectedContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  
  rejectedText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
    marginBottom: 4,
  },
  
  rejectionReason: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  
  disputedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  
  disputedText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  returnSummaryBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 8,
  },
  
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  
  detailDescription: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  
  evidenceImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  
  conversationSection: {
    marginBottom: 20,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  
  conversationContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    maxHeight: 200,
    minHeight: 120,
  },

  conversationItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageSender: {
    fontSize: 12,
    color: '#4b5563',
    marginLeft: 8,
    fontWeight: '500',
  },
  messageSenderAdmin: {
    color: '#9c7c3c',
  },
  adminBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noMessagesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    height: 40,
  },
  sendButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  modalActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },

  modalRejectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  
  modalRejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  
  modalApproveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  modalApproveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  

  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },

  // Modal Footer Styles
  modalFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',

    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: '#A68C7B',
  },
  modalBtnSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBtnSecondaryText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceContainer: {
    padding: 16,
    gap: 16,
  },
  choiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  choiceCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  choiceCardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  itemCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemCardImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
  },
  itemCardContent: {
    padding: 12,
  },
  itemCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemCardMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#c62828',
    borderWidth: 1,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  datePickerText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  datePickerPlaceholder: {
    color: '#999',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#666',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A68C7B',
  },
  footerContent: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  footerText: {
    fontSize: 14,
    color: '#F57C00',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 30,
  },
  evidenceViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenceViewerBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenceFullscreenImage: {
    width: '100%',
    height: '80%',
  },
  evidenceViewerClose: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  auctionCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  auctionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5EB',
    borderColor: '#A68C7B',
    gap: 6,
  },
  auctionActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
  },
  // Settings Tab Styles
  settingsTabContainer: {
    padding: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  settingsDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  settingsValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 12,
  },
  settingsButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Shipping Preferences Styles
  courierSection: {
    marginBottom: 20,
  },
  courierLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  checkboxGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

