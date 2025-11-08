import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from './MuseoModal';
import ImageUploadZone from './modal-features/ImageUploadZone';

const API = import.meta.env.VITE_API_BASE;

export default function SellerApplicationModal({ isOpen, onClose, onSubmitted }) {
  const { userData } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    shopName: '',
    fullName: userData?.fullName || '',
    email: userData?.email || '',
    phoneNumber: '',
    
    // Step 2: Business Address (PSGC)
    street: '',
    landmark: '',
    regionCode: '',
    provinceCode: '',
    cityCode: '',
    barangayCode: '',
    postalCode: '',
    
    // Step 3: Verification & Terms
    idDocument: null,
    shopDescription: '',
    agreedToTerms: false
  });
  
  // PSGC Data
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  
  const [errors, setErrors] = useState({});
  
  // Fetch regions on mount
  useEffect(() => {
    if (isOpen) {
      fetchRegions();
    }
  }, [isOpen]);
  
  const fetchRegions = async () => {
    try {
      const response = await fetch('https://psgc.gitlab.io/api/regions/');
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };
  
  // Fetch provinces when region changes
  useEffect(() => {
    if (formData.regionCode) {
      fetchProvinces(formData.regionCode);
      setFormData(prev => ({ 
        ...prev, 
        provinceCode: '', 
        cityCode: '', 
        barangayCode: '' 
      }));
      setCities([]);
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
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch cities when province changes
  useEffect(() => {
    if (formData.provinceCode) {
      fetchCities(formData.provinceCode);
      setFormData(prev => ({ 
        ...prev, 
        cityCode: '', 
        barangayCode: '' 
      }));
      setBarangays([]);
    }
  }, [formData.provinceCode]);
  
  const fetchCities = async (provinceCode) => {
    try {
      setLoading(true);
      const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch barangays when city changes
  useEffect(() => {
    if (formData.cityCode) {
      fetchBarangays(formData.cityCode);
      setFormData(prev => ({ 
        ...prev, 
        barangayCode: '' 
      }));
    }
  }, [formData.cityCode]);
  
  const fetchBarangays = async (cityCode) => {
    try {
      setLoading(true);
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
      const data = await response.json();
      setBarangays(data);
    } catch (error) {
      console.error('Error fetching barangays:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateStep = () => {
    const newErrors = {};
    
    if (currentStep === 1) {
      if (!formData.shopName.trim()) newErrors.shopName = 'Shop name is required';
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    }
    
    if (currentStep === 2) {
      if (!formData.street.trim()) newErrors.street = 'Street address is required';
      if (!formData.regionCode) newErrors.regionCode = 'Region is required';
      if (!formData.provinceCode) newErrors.provinceCode = 'Province is required';
      if (!formData.cityCode) newErrors.cityCode = 'City is required';
      if (!formData.barangayCode) newErrors.barangayCode = 'Barangay is required';
      if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    }
    
    if (currentStep === 3) {
      if (!formData.idDocument) newErrors.idDocument = 'Government ID is required';
      if (!formData.shopDescription.trim()) newErrors.shopDescription = 'Shop description is required';
      if (!formData.agreedToTerms) newErrors.agreedToTerms = 'You must agree to the terms';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
      setErrors({});
    }
  };
  
  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    setErrors({});
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) return;
    
    setIsSubmitting(true);
    
    try {
      const submitData = new FormData();
      
      const region = regions.find(r => r.code === formData.regionCode);
      const province = provinces.find(p => p.code === formData.provinceCode);
      const city = cities.find(c => c.code === formData.cityCode);
      const barangay = barangays.find(b => b.code === formData.barangayCode);
      
      submitData.append('shopName', formData.shopName);
      submitData.append('fullName', formData.fullName);
      submitData.append('email', formData.email);
      submitData.append('phoneNumber', formData.phoneNumber);
      submitData.append('street', formData.street);
      submitData.append('landmark', formData.landmark);
      submitData.append('region', region?.name || '');
      submitData.append('province', province?.name || '');
      submitData.append('city', city?.name || '');
      submitData.append('barangay', barangay?.name || '');
      submitData.append('postalCode', formData.postalCode);
      submitData.append('shopDescription', formData.shopDescription);
      
      // Handle file upload - ImageUploadZone returns object with file property
      if (formData.idDocument?.file) {
        submitData.append('idDocument', formData.idDocument.file);
      }
      
      const response = await fetch(`${API}/marketplace/seller/apply`, {
        method: 'POST',
        credentials: 'include',
        body: submitData
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Application submitted successfully! We\'ll review it and get back to you soon.');
        if (onSubmitted) onSubmitted(data);
        resetForm();
        onClose();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      shopName: '',
      fullName: userData?.fullName || '',
      email: userData?.email || '',
      phoneNumber: '',
      street: '',
      landmark: '',
      regionCode: '',
      provinceCode: '',
      cityCode: '',
      barangayCode: '',
      postalCode: '',
      idDocument: null,
      shopDescription: '',
      agreedToTerms: false
    });
    setErrors({});
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  return (
    <MuseoModal
      open={isOpen}
      onClose={handleClose}
      title="Become a Museo Seller"
      subtitle={`Step ${currentStep} of 3 - ${currentStep === 1 ? 'Basic Information' : currentStep === 2 ? 'Business Address' : 'Verification'}`}
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit} style={{ display: 'block' }}>
          {/* Progress Bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            {[1, 2, 3].map(step => (
              <div key={step} style={{
                flex: 1,
                height: '4px',
                background: step <= currentStep ? 'var(--museo-accent)' : 'var(--museo-border)',
                borderRadius: '2px',
                transition: 'background 0.3s ease'
              }} />
            ))}
          </div>
          
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div style={{ display: 'block' }}>
              <div style={{
                padding: '16px',
                background: 'var(--museo-bg-secondary)',
                borderRadius: '8px',
                marginBottom: '24px',
                borderLeft: '4px solid var(--museo-accent)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--museo-text-secondary)' }}>
                  <strong>Welcome!</strong> Start selling your artwork on Museo. No business registration required for individual artists.
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleInputChange}
                    className="museo-input"
                    placeholder="e.g., Aria's Art Studio"
                    style={{ borderColor: errors.shopName ? 'var(--museo-error)' : undefined }}
                  />
                  {errors.shopName && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.shopName}</span>}
                  <small style={{ display: 'block', marginTop: '4px', color: 'var(--museo-text-muted)', fontSize: '13px' }}>
                    This will be your public seller name on Museo
                  </small>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="museo-input"
                    placeholder="Juan Dela Cruz"
                    style={{ borderColor: errors.fullName ? 'var(--museo-error)' : undefined }}
                  />
                  {errors.fullName && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.fullName}</span>}
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="museo-input"
                    placeholder="your@email.com"
                    style={{ borderColor: errors.email ? 'var(--museo-error)' : undefined }}
                  />
                  {errors.email && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.email}</span>}
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="museo-input"
                    placeholder="+63 912 345 6789"
                    style={{ borderColor: errors.phoneNumber ? 'var(--museo-error)' : undefined }}
                  />
                  {errors.phoneNumber && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.phoneNumber}</span>}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Business Address */}
          {currentStep === 2 && (
            <div style={{ display: 'block' }}>
              <div style={{
                padding: '16px',
                background: 'var(--museo-bg-secondary)',
                borderRadius: '8px',
                marginBottom: '24px',
                borderLeft: '4px solid var(--museo-accent)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--museo-text-secondary)' }}>
                  <strong>Business Address</strong> - This will be used for returns and verification purposes.
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="museo-input"
                    placeholder="House/Unit No., Building, Street"
                    style={{ borderColor: errors.street ? 'var(--museo-error)' : undefined }}
                  />
                  {errors.street && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.street}</span>}
                </div>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    className="museo-input"
                    placeholder="Near..."
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Region *
                  </label>
                  <select
                    name="regionCode"
                    value={formData.regionCode}
                    onChange={handleInputChange}
                    className="museo-input"
                    style={{ borderColor: errors.regionCode ? 'var(--museo-error)' : undefined }}
                  >
                    <option value="">Select Region</option>
                    {regions.map(region => (
                      <option key={region.code} value={region.code}>{region.name}</option>
                    ))}
                  </select>
                  {errors.regionCode && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.regionCode}</span>}
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Province *
                  </label>
                  <select
                    name="provinceCode"
                    value={formData.provinceCode}
                    onChange={handleInputChange}
                    className="museo-input"
                    disabled={!formData.regionCode}
                    style={{ borderColor: errors.provinceCode ? 'var(--museo-error)' : undefined }}
                  >
                    <option value="">Select Province</option>
                    {provinces.map(province => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                  {errors.provinceCode && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.provinceCode}</span>}
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    City/Municipality *
                  </label>
                  <select
                    name="cityCode"
                    value={formData.cityCode}
                    onChange={handleInputChange}
                    className="museo-input"
                    disabled={!formData.provinceCode}
                    style={{ borderColor: errors.cityCode ? 'var(--museo-error)' : undefined }}
                  >
                    <option value="">Select City/Municipality</option>
                    {cities.map(city => (
                      <option key={city.code} value={city.code}>{city.name}</option>
                    ))}
                  </select>
                  {errors.cityCode && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.cityCode}</span>}
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Barangay *
                  </label>
                  <select
                    name="barangayCode"
                    value={formData.barangayCode}
                    onChange={handleInputChange}
                    className="museo-input"
                    disabled={!formData.cityCode}
                    style={{ borderColor: errors.barangayCode ? 'var(--museo-error)' : undefined }}
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map(barangay => (
                      <option key={barangay.code} value={barangay.code}>{barangay.name}</option>
                    ))}
                  </select>
                  {errors.barangayCode && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.barangayCode}</span>}
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="museo-input"
                    placeholder="1234"
                    maxLength="4"
                    style={{ borderColor: errors.postalCode ? 'var(--museo-error)' : undefined }}
                  />
                  {errors.postalCode && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.postalCode}</span>}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Verification & Terms */}
          {currentStep === 3 && (
            <div style={{ display: 'block' }}>
              <div style={{
                padding: '16px',
                background: 'var(--museo-bg-secondary)',
                borderRadius: '8px',
                marginBottom: '24px',
                borderLeft: '4px solid var(--museo-accent)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--museo-text-secondary)' }}>
                  <strong>Final Step!</strong> Upload your ID and agree to our seller terms.
                </p>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                  Shop Description *
                </label>
                <textarea
                  name="shopDescription"
                  value={formData.shopDescription}
                  onChange={handleInputChange}
                  className="museo-input"
                  placeholder="Tell buyers about your art style, inspiration, and what makes your work unique..."
                  rows="4"
                  style={{ 
                    borderColor: errors.shopDescription ? 'var(--museo-error)' : undefined,
                    resize: 'vertical'
                  }}
                />
                {errors.shopDescription && <span style={{ color: 'var(--museo-error)', fontSize: '13px' }}>{errors.shopDescription}</span>}
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: 'var(--museo-primary)' }}>
                  Government ID (for verification) *
                </label>
                <ImageUploadZone
                  type="single"
                  maxFiles={1}
                  hint="Upload a clear photo of your valid government ID • JPG, PNG up to 10MB"
                  value={formData.idDocument ? [formData.idDocument] : []}
                  onChange={(file) => setFormData(prev => ({ ...prev, idDocument: file }))}
                  accept="image/*"
                />
                {errors.idDocument && <span style={{ color: 'var(--museo-error)', fontSize: '13px', display: 'block', marginTop: '8px' }}>{errors.idDocument}</span>}
              </div>
              
              {/* Terms */}
              <div style={{
                padding: '16px',
                background: 'var(--museo-bg-secondary)',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                marginBottom: '16px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--museo-primary)' }}>Seller Agreement</h4>
                <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8', fontSize: '14px', color: 'var(--museo-text-secondary)' }}>
                  <li>15% commission on all sales</li>
                  <li>Provide accurate artwork descriptions and authentic photos</li>
                  <li>Ship within timeframe specified in your listings</li>
                  <li>Respond to buyer inquiries within 2-3 business days</li>
                  <li>Honor returns for damaged or incorrect items</li>
                  <li>No counterfeit, stolen, or prohibited artwork</li>
                  <li>Maintain professional conduct with buyers</li>
                  <li>Payments processed within 7-10 business days after delivery</li>
                  <li>You own all rights to artwork sold or have permission to sell</li>
                  <li>Museo may remove listings that violate policies</li>
                </ul>
              </div>
              
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>I agree to the Seller Terms and Conditions *</span>
                </label>
                {errors.agreedToTerms && <span style={{ color: 'var(--museo-error)', fontSize: '13px', display: 'block', marginTop: '4px' }}>{errors.agreedToTerms}</span>}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <MuseoModalActions>
            {currentStep > 1 && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {currentStep < 3 ? (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || !formData.agreedToTerms}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
