import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'http://192.168.18.79:3000/api';

const AddAddressModal = ({
  visible,
  onClose,
  onAddressAdded,
  userData,
  accessToken,
  refreshToken,
}) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [citiesMunicipalities, setCitiesMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [openSelect, setOpenSelect] = useState({
    region: false,
    province: false,
    city: false,
    barangay: false,
  });

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    regionCode: '',
    regionName: '',
    provinceCode: '',
    provinceName: '',
    cityMunicipalityCode: '',
    cityMunicipalityName: '',
    barangayCode: '',
    barangayName: '',
    postalCode: '',
    addressType: 'home',
    deliveryInstructions: '',
    isDefault: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill user data when modal opens
  useEffect(() => {
    if (visible && userData) {
      setFormData(prev => ({
        ...prev,
        fullName:
          prev.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: prev.email || userData.email || '',
        phoneNumber: prev.phoneNumber || userData.phoneNumber || '',
      }));
    }
  }, [visible, userData]);

  // Fetch location data
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await fetch('https://psgc.gitlab.io/api/regions/');
        const data = await res.json();
        setRegions(data || []);
      } catch (e) {
        console.error('Failed to fetch regions:', e);
      }
    };
    fetchRegions();
  }, []);

  const onSelectRegion = code => {
    setFormData(p => ({
      ...p,
      regionCode: code,
      provinceCode: '',
      cityMunicipalityCode: '',
      barangayCode: '',
    }));
    setProvinces([]);
    setCitiesMunicipalities([]);
    setBarangays([]);
    setOpenSelect({ region: false, province: false, city: false, barangay: false });

    fetch(`https://psgc.gitlab.io/api/regions/${code}/provinces/`)
      .then(res => res.json())
      .then(data => setProvinces(data || []))
      .catch(e => console.error('Failed to fetch provinces:', e));
  };

  const onSelectProvince = code => {
    setFormData(p => ({
      ...p,
      provinceCode: code,
      cityMunicipalityCode: '',
      barangayCode: '',
    }));
    setCitiesMunicipalities([]);
    setBarangays([]);
    setOpenSelect(s => ({ ...s, province: false }));

    fetch(`https://psgc.gitlab.io/api/provinces/${code}/cities-municipalities/`)
      .then(res => res.json())
      .then(data => setCitiesMunicipalities(data || []))
      .catch(e => console.error('Failed to fetch cities:', e));
  };

  const onSelectCity = code => {
    setFormData(p => ({
      ...p,
      cityMunicipalityCode: code,
      barangayCode: '',
    }));
    setBarangays([]);
    setOpenSelect(s => ({ ...s, city: false }));

    fetch(`https://psgc.gitlab.io/api/cities-municipalities/${code}/barangays/`)
      .then(res => res.json())
      .then(data => setBarangays(data || []))
      .catch(e => console.error('Failed to fetch barangays:', e));
  };

  const onSelectBarangay = code => {
    setFormData(p => ({
      ...p,
      barangayCode: code,
    }));
    setOpenSelect(s => ({ ...s, barangay: false }));
  };

  const validateAddressForm = () => {
    if (!formData.fullName?.trim()) return 'Full name is required';
    if (!formData.email?.trim()) return 'Email is required';
    if (!formData.phoneNumber?.trim()) return 'Phone number is required';
    if (!formData.addressLine1?.trim()) return 'Street address is required';
    if (!formData.regionCode) return 'Region is required';
    if (!formData.provinceCode) return 'Province is required';
    if (!formData.cityMunicipalityCode) return 'City/Municipality is required';
    if (!formData.barangayCode) return 'Barangay is required';
    if (!/^[0-9]{4}$/.test(String(formData.postalCode || '')))
      return 'Postal code must be 4 digits';
    return '';
  };

  const handleSaveAddress = async () => {
    const error = validateAddressForm();
    if (error) {
      Alert.alert('Invalid Form', error);
      return;
    }

    try {
      setIsSubmitting(true);
      const selRegion = regions.find(r => r.code === formData.regionCode);
      const selProv = provinces.find(p => p.code === formData.provinceCode);
      const selCity = citiesMunicipalities.find(
        c => c.code === formData.cityMunicipalityCode,
      );
      const selBrgy = barangays.find(b => b.code === formData.barangayCode);

      const addressData = {
        ...formData,
        regionName: selRegion?.name || '',
        provinceName: selProv?.name || '',
        cityMunicipalityName: selCity?.name || '',
        barangayName: selBrgy?.name || '',
      };

      const response = await fetch(`${API_BASE}/marketplace/addresses`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${accessToken || ''}; refresh_token=${
            refreshToken || ''
          }`,
        },
        body: JSON.stringify(addressData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Failed to save address');

      Alert.alert('Success', 'Address saved successfully');

      if (onClose) {
        onClose();
      }

      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        regionCode: '',
        regionName: '',
        provinceCode: '',
        provinceName: '',
        cityMunicipalityCode: '',
        cityMunicipalityName: '',
        barangayCode: '',
        barangayName: '',
        postalCode: '',
        addressType: 'home',
        deliveryInstructions: '',
        isDefault: false,
      });

      if (onAddressAdded) {
        await onAddressAdded();
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', error?.message || 'Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Address</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: '80%' }}
            contentContainerStyle={{ paddingBottom: 16 }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Personal Information */}
            <Text style={styles.sectionTitleModal}>Personal Information</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.fullName}
                onChangeText={t => setFormData(p => ({ ...p, fullName: t }))}
                placeholder="Juan Dela Cruz"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formRowModal}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.email}
                  onChangeText={t => setFormData(p => ({ ...p, email: t }))}
                  placeholder="juan@example.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.phoneNumber}
                  onChangeText={t =>
                    setFormData(p => ({ ...p, phoneNumber: t }))
                  }
                  placeholder="09123456789"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Address Details */}
            <Text style={styles.sectionTitleModal}>Address Details</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                House/Unit No., Building, Street Name *
              </Text>
              <TextInput
                style={styles.formInput}
                value={formData.addressLine1}
                onChangeText={t =>
                  setFormData(p => ({ ...p, addressLine1: t }))
                }
                placeholder="123 Main St, Unit 4B"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Subdivision/Village/Building (Optional)
              </Text>
              <TextInput
                style={styles.formInput}
                value={formData.addressLine2}
                onChangeText={t =>
                  setFormData(p => ({ ...p, addressLine2: t }))
                }
                placeholder="Green Valley Subd."
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Landmark (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.landmark}
                onChangeText={t => setFormData(p => ({ ...p, landmark: t }))}
                placeholder="Near ABC Store"
                placeholderTextColor="#999"
              />
            </View>

            {/* Location */}
            <Text style={styles.sectionTitleModal}>Location</Text>

            {/* Region */}
            <View style={styles.selectGroup}>
              <Text style={styles.formLabel}>Region *</Text>
              <View style={styles.selectBox}>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() =>
                    setOpenSelect(s => ({ ...s, region: !s.region }))
                  }
                >
                  <Text style={styles.selectTriggerText}>
                    {regions.find(r => r.code === formData.regionCode)?.name ||
                      'Select Region'}
                  </Text>
                  <Ionicons
                    name={openSelect.region ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
                {openSelect.region && (
                  <FlatList
                    data={regions}
                    keyExtractor={item => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          formData.regionCode === item.code &&
                            styles.selectItemActive,
                        ]}
                        onPress={() => onSelectRegion(item.code)}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  />
                )}
              </View>
            </View>

            {/* Province */}
            <View style={styles.selectGroup}>
              <Text style={styles.formLabel}>Province *</Text>
              <View style={styles.selectBox}>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() =>
                    setOpenSelect(s => ({ ...s, province: !s.province }))
                  }
                >
                  <Text style={styles.selectTriggerText}>
                    {provinces.find(p => p.code === formData.provinceCode)
                      ?.name || 'Select Province'}
                  </Text>
                  <Ionicons
                    name={openSelect.province ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
                {openSelect.province && (
                  <FlatList
                    data={provinces}
                    keyExtractor={item => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          formData.provinceCode === item.code &&
                            styles.selectItemActive,
                        ]}
                        onPress={() => onSelectProvince(item.code)}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  />
                )}
              </View>
            </View>

            {/* City/Municipality */}
            <View style={styles.selectGroup}>
              <Text style={styles.formLabel}>City/Municipality *</Text>
              <View style={styles.selectBox}>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() =>
                    setOpenSelect(s => ({ ...s, city: !s.city }))
                  }
                >
                  <Text style={styles.selectTriggerText}>
                    {citiesMunicipalities.find(
                      c => c.code === formData.cityMunicipalityCode,
                    )?.name || 'Select City/Municipality'}
                  </Text>
                  <Ionicons
                    name={openSelect.city ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
                {openSelect.city && (
                  <FlatList
                    data={citiesMunicipalities}
                    keyExtractor={item => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          formData.cityMunicipalityCode === item.code &&
                            styles.selectItemActive,
                        ]}
                        onPress={() => onSelectCity(item.code)}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  />
                )}
              </View>
            </View>

            {/* Barangay */}
            <View style={styles.selectGroup}>
              <Text style={styles.formLabel}>Barangay *</Text>
              <View style={styles.selectBox}>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() =>
                    setOpenSelect(s => ({ ...s, barangay: !s.barangay }))
                  }
                >
                  <Text style={styles.selectTriggerText}>
                    {barangays.find(b => b.code === formData.barangayCode)
                      ?.name || 'Select Barangay'}
                  </Text>
                  <Ionicons
                    name={openSelect.barangay ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
                {openSelect.barangay && (
                  <FlatList
                    data={barangays}
                    keyExtractor={item => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          formData.barangayCode === item.code &&
                            styles.selectItemActive,
                        ]}
                        onPress={() => onSelectBarangay(item.code)}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  />
                )}
              </View>
            </View>

            {/* Additional Options */}
            <Text style={styles.sectionTitleModal}>Additional Options</Text>
            <View style={styles.formRowModal}>
              {['home', 'office', 'other'].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.typeChip,
                    formData.addressType === val && styles.typeChipActive,
                  ]}
                  onPress={() =>
                    setFormData(p => ({ ...p, addressType: val }))
                  }
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      formData.addressType === val && styles.typeChipTextActive,
                    ]}
                  >
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Postal Code *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.postalCode}
                onChangeText={t =>
                  setFormData(p => ({ ...p, postalCode: t }))
                }
                keyboardType="number-pad"
                maxLength={4}
                placeholder="1234"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Delivery Instructions (Optional)
              </Text>
              <TextInput
                style={styles.textareaModal}
                value={formData.deliveryInstructions}
                onChangeText={t =>
                  setFormData(p => ({ ...p, deliveryInstructions: t }))
                }
                multiline
                numberOfLines={3}
                placeholder="Any special delivery instructions..."
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelBtn, { flex: 1 }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity
              style={[styles.saveAddressBtn, { flex: 1 }]}
              onPress={handleSaveAddress}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveAddressBtnText}>Save Address</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1810',
  },
  sectionTitleModal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1810',
    marginTop: 16,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E8E0D8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C1810',
    backgroundColor: '#fff',
  },
  formRowModal: {
    flexDirection: 'row',
  },
  selectGroup: {
    marginBottom: 16,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#E8E0D8',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  selectTriggerText: {
    fontSize: 14,
    color: '#2C1810',
    flex: 1,
  },
  selectItem: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
  },
  selectItemActive: {
    backgroundColor: '#FFF8F3',
  },
  selectItemText: {
    fontSize: 14,
    color: '#2C1810',
  },
  typeChip: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  typeChipActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  typeChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  textareaModal: {
    borderWidth: 1,
    borderColor: '#E8E0D8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C1810',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 16,
  },
  cancelBtn: {
    backgroundColor: '#666',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveAddressBtn: {
    backgroundColor: '#A68C7B',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveAddressBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default AddAddressModal;
