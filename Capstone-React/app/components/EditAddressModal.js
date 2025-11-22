import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase/supabaseClient';

const API_BASE = "http://192.168.18.79:3000/api";

export default function EditAddressModal({
  visible,
  onClose,
  address,
  userData,
  accessToken,
  refreshToken,
  onAddressUpdated,
}) {
  const [addressFormData, setAddressFormData] = useState({
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
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [citiesMunicipalities, setCitiesMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [openSelect, setOpenSelect] = useState({ region: false, province: false, city: false, barangay: false });
  const [addressFormSubmitting, setAddressFormSubmitting] = useState(false);

  // Fetch regions on mount
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

  // Load address data when modal opens
  useEffect(() => {
    if (visible && address) {
      setAddressFormData({
        fullName: address.fullName || '',
        email: address.email || userData?.email || '',
        phoneNumber: address.phoneNumber || '',
        addressLine1: address.addressLine1 || '',
        addressLine2: address.addressLine2 || '',
        landmark: address.landmark || '',
        regionCode: address.regionCode || '',
        regionName: address.regionName || '',
        provinceCode: address.provinceCode || '',
        provinceName: address.provinceName || '',
        cityMunicipalityCode: address.cityMunicipalityCode || '',
        cityMunicipalityName: address.cityMunicipalityName || '',
        barangayCode: address.barangayCode || '',
        barangayName: address.barangayName || '',
        postalCode: String(address.postalCode || ''),
        addressType: address.addressType || 'home',
        deliveryInstructions: address.deliveryInstructions || '',
        isDefault: !!address.isDefault,
      });

      // Fetch provinces if region is selected
      if (address.regionCode) {
        fetch(`https://psgc.gitlab.io/api/regions/${address.regionCode}/provinces/`)
          .then(res => res.json())
          .then(data => setProvinces(data || []))
          .catch(e => console.error('Failed to fetch provinces:', e));
      }

      // Fetch cities if province is selected
      if (address.provinceCode) {
        fetch(`https://psgc.gitlab.io/api/provinces/${address.provinceCode}/cities-municipalities/`)
          .then(res => res.json())
          .then(data => setCitiesMunicipalities(data || []))
          .catch(e => console.error('Failed to fetch cities:', e));
      }

      // Fetch barangays if city is selected
      if (address.cityMunicipalityCode) {
        fetch(`https://psgc.gitlab.io/api/cities-municipalities/${address.cityMunicipalityCode}/barangays/`)
          .then(res => res.json())
          .then(data => setBarangays(data || []))
          .catch(e => console.error('Failed to fetch barangays:', e));
      }
    }
  }, [visible, address, userData]);

  const onSelectRegion = (code) => {
    setAddressFormData(p => ({
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

  const onSelectProvince = (code) => {
    setAddressFormData(p => ({
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

  const onSelectCity = (code) => {
    setAddressFormData(p => ({
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

  const onSelectBarangay = (code) => {
    setAddressFormData(p => ({
      ...p,
      barangayCode: code,
    }));
    setOpenSelect(s => ({ ...s, barangay: false }));
  };

  const validateAddressForm = () => {
    if (!addressFormData.fullName?.trim()) return 'Full name is required';
    if (!addressFormData.email?.trim()) return 'Email is required';
    if (!addressFormData.phoneNumber?.trim()) return 'Phone number is required';
    if (!addressFormData.addressLine1?.trim()) return 'Street address is required';
    if (!addressFormData.regionCode) return 'Region is required';
    if (!addressFormData.provinceCode) return 'Province is required';
    if (!addressFormData.cityMunicipalityCode) return 'City/Municipality is required';
    if (!addressFormData.barangayCode) return 'Barangay is required';
    if (!/^[0-9]{4}$/.test(String(addressFormData.postalCode || ''))) return 'Postal code must be 4 digits';
    return '';
  };

  const handleSaveAddress = async () => {
    const error = validateAddressForm();
    if (error) {
      Alert.alert('Invalid Address', error);
      return;
    }

    try {
      setAddressFormSubmitting(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || accessToken || '';
      const rt = data?.session?.refresh_token || refreshToken || '';

      const selRegion = regions.find(r => r.code === addressFormData.regionCode);
      const selProv = provinces.find(p => p.code === addressFormData.provinceCode);
      const selCity = citiesMunicipalities.find(c => c.code === addressFormData.cityMunicipalityCode);
      const selBrgy = barangays.find(b => b.code === addressFormData.barangayCode);

      const addressData = {
        ...addressFormData,
        fullName: (addressFormData.fullName || '').trim(),
        email: (addressFormData.email || userData?.email || '').trim(),
        phoneNumber: (addressFormData.phoneNumber || '').trim(),
        addressLine1: (addressFormData.addressLine1 || '').trim(),
        addressLine2: (addressFormData.addressLine2 || '').trim(),
        landmark: (addressFormData.landmark || '').trim(),
        regionName: selRegion?.name || addressFormData.regionName || '',
        provinceName: selProv?.name || addressFormData.provinceName || '',
        cityMunicipalityName: selCity?.name || addressFormData.cityMunicipalityName || '',
        barangayName: selBrgy?.name || addressFormData.barangayName || '',
        postalCode: String(addressFormData.postalCode || '').trim(),
      };

      const res = await fetch(`${API_BASE}/marketplace/addresses/${address.userAddressId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: JSON.stringify(addressData),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const msg = json?.error || json?.message || 'Failed to save address';
        Alert.alert('Error', msg);
        return;
      }

      Alert.alert('Success', 'Address updated successfully');
      onAddressUpdated?.();
      onClose?.();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to save address');
    } finally {
      setAddressFormSubmitting(false);
    }
  };

  if (!visible || !address) return null;

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
            <Text style={styles.modalTitle}>Edit Address</Text>
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
                value={addressFormData.fullName}
                onChangeText={text => setAddressFormData(prev => ({ ...prev, fullName: text }))}
                placeholder="Juan Dela Cruz"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formRowModal}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  value={addressFormData.email}
                  onChangeText={text => setAddressFormData(prev => ({ ...prev, email: text }))}
                  placeholder="juan@example.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.formInput}
                  value={addressFormData.phoneNumber}
                  onChangeText={text => setAddressFormData(prev => ({ ...prev, phoneNumber: text }))}
                  placeholder="09123456789"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Address Details */}
            <Text style={styles.sectionTitleModal}>Address Details</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>House/Unit No., Building, Street Name *</Text>
              <TextInput
                style={styles.formInput}
                value={addressFormData.addressLine1}
                onChangeText={text => setAddressFormData(prev => ({ ...prev, addressLine1: text }))}
                placeholder="123 Main St, Unit 4B"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subdivision/Village/Building (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={addressFormData.addressLine2}
                onChangeText={text => setAddressFormData(prev => ({ ...prev, addressLine2: text }))}
                placeholder="Green Valley Subd."
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Landmark (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={addressFormData.landmark}
                onChangeText={text => setAddressFormData(prev => ({ ...prev, landmark: text }))}
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
                  onPress={() => setOpenSelect(s => ({ ...s, region: !s.region }))}
                >
                  <Text style={styles.selectTriggerText}>
                    {regions.find(r => r.code === addressFormData.regionCode)?.name || 'Select Region'}
                  </Text>
                  <Ionicons name={openSelect.region ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                </TouchableOpacity>
                {openSelect.region && (
                  <FlatList
                    data={regions}
                    keyExtractor={(item) => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          addressFormData.regionCode === item.code && styles.selectItemActive,
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
                  onPress={() => setOpenSelect(s => ({ ...s, province: !s.province }))}
                >
                  <Text style={styles.selectTriggerText}>
                    {provinces.find(p => p.code === addressFormData.provinceCode)?.name || 'Select Province'}
                  </Text>
                  <Ionicons name={openSelect.province ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                </TouchableOpacity>
                {openSelect.province && (
                  <FlatList
                    data={provinces}
                    keyExtractor={(item) => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          addressFormData.provinceCode === item.code && styles.selectItemActive,
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
              <Text style={styles.addressFormLabel}>City/Municipality *</Text>
              <View style={styles.selectBox}>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() => setOpenSelect(s => ({ ...s, city: !s.city }))}
                >
                  <Text style={styles.selectTriggerText}>
                    {citiesMunicipalities.find(c => c.code === addressFormData.cityMunicipalityCode)?.name || 'Select City/Municipality'}
                  </Text>
                  <Ionicons name={openSelect.city ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                </TouchableOpacity>
                {openSelect.city && (
                  <FlatList
                    data={citiesMunicipalities}
                    keyExtractor={(item) => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          addressFormData.cityMunicipalityCode === item.code && styles.selectItemActive,
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
                  onPress={() => setOpenSelect(s => ({ ...s, barangay: !s.barangay }))}
                >
                  <Text style={styles.selectTriggerText}>
                    {barangays.find(b => b.code === addressFormData.barangayCode)?.name || 'Select Barangay'}
                  </Text>
                  <Ionicons name={openSelect.barangay ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                </TouchableOpacity>
                {openSelect.barangay && (
                  <FlatList
                    data={barangays}
                    keyExtractor={(item) => String(item.code)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectItem,
                          addressFormData.barangayCode === item.code && styles.selectItemActive,
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
                  style={[styles.typeChip, addressFormData.addressType === val && styles.typeChipActive]}
                  onPress={() => setAddressFormData(p => ({ ...p, addressType: val }))}
                >
                  <Text style={[styles.typeChipText, addressFormData.addressType === val && styles.typeChipTextActive]}>
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Postal Code *</Text>
              <TextInput
                style={styles.formInput}
                value={addressFormData.postalCode}
                onChangeText={text => setAddressFormData(prev => ({ ...prev, postalCode: text }))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="1234"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Delivery Instructions (Optional)</Text>
              <TextInput
                style={styles.textareaModal}
                value={addressFormData.deliveryInstructions}
                onChangeText={text => setAddressFormData(prev => ({ ...prev, deliveryInstructions: text }))}
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
              disabled={addressFormSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity
              style={[styles.saveAddressBtn, { flex: 1 }]}
              onPress={handleSaveAddress}
              disabled={addressFormSubmitting}
            >
              {addressFormSubmitting ? (
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
}

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
