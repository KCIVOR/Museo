import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '../../supabase/supabaseClient';

const API_BASE = 'http://192.168.18.79:3000/api';

export default function EditPriceScheduleAuction({
  visible = false,
  onClose = () => {},
  auction = null,
  onSaved,
  styles: externalStyles,
}) {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    startPrice: '',
    reservePrice: '',
    minIncrement: '',
    startAt: '',
    endAt: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [startPickerVisible, setStartPickerVisible] = useState(false);
  const [endPickerVisible, setEndPickerVisible] = useState(false);

  // Initialize form when modal opens or auction changes
  useEffect(() => {
    if (visible && auction) {
      setForm({
        startPrice: auction.startPrice != null ? String(auction.startPrice) : '',
        reservePrice: auction.reservePrice != null ? String(auction.reservePrice) : '',
        minIncrement: auction.minIncrement != null ? String(auction.minIncrement) : '0',
        startAt: auction.startAt || '',
        endAt: auction.endAt || '',
      });
      setErrors({});
    }
  }, [visible, auction]);

  const validate = () => {
    const newErrors = {};
    const sp = parseFloat(form.startPrice);
    const rp = parseFloat(form.reservePrice);
    const mi = parseFloat(form.minIncrement);

    if (!Number.isFinite(sp) || sp <= 0) {
      newErrors.startPrice = 'Starting price must be greater than 0';
    }
    if (!Number.isFinite(rp) || rp < 0) {
      newErrors.reservePrice = 'Reserve price must be 0 or more';
    }
    if (Number.isFinite(sp) && Number.isFinite(rp) && rp < sp) {
      newErrors.reservePrice = 'Reserve price must be greater than or equal to starting price';
    }
    if (!Number.isFinite(mi) || mi < 0) {
      newErrors.minIncrement = 'Minimum increment must be 0 or more';
    }
    if (!form.startAt) {
      newErrors.startAt = 'Start time is required';
    }
    if (!form.endAt) {
      newErrors.endAt = 'End time is required';
    }
    if (form.startAt && form.endAt) {
      const start = new Date(form.startAt);
      const end = new Date(form.endAt);
      if (end <= start) {
        newErrors.endAt = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!auction) return;
    if (!validate()) return;

    try {
      setSubmitting(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';
      const refreshToken = sessionData?.session?.refresh_token || '';

      const body = {
        startPrice: parseFloat(form.startPrice),
        reservePrice: parseFloat(form.reservePrice),
        minIncrement: parseFloat(form.minIncrement),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };

      const response = await fetch(`${API_BASE}/auctions/${auction.auctionId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.error || result.message || 'Failed to update auction');
      }

      Alert.alert('Success', 'Auction updated');
      onSaved?.(result.data || result);
      onClose?.();
    } catch (error) {
      console.error('Error updating auction:', error);
      Alert.alert('Error', error.message || 'Failed to update auction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateLabel = (iso, fallback) => {
    if (!iso) return fallback;
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return fallback;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return fallback;
    }
  };

  const handleStartConfirm = (date) => {
    setStartPickerVisible(false);
    if (!date) return;
    setForm((prev) => ({ ...prev, startAt: date.toISOString() }));
  };

  const handleEndConfirm = (date) => {
    setEndPickerVisible(false);
    if (!date) return;
    setForm((prev) => ({ ...prev, endAt: date.toISOString() }));
  };

  if (!visible || !auction) return null;

  return (
    <Modal
      visible={visible && !!auction}
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
              <Text style={externalStyles.modalTitle}>Edit Auction</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={externalStyles.modalBody}
              contentContainerStyle={[
                externalStyles.modalBodyScroll,
                { paddingBottom: insets.bottom + 12 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={externalStyles.sectionHeader}>Auction Pricing</Text>

              <Text style={externalStyles.inputLabel}>Starting Price (₱) *</Text>
              <TextInput
                style={[
                  externalStyles.input,
                  errors.startPrice && externalStyles.inputError,
                ]}
                placeholder="0.00"
                value={form.startPrice}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, startPrice: text }))
                }
                keyboardType="decimal-pad"
              />
              {errors.startPrice && (
                <Text style={externalStyles.errorText}>{errors.startPrice}</Text>
              )}

              <Text style={externalStyles.inputLabel}>Reserve Price (₱) *</Text>
              <TextInput
                style={[
                  externalStyles.input,
                  errors.reservePrice && externalStyles.inputError,
                ]}
                placeholder="0.00"
                value={form.reservePrice}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, reservePrice: text }))
                }
                keyboardType="decimal-pad"
              />
              {errors.reservePrice && (
                <Text style={externalStyles.errorText}>{errors.reservePrice}</Text>
              )}

              <Text style={externalStyles.inputLabel}>Minimum Bid Increment (₱) *</Text>
              <TextInput
                style={[
                  externalStyles.input,
                  errors.minIncrement && externalStyles.inputError,
                ]}
                placeholder="0.00"
                value={form.minIncrement}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, minIncrement: text }))
                }
                keyboardType="decimal-pad"
              />
              {errors.minIncrement && (
                <Text style={externalStyles.errorText}>{errors.minIncrement}</Text>
              )}

              <Text style={externalStyles.sectionHeader}>
                Auction Duration (Manila Timezone)
              </Text>

              <Text style={externalStyles.inputLabel}>Start Time *</Text>
              <TouchableOpacity
                style={[
                  externalStyles.datePickerButton,
                  errors.startAt && externalStyles.inputError,
                ]}
                onPress={() => setStartPickerVisible(true)}
              >
                <Text
                  style={[
                    externalStyles.datePickerText,
                    !form.startAt && externalStyles.datePickerPlaceholder,
                  ]}
                >
                  {formatDateLabel(
                    form.startAt,
                    'Select Start Date & Time',
                  )}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#A68C7B" />
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={startPickerVisible}
                mode="datetime"
                onConfirm={handleStartConfirm}
                onCancel={() => setStartPickerVisible(false)}
                date={form.startAt ? new Date(form.startAt) : new Date()}
                minimumDate={new Date()}
              />
              {errors.startAt && (
                <Text style={externalStyles.errorText}>{errors.startAt}</Text>
              )}

              <Text style={externalStyles.inputLabel}>End Time *</Text>
              <TouchableOpacity
                style={[
                  externalStyles.datePickerButton,
                  errors.endAt && externalStyles.inputError,
                ]}
                onPress={() => setEndPickerVisible(true)}
              >
                <Text
                  style={[
                    externalStyles.datePickerText,
                    !form.endAt && externalStyles.datePickerPlaceholder,
                  ]}
                >
                  {formatDateLabel(form.endAt, 'Select End Date & Time')}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#A68C7B" />
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={endPickerVisible}
                mode="datetime"
                onConfirm={handleEndConfirm}
                onCancel={() => setEndPickerVisible(false)}
                date={
                  form.endAt
                    ? new Date(form.endAt)
                    : form.startAt
                    ? new Date(new Date(form.startAt).getTime() + 24 * 60 * 60 * 1000)
                    : new Date()
                }
                minimumDate={form.startAt ? new Date(form.startAt) : new Date()}
              />
              {errors.endAt && (
                <Text style={externalStyles.errorText}>{errors.endAt}</Text>
              )}

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
                disabled={submitting}
              >
                <Text style={externalStyles.modalBtnSecondaryText} numberOfLines={1}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  externalStyles.modalBtn,
                  externalStyles.modalBtnPrimary,
                  submitting && externalStyles.modalBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
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
}
