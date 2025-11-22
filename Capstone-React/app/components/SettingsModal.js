import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsModal(props) {
  const {
    // Styles
    styles,

    // Edit Profile modal props
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
    tempSex,
    setTempSex,
    showSexDropdown,
    setShowSexDropdown,
    tempBirthday,
    formattedTempDate,
    setShowDatePicker,
    showDatePicker,
    onChangeTempDate,
    tempAddress,
    setTempAddress,
    tempBio,
    setTempBio,
    tempAbout,
    setTempAbout,
    handleSave,

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
    appShowSexDropdown,
    setAppShowSexDropdown,
    appBirthdate,
    appShowDatePicker,
    setAppShowDatePicker,
    appAddress,
    setAppAddress,
    appValidIdImage,
    appSelfieImage,
    pickValidIdImage,
    pickSelfieImage,
    appSubmitting,
    submitArtistApplication,
    onChangeAppDate,

    // Apply as Seller modal props
    sellerModalVisible,
    setSellerModalVisible,
    resetSellerForm,
    sellerCurrentStep,
    shopName,
    setShopName,
    sellerFullName,
    setSellerFullName,
    sellerEmail,
    setSellerEmail,
    sellerPhone,
    setSellerPhone,
    street,
    setStreet,
    landmark,
    setLandmark,
    regions,
    selectedRegion,
    showRegionDropdown,
    setShowRegionDropdown,
    handleRegionChange,
    provinces,
    selectedProvince,
    showProvinceDropdown,
    setShowProvinceDropdown,
    handleProvinceChange,
    cities,
    selectedCity,
    showCityDropdown,
    setShowCityDropdown,
    handleCityChange,
    barangays,
    selectedBarangay,
    showBarangayDropdown,
    setShowBarangayDropdown,
    handleBarangayChange,
    postalCode,
    setPostalCode,
    shopDescription,
    setShopDescription,
    sellerIdDocument,
    pickSellerIdDocument,
    agreedToTerms,
    setAgreedToTerms,
    sellerSubmitting,
    handleSellerBack,
    handleSellerNext,
    submitSellerApplication,
  } = props;

  return (
    <>
      {/* Edit Profile Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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

              <ScrollView
                style={styles.uploadModalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.uploadInputLabel}>Profile Photo</Text>
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.uploadImagePicker}
                >
                  {tempImage ? (
                    <Image source={tempImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons
                        name="person-circle-outline"
                        size={48}
                        color="#A68C7B"
                      />
                      <Text style={styles.uploadImageText}>
                        Tap to change photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>Cover Photo</Text>
                <TouchableOpacity
                  onPress={pickBackgroundImage}
                  style={styles.uploadImagePicker}
                >
                  {tempBackgroundImage ? (
                    <Image
                      source={{ uri: tempBackgroundImage.uri }}
                      style={styles.uploadPickedImage}
                    />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>
                        Tap to change cover
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>First Name</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="First Name"
                  value={tempFirstName}
                  onChangeText={setTempFirstName}
                />

                <Text style={styles.uploadInputLabel}>Middle Name</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Middle Name"
                  value={tempMiddleName}
                  onChangeText={setTempMiddleName}
                />

                <Text style={styles.uploadInputLabel}>Last Name</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Last Name"
                  value={tempLastName}
                  onChangeText={setTempLastName}
                />

                <Text style={styles.uploadInputLabel}>Username</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Username"
                  value={tempUserNameField}
                  onChangeText={setTempUserNameField}
                />

                <Text style={styles.uploadInputLabel}>Sex</Text>
                <TouchableOpacity
                  style={styles.uploadInput}
                  onPress={() => setShowSexDropdown(!showSexDropdown)}
                >
                  <Text style={{ color: tempSex ? "#000" : "#999" }}>
                    {tempSex || "Select Sex"}
                  </Text>
                  <Ionicons
                    name={showSexDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#555"
                    style={{ position: "absolute", right: 12, top: 12 }}
                  />
                </TouchableOpacity>
                {showSexDropdown && (
                  <View style={styles.categoryDropdown}>
                    {["Male", "Female", "PreferNotToSay"].map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.categoryItem}
                        onPress={() => {
                          setTempSex(item);
                          setShowSexDropdown(false);
                        }}
                      >
                        <Text style={styles.categoryItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.uploadInputLabel}>Birthday</Text>
                <TouchableOpacity
                  style={styles.uploadInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: tempBirthday ? "#000" : "#999" }}>
                    {tempBirthday ? formattedTempDate : "Select your birthday"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={tempBirthday}
                    mode="date"
                    display="default"
                    onChange={onChangeTempDate}
                  />
                )}

                <Text style={styles.uploadInputLabel}>Address</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Enter your address"
                  value={tempAddress}
                  onChangeText={setTempAddress}
                />

                <Text style={styles.uploadInputLabel}>Bio</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Enter your bio"
                  value={tempBio}
                  onChangeText={setTempBio}
                />

                <Text style={styles.uploadInputLabel}>About</Text>
                <TextInput
                  style={[styles.uploadInput, styles.uploadTextArea]}
                  placeholder="Write something about yourself"
                  multiline
                  value={tempAbout}
                  onChangeText={setTempAbout}
                />

                <TouchableOpacity style={styles.uploadButton} onPress={handleSave}>
                  <Text style={styles.uploadButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Apply as Artist Modal */}
      <Modal
        visible={applyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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

              <ScrollView
                style={styles.uploadModalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.uploadInputLabel}>First Name *</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="First Name"
                  value={appFirstName}
                  onChangeText={setAppFirstName}
                />

                <Text style={styles.uploadInputLabel}>Middle Initial</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Middle Initial"
                  value={appMiddleInitial}
                  onChangeText={setAppMiddleInitial}
                  maxLength={1}
                />

                <Text style={styles.uploadInputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Last Name"
                  value={appLastName}
                  onChangeText={setAppLastName}
                />

                <Text style={styles.uploadInputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  value={appPhone}
                  onChangeText={setAppPhone}
                />

                <Text style={styles.uploadInputLabel}>Age *</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Age"
                  keyboardType="numeric"
                  value={appAge}
                  onChangeText={setAppAge}
                />

                <Text style={styles.uploadInputLabel}>Sex *</Text>
                <TouchableOpacity
                  style={styles.uploadInput}
                  onPress={() => setAppShowSexDropdown(!appShowSexDropdown)}
                >
                  <Text style={{ color: appSex ? "#000" : "#999" }}>
                    {appSex || "Select Sex"}
                  </Text>
                  <Ionicons
                    name={appShowSexDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#555"
                    style={{ position: "absolute", right: 12, top: 12 }}
                  />
                </TouchableOpacity>
                {appShowSexDropdown && (
                  <View style={styles.categoryDropdown}>
                    {["Male", "Female", "PreferNotToSay"].map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.categoryItem}
                        onPress={() => {
                          setAppSex(item);
                          setAppShowSexDropdown(false);
                        }}
                      >
                        <Text style={styles.categoryItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.uploadInputLabel}>Birthdate *</Text>
                <TouchableOpacity
                  style={styles.uploadInput}
                  onPress={() => setAppShowDatePicker(true)}
                >
                  <Text style={{ color: appBirthdate ? "#000" : "#999" }}>
                    {appBirthdate
                      ? appBirthdate.toLocaleDateString("en-US")
                      : "Select your birthdate"}
                  </Text>
                </TouchableOpacity>
                {appShowDatePicker && (
                  <DateTimePicker
                    value={appBirthdate}
                    mode="date"
                    display="default"
                    onChange={onChangeAppDate}
                  />
                )}

                <Text style={styles.uploadInputLabel}>Address *</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Address"
                  value={appAddress}
                  onChangeText={setAppAddress}
                />

                <Text style={styles.uploadInputLabel}>Valid ID *</Text>
                <TouchableOpacity
                  onPress={pickValidIdImage}
                  style={styles.uploadImagePicker}
                >
                  {appValidIdImage ? (
                    <Image
                      source={appValidIdImage}
                      style={styles.uploadPickedImage}
                    />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="card-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>
                        Tap to upload Valid ID
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>Selfie *</Text>
                <TouchableOpacity
                  onPress={pickSelfieImage}
                  style={styles.uploadImagePicker}
                >
                  {appSelfieImage ? (
                    <Image
                      source={appSelfieImage}
                      style={styles.uploadPickedImage}
                    />
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
                    {appSubmitting ? "Submitting..." : "Submit Application"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Apply as Seller Modal - 3 Steps */}
      <Modal
        visible={sellerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          resetSellerForm();
          setSellerModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <View>
                  <Text style={styles.uploadModalTitle}>Become a Museo Seller</Text>
                  <Text style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                    Step {sellerCurrentStep} of 3 - {sellerCurrentStep === 1
                      ? "Basic Information"
                      : sellerCurrentStep === 2
                      ? "Business Address"
                      : "Verification"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    resetSellerForm();
                    setSellerModalVisible(false);
                  }}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 4,
                  paddingHorizontal: 20,
                  marginBottom: 20,
                }}
              >
                {[1, 2, 3].map((step) => (
                  <View
                    key={step}
                    style={{
                      flex: 1,
                      height: 4,
                      backgroundColor: step <= sellerCurrentStep ? "#A68C7B" : "#e0e0e0",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </View>

              <ScrollView
                style={styles.uploadModalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Step 1: Basic Information */}
                {sellerCurrentStep === 1 && (
                  <View>
                    <View
                      style={{
                        padding: 12,
                        backgroundColor: "#FFF9E6",
                        borderRadius: 8,
                        marginBottom: 20,
                        borderLeftWidth: 4,
                        borderLeftColor: "#A68C7B",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: "#666" }}>
                        <Text style={{ fontWeight: "bold" }}>Welcome!</Text> Start
                        selling your artwork on Museo. No business registration
                        required for individual artists.
                      </Text>
                    </View>

                    <Text style={styles.uploadInputLabel}>Shop Name *</Text>
                    <TextInput
                      style={styles.uploadInput}
                      placeholder="e.g., Aria's Art Studio"
                      value={shopName}
                      onChangeText={setShopName}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        marginBottom: 16,
                        marginTop: -8,
                      }}
                    >
                      This will be your public seller name on Museo
                    </Text>

                    <Text style={styles.uploadInputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.uploadInput}
                      placeholder="Juan Dela Cruz"
                      value={sellerFullName}
                      onChangeText={setSellerFullName}
                    />

                    <Text style={styles.uploadInputLabel}>Email *</Text>
                    <TextInput
                      style={styles.uploadInput}
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      value={sellerEmail}
                      onChangeText={setSellerEmail}
                    />

                    <Text style={styles.uploadInputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.uploadInput}
                      placeholder="+63 912 345 6789"
                      keyboardType="phone-pad"
                      value={sellerPhone}
                      onChangeText={setSellerPhone}
                    />
                  </View>
                )}

                {/* Step 2: Business Address */}
                {sellerCurrentStep === 2 && (
                  <View>
                    <View
                      style={{
                        padding: 12,
                        backgroundColor: "#FFF9E6",
                        borderRadius: 8,
                        marginBottom: 20,
                        borderLeftWidth: 4,
                        borderLeftColor: "#A68C7B",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: "#666" }}>
                        <Text style={{ fontWeight: "bold" }}>Business Address</Text> -
                        This will be used for returns and verification purposes.
                      </Text>
                    </View>

                    <Text style={styles.uploadInputLabel}>Street Address *</Text>
                    <TextInput
                      style={styles.uploadInput}
                      placeholder="House/Unit No., Building, Street"
                      value={street}
                      onChangeText={setStreet}
                    />

                    <Text style={styles.uploadInputLabel}>Landmark (Optional)</Text>
                    <TextInput
                      style={styles.uploadInput}
                      placeholder="Near..."
                      value={landmark}
                      onChangeText={setLandmark}
                    />

                    <Text style={styles.uploadInputLabel}>Region *</Text>
                    <TouchableOpacity
                      style={styles.uploadInput}
                      onPress={() => setShowRegionDropdown(!showRegionDropdown)}
                    >
                      <Text style={{ color: selectedRegion ? "#000" : "#999" }}>
                        {selectedRegion
                          ? regions.find((r) => r.code === selectedRegion)?.name
                          : "Select Region"}
                      </Text>
                      <Ionicons
                        name={showRegionDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#555"
                        style={{ position: "absolute", right: 12, top: 12 }}
                      />
                    </TouchableOpacity>
                    {showRegionDropdown && (
                      <View style={[styles.categoryDropdown, { maxHeight: 200 }]}> 
                        <ScrollView
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          {regions.map((region) => (
                            <TouchableOpacity
                              key={region.code}
                              style={styles.categoryItem}
                              onPress={() => handleRegionChange(region.code)}
                            >
                              <Text style={styles.categoryItemText}>{region.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <Text style={styles.uploadInputLabel}>Province *</Text>
                    <TouchableOpacity
                      style={[styles.uploadInput, { opacity: !selectedRegion ? 0.5 : 1 }]}
                      onPress={() => selectedRegion && setShowProvinceDropdown(!showProvinceDropdown)}
                      disabled={!selectedRegion}
                    >
                      <Text style={{ color: selectedProvince ? "#000" : "#999" }}>
                        {selectedProvince
                          ? provinces.find((p) => p.code === selectedProvince)?.name
                          : "Select Province"}
                      </Text>
                      <Ionicons
                        name={showProvinceDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#555"
                        style={{ position: "absolute", right: 12, top: 12 }}
                      />
                    </TouchableOpacity>
                    {showProvinceDropdown && (
                      <View style={[styles.categoryDropdown, { maxHeight: 200 }]}> 
                        <ScrollView
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          {provinces.map((province) => (
                            <TouchableOpacity
                              key={province.code}
                              style={styles.categoryItem}
                              onPress={() => handleProvinceChange(province.code)}
                            >
                              <Text style={styles.categoryItemText}>{province.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <Text style={styles.uploadInputLabel}>City/Municipality *</Text>
                    <TouchableOpacity
                      style={[styles.uploadInput, { opacity: !selectedProvince ? 0.5 : 1 }]}
                      onPress={() => selectedProvince && setShowCityDropdown(!showCityDropdown)}
                      disabled={!selectedProvince}
                    >
                      <Text style={{ color: selectedCity ? "#000" : "#999" }}>
                        {selectedCity
                          ? cities.find((c) => c.code === selectedCity)?.name
                          : "Select City/Municipality"}
                      </Text>
                      <Ionicons
                        name={showCityDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#555"
                        style={{ position: "absolute", right: 12, top: 12 }}
                      />
                    </TouchableOpacity>
                    {showCityDropdown && (
                      <View style={[styles.categoryDropdown, { maxHeight: 200 }]}> 
                        <ScrollView
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          {cities.map((city) => (
                            <TouchableOpacity
                              key={city.code}
                              style={styles.categoryItem}
                              onPress={() => handleCityChange(city.code)}
                            >
                              <Text style={styles.categoryItemText}>{city.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <Text style={styles.uploadInputLabel}>Barangay *</Text>
                    <TouchableOpacity
                      style={[styles.uploadInput, { opacity: !selectedCity ? 0.5 : 1 }]}
                      onPress={() => selectedCity && setShowBarangayDropdown(!showBarangayDropdown)}
                      disabled={!selectedCity}
                    >
                      <Text style={{ color: selectedBarangay ? "#000" : "#999" }}>
                        {selectedBarangay
                          ? barangays.find((b) => b.code === selectedBarangay)?.name
                          : "Select Barangay"}
                      </Text>
                      <Ionicons
                        name={showBarangayDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#555"
                        style={{ position: "absolute", right: 12, top: 12 }}
                      />
                    </TouchableOpacity>
                    {showBarangayDropdown && (
                      <View style={[styles.categoryDropdown, { maxHeight: 200 }]}> 
                        <ScrollView
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          {barangays.map((barangay) => (
                            <TouchableOpacity
                              key={barangay.code}
                              style={styles.categoryItem}
                              onPress={() => handleBarangayChange(barangay.code)}
                            >
                              <Text style={styles.categoryItemText}>{barangay.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <Text style={styles.uploadInputLabel}>Postal Code *</Text>
                    <TextInput
                      style={styles.uploadInput}
                      placeholder="1234"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={postalCode}
                      onChangeText={setPostalCode}
                    />
                  </View>
                )}

                {/* Step 3: Verification & Terms */}
                {sellerCurrentStep === 3 && (
                  <View>
                    <View
                      style={{
                        padding: 12,
                        backgroundColor: "#FFF9E6",
                        borderRadius: 8,
                        marginBottom: 20,
                        borderLeftWidth: 4,
                        borderLeftColor: "#A68C7B",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: "#666" }}>
                        <Text style={{ fontWeight: "bold" }}>Final Step!</Text> Upload
                        your ID and agree to our seller terms.
                      </Text>
                    </View>

                    <Text style={styles.uploadInputLabel}>Shop Description *</Text>
                    <TextInput
                      style={[styles.uploadInput, styles.uploadTextArea]}
                      placeholder="Tell buyers about your art style, inspiration, and what makes your work unique..."
                      multiline
                      numberOfLines={4}
                      value={shopDescription}
                      onChangeText={setShopDescription}
                    />

                    <Text style={styles.uploadInputLabel}>
                      Government ID (for verification) *
                    </Text>
                    <TouchableOpacity
                      onPress={pickSellerIdDocument}
                      style={styles.uploadImagePicker}
                    >
                      {sellerIdDocument ? (
                        <Image
                          source={sellerIdDocument}
                          style={styles.uploadPickedImage}
                        />
                      ) : (
                        <View style={styles.uploadImagePlaceholder}>
                          <Ionicons name="card-outline" size={48} color="#A68C7B" />
                          <Text style={styles.uploadImageText}>
                            Upload valid government ID
                          </Text>
                          <Text style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                            JPG, PNG up to 10MB
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Seller Agreement */}
                    <View
                      style={{
                        padding: 12,
                        backgroundColor: "#f5f5f5",
                        borderRadius: 8,
                        maxHeight: 200,
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#A68C7B",
                          marginBottom: 8,
                        }}
                      >
                        Seller Agreement
                      </Text>
                      <ScrollView style={{ maxHeight: 140 }}>
                        <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
                          • 15% commission on all sales{"\n"}
                          • Provide accurate artwork descriptions{"\n"}
                          • Ship within specified timeframe{"\n"}
                          • Respond to inquiries within 2-3 business days{"\n"}
                          • Honor returns for damaged items{"\n"}
                          • No counterfeit or stolen artwork{"\n"}
                          • Maintain professional conduct{"\n"}
                          • Payments processed within 7-10 days after delivery{"\n"}
                          • You own rights to artwork sold{"\n"}
                          • Museo may remove listings that violate policies
                        </Text>
                      </ScrollView>
                    </View>

                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
                      onPress={() => setAgreedToTerms(!agreedToTerms)}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: agreedToTerms ? "#A68C7B" : "#ccc",
                          backgroundColor: agreedToTerms ? "#A68C7B" : "#fff",
                          marginRight: 8,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {agreedToTerms && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <Text style={{ fontSize: 14, color: "#333" }}>
                        I agree to the Seller Terms and Conditions *
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Navigation Buttons */}
                <View
                  style={{ flexDirection: "row", gap: 10, marginTop: 20, paddingBottom: 20 }}
                >
                  {sellerCurrentStep > 1 && (
                    <TouchableOpacity
                      style={[styles.uploadButton, { backgroundColor: "#e0e0e0", flex: 1 }]}
                      onPress={handleSellerBack}
                      disabled={sellerSubmitting}
                    >
                      <Text style={[styles.uploadButtonText, { color: "#333" }]}> 
                        Back
                      </Text>
                    </TouchableOpacity>
                  )}

                  {sellerCurrentStep < 3 ? (
                    <TouchableOpacity
                      style={[styles.uploadButton, { flex: 1 }]}
                      onPress={handleSellerNext}
                      disabled={sellerSubmitting}
                    >
                      <Text style={styles.uploadButtonText}>Next</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.uploadButton,
                        { flex: 1, opacity: !agreedToTerms || sellerSubmitting ? 0.5 : 1 },
                      ]}
                      onPress={submitSellerApplication}
                      disabled={!agreedToTerms || sellerSubmitting}
                    >
                      <Text style={styles.uploadButtonText}>
                        {sellerSubmitting ? "Submitting..." : "Submit Application"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
