import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from './MuseoModal';
import '../styles/main.css';
import '../styles/components/buttons.css';
import '../styles/components/inputs.css';
import '../styles/components/address-form.css';

const API = import.meta.env.VITE_API_BASE;

export default function AddressModal({ isOpen, onClose, onAddressSaved }) {
  const { userData } = useUser();
  
  // Form data
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    email: '',
    phoneNumber: '',
    alternatePhone: '',
    
    // Address Details
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    
    // Geographic Location from PSGC API
    regionCode: '',
    provinceCode: '',
    cityMunicipalityCode: '',
    barangayCode: '',
    
    // Location Names (will be filled when location is selected)
    regionName: '',
    provinceName: '',
    cityMunicipalityName: '',
    barangayName: '',
    
    // Additional Details
    postalCode: '',
    addressType: 'Home', // Changed to match backend enum: 'Home', 'Work', 'Other'
    isDefault: false,
    deliveryInstructions: ''
  });
  
  // PSGC Data States
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [citiesMunicipalities, setCitiesMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  
  // Loading and Error States
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch Regions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRegions();
      // Pre-fill email and name if available
      if (userData) {
        setFormData(prev => ({
          ...prev,
          fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || prev.fullName,
          email: userData.email || prev.email
        }));
      }
    }
  }, [isOpen, userData]);
  
  // Fetch Regions from PSGC API
  const fetchRegions = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://psgc.gitlab.io/api/regions/');
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error('Error fetching regions:', error);
      setErrors({ ...errors, api: 'Failed to load regions. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch Provinces when region changes
  useEffect(() => {
    if (formData.regionCode) {
      fetchProvinces(formData.regionCode);
      setFormData(prev => ({
        ...prev,
        provinceCode: '',
        cityMunicipalityCode: '',
        barangayCode: ''
      }));
      setCitiesMunicipalities([]);
      setBarangays([]);
    }
  }, [formData.regionCode]);
  
  const fetchProvinces = async (regionCode) => {
    try {
      setLoading(true);
      const response = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
      const data = await response.json();
      setProvinces(data);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      setErrors({ ...errors, api: 'Failed to load provinces. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch Cities/Municipalities when province changes
  useEffect(() => {
    if (formData.provinceCode) {
      fetchCitiesMunicipalities(formData.provinceCode);
      setFormData(prev => ({
        ...prev,
        cityMunicipalityCode: '',
        barangayCode: ''
      }));
      setBarangays([]);
    }
  }, [formData.provinceCode]);
  
  const fetchCitiesMunicipalities = async (provinceCode) => {
    try {
      setLoading(true);
      const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
      const data = await response.json();
      setCitiesMunicipalities(data);
    } catch (error) {
      console.error('Error fetching cities/municipalities:', error);
      setErrors({ ...errors, api: 'Failed to load cities/municipalities. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch Barangays when city/municipality changes
  useEffect(() => {
    if (formData.cityMunicipalityCode) {
      fetchBarangays(formData.cityMunicipalityCode);
      setFormData(prev => ({
        ...prev,
        barangayCode: ''
      }));
    }
  }, [formData.cityMunicipalityCode]);
  
  const fetchBarangays = async (cityMunicipalityCode) => {
    try {
      setLoading(true);
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityMunicipalityCode}/barangays/`);
      const data = await response.json();
      setBarangays(data);
    } catch (error) {
      console.error('Error fetching barangays:', error);
      setErrors({ ...errors, api: 'Failed to load barangays. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^(\+63|0)?9\d{9}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid Philippine mobile number';
    }
    
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Street address is required';
    }
    
    if (!formData.regionCode) {
      newErrors.regionCode = 'Region is required';
    }
    
    if (!formData.provinceCode) {
      newErrors.provinceCode = 'Province is required';
    }
    
    if (!formData.cityMunicipalityCode) {
      newErrors.cityMunicipalityCode = 'City/Municipality is required';
    }
    
    if (!formData.barangayCode) {
      newErrors.barangayCode = 'Barangay is required';
    }
    
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!/^\d{4}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Postal code must be 4 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get the names of selected locations
      const selectedRegion = regions.find(r => r.code === formData.regionCode);
      const selectedProvince = provinces.find(p => p.code === formData.provinceCode);
      const selectedCity = citiesMunicipalities.find(c => c.code === formData.cityMunicipalityCode);
      const selectedBarangay = barangays.find(b => b.code === formData.barangayCode);
      
      const addressData = {
        ...formData,
        regionName: selectedRegion?.name || '',
        provinceName: selectedProvince?.name || '',
        cityMunicipalityName: selectedCity?.name || '',
        barangayName: selectedBarangay?.name || ''
      };
      
      // Save to backend API
      const response = await fetch(`${API}/marketplace/addresses`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save address');
      }
      
      if (result.success) {
        // Fetch updated addresses from backend
        const addressesResponse = await fetch(`${API}/marketplace/addresses`, {
          credentials: 'include'
        });
        const addressesResult = await addressesResponse.json();
        
        // Call parent callback with updated addresses
        if (onAddressSaved && addressesResult.success) {
          onAddressSaved(addressesResult.data);
        }
        
        // Reset form
        resetForm();
        onClose();
        
        alert('Address saved successfully!');
      }
      
    } catch (error) {
      console.error('Error saving address:', error);
      alert(error.message || 'Failed to save address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      alternatePhone: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      regionCode: '',
      provinceCode: '',
      cityMunicipalityCode: '',
      barangayCode: '',
      regionName: '',
      provinceName: '',
      cityMunicipalityName: '',
      barangayName: '',
      postalCode: '',
      addressType: 'Home',
      isDefault: false,
      deliveryInstructions: ''
    });
    setErrors({});
  };
  
  // Close modal handler
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  return (
    <MuseoModal
      open={isOpen}
      onClose={handleClose}
      title="Add New Address"
      subtitle="Enter your delivery address details"
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit} style={{ display: 'block' }}>
          {/* Personal Information */}
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className={`museo-input ${errors.fullName ? 'museo-input--error' : ''}`}
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Juan Dela Cruz"
                />
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`museo-input ${errors.email ? 'museo-input--error' : ''}`}
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="juan@example.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number *</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  className={`museo-input ${errors.phoneNumber ? 'museo-input--error' : ''}`}
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+63 912 345 6789"
                />
                {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
              </div>
            </div>
          </div>
          
          {/* Address Details */}
          <div className="form-section">
            <h3 className="section-title">Address Details</h3>
            
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="addressLine1">House/Unit No., Building, Street Name *</label>
                <input
                  type="text"
                  id="addressLine1"
                  name="addressLine1"
                  className={`museo-input ${errors.addressLine1 ? 'museo-input--error' : ''}`}
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  placeholder="123 Main Street, Unit 4B"
                />
                {errors.addressLine1 && <span className="error-message">{errors.addressLine1}</span>}
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="addressLine2">Subdivision/Village/Building (Optional)</label>
                <input
                  type="text"
                  id="addressLine2"
                  name="addressLine2"
                  className="museo-input"
                  value={formData.addressLine2}
                  onChange={handleInputChange}
                  placeholder="Green Valley Subdivision"
                />
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="landmark">Landmark (Optional)</label>
                <input
                  type="text"
                  id="landmark"
                  name="landmark"
                  className="museo-input"
                  value={formData.landmark}
                  onChange={handleInputChange}
                  placeholder="Near ABC Store"
                />
              </div>
            </div>
          </div>
          
          {/* Location */}
          <div className="form-section">
            <h3 className="section-title">Location</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="regionCode">Region *</label>
                <select
                  id="regionCode"
                  name="regionCode"
                  className={`museo-select ${errors.regionCode ? 'museo-select--error' : ''}`}
                  value={formData.regionCode}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Select Region</option>
                  {regions.map(region => (
                    <option key={region.code} value={region.code}>
                      {region.name}
                    </option>
                  ))}
                </select>
                {errors.regionCode && <span className="error-message">{errors.regionCode}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="provinceCode">Province *</label>
                <select
                  id="provinceCode"
                  name="provinceCode"
                  className={`museo-select ${errors.provinceCode ? 'museo-select--error' : ''}`}
                  value={formData.provinceCode}
                  onChange={handleInputChange}
                  disabled={!formData.regionCode || loading}
                >
                  <option value="">Select Province</option>
                  {provinces.map(province => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {errors.provinceCode && <span className="error-message">{errors.provinceCode}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="cityMunicipalityCode">City/Municipality *</label>
                <select
                  id="cityMunicipalityCode"
                  name="cityMunicipalityCode"
                  className={`museo-select ${errors.cityMunicipalityCode ? 'museo-select--error' : ''}`}
                  value={formData.cityMunicipalityCode}
                  onChange={handleInputChange}
                  disabled={!formData.provinceCode || loading}
                >
                  <option value="">Select City/Municipality</option>
                  {citiesMunicipalities.map(city => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {errors.cityMunicipalityCode && <span className="error-message">{errors.cityMunicipalityCode}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="barangayCode">Barangay *</label>
                <select
                  id="barangayCode"
                  name="barangayCode"
                  className={`museo-select ${errors.barangayCode ? 'museo-select--error' : ''}`}
                  value={formData.barangayCode}
                  onChange={handleInputChange}
                  disabled={!formData.cityMunicipalityCode || loading}
                >
                  <option value="">Select Barangay</option>
                  {barangays.map(barangay => (
                    <option key={barangay.code} value={barangay.code}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
                {errors.barangayCode && <span className="error-message">{errors.barangayCode}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="postalCode">Postal Code *</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  className={`museo-input ${errors.postalCode ? 'museo-input--error' : ''}`}
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="1234"
                  maxLength="4"
                />
                {errors.postalCode && <span className="error-message">{errors.postalCode}</span>}
              </div>
            </div>
          </div>
          
          {/* Additional Options */}
          <div className="form-section">
            <h3 className="section-title">Additional Options</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Address Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="addressType"
                      value="home"
                      checked={formData.addressType === 'home'}
                      onChange={handleInputChange}
                    />
                    <span>Home</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="addressType"
                      value="office"
                      checked={formData.addressType === 'office'}
                      onChange={handleInputChange}
                    />
                    <span>Office</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="addressType"
                      value="other"
                      checked={formData.addressType === 'other'}
                      onChange={handleInputChange}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  <span>Set as default address</span>
                </label>
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</label>
                <textarea
                  id="deliveryInstructions"
                  name="deliveryInstructions"
                  className="museo-textarea"
                  value={formData.deliveryInstructions}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Any special delivery instructions..."
                />
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <MuseoModalActions>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? 'Saving...' : 'Save Address'}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
