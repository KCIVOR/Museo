import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabase/supabaseClient';
import EditAuctionItemModal from './EditAuctionItemModal';

const API_BASE = "http://192.168.18.79:3000/api";

const styles = StyleSheet.create({
  stepSubtitle: {
    fontSize: 14,
    color: '#7A6A58',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  productItemContainer: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#f8f9fa',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfoContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A68C7B',
    marginBottom: 8,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockText: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
    fontWeight: '500',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lowStockText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 4,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  selectButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default function AddAuctionProduct({
  visible,
  onClose,
  onSuccess,
  styles: externalStyles
}) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const [auctionStep, setAuctionStep] = useState(0);
  const [auctionItemChoice, setAuctionItemChoice] = useState(null);
  const [existingAuctionItems, setExistingAuctionItems] = useState([]);
  const [loadingAuctionItems, setLoadingAuctionItems] = useState(false);
  const [auctionItemId, setAuctionItemId] = useState(null);
  const [auctionFormData, setAuctionFormData] = useState({
    title: '',
    description: '',
    medium: '',
    dimensions: '',
    year_created: '',
    weight_kg: '',
    is_original: true,
    is_framed: false,
    condition: 'excellent',
    categories: '',
    tags: '',
    startPrice: '',
    reservePrice: '',
    minIncrement: '',
    startAt: '',
    endAt: ''
  });
  const [auctionImages, setAuctionImages] = useState([]);
  const [auctionErrors, setAuctionErrors] = useState({});
  const [isSubmittingAuction, setIsSubmittingAuction] = useState(false);
  const [showAuctionConditionDropdown, setShowAuctionConditionDropdown] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isStartDatePickerVisible, setStartDatePickerVisibility] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Scroll to top when auction step changes
  useEffect(() => {
    if (scrollViewRef.current && auctionStep > 0) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [auctionStep]);

  const fetchExistingAuctionItems = async () => {
    try { 
      setLoadingAuctionItems(true);
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
        setExistingAuctionItems(result.data || []);
      } else {
        setExistingAuctionItems([]);
      }
    } catch (error) {
      console.error('Error fetching auction items:', error);
      setExistingAuctionItems([]);
    } finally {
      setLoadingAuctionItems(false);
    }
  };

  const handleAuctionChoiceSelect = (choice) => {
    setAuctionItemChoice(choice);
    if (choice === 'existing') {
      fetchExistingAuctionItems();
    }
    setAuctionStep(1);
  };

  const handleSelectExistingAuctionItem = (item) => {
    setAuctionItemId(item.auctionItemId);
    setAuctionStep(2);
  };

  const handleEditItem = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteItem = async (itemId, e) => {
    e.stopPropagation();
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
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
              const response = await fetch(`${API_BASE}/auctions/items/${itemId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  Authorization: `Bearer ${at}`,
                },
              });
              const result = await response.json();
              if (response.ok && result.success) {
                setExistingAuctionItems(existingAuctionItems.filter(item => item.auctionItemId !== itemId));
                Alert.alert('Success', 'Item deleted successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const handleEditSuccess = (updatedItem) => {
    // Update the item in the list
    setExistingAuctionItems(existingAuctionItems.map(item =>
      item.auctionItemId === updatedItem.auctionItemId ? updatedItem : item
    ));
    setIsEditModalOpen(false);
  };

  const pickAuctionImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setAuctionImages(result.assets);
    }
  };

  const removeAuctionImage = (index) => {
    setAuctionImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateAuctionStep1 = () => {
    const newErrors = {};
    if (!auctionFormData.title.trim() || auctionFormData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!auctionFormData.medium.trim()) {
      newErrors.medium = 'Medium is required';
    }
    if (!auctionFormData.dimensions.trim()) {
      newErrors.dimensions = 'Dimensions are required';
    }
    if (!auctionFormData.categories.trim()) {
      newErrors.categories = 'At least one category is required';
    }
    if (auctionImages.length === 0) {
      newErrors.images = 'Upload at least one image';
    }
    setAuctionErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAuctionStep2 = () => {
    const newErrors = {};
    if (!auctionFormData.startPrice || parseFloat(auctionFormData.startPrice) <= 0) {
      newErrors.startPrice = 'Valid starting price required';
    }
    if (!auctionFormData.reservePrice || parseFloat(auctionFormData.reservePrice) <= 0) {
      newErrors.reservePrice = 'Valid reserve price required';
    }
    if (auctionFormData.reservePrice && auctionFormData.startPrice &&
      parseFloat(auctionFormData.reservePrice) < parseFloat(auctionFormData.startPrice)) {
      newErrors.reservePrice = 'Reserve price must be ≥ starting price';
    }
    if (!auctionFormData.minIncrement || parseFloat(auctionFormData.minIncrement) < 0) {
      newErrors.minIncrement = 'Minimum increment required';
    }
    if (!auctionFormData.startAt) {
      newErrors.startAt = 'Start time required';
    }
    if (!auctionFormData.endAt) {
      newErrors.endAt = 'End time required';
    }
    if (auctionFormData.endAt && auctionFormData.startAt &&
      new Date(auctionFormData.endAt) <= new Date(auctionFormData.startAt)) {
      newErrors.endAt = 'End time must be after start time';
    }
    setAuctionErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitAuctionStep1 = async () => {
    if (!validateAuctionStep1()) return;
    setIsSubmittingAuction(true);
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      const formData = new FormData();
      formData.append('title', auctionFormData.title.trim());
      formData.append('description', auctionFormData.description.trim());
      formData.append('medium', auctionFormData.medium.trim());
      formData.append('dimensions', auctionFormData.dimensions.trim());
      formData.append('year_created', auctionFormData.year_created || '');
      formData.append('weight_kg', auctionFormData.weight_kg || '');
      formData.append('is_original', auctionFormData.is_original.toString());
      formData.append('is_framed', auctionFormData.is_framed.toString());
      formData.append('condition', auctionFormData.condition);
      const categories = auctionFormData.categories.split(',').map(c => c.trim()).filter(c => c);
      const tags = auctionFormData.tags.split(',').map(t => t.trim()).filter(t => t);
      formData.append('categories', JSON.stringify(categories));
      formData.append('tags', JSON.stringify(tags));
      auctionImages.forEach((image) => {
        const filename = image.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('images', {
          uri: Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri,
          name: filename || 'image.jpg',
          type: type
        });
      });
      const response = await fetch(`${API_BASE}/auctions/items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
        body: formData
      });
      const result = await response.json();
      if (response.ok && result.success && result.data?.auctionItemId) {
        setAuctionItemId(result.data.auctionItemId);
        setAuctionStep(2);
        setAuctionErrors({});
      } else {
        setAuctionErrors({ submit: result.error || 'Failed to create auction item' });
      }
    } catch (error) {
      console.error('Error creating auction item:', error);
      setAuctionErrors({ submit: 'An error occurred while creating the auction item' });
    } finally {
      setIsSubmittingAuction(false);
    }
  };

  const localToISO = (localDatetimeString) => {
    if (!localDatetimeString) return null;
    try {
      const dt = new Date(localDatetimeString);
      if (isNaN(dt.getTime())) return null;
      return dt.toISOString();
    } catch (e) {
      console.error('Error converting date to ISO:', e);
      return null;
    }
  };

  const submitAuctionStep2 = async () => {
    if (!validateAuctionStep2()) return;
    setIsSubmittingAuction(true);
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      const startAtISO = localToISO(auctionFormData.startAt);
      const endAtISO = localToISO(auctionFormData.endAt);
      const auctionData = {
        auctionItemId,
        startPrice: parseFloat(auctionFormData.startPrice),
        reservePrice: parseFloat(auctionFormData.reservePrice),
        minIncrement: parseFloat(auctionFormData.minIncrement),
        startAt: startAtISO,
        endAt: endAtISO
      };
      const response = await fetch(`${API_BASE}/auctions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
        body: JSON.stringify(auctionData)
      });
      const result = await response.json();
      if (response.ok && result.success) {
        Alert.alert('Success', result.message || 'Auction created successfully!');
        handleCloseAuctionModal();
        if (onSuccess) onSuccess();
      } else {
        setAuctionErrors({ submit: result.error || 'Failed to create auction' });
      }
    } catch (error) {
      console.error('Error creating auction:', error);
      setAuctionErrors({ submit: 'An error occurred while creating the auction' });
    } finally {
      setIsSubmittingAuction(false);
    }
  };

  const handleCloseAuctionModal = () => {
    setAuctionStep(0);
    setAuctionItemChoice(null);
    setAuctionItemId(null);
    setAuctionFormData({
      title: '',
      description: '',
      medium: '',
      dimensions: '',
      year_created: '',
      weight_kg: '',
      is_original: true,
      is_framed: false,
      condition: 'excellent',
      categories: '',
      tags: '',
      startPrice: '',
      reservePrice: '',
      minIncrement: '',
      startAt: '',
      endAt: ''
    });
    setAuctionImages([]);
    setAuctionErrors({});
    setExistingAuctionItems([]);
    setShowAuctionConditionDropdown(false);
    onClose();
  };

  const handleStartDateConfirm = (date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
      setAuctionFormData(prev => ({ ...prev, startAt: formatted }));
      setStartDatePickerVisibility(false);
    } catch (e) {
      console.error('Error formatting start date:', e);
      Alert.alert('Error', 'Invalid date selected');
      setStartDatePickerVisibility(false);
    }
  };

  const handleEndDateConfirm = (date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
      setAuctionFormData(prev => ({ ...prev, endAt: formatted }));
      setEndDatePickerVisibility(false);
    } catch (e) {
      console.error('Error formatting end date:', e);
      Alert.alert('Error', 'Invalid date selected');
      setEndDatePickerVisibility(false);
    }
  };

  if (!visible) return null;

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseAuctionModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={externalStyles.modalOverlay}
      >
        <View style={externalStyles.modalOverlayTouchable}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseAuctionModal}
          />
          <View
            style={externalStyles.modalContent}
          >
            <View style={externalStyles.modalHeader}>
              {auctionStep === 0 ? (
                <View style={{ flex: 1 }}>
                  <Text style={externalStyles.modalTitle}>Create Auction</Text>
                  <Text style={[styles.stepSubtitle, { marginTop: 4, marginBottom: 0, paddingHorizontal: 0 }]}>Choose how to create your auction</Text>
                </View>
              ) : auctionStep === 1 && auctionItemChoice === 'existing' ? (
                <View style={{ flex: 1 }}>
                  <Text style={externalStyles.modalTitle}>Add Auction - Step 1: Select Item</Text>
                  <Text style={[styles.stepSubtitle, { marginTop: 4, marginBottom: 0, paddingHorizontal: 0 }]}>Select an existing item</Text>
                </View>
              ) : auctionStep === 1 && auctionItemChoice === 'create' ? (
                <View style={{ flex: 1 }}>
                  <Text style={externalStyles.modalTitle}>Add Auction - Step 1: Item Details</Text>
                  <Text style={[styles.stepSubtitle, { marginTop: 4, marginBottom: 0, paddingHorizontal: 0 }]}>Describe your artwork</Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={externalStyles.modalTitle}>Add Auction - Step 2: Auction Settings</Text>
                  <Text style={[styles.stepSubtitle, { marginTop: 4, marginBottom: 0, paddingHorizontal: 0 }]}>Set auction parameters</Text>
                </View>
              )}
              <TouchableOpacity onPress={handleCloseAuctionModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={externalStyles.modalBody}
              contentContainerStyle={[externalStyles.modalBodyScroll, { paddingBottom: insets.bottom + 12 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              bounces={true}
              alwaysBounceVertical={false}
              scrollEventThrottle={16}
              decelerationRate="normal"
              directionalLockEnabled={false}
            >
              {auctionStep === 0 ? (
                <View style={[externalStyles.choiceContainer, { marginTop: -15 }]}>
                  <TouchableOpacity
                    style={externalStyles.choiceCard}
                    onPress={() => handleAuctionChoiceSelect('create')}
                  >
                    <Ionicons name="add-circle-outline" size={48} color="#A68C7B" />
                    <Text style={externalStyles.choiceCardTitle}>Create New Item</Text>
                    <Text style={externalStyles.choiceCardDescription}>
                      Upload images and describe a new artwork to auction
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={externalStyles.choiceCard}
                    onPress={() => handleAuctionChoiceSelect('existing')}
                  >
                    <Ionicons name="folder-outline" size={48} color="#A68C7B" />
                    <Text style={externalStyles.choiceCardTitle}>Use Existing Item</Text>
                    <Text style={externalStyles.choiceCardDescription}>
                      Select from your previously created items
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : auctionStep === 1 && auctionItemChoice === 'existing' ? (
                <View>
                  {loadingAuctionItems ? (
                    <View style={externalStyles.loadingContainer}>
                      <ActivityIndicator size="large" color="#A68C7B" />
                      <Text style={externalStyles.loadingText}>Loading your items...</Text>
                    </View>
                  ) : existingAuctionItems.length === 0 ? (
                    <View style={externalStyles.emptyStateContainer}>
                      <Text style={externalStyles.emptyStateText}>No items found. Create a new item instead.</Text>
                    </View>
                  ) : (
                    <>
                      <ScrollView 
                        style={{ flex: 1, paddingHorizontal: 16 }}
                        showsVerticalScrollIndicator={false}
                        overScrollMode="never"
                        decelerationRate="normal"
                        scrollEventThrottle={16}
                        contentContainerStyle={{ paddingBottom: 4 }}
                      >
                        {existingAuctionItems.map((item) => (
                          <View key={item.auctionItemId} style={styles.productItemContainer}>
                            <View style={{ flexDirection: 'row', flex: 1 }}>
                              <View style={styles.productImageContainer}>
                                <Image
                                  source={{ uri: item.primary_image || 'https://via.placeholder.com/150' }}
                                  style={styles.productImage}
                                  resizeMode="cover"
                                />
                              </View>
                              <View style={styles.productInfoContainer}>
                                <View>
                                  <Text style={styles.productTitle} numberOfLines={1}>
                                    {item.title}
                                  </Text>
                                  <Text style={[styles.productPrice, { marginBottom: 4 }]}>
                                    {item.medium}
                                  </Text>
                                  <Text style={[styles.productPrice, { marginBottom: 8 }]}>
                                    {item.dimensions}
                                  </Text>
                                </View>
                                <View style={styles.productActions}>
                                  <TouchableOpacity 
                                    style={[styles.actionButton, { backgroundColor: '#FFF5EB', borderColor: '#FFE0B2' }]}
                                    onPress={() => handleSelectExistingAuctionItem(item)}
                                  >
                                    <Ionicons name="checkmark" size={18} color="#A68C7B" />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={styles.actionButton}
                                    onPress={(e) => handleEditItem(item, e)}
                                  >
                                    <Ionicons name="create-outline" size={16} color="#A68C7B" />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={(e) => handleDeleteItem(item.auctionItemId, e)}
                                  >
                                    <Ionicons name="trash-outline" size={16} color="#F44336" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </>
                  )}
                  {auctionErrors.submit && (
                    <View style={externalStyles.errorContainer}>
                      <Text style={externalStyles.errorText}>{auctionErrors.submit}</Text>
                    </View>
                  )}
                </View>
              ) : auctionStep === 1 && auctionItemChoice === 'create' ? (
                <View>
                  <Text style={[externalStyles.sectionHeader, { marginTop: -4 }]}>Product Images</Text>
                  <Text style={externalStyles.hintText}>Support: JPG, PNG up to 10MB • Maximum 10 images • First image will be primary</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={externalStyles.imagePickerScrollView}
                    nestedScrollEnabled={true}
                    scrollEnabled={true}
                  >
                    {auctionImages.map((image, index) => (
                      <View key={index} style={externalStyles.imagePreviewItem}>
                        <Image source={{ uri: image.uri }} style={externalStyles.imagePreview} />
                        <TouchableOpacity
                          style={externalStyles.removeImageBtn}
                          onPress={() => removeAuctionImage(index)}
                        >
                          <Ionicons name="close-circle" size={26} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={externalStyles.imagePreviewItem}>
                      <TouchableOpacity
                        style={externalStyles.addPhotoBtn}
                        onPress={pickAuctionImages}
                      >
                        <Ionicons name="image-outline" size={32} color="#A68C7B" />
                        <Text style={externalStyles.addPhotoText}>Add Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                  {auctionErrors.images && (
                    <Text style={externalStyles.errorText}>{auctionErrors.images}</Text>
                  )}
                  <Text style={externalStyles.sectionHeader}>Basic Information</Text>
                  <Text style={externalStyles.inputLabel}>Product Title *</Text>
                  <TextInput
                    style={[externalStyles.input, auctionErrors.title && externalStyles.inputError]}
                    placeholder="e.g., Sunset Over Mountains"
                    value={auctionFormData.title}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, title: text }))}
                    returnKeyType="next"
                  />
                  {auctionErrors.title && (
                    <Text style={externalStyles.errorText}>{auctionErrors.title}</Text>
                  )}
                  <Text style={externalStyles.inputLabel}>Description</Text>
                  <TextInput
                    style={[externalStyles.input, externalStyles.textArea]}
                    placeholder="Describe your product in detail..."
                    value={auctionFormData.description}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={externalStyles.sectionHeader}>Product Details</Text>
                  <Text style={externalStyles.inputLabel}>Medium *</Text>
                  <TextInput
                    style={[externalStyles.input, auctionErrors.medium && externalStyles.inputError]}
                    placeholder="e.g., Oil on Canvas"
                    value={auctionFormData.medium}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, medium: text }))}
                    returnKeyType="next"
                  />
                  {auctionErrors.medium && (
                    <Text style={externalStyles.errorText}>{auctionErrors.medium}</Text>
                  )}
                  <Text style={externalStyles.inputLabel}>Dimensions *</Text>
                  <TextInput
                    style={[externalStyles.input, auctionErrors.dimensions && externalStyles.inputError]}
                    placeholder="e.g., 50x70 cm"
                    value={auctionFormData.dimensions}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, dimensions: text }))}
                    returnKeyType="next"
                  />
                  {auctionErrors.dimensions && (
                    <Text style={externalStyles.errorText}>{auctionErrors.dimensions}</Text>
                  )}
                  <Text style={externalStyles.inputLabel}>Year Created</Text>
                  <TextInput
                    style={externalStyles.input}
                    placeholder="e.g., 2024"
                    value={auctionFormData.year_created}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, year_created: text }))}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                  <Text style={externalStyles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={externalStyles.input}
                    placeholder="0.00"
                    value={auctionFormData.weight_kg}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, weight_kg: text }))}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                  <Text style={externalStyles.inputLabel}>Condition *</Text>
                  <TouchableOpacity
                    style={externalStyles.dropdownBtn}
                    onPress={() => setShowAuctionConditionDropdown(!showAuctionConditionDropdown)}
                  >
                    <Text style={externalStyles.dropdownBtnTextSelected}>
                      {auctionFormData.condition.charAt(0).toUpperCase() + auctionFormData.condition.slice(1)}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {showAuctionConditionDropdown && (
                    <View style={externalStyles.dropdownMenu}>
                      {[
                        { label: 'Excellent', value: 'excellent' },
                        { label: 'Good', value: 'good' },
                        { label: 'Fair', value: 'fair' },
                        { label: 'Poor', value: 'poor' }
                      ].map(item => (
                        <TouchableOpacity
                          key={item.value}
                          style={externalStyles.dropdownItem}
                          onPress={() => {
                            setAuctionFormData(prev => ({ ...prev, condition: item.value }));
                            setShowAuctionConditionDropdown(false);
                          }}
                        >
                          <Text style={externalStyles.dropdownItemText}>{item.label}</Text>
                          {auctionFormData.condition === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={externalStyles.checkboxContainer}
                    onPress={() => setAuctionFormData(prev => ({ ...prev, is_original: !prev.is_original }))}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <View style={[externalStyles.checkbox, auctionFormData.is_original && externalStyles.checkboxChecked]}>
                      {auctionFormData.is_original && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={externalStyles.checkboxLabel}>Original Artwork</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={externalStyles.checkboxContainer}
                    onPress={() => setAuctionFormData(prev => ({ ...prev, is_framed: !prev.is_framed }))}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <View style={[externalStyles.checkbox, auctionFormData.is_framed && externalStyles.checkboxChecked]}>
                      {auctionFormData.is_framed && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={externalStyles.checkboxLabel}>Framed</Text>
                  </TouchableOpacity>
                  <Text style={externalStyles.sectionHeader}>Categorization</Text>
                  <Text style={externalStyles.inputLabel}>Categories (comma-separated) *</Text>
                  <TextInput
                    style={[externalStyles.input, auctionErrors.categories && externalStyles.inputError]}
                    placeholder="e.g., Painting, Contemporary Art"
                    value={auctionFormData.categories}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, categories: text }))}
                    returnKeyType="next"
                  />
                  <Text style={externalStyles.hintText}>Separate with commas</Text>
                  {auctionErrors.categories && (
                    <Text style={externalStyles.errorText}>{auctionErrors.categories}</Text>
                  )}
                  <Text style={externalStyles.inputLabel}>Tags (comma-separated)</Text>
                  <TextInput
                    style={externalStyles.input}
                    placeholder="e.g., abstract, modern"
                    value={auctionFormData.tags}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, tags: text }))}
                    returnKeyType="next"
                  />
                  <Text style={externalStyles.hintText}>Separate with commas</Text>
                  {auctionErrors.submit && (
                    <View style={externalStyles.errorContainer}>
                      <Text style={externalStyles.errorText}>{auctionErrors.submit}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <Text style={[externalStyles.sectionHeader, { marginTop: -4 }]}>Auction Pricing</Text>
                  <Text style={externalStyles.inputLabel}>Starting Price (₱) *</Text>
                  <TextInput
                    style={[externalStyles.input, auctionErrors.startPrice && externalStyles.inputError]}
                    placeholder="0.00"
                    value={auctionFormData.startPrice}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, startPrice: text }))}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                  {auctionErrors.startPrice && (
                    <Text style={externalStyles.errorText}>{auctionErrors.startPrice}</Text>
                  )}
                  <Text style={externalStyles.inputLabel}>Reserve Price (₱) *</Text>
                  <TextInput
                    style={[externalStyles.input, auctionErrors.reservePrice && externalStyles.inputError]}
                    placeholder="0.00"
                    value={auctionFormData.reservePrice}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, reservePrice: text }))}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                  {auctionErrors.reservePrice && (
                    <Text style={externalStyles.errorText}>{auctionErrors.reservePrice}</Text>
                  )}
                  <Text style={externalStyles.inputLabel}>Minimum Bid Increment (₱) *</Text>
                  <TextInput
                    style={[externalStyles.input, auctionErrors.minIncrement && externalStyles.inputError]}
                    placeholder="0.00"
                    value={auctionFormData.minIncrement}
                    onChangeText={(text) => setAuctionFormData(prev => ({ ...prev, minIncrement: text }))}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                  {auctionErrors.minIncrement && (
                    <Text style={externalStyles.errorText}>{auctionErrors.minIncrement}</Text>
                  )}
                  <Text style={externalStyles.sectionHeader}>Auction Duration (Manila Timezone)</Text>
                  <Text style={externalStyles.inputLabel}>Start Time *</Text>
                  <TouchableOpacity
                    style={[externalStyles.datePickerButton, auctionErrors.startAt && externalStyles.inputError]}
                    onPress={() => setStartDatePickerVisibility(true)}
                  >
                    <Text style={[externalStyles.datePickerText, !auctionFormData.startAt && externalStyles.datePickerPlaceholder]}>
                      {auctionFormData.startAt
                        ? (() => {
                          try {
                            const date = new Date(auctionFormData.startAt);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                            }
                          } catch (e) {
                            console.error('Error formatting start date:', e);
                          }
                          return 'Select Start Date & Time';
                        })()
                        : 'Select Start Date & Time'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#A68C7B" />
                  </TouchableOpacity>
                  <DateTimePickerModal
                    isVisible={isStartDatePickerVisible}
                    mode="datetime"
                    onConfirm={handleStartDateConfirm}
                    onCancel={() => setStartDatePickerVisibility(false)}
                    date={auctionFormData.startAt ? new Date(auctionFormData.startAt) : new Date()}
                    minimumDate={new Date()}
                  />
                  {auctionErrors.startAt && (
                    <Text style={externalStyles.errorText}>{auctionErrors.startAt}</Text>
                  )}
                  <Text style={externalStyles.inputLabel}>End Time *</Text>
                  <TouchableOpacity
                    style={[externalStyles.datePickerButton, auctionErrors.endAt && externalStyles.inputError]}
                    onPress={() => setEndDatePickerVisibility(true)}
                  >
                    <Text style={[externalStyles.datePickerText, !auctionFormData.endAt && externalStyles.datePickerPlaceholder]}>
                      {auctionFormData.endAt
                        ? (() => {
                          try {
                            const date = new Date(auctionFormData.endAt);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                            }
                          } catch (e) {
                            console.error('Error formatting end date:', e);
                          }
                          return 'Select End Date & Time';
                        })()
                        : 'Select End Date & Time'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#A68C7B" />
                  </TouchableOpacity>
                  <DateTimePickerModal
                    isVisible={isEndDatePickerVisible}
                    mode="datetime"
                    onConfirm={handleEndDateConfirm}
                    onCancel={() => setEndDatePickerVisibility(false)}
                    date={auctionFormData.endAt ? new Date(auctionFormData.endAt) : (auctionFormData.startAt ? new Date(new Date(auctionFormData.startAt).getTime() + 24*60*60*1000) : new Date())}
                    minimumDate={auctionFormData.startAt ? new Date(auctionFormData.startAt) : new Date()}
                  />
                  {auctionErrors.endAt && (
                    <Text style={externalStyles.errorText}>{auctionErrors.endAt}</Text>
                  )}
                  {auctionErrors.submit && (
                    <View style={externalStyles.errorContainer}>
                      <Text style={externalStyles.errorText}>{auctionErrors.submit}</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {auctionStep > 0 && (
              <View style={externalStyles.modalFooter}>
                <TouchableOpacity
                  style={[externalStyles.modalBtn, externalStyles.modalBtnSecondary]}
                  onPress={() => setAuctionStep(auctionStep - 1)}
                  disabled={isSubmittingAuction}
                >
                  <Text style={externalStyles.modalBtnSecondaryText} numberOfLines={1}>
                    Back
                  </Text>
                </TouchableOpacity>
                {auctionStep === 1 && auctionItemChoice === 'create' && (
                  <TouchableOpacity
                    style={[externalStyles.modalBtn, externalStyles.modalBtnPrimary, isSubmittingAuction && externalStyles.modalBtnDisabled]}
                    onPress={submitAuctionStep1}
                    disabled={isSubmittingAuction}
                  >
                    {isSubmittingAuction ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={externalStyles.modalBtnPrimaryText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                        Next
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {auctionStep === 2 && (
                  <TouchableOpacity
                    style={[externalStyles.modalBtn, externalStyles.modalBtnPrimary, isSubmittingAuction && externalStyles.modalBtnDisabled]}
                    onPress={submitAuctionStep2}
                    disabled={isSubmittingAuction}
                  >
                    {isSubmittingAuction ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={externalStyles.modalBtnPrimaryText} numberOfLines={1}>
                        Create Auction
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Edit Item Modal */}
    <EditAuctionItemModal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      item={editingItem}
      onSuccess={handleEditSuccess}
      styles={externalStyles}
    />
    </>
  );
}
