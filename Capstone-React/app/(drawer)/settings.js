import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, KeyboardAvoidingView, Alert, SafeAreaView, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../components/Header";
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";
import AndroidFooterSpacer from '../components/Footer';
import SettingsModal from "../components/SettingsModal";

const API_BASE = "http://192.168.18.79:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

export default function SettingsScreen() {
  const { userData, refreshUserData } = useUser();
  const role = userData?.role || null;
  const router = useRouter();

  // Profile state
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userNameField, setUserNameField] = useState("");
  const [username, setUsername] = useState("");
  const [sex, setSex] = useState("");
  const [birthday, setBirthday] = useState(new Date());
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [about, setAbout] = useState("");
  const [image, setImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Notification states
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);
  const [commentsLikes, setCommentsLikes] = useState(true);
  
  // Notifications list
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  // Collapsible sections
  const [accountExpanded, setAccountExpanded] = useState(true);
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [marketplaceExpanded, setMarketplaceExpanded] = useState(true);

  // Privacy states
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  // Marketplace states
  const [commissionRate, setCommissionRate] = useState('15');
  const [acceptCustomOrders, setAcceptCustomOrders] = useState(true);
  const [internationalShipping, setInternationalShipping] = useState(false);
  const [vacationMode, setVacationMode] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState('account');

  // Activities state
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Change email state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [emailMsgType, setEmailMsgType] = useState('');

  // Edit Profile modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [tempBackgroundImage, setTempBackgroundImage] = useState(null);
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempMiddleName, setTempMiddleName] = useState("");
  const [tempLastName, setTempLastName] = useState("");
  const [tempUserNameField, setTempUserNameField] = useState("");
  const [tempSex, setTempSex] = useState("");
  const [tempBirthday, setTempBirthday] = useState(new Date());
  const [tempAddress, setTempAddress] = useState("");
  const [tempBio, setTempBio] = useState("");
  const [tempAbout, setTempAbout] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSexDropdown, setShowSexDropdown] = useState(false);

  // Apply as Artist modal state
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [appFirstName, setAppFirstName] = useState("");
  const [appMiddleInitial, setAppMiddleInitial] = useState("");
  const [appLastName, setAppLastName] = useState("");
  const [appPhone, setAppPhone] = useState("");
  const [appAge, setAppAge] = useState("");
  const [appSex, setAppSex] = useState("");
  const [appBirthdate, setAppBirthdate] = useState(new Date());
  const [appShowSexDropdown, setAppShowSexDropdown] = useState(false);
  const [appShowDatePicker, setAppShowDatePicker] = useState(false);
  const [appAddress, setAppAddress] = useState("");
  const [appValidIdImage, setAppValidIdImage] = useState(null);
  const [appSelfieImage, setAppSelfieImage] = useState(null);
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Apply as Seller modal state (3-step wizard)
  const [sellerModalVisible, setSellerModalVisible] = useState(false);
  const [sellerCurrentStep, setSellerCurrentStep] = useState(1);
  const [sellerSubmitting, setSellerSubmitting] = useState(false);
  const [hasPendingSellerRequest, setHasPendingSellerRequest] = useState(false);
  
  // Step 1: Basic Information
  const [shopName, setShopName] = useState("");
  const [sellerFullName, setSellerFullName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  
  // Step 2: Business Address (PSGC)
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  
  // Step 3: Verification & Terms
  const [shopDescription, setShopDescription] = useState("");
  const [sellerIdDocument, setSellerIdDocument] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [sellerApplicationStatus, setSellerApplicationStatus] = useState(null); // 'pending', 'approved', 'rejected'

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        setAccessToken(at);
        setRefreshToken(rt);

        if (at && rt) {
          await refreshUserData();
          await fetchProfile(at, rt);
          await checkPendingRequest(at, rt);
        }
      } catch (e) {
        console.warn("Settings init error:", e?.message || e);
      }
    };
    init();
  }, []);

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refresh = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const at = data?.session?.access_token || null;
          const rt = data?.session?.refresh_token || null;
          
          if (at && rt) {
            await refreshUserData();
            await fetchProfile(at, rt);
            await checkPendingRequest(at, rt);
          }
        } catch (e) {
          console.warn("Settings focus refresh error:", e?.message || e);
        }
      };
      refresh();
      return () => {};
    }, [])
  );

  const fetchProfile = async (at = accessToken, rt = refreshToken) => {
    try {
      const res = await fetch(`${API_BASE}/profile/getProfile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to fetch profile (${res.status})`);

      const data = await res.json();
      const p = data?.profile ?? data;

      setFirstName(p.firstName || "");
      setMiddleName(p.middleName || "");
      setLastName(p.lastName || "");
      setUserNameField(p.username || "");
      setUsername(p.username || "");
      setSex(p.sex || "");
      setAddress(p.address || "");
      setBio(p.bio || "");
      setAbout(p.about || "");

      const fetchedBday = p.birthday || p.birthdate;
      if (fetchedBday) {
        const parsedDate = new Date(fetchedBday);
        setBirthday(parsedDate);
        await AsyncStorage.setItem("userBirthday", parsedDate.toISOString());
      }

      const resolveUrl = (u) => {
        if (!u) return null;
        return u.startsWith("http") ? u : `${API_ORIGIN}${u}`;
      };
      const avatarUrl = resolveUrl(p.profilePicture);
      const coverUrl = resolveUrl(p.coverPicture);
      setImage(avatarUrl ? { uri: avatarUrl } : null);
      setBackgroundImage(coverUrl ? { uri: coverUrl } : null);
    } catch (err) {
      console.warn("Profile fetch failed:", err.message);
    }
  };

  const checkPendingRequest = async (at, rt) => {
    try {
      const res = await fetch(`${API_BASE}/request/getRequest`, {
        method: "GET",
        credentials: "include",
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
      });
      if (!res.ok) {
        setHasPendingRequest(false);
        return false;
      }
      const data = await res.json();
      
      if (data?.requests && Array.isArray(data.requests)) {
        const pendingArtistRequest = data.requests.find(
          req => req.requestType === 'artist_verification' && req.status === 'pending'
        );
        const hasPending = !!pendingArtistRequest;
        setHasPendingRequest(hasPending);
        return hasPending;
      }
      setHasPendingRequest(false);
      return false;
    } catch (error) {
      console.error("Error checking pending request:", error?.message || error);
      setHasPendingRequest(false);
      return false;
    }
  };

  const fetchActivities = async () => {
    try {
      setLoadingActivities(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      
      const response = await fetch(`${API_BASE}/user/activities`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setActivities(result.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleChangeEmailSubmit = async () => {
    setEmailMsg('');
    if (!newEmail) {
      setEmailMsgType('error');
      setEmailMsg('Please enter a new email');
      return;
    }
    try {
      setEmailLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const res = await fetch(`${API_BASE}/auth/change-email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: JSON.stringify({ newEmail, currentPassword: emailCurrentPassword, access_token: at }),
      });
      const result = await res.json();
      if (!res.ok) {
        setEmailMsgType('error');
        setEmailMsg(result.message || 'Failed to start email change');
      } else {
        setEmailMsgType('success');
        setEmailMsg(result.message || 'Verification sent to the new email');
        setShowEmailForm(false);
        setNewEmail('');
        setEmailCurrentPassword('');
      }
    } catch (err) {
      setEmailMsgType('error');
      setEmailMsg('An error occurred. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setTempImage({ uri: result.assets[0].uri });
    }
  };

  const pickBackgroundImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled) {
      setTempBackgroundImage({ uri: result.assets[0].uri });
    }
  };

  const onChangeTempDate = (event, selectedDate) => {
    if (selectedDate) setTempBirthday(selectedDate);
    if (Platform.OS === 'android') setShowDatePicker(false);
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      if (tempImage) {
        const filename = tempImage.uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";
        formData.append("avatar", { uri: tempImage.uri, name: filename, type });
      }
      if (tempBackgroundImage) {
        const filename = tempBackgroundImage.uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";
        formData.append("cover", { uri: tempBackgroundImage.uri, name: filename, type });
      }

      formData.append("firstName", String(tempFirstName ?? ""));
      formData.append("middleName", String(tempMiddleName ?? ""));
      formData.append("lastName", String(tempLastName ?? ""));
      formData.append("username", String(tempUserNameField || username || ""));
      formData.append("sex", String(tempSex ?? ""));
      const birthdayISO = tempBirthday ? new Date(tempBirthday).toISOString() : "";
      formData.append("birthday", birthdayISO);
      formData.append("birthdate", birthdayISO);
      formData.append("address", String(tempAddress ?? ""));
      formData.append("bio", String(tempBio ?? ""));
      formData.append("about", String(tempAbout ?? ""));

      if (tempBirthday) {
        await AsyncStorage.setItem("userBirthday", new Date(tempBirthday).toISOString());
      }

      const res = await fetch(`${API_BASE}/profile/updateProfile`, {
        method: "POST",
        headers: {
          Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = "Failed to update profile";
        try {
          const errorData = await res.json();
          errorMsg = errorData?.message || errorData?.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      setModalVisible(false);
      setTempImage(null);
      setTempBackgroundImage(null);
      await fetchProfile();
      await refreshUserData();

      Alert.alert("Success", "Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      Alert.alert("Update Failed", err?.message || "Failed to save profile information");
    }
  };

  const pickValidIdImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setAppValidIdImage({ uri: result.assets[0].uri });
    }
  };

  const pickSelfieImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setAppSelfieImage({ uri: result.assets[0].uri });
    }
  };

  const onChangeAppDate = (event, selectedDate) => {
    if (selectedDate) setAppBirthdate(selectedDate);
    if (Platform.OS === 'android') setAppShowDatePicker(false);
  };

  const submitArtistApplication = async () => {
    try {
      if (!appFirstName || !appLastName || !appPhone || !appAge || !appSex || !appBirthdate || !appAddress || !appValidIdImage || !appSelfieImage) {
        Alert.alert('Incomplete', 'Please fill in all fields and attach both images.');
        return;
      }
      setAppSubmitting(true);

      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }

      const fd = new FormData();
      fd.append('requestType', 'artist_verification');
      fd.append('firstName', String(appFirstName));
      fd.append('midInit', String(appMiddleInitial || ''));
      fd.append('lastName', String(appLastName));
      fd.append('phone', String(appPhone));
      fd.append('age', String(appAge));
      fd.append('sex', String(appSex));
      fd.append('birthdate', new Date(appBirthdate).toISOString());
      fd.append('address', String(appAddress));
      fd.append('portfolio', '');
      fd.append('bio', '');
      fd.append('consent', 'true');
      fd.append('file', { uri: appValidIdImage.uri, name: 'valid_id.jpg', type: 'image/jpeg' });
      fd.append('file2', { uri: appSelfieImage.uri, name: 'selfie.jpg', type: 'image/jpeg' });

      const endpoint = `${API_BASE}/request/registerAsArtist`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: fd,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Application failed');
      }

      await checkPendingRequest(at, rt);
      Alert.alert('Submitted', 'Your application has been submitted.');
      setApplyModalVisible(false);
    } catch (e) {
      console.error('submitArtistApplication error:', e?.message || e);
      Alert.alert('Failed', e?.message || 'Could not submit application');
    } finally {
      setAppSubmitting(false);
    }
  };

  // Fetch PSGC regions when seller modal opens
  useEffect(() => {
    if (sellerModalVisible) {
      fetchRegions();
      // Pre-fill user data
      setSellerFullName(userData?.fullName || firstName + ' ' + lastName || '');
      setSellerEmail(userData?.email || '');
    }
  }, [sellerModalVisible]);

  const fetchRegions = async () => {
    try {
      const response = await fetch('https://psgc.gitlab.io/api/regions/');
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchProvinces = async (regionCode) => {
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
      const data = await response.json();
      setProvinces(data);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };

  const fetchCities = async (provinceCode) => {
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchBarangays = async (cityCode) => {
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
      const data = await response.json();
      setBarangays(data);
    } catch (error) {
      console.error('Error fetching barangays:', error);
    }
  };

  const handleRegionChange = (regionCode) => {
    setSelectedRegion(regionCode);
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    if (regionCode) {
      fetchProvinces(regionCode);
    }
    setShowRegionDropdown(false);
  };

  const handleProvinceChange = (provinceCode) => {
    setSelectedProvince(provinceCode);
    setSelectedCity('');
    setSelectedBarangay('');
    setCities([]);
    setBarangays([]);
    if (provinceCode) {
      fetchCities(provinceCode);
    }
    setShowProvinceDropdown(false);
  };

  const handleCityChange = (cityCode) => {
    setSelectedCity(cityCode);
    setSelectedBarangay('');
    setBarangays([]);
    if (cityCode) {
      fetchBarangays(cityCode);
    }
    setShowCityDropdown(false);
  };

  const handleBarangayChange = (barangayCode) => {
    setSelectedBarangay(barangayCode);
    setShowBarangayDropdown(false);
  };

  const validateSellerStep = () => {
    if (sellerCurrentStep === 1) {
      if (!shopName.trim() || !sellerFullName.trim() || !sellerEmail.trim() || !sellerPhone.trim()) {
        Alert.alert('Incomplete', 'Please fill in all required fields.');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(sellerEmail)) {
        Alert.alert('Invalid', 'Please enter a valid email address.');
        return false;
      }
    } else if (sellerCurrentStep === 2) {
      if (!street.trim() || !selectedRegion || !selectedProvince || !selectedCity || !selectedBarangay || !postalCode.trim()) {
        Alert.alert('Incomplete', 'Please complete all address fields.');
        return false;
      }
    } else if (sellerCurrentStep === 3) {
      if (!shopDescription.trim() || !sellerIdDocument) {
        Alert.alert('Incomplete', 'Please provide shop description and upload your ID.');
        return false;
      }
      if (!agreedToTerms) {
        Alert.alert('Agreement Required', 'You must agree to the Seller Terms and Conditions.');
        return false;
      }
    }
    return true;
  };

  const handleSellerNext = () => {
    if (validateSellerStep()) {
      setSellerCurrentStep(prev => prev + 1);
    }
  };

  const handleSellerBack = () => {
    setSellerCurrentStep(prev => prev - 1);
  };

  const submitSellerApplication = async () => {
    if (!validateSellerStep()) return;

    try {
      setSellerSubmitting(true);

      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }

      const region = regions.find(r => r.code === selectedRegion);
      const province = provinces.find(p => p.code === selectedProvince);
      const city = cities.find(c => c.code === selectedCity);
      const barangay = barangays.find(b => b.code === selectedBarangay);

      const fd = new FormData();
      fd.append('shopName', shopName);
      fd.append('fullName', sellerFullName);
      fd.append('email', sellerEmail);
      fd.append('phoneNumber', sellerPhone);
      fd.append('street', street);
      fd.append('landmark', landmark);
      fd.append('region', region?.name || '');
      fd.append('province', province?.name || '');
      fd.append('city', city?.name || '');
      fd.append('barangay', barangay?.name || '');
      fd.append('postalCode', postalCode);
      fd.append('shopDescription', shopDescription);
      fd.append('idDocument', {
        uri: sellerIdDocument.uri,
        name: 'government_id.jpg',
        type: 'image/jpeg'
      });

      const endpoint = `${API_BASE}/marketplace/seller/apply`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: fd,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Application failed');
      }

      const data = await res.json();
      
      // Success notification with detailed message
      Alert.alert(
        '🎉 Application Submitted!',
        data.message || 'Your seller application has been submitted successfully!\n\nWhat happens next:\n• Our team will review your application\n• You\'ll be notified via email once approved\n• You can check your application status in Settings\n\nThank you for joining Museo Marketplace!',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Seller application submitted successfully');
            }
          }
        ]
      );
      
      setHasPendingSellerRequest(true);
      resetSellerForm();
      setSellerModalVisible(false);
    } catch (e) {
      console.error('submitSellerApplication error:', e?.message || e);
      Alert.alert('Failed', e?.message || 'Could not submit application');
    } finally {
      setSellerSubmitting(false);
    }
  };

  const pickSellerIdDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setSellerIdDocument({ uri: result.assets[0].uri });
    }
  };

  const resetSellerForm = () => {
    setSellerCurrentStep(1);
    setShopName('');
    setSellerFullName('');
    setSellerEmail('');
    setSellerPhone('');
    setStreet('');
    setLandmark('');
    setSelectedRegion('');
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setPostalCode('');
    setShopDescription('');
    setSellerIdDocument(null);
    setAgreedToTerms(false);
  };

  const formattedTempDate = tempBirthday
    ? tempBirthday.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" showSearch={false} />

      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {['account', 'notifications', 'profile', 'marketplace', 'activities'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab);
                if (tab === 'activities') {
                  fetchActivities();
                }
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'account' && 'Account'}
                {tab === 'notifications' && 'Notifications'}
                {tab === 'profile' && 'Profile'}
                {tab === 'marketplace' && 'Marketplace'}
                {tab === 'activities' && 'Activities'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        
        {/* Account Tab */}
        {activeTab === 'account' && (
        <>
        {/* Account Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setAccountExpanded(!accountExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <Ionicons 
              name={accountExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#A68C7B" 
            />
          </TouchableOpacity>
          
          {accountExpanded && (
            <View>
              <Text style={styles.groupTitle}>Security</Text>
              <TouchableOpacity style={styles.settingButton}>
                <View style={styles.settingContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="key-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Change Password</Text>
                    <Text style={styles.settingDescription}>Update your account password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#999" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingButton}
                onPress={() => setShowEmailForm(!showEmailForm)}
              >
                <View style={styles.settingContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="mail-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Change Email</Text>
                    <Text style={styles.settingDescription}>{userData?.email || 'user@example.com'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#999" />
                </View>
              </TouchableOpacity>

              {showEmailForm && (
                <View style={styles.formContainer}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="New Email"
                    placeholderTextColor="#999"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    editable={!emailLoading}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Current Password (optional)"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={emailCurrentPassword}
                    onChangeText={setEmailCurrentPassword}
                    editable={!emailLoading}
                  />
                  {emailMsg && (
                    <Text style={[styles.formMessage, emailMsgType === 'error' && styles.formMessageError]}>
                      {emailMsg}
                    </Text>
                  )}
                  <View style={styles.formButtonGroup}>
                    <TouchableOpacity 
                      style={[styles.formButton, styles.formButtonPrimary]}
                      onPress={handleChangeEmailSubmit}
                      disabled={emailLoading}
                    >
                      <Text style={styles.formButtonText}>
                        {emailLoading ? 'Sending...' : 'Send Verification'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.formButton, styles.formButtonSecondary]}
                      onPress={() => setShowEmailForm(false)}
                      disabled={emailLoading}
                    >
                      <Text style={styles.formButtonSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
        </>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <Text style={styles.groupTitle}>Email Notifications</Text>
          
          <View style={styles.settingToggleItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Marketing Emails</Text>
              <Text style={styles.settingDescription}>Receive updates about new features</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleSwitch, marketingEmails && styles.toggleSwitchActive]}
              onPress={() => setMarketingEmails(!marketingEmails)}
            >
              <View style={[styles.toggleThumb, marketingEmails && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingToggleItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Order Updates</Text>
              <Text style={styles.settingDescription}>Get notified about order status</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleSwitch, orderUpdates && styles.toggleSwitchActive]}
              onPress={() => setOrderUpdates(!orderUpdates)}
            >
              <View style={[styles.toggleThumb, orderUpdates && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingToggleItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>New Followers</Text>
              <Text style={styles.settingDescription}>Notification when someone follows you</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleSwitch, newFollowers && styles.toggleSwitchActive]}
              onPress={() => setNewFollowers(!newFollowers)}
            >
              <View style={[styles.toggleThumb, newFollowers && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingToggleItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Comments & Likes</Text>
              <Text style={styles.settingDescription}>Notification for interactions on your posts</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleSwitch, commentsLikes && styles.toggleSwitchActive]}
              onPress={() => setCommentsLikes(!commentsLikes)}
            >
              <View style={[styles.toggleThumb, commentsLikes && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Settings</Text>
            
            {/* Profile Preview - Tap to View */}
            <TouchableOpacity 
              style={styles.profilePreviewCard}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <Image 
                source={image || { uri: 'https://via.placeholder.com/100' }} 
                style={styles.profileAvatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userData?.fullName || userData?.username || 'User Name'}
                </Text>
                <Text style={styles.profileUsername}>@{userData?.username || 'username'}</Text>
                <Text style={styles.profileViewHint}>Tap to view profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#A68C7B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => {
                setTempImage(image);
                setTempBackgroundImage(backgroundImage);
                setTempFirstName(firstName);
                setTempMiddleName(middleName);
                setTempLastName(lastName);
                setTempUserNameField(userNameField || username);
                setTempSex(sex);
                setTempBirthday(birthday || new Date());
                setTempAddress(address);
                setTempBio(bio);
                setTempAbout(about);
                setModalVisible(true);
              }}
            >
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="create-outline" size={24} color="#A68C7B" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Edit Profile</Text>
                  <Text style={styles.settingDescription}>Update your personal information</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>

            {/* Privacy Settings */}
            <Text style={styles.groupTitle}>Privacy</Text>
            
            <View>
              <View style={[styles.settingButton, styles.visibilityContainer]}>
                <View style={styles.settingContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="eye-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Profile Visibility</Text>
                    <Text style={styles.settingDescription}>Control who can see your profile</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.visibilitySelector}
                  onPress={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                >
                  <Text style={{ color: '#A68C7B', fontSize: 14, fontWeight: '600', flex: 1 }}>
                    {profileVisibility === 'public' ? 'Public' : profileVisibility === 'followers' ? 'Followers Only' : 'Private'}
                  </Text>
                  <Ionicons name={showVisibilityDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#A68C7B" />
                </TouchableOpacity>
              </View>
              
              {showVisibilityDropdown && (
                <View style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setProfileVisibility('public');
                    setShowVisibilityDropdown(false);
                  }}
                >
                  <Ionicons name="globe-outline" size={20} color="#666" />
                  <Text style={styles.dropdownText}>Public</Text>
                  {profileVisibility === 'public' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setProfileVisibility('followers');
                    setShowVisibilityDropdown(false);
                  }}
                >
                  <Ionicons name="people-outline" size={20} color="#666" />
                  <Text style={styles.dropdownText}>Followers Only</Text>
                  {profileVisibility === 'followers' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setProfileVisibility('private');
                    setShowVisibilityDropdown(false);
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color="#666" />
                  <Text style={styles.dropdownText}>Private</Text>
                  {profileVisibility === 'private' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                </TouchableOpacity>
              </View>
              )}
            </View>

            <View style={styles.settingToggleItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Show Activity Status</Text>
                <Text style={styles.settingDescription}>Let others see when you're active</Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleSwitch, showActivityStatus && styles.toggleSwitchActive]}
                onPress={() => setShowActivityStatus(!showActivityStatus)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, showActivityStatus && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
        </View>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
        <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setMarketplaceExpanded(!marketplaceExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Marketplace</Text>
              <Ionicons 
                name={marketplaceExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#A68C7B" 
              />
            </TouchableOpacity>
            
            {marketplaceExpanded && (
              <View>
            
            {userData?.isSeller ? (
              <>
                <View style={styles.sellerBadge}>
                  <Ionicons name="star" size={24} color="#FFD700" />
                  <Text style={styles.sellerBadgeText}>Verified Seller</Text>
                </View>

                <Text style={styles.groupTitle}>Seller Requirements</Text>
                
                <View style={styles.requirementItem}>
                  <View style={styles.requirementIcon}>
                    <Ionicons name="person-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={styles.requirementInfo}>
                    <Text style={styles.requirementTitle}>Complete Profile</Text>
                    <Text style={styles.requirementDescription}>Fill out your profile with bio, avatar, and portfolio</Text>
                  </View>
                </View>

                <View style={styles.requirementItem}>
                  <View style={styles.requirementIcon}>
                    <Ionicons name="document-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={styles.requirementInfo}>
                    <Text style={styles.requirementTitle}>Identity Verification</Text>
                    <Text style={styles.requirementDescription}>Verify your identity for secure transactions</Text>
                  </View>
                </View>

                <View style={styles.requirementItem}>
                  <View style={styles.requirementIcon}>
                    <Ionicons name="lock-closed-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={styles.requirementInfo}>
                    <Text style={styles.requirementTitle}>Payment Setup</Text>
                    <Text style={styles.requirementDescription}>Connect your bank account or payment method</Text>
                  </View>
                </View>

                <View style={styles.requirementItem}>
                  <View style={styles.requirementIcon}>
                    <Ionicons name="star-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={styles.requirementInfo}>
                    <Text style={styles.requirementTitle}>Quality Standards</Text>
                    <Text style={styles.requirementDescription}>Maintain high-quality artwork and professional service</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Apply as Artist Section */}
                {String(role ?? '').trim().toLowerCase() === 'user' && (
                  <View>
                    <Text style={styles.groupTitle}>Become an Artist</Text>
                    <TouchableOpacity
                      style={[styles.settingButton, hasPendingRequest && styles.disabledButton]}
                      onPress={() => {
                        setAppFirstName(firstName || "");
                        setAppMiddleInitial((middleName || "").slice(0,1).toUpperCase());
                        setAppLastName(lastName || "");
                        setAppSex(sex || "");
                        setAppBirthdate(birthday || new Date());
                        setAppAddress(address || "");
                        setAppPhone("");
                        setAppAge("");
                        setAppValidIdImage(null);
                        setAppSelfieImage(null);
                        setApplyModalVisible(true);
                      }}
                      disabled={hasPendingRequest}
                    >
                      <View style={styles.settingContent}>
                        <View style={styles.iconContainer}>
                          <Ionicons name="brush-outline" size={24} color={hasPendingRequest ? "#999" : "#A68C7B"} />
                        </View>
                        <View style={styles.settingTextContainer}>
                          <Text style={[styles.settingTitle, hasPendingRequest && styles.disabledText]}>
                            {hasPendingRequest ? "Verification Pending" : "Apply as Artist"}
                          </Text>
                          <Text style={styles.settingDescription}>
                            {hasPendingRequest ? "Your application is under review" : "Submit your artist verification"}
                          </Text>
                        </View>
                        {!hasPendingRequest && <Ionicons name="chevron-forward" size={24} color="#999" />}
                        {hasPendingRequest && <Ionicons name="time-outline" size={24} color="#FFC107" />}
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Apply as Seller - for Artists (only show if NOT already a seller) */}
                {String(role ?? '').trim().toLowerCase() === 'artist' && !userData?.isSeller && (
                  <View>
                    <Text style={styles.groupTitle}>Become a Seller</Text>
                    <TouchableOpacity 
                      style={[styles.settingButton, (hasPendingSellerRequest || sellerApplicationStatus === 'pending') && styles.disabledButton]}
                      onPress={() => {
                        resetSellerForm();
                        setSellerModalVisible(true);
                      }}
                      disabled={hasPendingSellerRequest || sellerApplicationStatus === 'pending'}
                    >
                      <View style={styles.settingContent}>
                        <View style={styles.iconContainer}>
                          <Ionicons 
                            name="storefront-outline" 
                            size={24} 
                            color={(hasPendingSellerRequest || sellerApplicationStatus === 'pending') ? "#999" : sellerApplicationStatus === 'rejected' ? "#FF4444" : "#A68C7B"} 
                          />
                        </View>
                        <View style={styles.settingTextContainer}>
                          <Text style={[styles.settingTitle, (hasPendingSellerRequest || sellerApplicationStatus === 'pending') && styles.disabledText, sellerApplicationStatus === 'rejected' && { color: '#FF4444' }]}>
                            {sellerApplicationStatus === 'pending' || hasPendingSellerRequest ? "Seller Verification Pending" : 
                             sellerApplicationStatus === 'rejected' ? "Application Rejected - Reapply" : 
                             "Apply as Seller"}
                          </Text>
                          <Text style={styles.settingDescription}>
                            {sellerApplicationStatus === 'pending' || hasPendingSellerRequest ? "Your seller application is under review" : 
                             sellerApplicationStatus === 'rejected' ? "Your application was rejected. You can submit a new application." : 
                             "Register to sell your artwork"}
                          </Text>
                        </View>
                        {!hasPendingSellerRequest && sellerApplicationStatus !== 'pending' && sellerApplicationStatus !== 'rejected' && <Ionicons name="chevron-forward" size={24} color="#999" />}
                        {(hasPendingSellerRequest || sellerApplicationStatus === 'pending') && <Ionicons name="time-outline" size={24} color="#FFC107" />}
                        {sellerApplicationStatus === 'rejected' && <Ionicons name="refresh" size={24} color="#FF4444" />}
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
              </View>
            )}
        </View>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
        <View style={styles.section}>
          <View style={styles.activitiesHeader}>
            <Text style={styles.sectionTitle}>Your Activities</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchActivities}
              disabled={loadingActivities}
            >
              <Ionicons name="refresh" size={20} color="#A68C7B" />
            </TouchableOpacity>
          </View>

          {loadingActivities ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#A68C7B" />
              <Text style={styles.loadingText}>Loading activities...</Text>
            </View>
          ) : activities.length > 0 ? (
            <View>
              {activities.map((activity, index) => (
                <View key={activity.id || index} style={styles.activityCard}>
                  <Text style={styles.activityEmoji}>📋</Text>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{activity.description || 'Activity'}</Text>
                    <Text style={styles.activityTime}>
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No Activities Yet</Text>
              <Text style={styles.emptyStateText}>Your activities will appear here</Text>
            </View>
          )}
        </View>
        )}
      </ScrollView>

      <SettingsModal
        styles={styles}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        pickImage={pickImage}
        tempImage={tempImage}
        pickBackgroundImage={pickBackgroundImage}
        tempBackgroundImage={tempBackgroundImage}
        tempFirstName={tempFirstName}
        setTempFirstName={setTempFirstName}
        tempMiddleName={tempMiddleName}
        setTempMiddleName={setTempMiddleName}
        tempLastName={tempLastName}
        setTempLastName={setTempLastName}
        tempUserNameField={tempUserNameField}
        setTempUserNameField={setTempUserNameField}
        tempSex={tempSex}
        setTempSex={setTempSex}
        showSexDropdown={showSexDropdown}
        setShowSexDropdown={setShowSexDropdown}
        tempBirthday={tempBirthday}
        formattedTempDate={formattedTempDate}
        setShowDatePicker={setShowDatePicker}
        showDatePicker={showDatePicker}
        onChangeTempDate={onChangeTempDate}
        tempAddress={tempAddress}
        setTempAddress={setTempAddress}
        tempBio={tempBio}
        setTempBio={setTempBio}
        tempAbout={tempAbout}
        setTempAbout={setTempAbout}
        handleSave={handleSave}
        applyModalVisible={applyModalVisible}
        setApplyModalVisible={setApplyModalVisible}
        appFirstName={appFirstName}
        setAppFirstName={setAppFirstName}
        appMiddleInitial={appMiddleInitial}
        setAppMiddleInitial={setAppMiddleInitial}
        appLastName={appLastName}
        setAppLastName={setAppLastName}
        appPhone={appPhone}
        setAppPhone={setAppPhone}
        appAge={appAge}
        setAppAge={setAppAge}
        appSex={appSex}
        setAppSex={setAppSex}
        appShowSexDropdown={appShowSexDropdown}
        setAppShowSexDropdown={setAppShowSexDropdown}
        appBirthdate={appBirthdate}
        appShowDatePicker={appShowDatePicker}
        setAppShowDatePicker={setAppShowDatePicker}
        appAddress={appAddress}
        setAppAddress={setAppAddress}
        appValidIdImage={appValidIdImage}
        appSelfieImage={appSelfieImage}
        pickValidIdImage={pickValidIdImage}
        pickSelfieImage={pickSelfieImage}
        appSubmitting={appSubmitting}
        submitArtistApplication={submitArtistApplication}
        onChangeAppDate={onChangeAppDate}
        sellerModalVisible={sellerModalVisible}
        setSellerModalVisible={setSellerModalVisible}
        resetSellerForm={resetSellerForm}
        sellerCurrentStep={sellerCurrentStep}
        shopName={shopName}
        setShopName={setShopName}
        sellerFullName={sellerFullName}
        setSellerFullName={setSellerFullName}
        sellerEmail={sellerEmail}
        setSellerEmail={setSellerEmail}
        sellerPhone={sellerPhone}
        setSellerPhone={setSellerPhone}
        street={street}
        setStreet={setStreet}
        landmark={landmark}
        setLandmark={setLandmark}
        regions={regions}
        selectedRegion={selectedRegion}
        showRegionDropdown={showRegionDropdown}
        setShowRegionDropdown={setShowRegionDropdown}
        handleRegionChange={handleRegionChange}
        provinces={provinces}
        selectedProvince={selectedProvince}
        showProvinceDropdown={showProvinceDropdown}
        setShowProvinceDropdown={setShowProvinceDropdown}
        handleProvinceChange={handleProvinceChange}
        cities={cities}
        selectedCity={selectedCity}
        showCityDropdown={showCityDropdown}
        setShowCityDropdown={setShowCityDropdown}
        handleCityChange={handleCityChange}
        barangays={barangays}
        selectedBarangay={selectedBarangay}
        showBarangayDropdown={showBarangayDropdown}
        setShowBarangayDropdown={setShowBarangayDropdown}
        handleBarangayChange={handleBarangayChange}
        postalCode={postalCode}
        setPostalCode={setPostalCode}
        shopDescription={shopDescription}
        setShopDescription={setShopDescription}
        sellerIdDocument={sellerIdDocument}
        pickSellerIdDocument={pickSellerIdDocument}
        agreedToTerms={agreedToTerms}
        setAgreedToTerms={setAgreedToTerms}
        sellerSubmitting={sellerSubmitting}
        handleSellerBack={handleSellerBack}
        handleSellerNext={handleSellerNext}
        submitSellerApplication={submitSellerApplication}
      />
      <AndroidFooterSpacer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1 },
  contentContainer: { padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#A68C7B", marginBottom: 30 },
  section: { marginBottom: 15 },
  settingButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingContent: { flexDirection: "row", alignItems: "center" },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F0EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  settingDescription: { fontSize: 13, color: "#666" },
  disabledButton: { opacity: 0.6 },
  disabledText: { color: "#999" },
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  uploadModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  uploadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  uploadModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  uploadModalBody: {
    padding: 20,
  },
  uploadImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  uploadImageText: {
    marginTop: 10,
    fontSize: 14,
    color: '#A68C7B',
  },
  uploadPickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  uploadInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  uploadTextArea: {
    height: 100,
    textAlignVertical: 'top',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemText: {
    fontSize: 14,
    color: '#333',
  },
  // Tab styles
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabContentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  tabButtonActive: {
    backgroundColor: '#F5F0EB',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 6,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#A68C7B',
    fontWeight: '600',
  },
  // Tab panels
  tabPanel: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  // Profile preview
  profilePreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileViewHint: {
    fontSize: 12,
    color: '#A68C7B',
    fontStyle: 'italic',
  },
  // Toggle items
  settingToggleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Seller badge
  sellerBadge: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  sellerBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  // Activities
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activitiesLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  activitiesList: {
    marginTop: 10,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activitiesEmpty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Toggle Switch Styles
  toggleSwitch: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#A68C7B',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Profile Visibility Dropdown
  visibilityContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'column',
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F0EB',
    marginTop: 12,
    width: '100%',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  // Tab Navigation
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabsScroll: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#A68C7B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#A68C7B',
  },
  // Form Styles
  formContainer: {
    backgroundColor: '#F5F0EB',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  formMessage: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  formMessageError: {
    color: '#D32F2F',
  },
  formButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  formButtonPrimary: {
    backgroundColor: '#A68C7B',
  },
  formButtonSecondary: {
    backgroundColor: '#e0e0e0',
  },
  formButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formButtonSecondaryText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  // Activities Styles
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  // Requirement Styles
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requirementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  requirementInfo: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requirementDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
