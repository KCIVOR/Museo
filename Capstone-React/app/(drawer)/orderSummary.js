import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, RefreshControl, Linking, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabase/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AndroidFooterSpacer from '../components/Footer';
import AddAddressModal from '../components/AddAddressModal';
import EditAddressModal from '../components/EditAddressModal';

const API_BASE = "http://192.168.18.79:3000/api";

const OrderSummaryScreen = () => {
  const router = useRouter();
  const { userData } = useUser();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  // Payment method removed - Xendit handles this during payment
  const [selectedShipping, setSelectedShipping] = useState('jnt-standard');
  const [orderNotes, setOrderNotes] = useState('None');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedCourierBrand, setSelectedCourierBrand] = useState('J&T Express');
  const [availableShippingOptions, setAvailableShippingOptions] = useState([]);
  
  // P2P Migration: Direct purchase support
  const isDirectPurchase = params.directPurchase === 'true';
  const directMarketItemId = params.marketItemId;
  const directQuantity = parseInt(params.quantity) || 1;
  
  console.log('OrderSummary params:', params);
  console.log('Direct purchase mode:', { isDirectPurchase, directMarketItemId, directQuantity });

  // Fetch cart
  const fetchCart = async (at, rt) => {
    try {
      const response = await fetch(`${API_BASE}/marketplace/cart`, {
        method: 'GET',
        credentials: 'include',
        headers: { 
          Cookie: `access_token=${at || ''}; refresh_token=${rt || ''}`,
          'Authorization': `Bearer ${at || ''}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        if (!result.data.items || result.data.items.length === 0) {
          // Silently redirect to marketplace if cart is empty
          setCartItems([]);
          router.replace('/(drawer)/marketplace');
          return;
        }
        
        const transformedCart = result.data.items.map(item => ({
          id: item.cartItemId,
          cartItemId: item.cartItemId,
          quantity: item.quantity,
          marketItemId: item.marketplace_items?.marketItemId,
          title: item.marketplace_items?.title || 'Unknown Item',
          price: item.marketplace_items?.price || 0,
          primary_image: item.marketplace_items?.images?.[0] || null,
          artist: item.marketplace_items?.sellerProfiles?.shopName || 'Unknown',
          sellerProfiles: item.marketplace_items?.sellerProfiles, // Include full seller profile with shipping preferences
        }));
        console.log('Transformed cart items:', transformedCart);
        setCartItems(transformedCart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  // Hardware back: always go back to Marketplace (consistent with My Orders / Seller Dashboard)
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        try { router.replace('/(drawer)/marketplace'); } catch {}
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => { try { sub.remove(); } catch {} };
    }, [router])
  );

  // P2P Migration: Fetch single marketplace item for direct purchase (matches web version)
  const fetchDirectPurchaseItem = async (at, rt, marketItemId, quantity) => {
    console.log('fetchDirectPurchaseItem called with:', { marketItemId, quantity });
    
    try {
      // Use specific item endpoint like web version
      const response = await fetch(`${API_BASE}/marketplace/items/${marketItemId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 
          Cookie: `access_token=${at || ''}; refresh_token=${rt || ''}`,
          'Authorization': `Bearer ${at || ''}`,
        },
      });

      const result = await response.json();
      console.log('API Response for item:', response.status, result);
      
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Item not found');
      }
      
      const item = result.data;
      console.log('Fetched specific item:', {
        marketItemId,
        title: item.title,
        price: item.price,
        seller: item.sellerProfiles?.shopName
      });
      
      // Transform single item to cart format (match web version structure)
      const cartItem = {
        id: marketItemId,
        cartItemId: `direct_${marketItemId}`,
        quantity: Number(quantity) || 1,
        marketItemId: marketItemId,
        title: item.title || 'Unknown Item',
        price: item.price || 0,
        primary_image: item.images?.[0] || item.primary_image || null,
        artist: item.sellerProfiles?.shopName || 'Unknown Artist',
        sellerProfileId: item.sellerProfileId,
        sellerProfiles: item.sellerProfiles // Include full seller profile with shipping preferences
      };
      
      console.log('Created cart item:', cartItem);
      console.log('Seller preferences in item:', item.sellerProfiles?.shippingPreferences);
      setCartItems([cartItem]);
    } catch (error) {
      console.error('Error fetching direct purchase item:', error);
      Alert.alert('Error', 'Failed to load item details');
      router.replace('/(drawer)/marketplace');
    }
  };

  // Fetch addresses
  const fetchAddresses = async (at, rt) => {
    try {
      const response = await fetch(`${API_BASE}/marketplace/addresses`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}`,
        },
      });

      const result = await response.json();
      if (!response.ok || !result?.success) return;
      
      const list = result?.data || [];
      setAddresses(list);
      const def = list.find(a => a.isDefault);
      if (def) setSelectedAddress(def.userAddressId);
      else if (list.length) setSelectedAddress(list[0].userAddressId);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleAddressAdded = async () => {
    await fetchAddresses(accessToken, refreshToken);
  };

  // Filter shipping options based on seller's preferences (from item data)
  const filterShippingOptions = (item) => {
    try {
      if (!item) {
        console.log('No item provided, using all options');
        setAvailableShippingOptions([]);
        return;
      }

      // Get seller preferences directly from item data (matching web version)
      const prefsContainer = Array.isArray(item?.sellerProfiles) ? item?.sellerProfiles[0] : item?.sellerProfiles;
      const prefs = prefsContainer?.shippingPreferences;
      
      console.log('Item data:', item);
      console.log('Seller profiles container:', prefsContainer);
      console.log('Seller preferences:', prefs);

      const shippingOptions = [
        { id: 'jnt-standard', courier: 'J&T Express', courierService: 'standard', name: 'J&T Express — Standard', description: '5–7 business days', price: 100 },
        { id: 'jnt-express', courier: 'J&T Express', courierService: 'express', name: 'J&T Express — Express', description: '2–3 business days', price: 180 },
        { id: 'lbc-standard', courier: 'LBC', courierService: 'standard', name: 'LBC — Standard', description: '4–6 business days', price: 120 },
        { id: 'lbc-express', courier: 'LBC', courierService: 'express', name: 'LBC — Express', description: '2–3 business days', price: 250 }
      ];

      // Filter based on seller preferences if available
      let filteredOpts = shippingOptions;
      
      if (prefs && prefs.couriers) {
        filteredOpts = shippingOptions.filter(opt => {
          const courierBrand = opt.courier;
          const svc = opt.courierService;
          const isEnabled = prefs.couriers?.[courierBrand]?.[svc] === true;
          console.log(`Checking ${courierBrand} ${svc}: ${isEnabled}`);
          return isEnabled;
        });
        console.log('Preferences found - filtered options:', filteredOpts);
      } else {
        console.log('No preferences found - using all options');
      }

      setAvailableShippingOptions(filteredOpts);
    } catch (error) {
      console.error('Error filtering shipping options:', error);
      setAvailableShippingOptions([]);
    }
  };

  const openEditAddressForm = (addr) => {
    if (!addr) return;
    setEditingAddress(addr);
    setShowEditAddressModal(true);
  };

  const handleAddressUpdated = async () => {
    await fetchAddresses(accessToken, refreshToken);
    setShowEditAddressModal(false);
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

              await fetchAddresses(accessToken, refreshToken);
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const init = async () => {
      console.log('OrderSummary useEffect init called');
      console.log('userData:', userData);
      console.log('Direct purchase check:', { isDirectPurchase, directMarketItemId, directQuantity });
      
      if (!userData) {
        Alert.alert('Login Required', 'Please login to checkout');
        router.push('/');
        return;
      }
      
      try {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        console.log('Session tokens:', { at: !!at, rt: !!rt });
        
        setAccessToken(at);
        setRefreshToken(rt);
        setLoading(true);
        
        // P2P Migration: Handle direct purchase vs cart-based checkout
        if (isDirectPurchase && directMarketItemId) {
          console.log('Direct purchase mode - fetching item:', directMarketItemId);
          await fetchDirectPurchaseItem(at, rt, directMarketItemId, directQuantity);
          await fetchAddresses(at, rt);
        } else {
          console.log('Cart mode - fetching cart');
          await fetchCart(at, rt);
          await fetchAddresses(at, rt);
        }
      } catch (error) {
        console.error('Error in init:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userData, isDirectPurchase, directMarketItemId, directQuantity]);

  // Filter shipping options when cart items change
  useEffect(() => {
    if (cartItems.length > 0) {
      filterShippingOptions(cartItems[0]);
    }
  }, [cartItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // P2P Migration: Handle direct purchase vs cart-based checkout
      if (isDirectPurchase && directMarketItemId) {
        await fetchDirectPurchaseItem(accessToken, refreshToken, directMarketItemId, directQuantity);
        await fetchAddresses(accessToken, refreshToken);
      } else {
        await fetchCart(accessToken, refreshToken);
        await fetchAddresses(accessToken, refreshToken);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Shipping options (courier-branded, matching web version)
  const allShippingOptions = [
    { id: 'jnt-standard', courier: 'J&T Express', courierService: 'standard', name: 'J&T Express — Standard', description: '5–7 business days', price: 100 },
    { id: 'jnt-express', courier: 'J&T Express', courierService: 'express', name: 'J&T Express — Express', description: '2–3 business days', price: 180 },
    { id: 'lbc-standard', courier: 'LBC', courierService: 'standard', name: 'LBC — Standard', description: '4–6 business days', price: 120 },
    { id: 'lbc-express', courier: 'LBC', courierService: 'express', name: 'LBC — Express', description: '2–3 business days', price: 250 }
  ];

  // Use filtered options if available, otherwise use all options
  const effectiveShippingOptions = availableShippingOptions.length > 0 ? availableShippingOptions : allShippingOptions;

  const getSubtotal = useMemo(() => () => cartItems.reduce((t, i) => t + (Number(i.price || 0) * Number(i.quantity || 0)), 0), [cartItems]);
  
  const getShippingCost = useMemo(() => () => {
    const option = effectiveShippingOptions.find(opt => opt.id === selectedShipping);
    return option ? option.price : 0;
  }, [selectedShipping, effectiveShippingOptions]);
  
  const getTotal = useMemo(() => () => getSubtotal() + getShippingCost(), [getSubtotal, getShippingCost]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Missing address', 'Please select a delivery address');
      return;
    }
    
    if (!cartItems || cartItems.length === 0) {
      Alert.alert('No items', 'No items found to place order');
      return;
    }
    
    try {
      setLoading(true);
      const address = addresses.find(a => a.userAddressId === selectedAddress);
      
      // Match web version order data structure exactly
      const item = cartItems[0]; // For direct purchase, we only have one item
      const shippingFee = getShippingCost();
      const shippingMethod = effectiveShippingOptions.find(opt => opt.id === selectedShipping);
      
      const orderData = {
        marketItemId: item.marketItemId,
        quantity: item.quantity,
        shippingFee,
        shippingMethod: shippingMethod?.courierService || 'standard',
        courier: shippingMethod?.courier || null,
        courierService: shippingMethod?.courierService || null,
        orderNotes: orderNotes || 'None',
        shippingAddress: {
          fullName: address?.fullName,
          phone: address?.phoneNumber || address?.phone,
          addressLine1: address?.addressLine1 || address?.street,
          addressLine2: address?.addressLine2 || '',
          barangayName: address?.barangayName || address?.barangay,
          cityMunicipalityName: address?.cityMunicipalityName || address?.city,
          provinceName: address?.provinceName || address?.province,
          postalCode: address?.postalCode,
          landmark: address?.landmark || ''
        },
        contactInfo: {
          name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
          email: userData?.email || '',
          phone: address?.phoneNumber || address?.phone || ''
        }
      };

      console.log('Order data being sent:', JSON.stringify(orderData, null, 2));
      console.log('Cart items:', cartItems);
      console.log('Is direct purchase:', isDirectPurchase);

      const response = await fetch(`${API_BASE}/marketplace/orders/buy-now`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken || ''}; refresh_token=${refreshToken || ''}`,
        },
        body: JSON.stringify(orderData),
      });
      
      const result = await response.json();
      console.log('API Response:', response.status, result);
      
      if (!response.ok || result.success === false) {
        console.error('Order creation failed:', result);
        throw new Error(result?.error || result?.message || `Failed to create order (${response.status})`);
      }
      
      // Match web version response handling
      const checkoutUrl = result?.data?.checkoutUrl || result?.checkoutUrl;
      
      if (!checkoutUrl) {
        throw new Error('No checkout URL returned');
      }
      
      // Open Xendit payment page and navigate to orders
      Alert.alert(
        'Order Created',
        'Order created successfully! Please complete payment in the browser.',
        [
          {
            text: 'Open Payment',
            onPress: async () => {
              try {
                await Linking.openURL(checkoutUrl);
                router.push('/(drawer)/myOrders');
              } catch (e) {
                console.error('Failed to open payment URL:', e);
                Alert.alert('Error', 'Failed to open payment page');
              }
            }
          },
          {
            text: 'Later',
            onPress: () => router.push('/(drawer)/myOrders'),
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', error?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Custom Header */}
        <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 56 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.replace('/(drawer)/marketplace')}
              hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
              activeOpacity={0.6}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Checkout</Text>
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 56 }] }>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/(drawer)/marketplace')}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
            activeOpacity={0.6}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#A68C7B"]} tintColor="#A68C7B" />
        }
      >
        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({cartItems.length})</Text>
          {cartItems.map(item => (
            <View key={item.cartItemId} style={styles.cartItem}>
              <Image 
                source={item.primary_image ? { uri: item.primary_image } : require('../../assets/pic1.jpg')}
                style={styles.itemImage}
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.itemSeller}>by {item.sellerName}</Text>
                <Text style={styles.itemPrice}>₱{item.price} × {item.quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>₱{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {addresses.length === 0 ? (
            <TouchableOpacity style={styles.addAddressBtn} onPress={() => setShowAddAddress(true)}>
              <Ionicons name="add-circle-outline" size={24} color="#A68C7B" />
              <Text style={styles.addAddressText}>Add Delivery Address</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.addMoreAddressBtn} onPress={() => setShowAddAddress(true)}>
                <Ionicons name="add-circle-outline" size={20} color="#A68C7B" />
                <Text style={styles.addMoreAddressText}>Add New Address</Text>
              </TouchableOpacity>
              {addresses.map(addr => (
                <View
                  key={addr.userAddressId}
                  style={{ position: 'relative', marginBottom: 12 }}
                >
                  <TouchableOpacity
                    style={[styles.addressCard, selectedAddress === addr.userAddressId && styles.addressCardSelected]}
                    onPress={() => setSelectedAddress(addr.userAddressId)}
                  >
                    <View style={styles.addressRadio}>
                      {selectedAddress === addr.userAddressId && <View style={styles.addressRadioSelected} />}
                    </View>
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressName}>{addr.fullName}</Text>
                      <Text style={styles.addressText}>{addr.addressLine1}</Text>
                      <Text style={styles.addressText}>{addr.barangayName}, {addr.cityMunicipalityName}</Text>
                      <Text style={styles.addressText}>{addr.phoneNumber}</Text>
                    </View>
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
              ))}
            </>
          )}
        </View>

        {/* Shipping Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Method</Text>
          {['J&T Express', 'LBC'].map(brand => {
            const brandOptions = effectiveShippingOptions.filter(opt => opt.courier === brand);
            // Skip brands with no available options
            if (brandOptions.length === 0) return null;
            const isBrandSelected = selectedCourierBrand === brand;
            const currentOption = brandOptions.find(o => o.id === selectedShipping) || brandOptions[0];
            
            return (
              <TouchableOpacity
                key={brand}
                style={[styles.optionCard, isBrandSelected && styles.optionCardSelected]}
                onPress={() => {
                  setSelectedCourierBrand(brand);
                  setSelectedShipping(brandOptions[0].id);
                }}
              >
                <View style={styles.optionRadio}>
                  {isBrandSelected && <View style={styles.optionRadioSelected} />}
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{brand}</Text>
                  {isBrandSelected && (
                    <View style={styles.serviceSelector}>
                      <Text style={styles.serviceLabel}>Service:</Text>
                      {brandOptions.map(opt => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.serviceOption, selectedShipping === opt.id && styles.serviceOptionSelected]}
                          onPress={() => setSelectedShipping(opt.id)}
                        >
                          <Text style={[styles.serviceText, selectedShipping === opt.id && styles.serviceTextSelected]}>
                            {opt.courierService.charAt(0).toUpperCase() + opt.courierService.slice(1)} — ₱{opt.price}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {!isBrandSelected && (
                    <Text style={styles.optionDesc}>{currentOption?.description}</Text>
                  )}
                </View>
                <Text style={styles.optionPrice}>₱{currentOption?.price}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payment Method Section Removed - Xendit handles payment method selection */}

        {/* Order Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add special instructions..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={orderNotes}
            onChangeText={setOrderNotes}
          />
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>₱{getSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping:</Text>
            <Text style={styles.summaryValue}>₱{getShippingCost().toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>₱{getTotal().toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, processing && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
      {/* Add Address Modal */}
      <AddAddressModal
        visible={showAddAddress}
        onClose={() => setShowAddAddress(false)}
        onAddressAdded={handleAddressAdded}
        userData={userData}
        accessToken={accessToken}
        refreshToken={refreshToken}
      />
      {/* Edit Address Modal */}
      <EditAddressModal
        visible={showEditAddressModal}
        onClose={() => setShowEditAddressModal(false)}
        address={editingAddress}
        userData={userData}
        accessToken={accessToken}
        refreshToken={refreshToken}
        onAddressUpdated={handleAddressUpdated}
      />
      <AndroidFooterSpacer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FA',
  },
  
  // Custom Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    paddingBottom: 10,
    backgroundColor: '#fff',
    height: 60,
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D8',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#E8E0D8',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 4,
  },
  itemSeller: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 12,
    color: '#A68C7B',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1810',
    marginLeft: 8,
  },
  addressCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    marginBottom: 12,
  },
  addressCardSelected: {
    borderColor: '#A68C7B',
    backgroundColor: '#FFF8F3',
  },
  addressRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#A68C7B',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#A68C7B',
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  addressActionsRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: 14,
    color: '#A68C7B',
    marginLeft: 8,
    fontWeight: '600',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: '#A68C7B',
    backgroundColor: '#FFF8F3',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#A68C7B',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#A68C7B',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#666',
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A68C7B',
  },
  cardFormContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E8E0D8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C1810',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1810',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1810',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#A68C7B',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
  },
  placeOrderBtn: {
    backgroundColor: '#A68C7B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  addMoreAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A68C7B',
    marginBottom: 12,
  },
  addMoreAddressText: {
    fontSize: 14,
    color: '#A68C7B',
    marginLeft: 8,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1810',
  },
  sectionTitleModal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1810',
    marginTop: 16,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E8E0D8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C1810',
    backgroundColor: '#fff',
  },
  formRowModal: {
    flexDirection: 'row',
  },
  selectGroup: {
    marginBottom: 16,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#E8E0D8',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  selectTriggerText: {
    fontSize: 14,
    color: '#2C1810',
    flex: 1,
  },
  selectItem: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
  },
  selectItemActive: {
    backgroundColor: '#FFF8F3',
  },
  selectItemText: {
    fontSize: 14,
    color: '#2C1810',
  },
  typeChip: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  typeChipActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  typeChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  textareaModal: {
    borderWidth: 1,
    borderColor: '#E8E0D8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C1810',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 16,
  },
  cancelBtn: {
    backgroundColor: '#666',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveAddressBtn: {
    backgroundColor: '#A68C7B',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveAddressBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  serviceSelector: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  serviceOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  serviceOptionSelected: {
    borderColor: '#A68C7B',
    backgroundColor: '#FFF8F3',
  },
  serviceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  serviceTextSelected: {
    color: '#A68C7B',
    fontWeight: '600',
  },
});

export default OrderSummaryScreen;
