import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome';
import CommentModal from './CommentModal';

export default function ProfileModal(props) {
  const [fullscreenImageUri, setFullscreenImageUri] = useState(null);

  const {
    // Styles
    styles,

    // Apply as Artist modal props
    applyModalVisible,
    setApplyModalVisible,
    appFirstName,
    setAppFirstName,
    appMiddleInitial,
    setAppMiddleInitial,
    appLastName,
    setAppLastName,
    appPhone,
    setAppPhone,
    appAge,
    setAppAge,
    appSex,
    setAppSex,
    appBirthdate,
    setAppBirthdate,
    appShowSexDropdown,
    setAppShowSexDropdown,
    appShowDatePicker,
    setAppShowDatePicker,
    appAddress,
    setAppAddress,
    appValidIdImage,
    appSelfieImage,
    appSubmitting,
    onChangeAppDate,
    pickValidIdImage,
    pickSelfieImage,
    submitArtistApplication,

    // Artwork details modal props
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

    // Artwork upload modal props
    artModalVisible,
    setArtModalVisible,
    pickArtworkImage,
    artImage,
    artTitle,
    setArtTitle,
    artMedium,
    setArtMedium,
    artDescription,
    setArtDescription,
    artApplyWatermark,
    setArtApplyWatermark,
    artWatermarkText,
    setArtWatermarkText,
    submitArtwork,
    artUploading,

    // Edit profile modal props
    modalVisible,
    setModalVisible,
    pickImage,
    tempImage,
    pickBackgroundImage,
    tempBackgroundImage,
    tempFirstName,
    setTempFirstName,
    tempMiddleName,
    setTempMiddleName,
    tempLastName,
    setTempLastName,
    tempUserNameField,
    setTempUserNameField,
    showSexDropdown,
    setShowSexDropdown,
    tempSex,
    setTempSex,
    tempBirthday,
    setShowDatePicker,
    showDatePicker,
    formattedTempDate,
    onChangeTempDate,
    tempAddress,
    setTempAddress,
    tempBio,
    setTempBio,
    tempAbout,
    setTempAbout,
    handleSave,
  } = props;

  useEffect(() => {
    if (!selectedArt) {
      setArtMenuVisible(false);
    }
  }, [selectedArt, setArtMenuVisible]);

  return (
    <>
      {/* Apply as Artist Modal */}
      <Modal
        visible={applyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Apply as Artist</Text>
                <TouchableOpacity onPress={() => setApplyModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <Text style={styles.uploadInputLabel}>First Name *</Text>
                <TextInput style={styles.uploadInput} placeholder="First Name" value={appFirstName} onChangeText={setAppFirstName} />
                
                <Text style={styles.uploadInputLabel}>Middle Initial</Text>
                <TextInput style={styles.uploadInput} placeholder="Middle Initial" value={appMiddleInitial} onChangeText={setAppMiddleInitial} maxLength={1} />
                
                <Text style={styles.uploadInputLabel}>Last Name *</Text>
                <TextInput style={styles.uploadInput} placeholder="Last Name" value={appLastName} onChangeText={setAppLastName} />
                
                <Text style={styles.uploadInputLabel}>Phone Number *</Text>
                <TextInput style={styles.uploadInput} placeholder="Phone Number" keyboardType="phone-pad" value={appPhone} onChangeText={setAppPhone} />
                
                <Text style={styles.uploadInputLabel}>Age *</Text>
                <TextInput style={styles.uploadInput} placeholder="Age" keyboardType="numeric" value={appAge} onChangeText={setAppAge} />

                <Text style={styles.uploadInputLabel}>Sex *</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setAppShowSexDropdown(!appShowSexDropdown)}>
                  <Text style={{ color: appSex ? '#000' : '#999' }}>{appSex || 'Select Sex'}</Text>
                  <Ionicons name={appShowSexDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#555" style={{ position: 'absolute', right: 12, top: 12 }} />
                </TouchableOpacity>
                {appShowSexDropdown && (
                  <View style={styles.categoryDropdown}>
                    {['Male', 'Female', 'PreferNotToSay'].map(item => (
                      <TouchableOpacity key={item} style={styles.categoryItem} onPress={() => { setAppSex(item); setAppShowSexDropdown(false); }}>
                        <Text style={styles.categoryItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.uploadInputLabel}>Birthdate *</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setAppShowDatePicker(true)}>
                  <Text style={{ color: appBirthdate ? '#000' : '#999' }}>
                    {appBirthdate ? appBirthdate.toLocaleDateString('en-US') : 'Select your birthdate'}
                  </Text>
                </TouchableOpacity>
                {appShowDatePicker && (
                  <DateTimePicker value={appBirthdate} mode="date" display="default" onChange={onChangeAppDate} />
                )}

                <Text style={styles.uploadInputLabel}>Address *</Text>
                <TextInput style={styles.uploadInput} placeholder="Address" value={appAddress} onChangeText={setAppAddress} />

                <Text style={styles.uploadInputLabel}>Valid ID *</Text>
                <TouchableOpacity onPress={pickValidIdImage} style={styles.uploadImagePicker}>
                  {appValidIdImage ? (
                    <Image source={appValidIdImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="card-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to upload Valid ID</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>Selfie *</Text>
                <TouchableOpacity onPress={pickSelfieImage} style={styles.uploadImagePicker}>
                  {appSelfieImage ? (
                    <Image source={appSelfieImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="person-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to upload Selfie</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadButton, appSubmitting && styles.uploadButtonDisabled]}
                  onPress={submitArtistApplication}
                  disabled={appSubmitting}
                >
                  <Text style={styles.uploadButtonText}>
                    {appSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                <Image 
                  source={{ uri: selectedArt.image }} 
                  style={styles.artModalImage}
                  onError={(error) => {
                    console.log('[profile.js] Image load error:', error.nativeEvent?.error);
                    console.log('[profile.js] Failed image URI:', selectedArt.image);
                  }}
                />
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
                    
                    {/* Three-dot Menu for Edit/Delete */}
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

      {/* Artwork Upload Modal */}
      <Modal
        visible={artModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setArtModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Upload Artwork</Text>
                <TouchableOpacity onPress={() => setArtModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Image Picker */}
              <TouchableOpacity style={styles.uploadImagePicker} onPress={pickArtworkImage}>
                {artImage ? (
                  <Image source={artImage} style={styles.uploadPickedImage} />
                ) : (
                  <View style={styles.uploadImagePlaceholder}>
                    <Ionicons name="image-outline" size={48} color="#A68C7B" />
                    <Text style={styles.uploadImageText}>Tap to select image</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Title Input */}
              <Text style={styles.uploadInputLabel}>Title *</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="Enter artwork title"
                value={artTitle}
                onChangeText={setArtTitle}
              />

              {/* Medium Input */}
              <Text style={styles.uploadInputLabel}>Medium</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="e.g., Oil, Digital, Watercolor"
                value={artMedium}
                onChangeText={setArtMedium}
              />

              {/* Description Input */}
              <Text style={styles.uploadInputLabel}>Description</Text>
              <TextInput
                style={[styles.uploadInput, styles.uploadTextArea]}
                placeholder="Enter description"
                value={artDescription}
                onChangeText={setArtDescription}
                multiline
                numberOfLines={4}
              />

              {/* Watermark Section */}
              <View style={styles.watermarkSection}>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtApplyWatermark(!artApplyWatermark)}
                >
                  <Ionicons 
                    name={artApplyWatermark ? 'checkbox' : 'square-outline'} 
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

                {artApplyWatermark && (
                  <View style={styles.watermarkInputContainer}>
                    <Text style={styles.watermarkInputLabel}>
                      Custom watermark text (optional)
                    </Text>
                    <TextInput
                      style={styles.watermarkInput}
                      placeholder={`© Your Name ${new Date().getFullYear()} • Museo`}
                      value={artWatermarkText}
                      onChangeText={setArtWatermarkText}
                    />
                    <Text style={styles.watermarkHint}>
                      Leave blank to use default watermark
                    </Text>
                  </View>
                )}
              </View>

              {/* Upload Button */}
              <TouchableOpacity
                style={[styles.uploadButton, artUploading && styles.uploadButtonDisabled]}
                onPress={submitArtwork}
                disabled={artUploading}
              >
                <Text style={styles.uploadButtonText}>
                  {artUploading ? 'Uploading...' : 'Upload Artwork'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.uploadInputLabel}>Profile Photo</Text>
                <TouchableOpacity onPress={pickImage} style={styles.uploadImagePicker}>
                  {tempImage ? (
                    <Image source={tempImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="person-circle-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to change photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>Cover Photo</Text>
                <TouchableOpacity onPress={pickBackgroundImage} style={styles.uploadImagePicker}>
                  {tempBackgroundImage ? (
                    <Image source={{ uri: tempBackgroundImage.uri }} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to change cover</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>First Name</Text>
                <TextInput style={styles.uploadInput} placeholder="First Name" value={tempFirstName} onChangeText={setTempFirstName} />

                <Text style={styles.uploadInputLabel}>Middle Name</Text>
                <TextInput style={styles.uploadInput} placeholder="Middle Name" value={tempMiddleName} onChangeText={setTempMiddleName} />

                <Text style={styles.uploadInputLabel}>Last Name</Text>
                <TextInput style={styles.uploadInput} placeholder="Last Name" value={tempLastName} onChangeText={setTempLastName} />

                <Text style={styles.uploadInputLabel}>Username</Text>
                <TextInput style={styles.uploadInput} placeholder="Username" value={tempUserNameField} onChangeText={setTempUserNameField} />

                <Text style={styles.uploadInputLabel}>Sex</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setShowSexDropdown(!showSexDropdown)}>
                  <Text style={{ color: tempSex ? '#000' : '#999' }}>{tempSex || 'Select Sex'}</Text>
                  <Ionicons name={showSexDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#555" style={{ position: 'absolute', right: 12, top: 12 }} />
                </TouchableOpacity>
                {showSexDropdown && (
                  <View style={styles.categoryDropdown}>
                    {["Male", "Female", "PreferNotToSay"].map((item) => (
                      <TouchableOpacity key={item} style={styles.categoryItem} onPress={() => { setTempSex(item); setShowSexDropdown(false); }}>
                        <Text style={styles.categoryItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.uploadInputLabel}>Birthday</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: tempBirthday ? '#000' : '#999' }}>
                    {tempBirthday ? formattedTempDate : "Select your birthday"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={tempBirthday} mode="date" display="default" onChange={onChangeTempDate} />
                )}

                <Text style={styles.uploadInputLabel}>Address</Text>
                <TextInput style={styles.uploadInput} placeholder="Enter your address" value={tempAddress} onChangeText={setTempAddress} />

                <Text style={styles.uploadInputLabel}>Bio</Text>
                <TextInput style={styles.uploadInput} placeholder="Enter your bio" value={tempBio} onChangeText={setTempBio} />

                <Text style={styles.uploadInputLabel}>About</Text>
                <TextInput style={[styles.uploadInput, styles.uploadTextArea]} placeholder="Write something about yourself" multiline value={tempAbout} onChangeText={setTempAbout} />

                <TouchableOpacity style={styles.uploadButton} onPress={handleSave}>
                  <Text style={styles.uploadButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    </>
  );
}
