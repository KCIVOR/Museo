import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';
import CommentModal from './CommentModal';

export default function ViewArtistModal(props) {
  const [fullscreenImageUri, setFullscreenImageUri] = useState(null);

  const {
    styles,

    // Common/detail modal props
    selectedArt,
    setSelectedArt,
    username,
    firstName,
    middleName,
    lastName,
    handleToggleArtLike,
    artUserLiked,
    artLikesCount,
    artMenuVisible,
    setArtMenuVisible,
    handleEditArtwork,
    handleDeleteArtwork,
    descriptionExpanded,
    setDescriptionExpanded,
    openCommentsModal,
    totalCommentCount,
    artComments,

    // Visibility/role context for conditional menu
    currentUserId,
    viewedUserId,
    isViewingOther,
    role,

    // Edit artwork modal props
    editModalVisible,
    setEditModalVisible,
    pickEditArtworkImage,
    editArtImage,
    editingArt,
    editArtTitle,
    setEditArtTitle,
    editArtMedium,
    setEditArtMedium,
    editArtDescription,
    setEditArtDescription,
    submitEditArtwork,
    editArtUploading,

    // Upload artwork modal props
    artModalVisible,
    setArtModalVisible,
    pickArtworkImage,
    artImage,
    artTitle,
    setArtTitle,
    artDescription,
    setArtDescription,
    artMedium,
    setArtMedium,
    submitArtwork,
    artUploading,

    // Comments modal props
    commentsModalVisible,
    setCommentsModalVisible,
    closeCommentsModal,
    renderArtComment,
    commentListRef,
    commentPage,
    hasMoreComments,
    loadingMoreComments,
    loadMoreArtComments,
    showLessArtComments,
    artNewComment,
    setArtNewComment,
    postArtComment,
  } = props;

  return (
    <>
      {/* Artwork Details Modal */}
      <Modal visible={selectedArt !== null} transparent animationType="fade" onRequestClose={() => setSelectedArt(null)}>
        <View style={styles.fullScreenContainer}>
          <View style={{ width: '90%', maxHeight: '85%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            {/* Explicit close button */}
            <TouchableOpacity onPress={() => setSelectedArt(null)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            {/* Fixed Image at top - Clickable for fullscreen */}
            {selectedArt?.image && (
              <TouchableOpacity onPress={() => setFullscreenImageUri(selectedArt.image)}>
                <Image source={{ uri: selectedArt.image }} style={styles.artModalImage} />
              </TouchableOpacity>
            )}
            
            {/* Scrollable content below image */}
            <ScrollView
              contentContainerStyle={{ paddingBottom: 16 }}
              decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <View style={{ padding: 12 }}>
                
                {/* Row 1: Username, Heart, and Menu */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{username || 'Artist'}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Heart/Like Button */}
                    <TouchableOpacity onPress={handleToggleArtLike} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 20 }}>
                      <Icon name={artUserLiked ? 'heart' : 'heart-o'} size={22} color={artUserLiked ? 'red' : '#555'} />
                      <Text style={{ marginLeft: 8, fontWeight: '600' }}>{artLikesCount}</Text>
                    </TouchableOpacity>
                    
                    {/* Three-dot Menu for Edit/Delete - only show if current user is the artist owner or admin */}
                    {currentUserId && ((isViewingOther && currentUserId === viewedUserId) || (!isViewingOther)) && (role === 'artist' || role === 'admin') && (
                      <View style={{ position: 'relative' }}>
                        <TouchableOpacity 
                          onPress={() => setArtMenuVisible(!artMenuVisible)}
                          style={{ padding: 8 }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={24} color="#555" />
                        </TouchableOpacity>
                        
                        {/* Dropdown menu */}
                        {artMenuVisible && (
                          <View style={styles.dropdownMenu}>
                            <TouchableOpacity 
                              style={styles.menuItem}
                              onPress={() => {
                                setArtMenuVisible(false);
                                handleEditArtwork(selectedArt);
                              }}
                            >
                              <Ionicons name="pencil-outline" size={18} color="#555" />
                              <Text style={styles.menuItemText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                              onPress={() => {
                                setArtMenuVisible(false);
                                handleDeleteArtwork(selectedArt);
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#d9534f" />
                              <Text style={[styles.menuItemText, { color: '#d9534f' }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Report button - show for users viewing other people's artwork */}
                    {currentUserId && !(currentUserId && ((isViewingOther && currentUserId === viewedUserId) || (!isViewingOther)) && (role === 'artist' || role === 'admin')) && (
                      <TouchableOpacity 
                        onPress={() => Alert.alert('Report', 'Report functionality coming soon')} 
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="flag-outline" size={22} color="#555" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Row 2: By: Fullname */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    by: {[firstName, middleName, lastName].filter(Boolean).join(' ') || username || 'Unknown'}
                  </Text>
                </View>

                {/* Medium */}
                {!!selectedArt?.medium && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 }}>Medium:</Text>
                    <Text style={{ fontSize: 14, color: '#222' }}>{selectedArt.medium}</Text>
                  </View>
                )}

                {/* Description */}
                {!!selectedArt?.description && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 }}>Description:</Text>
                    <Text style={{ fontSize: 14, color: '#222' }}>
                      {descriptionExpanded || selectedArt.description.length <= 150
                        ? selectedArt.description
                        : `${selectedArt.description.substring(0, 150)}...`}
                    </Text>
                    {selectedArt.description.length > 150 && (
                      <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)} style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: '#A68C7B', fontWeight: '600', marginTop: 4 }}>
                          {descriptionExpanded ? 'View Less' : 'View More'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Date and time */}
                {!!selectedArt?.timestamp && (
                  <Text style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{selectedArt.timestamp}</Text>
                )}

                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10 }} />
                
                {/* Comments Button */}
                <TouchableOpacity 
                  onPress={openCommentsModal}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f5f5', 
                    padding: 12, 
                    borderRadius: 8,
                    marginTop: 10
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#A68C7B" />
                  <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#333' }}>
                    View Comments ({(() => {
                      const count = totalCommentCount > 0 ? totalCommentCount : (artComments?.length || 0);
                      return count >= 10 ? '10+' : count;
                    })()})
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={fullscreenImageUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImageUri(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' }}>
          {/* Close Button - Top Right */}
          <TouchableOpacity
            onPress={() => setFullscreenImageUri(null)}
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 10,
              padding: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
            }}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          {/* Fullscreen Image */}
          {fullscreenImageUri && (
            <Image
              source={{ uri: fullscreenImageUri }}
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
            />
          )}
        </View>
      </Modal>

      {/* Edit Artwork Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Edit Artwork</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Image Picker */}
                <TouchableOpacity style={styles.uploadImagePicker} onPress={pickEditArtworkImage}>
                  {editArtImage ? (
                    <Image source={editArtImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>{editingArt ? 'Tap to change image (keep current or select new)' : 'Tap to select image'}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Title Input */}
                <Text style={styles.uploadInputLabel}>Title *</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Enter artwork title"
                  value={editArtTitle}
                  onChangeText={setEditArtTitle}
                />

                {/* Medium Input */}
                <Text style={styles.uploadInputLabel}>Medium</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="e.g., Oil, Digital, Watercolor"
                  value={editArtMedium}
                  onChangeText={setEditArtMedium}
                />

                {/* Description Input */}
                <Text style={styles.uploadInputLabel}>Description</Text>
                <TextInput
                  style={[styles.uploadInput, styles.uploadTextArea]}
                  placeholder="Enter description"
                  value={editArtDescription}
                  onChangeText={setEditArtDescription}
                  multiline
                  numberOfLines={4}
                />

                {/* Update Button */}
                <TouchableOpacity
                  style={[styles.uploadButton, editArtUploading && styles.uploadButtonDisabled]}
                  onPress={submitEditArtwork}
                  disabled={editArtUploading}
                >
                  <Text style={styles.uploadButtonText}>
                    {editArtUploading ? 'Updating...' : 'Update Artwork'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Upload Artwork Modal */}
      <Modal visible={artModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setArtModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
              <ScrollView contentContainerStyle={styles.modalBox} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Upload Artwork</Text>
                <TouchableOpacity onPress={pickArtworkImage} style={styles.imagePicker}>
                  {artImage ? (
                    <Image source={artImage} style={styles.artworkPreview} />
                  ) : (
                    <View style={[styles.artworkPreview, styles.placeholderCircle]}>
                      <Icon name="image" size={40} color="#999" />
                    </View>
                  )}
                  <Text style={styles.changePhotoText}>Choose Artwork Image</Text>
                </TouchableOpacity>
                <TextInput style={styles.input} placeholder="Title (optional)" placeholderTextColor="#999" value={artTitle} onChangeText={setArtTitle} />
                <TextInput style={[styles.input, { height: 80 }]} placeholder="Description (optional)" placeholderTextColor="#999" value={artDescription} onChangeText={setArtDescription} multiline />
                <TextInput style={styles.input} placeholder="Medium (e.g., Oil, Digital)" placeholderTextColor="#999" value={artMedium} onChangeText={setArtMedium} />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setArtModalVisible(false)} disabled={artUploading}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={submitArtwork} disabled={artUploading}>
                    <Text style={styles.saveButtonText}>{artUploading ? 'Uploading...' : 'Upload'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Comments Modal - Using reusable CommentModal */}
      <CommentModal
        commentModalVisible={commentsModalVisible}
        setCommentModalVisible={setCommentsModalVisible}
        currentPostComments={artComments || []}
        newCommentText={artNewComment}
        setNewCommentText={setArtNewComment}
        postComment={postArtComment}
        renderComment={renderArtComment}
        commentListRef={commentListRef}
        commentPage={commentPage}
        hasMoreComments={hasMoreComments}
        loadingMoreComments={loadingMoreComments}
        loadMoreComments={loadMoreArtComments}
        showLessComments={showLessArtComments}
        styles={styles}
      />
    </>
  );
}
