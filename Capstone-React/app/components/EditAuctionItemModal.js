import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../supabase/supabaseClient';

const API_BASE = "http://192.168.18.79:3000/api";

const EditAuctionItemModal = ({ isOpen, onClose, item, onSuccess, styles: externalStyles }) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
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
    tags: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);

  // Pre-fill form when item changes
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        medium: item.medium || '',
        dimensions: item.dimensions || '',
        year_created: item.year_created || '',
        weight_kg: item.weight_kg || '',
        is_original: item.is_original ?? true,
        is_framed: item.is_framed ?? false,
        condition: item.condition || 'excellent',
        categories: Array.isArray(item.categories) ? item.categories.join(', ') : item.categories || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || ''
      });
      setErrors({});
      setShowConditionDropdown(false);
    }
  }, [item, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!formData.medium.trim()) {
      newErrors.medium = 'Medium is required';
    }
    if (!formData.dimensions.trim()) {
      newErrors.dimensions = 'Dimensions are required';
    }
    if (!formData.categories.trim()) {
      newErrors.categories = 'At least one category is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!item || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        medium: formData.medium.trim(),
        dimensions: formData.dimensions.trim(),
        year_created: formData.year_created ? parseInt(formData.year_created) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        is_original: formData.is_original,
        is_framed: formData.is_framed,
        condition: formData.condition,
        categories: formData.categories.split(',').map(c => c.trim()).filter(c => c),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      const response = await fetch(`${API_BASE}/auctions/items/${item.auctionItemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          Authorization: `Bearer ${at}`,
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        onSuccess && onSuccess(result.data);
        onClose();
        Alert.alert('Success', 'Item updated successfully');
      } else {
        setErrors({ submit: result.error || 'Failed to update item' });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setErrors({ submit: 'An error occurred while updating the item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <Modal
      visible={isOpen && !!item}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={externalStyles.modalOverlay}
      >
        <TouchableOpacity
          style={externalStyles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={externalStyles.modalContent}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => false}
          >
            <View style={externalStyles.modalHeader}>
              <Text style={externalStyles.modalTitle}>Edit Auction Item</Text>
              <TouchableOpacity onPress={onClose}>
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
              <Text style={externalStyles.sectionHeader}>Basic Information</Text>
              <Text style={externalStyles.inputLabel}>Product Title *</Text>
              <TextInput
                style={[externalStyles.input, errors.title && externalStyles.inputError]}
                placeholder="e.g., Sunset Over Mountains"
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                returnKeyType="next"
              />
              {errors.title && <Text style={externalStyles.errorText}>{errors.title}</Text>}

              <Text style={externalStyles.inputLabel}>Description</Text>
              <TextInput
                style={[externalStyles.input, externalStyles.textArea]}
                placeholder="Describe your product in detail..."
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={externalStyles.sectionHeader}>Product Details</Text>
              <Text style={externalStyles.inputLabel}>Medium *</Text>
              <TextInput
                style={[externalStyles.input, errors.medium && externalStyles.inputError]}
                placeholder="e.g., Oil on Canvas"
                value={formData.medium}
                onChangeText={(text) => setFormData(prev => ({ ...prev, medium: text }))}
                returnKeyType="next"
              />
              {errors.medium && <Text style={externalStyles.errorText}>{errors.medium}</Text>}

              <Text style={externalStyles.inputLabel}>Dimensions *</Text>
              <TextInput
                style={[externalStyles.input, errors.dimensions && externalStyles.inputError]}
                placeholder="e.g., 50x70 cm"
                value={formData.dimensions}
                onChangeText={(text) => setFormData(prev => ({ ...prev, dimensions: text }))}
                returnKeyType="next"
              />
              {errors.dimensions && <Text style={externalStyles.errorText}>{errors.dimensions}</Text>}

              <Text style={externalStyles.inputLabel}>Year Created</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., 2024"
                value={formData.year_created}
                onChangeText={(text) => setFormData(prev => ({ ...prev, year_created: text }))}
                keyboardType="number-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="0.00"
                value={formData.weight_kg}
                onChangeText={(text) => setFormData(prev => ({ ...prev, weight_kg: text }))}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={externalStyles.inputLabel}>Condition *</Text>
              <TouchableOpacity
                style={externalStyles.dropdownBtn}
                onPress={() => setShowConditionDropdown(!showConditionDropdown)}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text style={externalStyles.dropdownBtnTextSelected}>
                  {formData.condition.charAt(0).toUpperCase() + formData.condition.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showConditionDropdown && (
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
                        setFormData(prev => ({ ...prev, condition: item.value }));
                        setShowConditionDropdown(false);
                      }}
                      activeOpacity={0.7}
                      delayPressIn={0}
                    >
                      <Text style={externalStyles.dropdownItemText}>{item.label}</Text>
                      {formData.condition === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setFormData(prev => ({ ...prev, is_original: !prev.is_original }))}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <View style={[externalStyles.checkbox, formData.is_original && externalStyles.checkboxChecked]}>
                  {formData.is_original && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Original Artwork</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={externalStyles.checkboxContainer}
                onPress={() => setFormData(prev => ({ ...prev, is_framed: !prev.is_framed }))}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <View style={[externalStyles.checkbox, formData.is_framed && externalStyles.checkboxChecked]}>
                  {formData.is_framed && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={externalStyles.checkboxLabel}>Framed</Text>
              </TouchableOpacity>

              <Text style={externalStyles.sectionHeader}>Categorization</Text>
              <Text style={externalStyles.inputLabel}>Categories (comma-separated) *</Text>
              <TextInput
                style={[externalStyles.input, errors.categories && externalStyles.inputError]}
                placeholder="e.g., Painting, Contemporary Art"
                value={formData.categories}
                onChangeText={(text) => setFormData(prev => ({ ...prev, categories: text }))}
                returnKeyType="next"
              />
              <Text style={externalStyles.hintText}>Separate with commas</Text>
              {errors.categories && <Text style={externalStyles.errorText}>{errors.categories}</Text>}

              <Text style={externalStyles.inputLabel}>Tags (comma-separated)</Text>
              <TextInput
                style={externalStyles.input}
                placeholder="e.g., abstract, modern"
                value={formData.tags}
                onChangeText={(text) => setFormData(prev => ({ ...prev, tags: text }))}
                returnKeyType="next"
              />
              <Text style={externalStyles.hintText}>Separate with commas</Text>

              {errors.submit && (
                <View style={externalStyles.errorContainer}>
                  <Text style={externalStyles.errorText}>{errors.submit}</Text>
                </View>
              )}
            </ScrollView>

            <View style={externalStyles.modalFooter}>
              <TouchableOpacity
                style={[externalStyles.modalBtn, externalStyles.modalBtnSecondary]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={externalStyles.modalBtnSecondaryText} numberOfLines={1}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[externalStyles.modalBtn, externalStyles.modalBtnPrimary, isSubmitting && externalStyles.modalBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={externalStyles.modalBtnPrimaryText} numberOfLines={1}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditAuctionItemModal;
