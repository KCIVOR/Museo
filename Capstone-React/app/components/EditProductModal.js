import React, { useState, useEffect } from 'react';
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

export default function EditProductModal({
  visible,
  product,
  onClose,
  onSuccess,
  styles: externalStyles
}) {
  const insets = useSafeAreaInsets();
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategories, setEditCategories] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [editMedium, setEditMedium] = useState('');
  const [editDimensions, setEditDimensions] = useState('');
  const [editYearCreated, setEditYearCreated] = useState('');
  const [editWeightKg, setEditWeightKg] = useState('');
  const [editCondition, setEditCondition] = useState('excellent');
  const [editIsOriginal, setEditIsOriginal] = useState(true);
  const [editIsFramed, setEditIsFramed] = useState(false);
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editImages, setEditImages] = useState([]);
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    if (visible && product) {
      setEditTitle(product.title || '');
      setEditPrice(product.price?.toString() || '');
      setEditQuantity(product.quantity?.toString() || '');
      setEditDescription(product.description || '');
      const cats = product.categories || [];
      setEditCategories(Array.isArray(cats) ? cats.join(', ') : cats);
      const tgs = product.tags || [];
      setEditTags(Array.isArray(tgs) ? tgs.join(', ') : tgs);
      setEditStatus(product.status || 'active');
      setEditIsAvailable(product.is_available !== false);
      setEditMedium(product.medium || '');
      setEditDimensions(product.dimensions || '');
      setEditYearCreated(product.year_created?.toString() || '');
      setEditWeightKg(product.weight_kg?.toString() || '');
      setEditCondition(product.condition || 'excellent');
      setEditIsOriginal(product.is_original !== false);
      setEditIsFramed(product.is_framed || false);
      setEditIsFeatured(product.is_featured || false);
      const existingImgs = [];
      if (product.images && Array.isArray(product.images)) {
        existingImgs.push(...product.images.map((url, idx) => ({
          id: `existing-${idx}`,
          uri: url,
          url: url,
          isExisting: true
        })));
      } else if (product.primary_image) {
        existingImgs.push({
          id: 'existing-0',
          uri: product.primary_image,
          url: product.primary_image,
          isExisting: true
        });
      }
      setEditImages(existingImgs);
    }
  }, [visible, product]);

  const pickEditImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setEditImages(result.assets);
    }
  };

  const removeEditImage = (index) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitEditProduct = async () => {
    try {
      if (!editTitle.trim()) {
        Alert.alert('Error', 'Product title is required');
        return;
      }
      if (!editPrice || parseFloat(editPrice) <= 0) {
        Alert.alert('Error', 'Valid price is required');
        return;
      }
      if (!editMedium.trim()) {
        Alert.alert('Error', 'Medium is required');
        return;
      }
      if (!editDimensions.trim()) {
        Alert.alert('Error', 'Dimensions are required');
        return;
      }
      if (!editQuantity || parseInt(editQuantity) < 0) {
        Alert.alert('Error', 'Valid quantity is required');
        return;
      }
      const categories = editCategories.split(',').map(c => c.trim()).filter(c => c);
      if (categories.length === 0) {
        Alert.alert('Error', 'At least one category is required');
        return;
      }
      const tags = editTags.split(',').map(t => t.trim()).filter(t => t);
      if (editImages.length === 0) {
        Alert.alert('Error', 'Please upload at least one product image');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('price', parseFloat(editPrice));
      formData.append('quantity', parseInt(editQuantity));
      formData.append('description', editDescription.trim());
      formData.append('medium', editMedium.trim());
      formData.append('dimensions', editDimensions.trim());
      formData.append('year_created', editYearCreated || '');
      formData.append('weight_kg', editWeightKg || '');
      formData.append('is_original', editIsOriginal.toString());
      formData.append('is_framed', editIsFramed.toString());
      formData.append('condition', editCondition);
      formData.append('categories', JSON.stringify(categories));
      formData.append('tags', JSON.stringify(tags));
      formData.append('is_available', editIsAvailable.toString());
      formData.append('is_featured', editIsFeatured.toString());
      formData.append('status', editStatus);

      const existingImages = editImages.filter(img => img.isExisting && !img.file);
      const newImages = editImages.filter(img => !img.isExisting && img.uri);

      if (existingImages.length > 0) {
        const existingUrls = existingImages.map(img => img.url || img.uri);
        formData.append('existing_images_to_keep', JSON.stringify(existingUrls));
      }

      if (newImages.length > 0) {
        newImages.forEach((image) => {
          const filename = image.uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image';
          formData.append('images', {
            uri: image.uri,
            name: filename,
            type: type
          });
        });
      }

      if (editImages.length === 0) {
        formData.append('remove_all_images', 'true');
      }

      const response = await fetch(`${API_BASE}/marketplace/items/${product.marketItemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Product updated successfully!');
        handleCloseModal();
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Error', result.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'An error occurred while updating the product');
    }
  };

  const handleCloseModal = () => {
    setShowConditionDropdown(false);
    setShowStatusDropdown(false);
    onClose();
  };

  if (!visible || !product) return null;

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
        <TouchableOpacity
          style={externalStyles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={externalStyles.modalContent}
          >
            <View style={externalStyles.modalHeader}>
              <Text style={externalStyles.modalTitle}>Edit Product</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={externalStyles.modalBody}
              contentContainerStyle={{ paddingBottom: insets.bottom + 3 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={externalStyles.sectionHeader}>Product Images</Text>
              <Text style={externalStyles.hintText}>Support: JPG, PNG up to 10MB • Maximum 10 images • First image will be primary</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={externalStyles.imagePickerScrollView}
              >
                {editImages.map((image, index) => (
                  <View key={index} style={externalStyles.imagePreviewItem}>
                    <Image source={{ uri: image.uri }} style={externalStyles.imagePreview} />
                    <TouchableOpacity
                      style={externalStyles.removeImageBtn}
                      onPress={() => removeEditImage(index)}
                    >
                      <Ionicons name="close-circle" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={externalStyles.imagePreviewItem}>
                  <TouchableOpacity
                    style={externalStyles.addPhotoBtn}
                    onPress={pickEditImages}
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
                placeholder="Enter product title"
                value={editTitle}
                onChangeText={setEditTitle}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Price *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="Enter price"
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Description</Text>
              <TextInput
                style={[externalStyles.input, externalStyles.textArea]}
                placeholder="Enter product description"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={4}
                returnKeyType="done"
              />

              <Text style={externalStyles.sectionHeader}>Product Details</Text>

              <Text style={externalStyles.inputLabel}>Medium *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., Oil on Canvas, Watercolor, Digital"
                value={editMedium}
                onChangeText={setEditMedium}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Dimensions *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., 24x36 inches"
                value={editDimensions}
                onChangeText={setEditDimensions}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Year Created</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., 2024"
                value={editYearCreated}
                onChangeText={setEditYearCreated}
                keyboardType="number-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., 2.5"
                value={editWeightKg}
                onChangeText={setEditWeightKg}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Condition *</Text>
              <TouchableOpacity
                style={externalStyles.dropdownBtn}
                onPress={() => setShowConditionDropdown(!showConditionDropdown)}
              >
                <Text style={editCondition ? externalStyles.dropdownBtnTextSelected : externalStyles.dropdownBtnText}>
                  {editCondition.charAt(0).toUpperCase() + editCondition.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showConditionDropdown && (
                <View style={externalStyles.dropdownMenu}>
                  {[
                    { value: 'excellent', label: 'Excellent' },
                    { value: 'good', label: 'Good' },
                    { value: 'fair', label: 'Fair' },
                    { value: 'poor', label: 'Poor' }
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={externalStyles.dropdownItem}
                      onPress={() => {
                        setEditCondition(item.value);
                        setShowConditionDropdown(false);
                      }}
                    >
                      <Text style={externalStyles.dropdownItemText}>{item.label}</Text>
                      {editCondition === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={externalStyles.sectionHeader}>Features</Text>

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setEditIsOriginal(!editIsOriginal)}
              >
                <View style={[externalStyles.checkbox, editIsOriginal && externalStyles.checkboxChecked]}>
                  {editIsOriginal && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Original Artwork</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setEditIsFramed(!editIsFramed)}
              >
                <View style={[externalStyles.checkbox, editIsFramed && externalStyles.checkboxChecked]}>
                  {editIsFramed && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Framed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setEditIsFeatured(!editIsFeatured)}
              >
                <View style={[externalStyles.checkbox, editIsFeatured && externalStyles.checkboxChecked]}>
                  {editIsFeatured && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Featured Item</Text>
              </TouchableOpacity>

              <Text style={externalStyles.sectionHeader}>Categories & Tags</Text>

              <Text style={externalStyles.inputLabel}>Categories (comma-separated) *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., landscape, nature, contemporary"
                value={editCategories}
                onChangeText={setEditCategories}
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Tags (comma-separated)</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., sunset, mountains, oil painting, framed"
                value={editTags}
                onChangeText={setEditTags}
                returnKeyType="next"
              />

              <Text style={externalStyles.sectionHeader}>Inventory & Status</Text>

              <Text style={externalStyles.inputLabel}>Quantity Available *</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="Enter quantity"
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="number-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Item Status</Text>
              <TouchableOpacity
                style={externalStyles.dropdownBtn}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <Text style={editStatus ? externalStyles.dropdownBtnTextSelected : externalStyles.dropdownBtnText}>
                  {editStatus === 'active' ? 'Active' : editStatus === 'pending' ? 'Pending Approval' : 'Inactive'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showStatusDropdown && (
                <View style={externalStyles.dropdownMenu}>
                  {[
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending Approval' },
                    { value: 'inactive', label: 'Inactive' }
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={externalStyles.dropdownItem}
                      onPress={() => {
                        setEditStatus(item.value);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={externalStyles.dropdownItemText}>{item.label}</Text>
                      {editStatus === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setEditIsAvailable(!editIsAvailable)}
              >
                <View style={[externalStyles.checkbox, editIsAvailable && externalStyles.checkboxChecked]}>
                  {editIsAvailable && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Available for Purchase</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={externalStyles.submitBtn}
                onPress={submitEditProduct}
              >
                <Text style={externalStyles.submitBtnText}>Update Product</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
