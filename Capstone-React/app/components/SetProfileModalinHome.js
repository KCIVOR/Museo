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
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SetProfileModalinHome({
  profileModalVisible,
  setProfileModalVisible,
  firstName,
  setFirstName,
  middleName,
  setMiddleName,
  lastName,
  setLastName,
  userNameField,
  setUserNameField,
  sex,
  setSex,
  birthday,
  setBirthday,
  showDatePicker,
  setShowDatePicker,
  showSexDropdown,
  setShowSexDropdown,
  address,
  setAddress,
  bio,
  setBio,
  about,
  setAbout,
  tempImage,
  tempBackgroundImage,
  formattedDate,
  onChangeDate,
  pickProfileImage,
  pickBackgroundImage,
  handleProfileSave,
  styles,
}) {
  return (
    <Modal
      visible={profileModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            <View style={styles.uploadModalHeader}>
              <Text style={styles.uploadModalTitle}>Complete Your Profile</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.uploadModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.uploadInputLabel}>Profile Photo</Text>
              <TouchableOpacity onPress={pickProfileImage} style={styles.uploadImagePicker}>
                {tempImage ? (
                  <Image source={tempImage} style={styles.uploadPickedImage} />
                ) : (
                  <View style={styles.uploadImagePlaceholder}>
                    <Ionicons name="person-circle-outline" size={48} color="#A68C7B" />
                    <Text style={styles.uploadImageText}>Tap to add profile photo</Text>
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
                    <Text style={styles.uploadImageText}>Tap to add cover photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.uploadInputLabel}>First Name</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />

              <Text style={styles.uploadInputLabel}>Middle Name</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="Middle Name"
                value={middleName}
                onChangeText={setMiddleName}
              />

              <Text style={styles.uploadInputLabel}>Last Name</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />

              <Text style={styles.uploadInputLabel}>Username</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="Username"
                value={userNameField}
                onChangeText={setUserNameField}
              />

              <Text style={styles.uploadInputLabel}>Sex</Text>
              <TouchableOpacity
                style={styles.uploadInput}
                onPress={() => setShowSexDropdown(!showSexDropdown)}
              >
                <Text style={{ color: sex ? '#000' : '#999' }}>{sex || 'Select Sex'}</Text>
                <Ionicons
                  name={showSexDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#555"
                  style={{ position: 'absolute', right: 12, top: 12 }}
                />
              </TouchableOpacity>
              {showSexDropdown && (
                <View style={styles.categoryDropdown}>
                  {['Male', 'Female', 'PreferNotToSay'].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.categoryItem}
                      onPress={() => {
                        setSex(item);
                        setShowSexDropdown(false);
                      }}
                    >
                      <Text style={styles.categoryItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.uploadInputLabel}>Birthday</Text>
              <TouchableOpacity style={styles.uploadInput} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: birthday ? '#000' : '#999' }}>
                  {birthday ? formattedDate : 'Select your birthday'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker value={birthday} mode="date" display="default" onChange={onChangeDate} />
              )}

              <Text style={styles.uploadInputLabel}>Address</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="Enter your address"
                value={address}
                onChangeText={setAddress}
              />

              <Text style={styles.uploadInputLabel}>Bio</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="Enter your bio"
                value={bio}
                onChangeText={setBio}
              />

              <Text style={styles.uploadInputLabel}>About</Text>
              <TextInput
                style={[styles.uploadInput, styles.uploadTextArea]}
                placeholder="Write something about yourself"
                multiline
                value={about}
                onChangeText={setAbout}
              />

              <TouchableOpacity style={styles.uploadButton} onPress={handleProfileSave}>
                <Text style={styles.uploadButtonText}>Save Profile</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
