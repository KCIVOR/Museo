import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';

// Helper function to detect if URI is a video
const isVideo = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  const path = uri.split('?')[0].toLowerCase();
  return /\.(mp4|mov|avi|mkv)(\?.*)?$/i.test(path);
};

// Helper function to detect if URI is a GIF
const isGif = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  const path = uri.split('?')[0].toLowerCase();
  return /\.gif(\?.*)?$/i.test(path);
};

export default function EditHomeModal({
  modalVisible,
  setModalVisible,
  postText,
  setPostText,
  pickedImages,
  setPickedImages,
  existingImages,
  setExistingImages,
  imagesToRemove,
  setImagesToRemove,
  editingPostId,
  setEditingPostId,
  loading,
  image,
  uploadPost,
  pickImage,
  removeImage,
  styles,
}) {
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingPostId(null);
    setPostText('');
    setPickedImages([]);
    setExistingImages([]);
    setImagesToRemove([]);
  };

  return (
    <Modal
      visible={modalVisible && editingPostId !== null}
      transparent
      animationType="slide"
      onRequestClose={handleCloseModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            <View style={styles.uploadModalHeader}>
              <Text style={styles.uploadModalTitle}>Edit Post</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.uploadModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.postInputContainer}>
                {image ? (
                  <Image source={image} style={styles.postAvatar} />
                ) : (
                  <View style={[styles.postAvatar, styles.placeholderCircle]}>
                    <Ionicons name="person" size={24} color="#999" />
                  </View>
                )}
                <TextInput
                  style={styles.postTextInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#999"
                  value={postText}
                  onChangeText={setPostText}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <Text style={styles.uploadInputLabel}>Media (Photos, Videos, GIFs)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                {/* Existing images from the post */}
                {existingImages.map((imageUrl, index) => (
                  <View key={`existing-${index}`} style={styles.postImageContainer}>
                    {isVideo(imageUrl) ? (
                      <View style={styles.postPreviewImage}>
                        <Video
                          source={{ uri: imageUrl }}
                          style={styles.postPreviewImage}
                          resizeMode="cover"
                          isLooping
                          shouldPlay={false}
                        />
                        <View style={styles.videoOverlay}>
                          <Ionicons name="play-circle" size={32} color="#fff" />
                        </View>
                      </View>
                    ) : isGif(imageUrl) ? (
                      <View style={styles.postPreviewImage}>
                        <Image source={{ uri: imageUrl }} style={styles.postPreviewImage} />
                        <View style={styles.gifOverlay}>
                          <Text style={styles.gifLabel}>GIF</Text>
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: imageUrl }} style={styles.postPreviewImage} />
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setExistingImages((prev) => prev.filter((_, i) => i !== index));
                        setImagesToRemove((prev) => [...prev, imageUrl]);
                      }}
                      style={styles.postRemoveBtn}
                    >
                      <Ionicons name="close-circle" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Newly picked images */}
                {pickedImages.map((item, index) => {
                  const uri = Array.isArray(item) ? item[0] : item;
                  return (
                    <View key={`new-${index}`} style={styles.postImageContainer}>
                      {isVideo(uri) ? (
                        <View style={styles.postPreviewImage}>
                          <Video
                            source={{ uri }}
                            style={styles.postPreviewImage}
                            resizeMode="cover"
                            isLooping
                            shouldPlay={false}
                          />
                          <View style={styles.videoOverlay}>
                            <Ionicons name="play-circle" size={32} color="#fff" />
                          </View>
                        </View>
                      ) : isGif(uri) ? (
                        <View style={styles.postPreviewImage}>
                          <Image source={{ uri }} style={styles.postPreviewImage} />
                          <View style={styles.gifOverlay}>
                            <Text style={styles.gifLabel}>GIF</Text>
                          </View>
                        </View>
                      ) : (
                        <Image source={{ uri }} style={styles.postPreviewImage} />
                      )}
                      <TouchableOpacity onPress={() => removeImage(index)} style={styles.postRemoveBtn}>
                        <Ionicons name="close-circle" size={26} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Add more media button */}
                <View style={styles.postImageContainer}>
                  <TouchableOpacity onPress={pickImage} style={styles.postAddPhotoBtn}>
                    <Ionicons name="image-outline" size={32} color="#A68C7B" />
                    <Text style={styles.postAddPhotoText}>Add Media</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Update button */}
              <TouchableOpacity style={styles.uploadButton} onPress={uploadPost} disabled={loading}>
                <Text style={styles.uploadButtonText}>{loading ? 'Updating...' : 'Update'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
