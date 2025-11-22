import React, { useState } from 'react';
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
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabase/supabaseClient';

const API_BASE = "http://192.168.18.79:3000/api";

export default function AddMarketProduct({
  visible,
  onClose,
  onSuccess,
  styles: externalStyles
}) {
  const insets = useSafeAreaInsets();
  const [addTitle, setAddTitle] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCategories, setAddCategories] = useState('');
  const [addTags, setAddTags] = useState('');
  const [addStatus, setAddStatus] = useState('active');
  const [addIsAvailable, setAddIsAvailable] = useState(true);
  const [addMedium, setAddMedium] = useState('');
  const [addDimensions, setAddDimensions] = useState('');
  const [addYearCreated, setAddYearCreated] = useState('');
  const [addWeightKg, setAddWeightKg] = useState('');
  const [addCondition, setAddCondition] = useState('excellent');
  const [addIsOriginal, setAddIsOriginal] = useState(true);
  const [addIsFramed, setAddIsFramed] = useState(false);
  const [addIsFeatured, setAddIsFeatured] = useState(false);
  const [addImages, setAddImages] = useState([]);
  const [showAddConditionDropdown, setShowAddConditionDropdown] = useState(false);
  const [showAddStatusDropdown, setShowAddStatusDropdown] = useState(false);

  const pickAddImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setAddImages(result.assets);
    }
  };

  const removeAddImage = (index) => {
    setAddImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitAddProduct = async () => {
    try {
      if (!addTitle.trim()) {
        Alert.alert('Error', 'Product title is required');
        return;
      }
      if (addTitle.trim().length < 2) {
        Alert.alert('Error', 'Title must be at least 2 characters long');
        return;
      }
      if (!addPrice || parseFloat(addPrice) <= 0) {
        Alert.alert('Error', 'Valid price is required');
        return;
      }
      if (!addMedium.trim()) {
        Alert.alert('Error', 'Medium is required');
        return;
      }
      if (!addDimensions.trim()) {
        Alert.alert('Error', 'Dimensions are required');
        return;
      }
      if (!addQuantity || parseInt(addQuantity) < 0) {
        Alert.alert('Error', 'Valid quantity is required');
        return;
      }
      const categories = addCategories.split(',').map(c => c.trim()).filter(c => c);
      if (categories.length === 0) {
        Alert.alert('Error', 'At least one category is required');
        return;
      }
      const tags = addTags.split(',').map(t => t.trim()).filter(t => t);
      if (addImages.length === 0) {
        Alert.alert('Error', 'Please upload at least one product image');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const formData = new FormData();
      formData.append('title', addTitle.trim());
      formData.append('price', parseFloat(addPrice));
      formData.append('quantity', parseInt(addQuantity));
      formData.append('description', addDescription.trim());
      formData.append('medium', addMedium.trim());
      formData.append('dimensions', addDimensions.trim());
      formData.append('year_created', addYearCreated || '');
      formData.append('weight_kg', addWeightKg || '');
      formData.append('is_original', addIsOriginal.toString());
      formData.append('is_framed', addIsFramed.toString());
      formData.append('condition', addCondition);
      formData.append('categories', JSON.stringify(categories));
      formData.append('tags', JSON.stringify(tags));
      formData.append('is_available', addIsAvailable.toString());
      formData.append('is_featured', addIsFeatured.toString());
      formData.append('status', addStatus);

      addImages.forEach((image) => {
        const filename = image.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
        formData.append('images', {
          uri: image.uri,
          name: filename,
          type: type
        });
      });

      const response = await fetch(`${API_BASE}/marketplace/items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Product added successfully!');
        handleCloseModal();
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Error', result.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'An error occurred while adding the product');
    }
  };

  const handleCloseModal = () => {
    setAddTitle('');
    setAddPrice('');
    setAddQuantity('');
    setAddDescription('');
    setAddCategories('');
    setAddTags('');
    setAddStatus('active');
    setAddIsAvailable(true);
    setAddMedium('');
    setAddDimensions('');
    setAddYearCreated('');
    setAddWeightKg('');
    setAddCondition('excellent');
    setAddIsOriginal(true);
    setAddIsFramed(false);
    setAddIsFeatured(false);
    setAddImages([]);
    setShowAddConditionDropdown(false);
    setShowAddStatusDropdown(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={externalStyles.modalOverlay}
      >
        <View
          style={externalStyles.modalOverlayTouchable}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View
            style={externalStyles.modalContent}
          >
            <View style={externalStyles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={externalStyles.modalTitle}>Add New Product</Text>
                <Text style={{ fontSize: 14, color: '#7A6A58', marginTop: 4 }}>
                  List a new product in your marketplace
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
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
              <Text style={[externalStyles.sectionHeader, { marginTop: -4 }]}>Product Images</Text>
              <Text style={externalStyles.hintText}>Support: JPG, PNG up to 10MB • Maximum 10 images • First image will be primary</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={externalStyles.imagePickerScrollView}
              >
                {addImages.map((image, index) => (
                  <View key={index} style={externalStyles.imagePreviewItem}>
                    <Image source={{ uri: image.uri }} style={externalStyles.imagePreview} />
                    <TouchableOpacity
                      style={externalStyles.removeImageBtn}
                      onPress={() => removeAddImage(index)}
                    >
                      <Ionicons name="close-circle" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={externalStyles.imagePreviewItem}>
                  <TouchableOpacity
                    style={externalStyles.addPhotoBtn}
                    onPress={pickAddImages}
                  >
                    <Ionicons name="image-outline" size={32} color="#A68C7B" />
                    <Text style={externalStyles.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <Text style={externalStyles.sectionHeader}>Basic Information</Text>

              <Text style={externalStyles.inputLabel}>Product Title *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., Sunset Over Mountains"
                value={addTitle}
                onChangeText={setAddTitle}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Price (₱) *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="0.00"
                value={addPrice}
                onChangeText={setAddPrice}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Description</Text>
              <TextInput
                style={[externalStyles.input, externalStyles.textArea]}
                placeholder="Describe your product in detail..."
                value={addDescription}
                onChangeText={setAddDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={externalStyles.sectionHeader}>Product Details</Text>

              <Text style={externalStyles.inputLabel}>Medium *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., Oil on Canvas, Watercolor"
                value={addMedium}
                onChangeText={setAddMedium}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Dimensions *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., 24x36 inches"
                value={addDimensions}
                onChangeText={setAddDimensions}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Year Created</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., 2024"
                value={addYearCreated}
                onChangeText={setAddYearCreated}
                keyboardType="number-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., 2.5"
                value={addWeightKg}
                onChangeText={setAddWeightKg}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Condition *</Text>
              <TouchableOpacity
                style={externalStyles.dropdownBtn}
                onPress={() => setShowAddConditionDropdown(!showAddConditionDropdown)}
              >
                <Text style={externalStyles.dropdownButtonText}>
                  {addCondition.charAt(0).toUpperCase() + addCondition.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {showAddConditionDropdown && (
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
                        setAddCondition(item.value);
                        setShowAddConditionDropdown(false);
                      }}
                    >
                      <Text style={externalStyles.dropdownItemText}>{item.label}</Text>
                      {addCondition === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setAddIsOriginal(!addIsOriginal)}
              >
                <View style={[externalStyles.checkbox, addIsOriginal && externalStyles.checkboxChecked]}>
                  {addIsOriginal && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Original Artwork</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setAddIsFramed(!addIsFramed)}
              >
                <View style={[externalStyles.checkbox, addIsFramed && externalStyles.checkboxChecked]}>
                  {addIsFramed && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Framed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setAddIsFeatured(!addIsFeatured)}
              >
                <View style={[externalStyles.checkbox, addIsFeatured && externalStyles.checkboxChecked]}>
                  {addIsFeatured && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Feature this item</Text>
              </TouchableOpacity>

              <Text style={externalStyles.sectionHeader}>Categories & Tags</Text>

              <Text style={externalStyles.inputLabel}>Categories (comma-separated) *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., landscape, nature, contemporary"
                value={addCategories}
                onChangeText={setAddCategories}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Tags (comma-separated)</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., sunset, mountains, oil painting"
                value={addTags}
                onChangeText={setAddTags}
                returnKeyType="next"
              />

              <Text style={externalStyles.sectionHeader}>Inventory & Status</Text>

              <Text style={externalStyles.inputLabel}>Quantity Available *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="1"
                value={addQuantity}
                onChangeText={setAddQuantity}
                keyboardType="number-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Item Status</Text>
              <TouchableOpacity
                style={externalStyles.dropdownBtn}
                onPress={() => setShowAddStatusDropdown(!showAddStatusDropdown)}
              >
                <Text style={externalStyles.dropdownButtonText}>
                  {addStatus.charAt(0).toUpperCase() + addStatus.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {showAddStatusDropdown && (
                <View style={externalStyles.dropdownMenu}>
                  {[
                    { label: 'Active', value: 'active' },
                    { label: 'Pending Approval', value: 'pending' },
                    { label: 'Inactive', value: 'inactive' }
                  ].map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={externalStyles.dropdownItem}
                      onPress={() => {
                        setAddStatus(item.value);
                        setShowAddStatusDropdown(false);
                      }}
                    >
                      <Text style={externalStyles.dropdownItemText}>{item.label}</Text>
                      {addStatus === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setAddIsAvailable(!addIsAvailable)}
              >
                <View style={[externalStyles.checkbox, addIsAvailable && externalStyles.checkboxChecked]}>
                  {addIsAvailable && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Available for Purchase</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={externalStyles.submitBtn}
                onPress={submitAddProduct}
              >
                <Text style={externalStyles.submitBtnText}>Add Product</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
