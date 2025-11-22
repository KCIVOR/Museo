import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = "http://192.168.18.79:3000/api";

const UploadGalleryModal = ({
  visible,
  onClose,
  categories,
  onUploadSuccess,
  loadSession
}) => {
  const [uploading, setUploading] = useState(false);
  const [newArtwork, setNewArtwork] = useState({ 
    title: '', 
    medium: '', 
    description: '', 
    category: '', 
    images: [] 
  });
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const pickImages = async () => {
    const currentImageCount = newArtwork.images.length;
    if (currentImageCount >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 images allowed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const remainingSlots = 5 - currentImageCount;
      const selectedImages = result.assets.slice(0, remainingSlots);
      setNewArtwork({ ...newArtwork, images: [...newArtwork.images, ...selectedImages] });
    }
  };

  const removeImageFromUpload = (index) => {
    setNewArtwork({
      ...newArtwork,
      images: newArtwork.images.filter((_, i) => i !== index)
    });
  };

  const handleUpload = async () => {
    if (!newArtwork.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!newArtwork.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!newArtwork.medium.trim()) {
      Alert.alert('Error', 'Please enter a medium');
      return;
    }
    if (!newArtwork.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (newArtwork.images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    try {
      setUploading(true);
      const { at, rt } = await loadSession();
      
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('title', newArtwork.title.trim());
      formData.append('medium', newArtwork.medium.trim());
      formData.append('description', newArtwork.description.trim());
      // Backend expects 'categories' as a JSON array string
      formData.append('categories', JSON.stringify([newArtwork.category]));
      
      // Watermark settings
      formData.append('applyWatermark', applyWatermark.toString());
      if (watermarkText.trim()) {
        formData.append('watermarkText', watermarkText.trim());
      }
      // Add multiple image files - backend expects 'images' field
      newArtwork.images.forEach((imageAsset) => {
        const imageUri = Platform.OS === 'android' ? imageAsset.uri : imageAsset.uri.replace('file://', '');
        const filename = imageUri.split('/').pop();
        const match = /\.([\w]+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('images', {
          uri: imageUri,
          name: filename,
          type: type,
        });
      });

      console.log('Uploading to:', `${API_BASE}/gallery/upload`);
      console.log('Form data:', {
        title: newArtwork.title,
        medium: newArtwork.medium,
        description: newArtwork.description,
        category: newArtwork.category,
        imageCount: newArtwork.images.length,
        applyWatermark: applyWatermark,
      });

      const res = await fetch(`${API_BASE}/gallery/upload`, {
        method: 'POST',
        headers: {
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      console.log('Response status:', res.status);
      const responseText = await res.text();
      console.log('Response text:', responseText);

      if (res.ok) {
        Alert.alert('Success', 'Artwork uploaded successfully!');
        setNewArtwork({ title: '', medium: '', description: '', category: '', images: [] });
        setWatermarkText('');
        setApplyWatermark(true);
        onClose();
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        let errorMessage = 'Failed to upload artwork';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Upload failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', `Failed to upload artwork: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Artwork</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Image Picker */}
              <View style={styles.imagesSection}>
                <Text style={styles.inputLabel}>Images * (Max 5)</Text>
                <TouchableOpacity 
                  style={styles.addImageButton} 
                  onPress={pickImages}
                  disabled={newArtwork.images.length >= 5}
                >
                  <Ionicons name="add-circle-outline" size={24} color={newArtwork.images.length >= 5 ? "#ccc" : "#A68C7B"} />
                  <Text style={[styles.addImageText, newArtwork.images.length >= 5 && { color: '#ccc' }]}>
                    {newArtwork.images.length === 0 ? 'Add Images' : `Add More (${newArtwork.images.length}/5)`}
                  </Text>
                </TouchableOpacity>
                
                {/* Display selected images */}
                {newArtwork.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesPreview}>
                    {newArtwork.images.map((img, idx) => (
                      <View key={idx} style={styles.imagePreviewContainer}>
                        <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => removeImageFromUpload(idx)}
                        >
                          <Ionicons name="close-circle" size={26} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Title Input */}
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter artwork title"
                value={newArtwork.title}
                onChangeText={(text) => setNewArtwork({ ...newArtwork, title: text })}
              />

              {/* Medium Input */}
              <Text style={styles.inputLabel}>Medium *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Oil, Digital, Watercolor"
                value={newArtwork.medium}
                onChangeText={(text) => setNewArtwork({ ...newArtwork, medium: text })}
              />

              {/* Description Input */}
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                value={newArtwork.description}
                onChangeText={(text) => setNewArtwork({ ...newArtwork, description: text })}
                multiline
                numberOfLines={4}
              />

              {/* Watermark Section */}
              <View style={styles.watermarkSection}>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setApplyWatermark(!applyWatermark)}
                >
                  <Ionicons 
                    name={applyWatermark ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <View style={styles.checkboxLabel}>
                    <Text style={styles.checkboxTitle}>🔒 Protect with watermark</Text>
                    <Text style={styles.checkboxSubtitle}>
                      Add watermark to protect your artwork from unauthorized use
                    </Text>
                  </View>
                </TouchableOpacity>

                {applyWatermark && (
                  <View style={styles.watermarkInputContainer}>
                    <Text style={styles.watermarkInputLabel}>
                      Custom watermark text (optional)
                    </Text>
                    <TextInput
                      style={styles.watermarkInput}
                      placeholder={`© Your Name ${new Date().getFullYear()} • Museo`}
                      value={watermarkText}
                      onChangeText={setWatermarkText}
                    />
                    <Text style={styles.watermarkHint}>
                      Leave blank to use default watermark
                    </Text>
                  </View>
                )}
              </View>

              {/* Category Selector */}
              <Text style={styles.inputLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text style={{ color: newArtwork.category ? '#000' : '#999' }}>
                  {newArtwork.category || 'Select category'}
                </Text>
                <Ionicons
                  name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#555"
                  style={{ position: 'absolute', right: 12, top: 12 }}
                />
              </TouchableOpacity>
              {showCategoryDropdown && (
                <View style={styles.categoryDropdown}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {categories
                      .filter(cat => cat.field !== 'all')
                      .map((cat) => (
                        <TouchableOpacity
                          key={cat.field}
                          style={styles.categoryItem}
                          onPress={() => {
                            setNewArtwork({ ...newArtwork, category: cat.name });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text style={styles.categoryItemText}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}

              {/* Upload Button */}
              <TouchableOpacity 
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Upload Artwork'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalBody: {
    padding: 20,
  },
  imagesSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
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
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  watermarkSection: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 12,
  },
  checkboxTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  checkboxSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  watermarkInputContainer: {
    marginTop: 16,
    paddingLeft: 36,
  },
  watermarkInputLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  watermarkInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  watermarkHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  categoryDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemText: {
    fontSize: 14,
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UploadGalleryModal;
