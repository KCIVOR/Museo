import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/visitMuseo.css';

const VisitMuseo = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    visitorType: '', // individual, school, organization
    organizationName: '',
    howMany: '',
    classification: '',
    institutional: '',
    yearLevel: '',
    location: '',
    organizationDetails: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    preferredDate: '',
    preferredTime: '',
    purposeOfVisit: '',
    purposeOther: '',
    remarks: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Museum showcase images - actual museo photos
  const museumImages = [
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo1.jpg', caption: 'Main Gallery Hall' },
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo2.jpg', caption: 'Art Exhibition Space' },
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo3.jpg', caption: 'Sculpture Garden' },
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo4.jpg', caption: 'Historical Archives' },
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo5.jpg', caption: 'Contemporary Wing' },
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo6.jpg', caption: 'Museum Entrance' },
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo1.jpg', caption: 'Interactive Area' },
    { url: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/museo2.jpg', caption: 'Museum Café' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Prepare data for API
      const bookingData = {
        visitorType: formData.visitorType,
        organizationName: formData.organizationName || null,
        howMany: formData.howMany,
        classification: formData.classification || null,
        institutional: formData.institutional || null,
        yearLevel: formData.yearLevel || null,
        location: formData.location,
        organizationDetails: formData.organizationDetails || null,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime || null,
        purposeOfVisit: formData.purposeOfVisit,
        purposeOther: formData.purposeOther || null,
        remarks: formData.remarks || null
      };

      // Call API
      const response = await fetch('http://localhost:3000/api/visit-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit booking');
      }

      // Success
      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        visitorType: '',
        organizationName: '',
        howMany: '',
        classification: '',
        institutional: '',
        yearLevel: '',
        location: '',
        organizationDetails: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        preferredDate: '',
        preferredTime: '',
        purposeOfVisit: '',
        purposeOther: '',
        remarks: ''
      });

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);

    } catch (error) {
      console.error('Error submitting booking:', error);
      setSubmitError(error.message || 'Failed to submit booking. Please try again.');
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="visit-museo-page">
      {/* Hero Section */}
      <section className="vm-hero">
        <div className="vm-hero-overlay">
          <div className="vm-hero-content">
            <span className="vm-hero-badge">Experience Art & Culture</span>
            <h1 className="vm-hero-title">Visit Museo</h1>
            <p className="vm-hero-subtitle">
              Immerse yourself in a world of creativity, history, and inspiration
            </p>
            <button 
              className="vm-hero-btn"
              onClick={() => document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' })}
            >
              Book Your Visit
            </button>
          </div>
        </div>
      </section>

      {/* Museum Gallery Collage */}
      <section className="vm-gallery-section">
        <div className="vm-section-header">
          <h2 className="vm-section-title">Discover Museo</h2>
          <p className="vm-section-subtitle">
            Explore Our Spaces
          </p>
        </div>

        {/* Collage Grid */}
        <div className="vm-collage-grid">
          {/* Large Featured Image */}
          <div className="vm-collage-item vm-collage-item--large" style={{ animationDelay: '0s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[0].url} alt={museumImages[0].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[0].caption}</h3>
              </div>
            </div>
          </div>

          {/* Medium Images */}
          <div className="vm-collage-item vm-collage-item--medium" style={{ animationDelay: '0.1s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[1].url} alt={museumImages[1].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[1].caption}</h3>
              </div>
            </div>
          </div>

          <div className="vm-collage-item vm-collage-item--medium" style={{ animationDelay: '0.2s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[2].url} alt={museumImages[2].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[2].caption}</h3>
              </div>
            </div>
          </div>

          {/* Small Images */}
          <div className="vm-collage-item vm-collage-item--small" style={{ animationDelay: '0.3s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[3].url} alt={museumImages[3].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[3].caption}</h3>
              </div>
            </div>
          </div>

          <div className="vm-collage-item vm-collage-item--small" style={{ animationDelay: '0.4s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[4].url} alt={museumImages[4].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[4].caption}</h3>
              </div>
            </div>
          </div>

          <div className="vm-collage-item vm-collage-item--small" style={{ animationDelay: '0.5s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[5].url} alt={museumImages[5].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[5].caption}</h3>
              </div>
            </div>
          </div>

          {/* Wide Images */}
          <div className="vm-collage-item vm-collage-item--wide" style={{ animationDelay: '0.6s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[6].url} alt={museumImages[6].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[6].caption}</h3>
              </div>
            </div>
          </div>

          <div className="vm-collage-item vm-collage-item--wide" style={{ animationDelay: '0.7s' }}>
            <div className="vm-collage-image-wrapper">
              <img src={museumImages[7].url} alt={museumImages[7].caption} className="vm-collage-image" />
              <div className="vm-collage-overlay">
                <h3 className="vm-collage-caption">{museumImages[7].caption}</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Visit Section */}
      <section className="vm-why-section">
        <div className="vm-why-container">
          <h2 className="vm-why-title">Why Visit Museo?</h2>
          <div className="vm-why-grid">
            <div className="vm-why-card">
              <div className="vm-why-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <h3 className="vm-why-card-title">World-Class Art</h3>
              <p className="vm-why-card-text">
                Experience curated collections from renowned artists and emerging talents
              </p>
            </div>
            <div className="vm-why-card">
              <div className="vm-why-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h3 className="vm-why-card-title">Educational Programs</h3>
              <p className="vm-why-card-text">
                Guided tours and workshops designed for students and art enthusiasts
              </p>
            </div>
            <div className="vm-why-card">
              <div className="vm-why-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                  <path d="M9 9v.01"/>
                  <path d="M9 12v.01"/>
                  <path d="M9 15v.01"/>
                  <path d="M9 18v.01"/>
                </svg>
              </div>
              <h3 className="vm-why-card-title">Historic Venue</h3>
              <p className="vm-why-card-text">
                Explore a beautifully preserved space that celebrates cultural heritage
              </p>
            </div>
            <div className="vm-why-card">
              <div className="vm-why-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="vm-why-card-title">Group Friendly</h3>
              <p className="vm-why-card-text">
                Special arrangements for schools, organizations, and large groups
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section className="vm-booking-section" id="booking-section">
        <div className="vm-booking-container">
          <div className="vm-booking-header">
            <span className="vm-booking-badge">Plan Your Visit</span>
            <h2 className="vm-booking-title">Book a Visit</h2>
            <p className="vm-booking-subtitle">
              Fill out the form below and we'll get back to you within 24 hours
            </p>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <div className="vm-alert vm-alert-success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <div>
                <h4>Booking Submitted Successfully!</h4>
                <p>Thank you for your interest in visiting Museo. We will review your request and contact you within 24 hours.</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="vm-alert vm-alert-error">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <h4>Submission Failed</h4>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          <form className="vm-booking-form" onSubmit={handleSubmit}>
            {/* Visitor Type Selection */}
            <div className="vm-form-section">
              <h3 className="vm-form-section-title">Visitor Information</h3>
              <div className="vm-form-grid">
                <div className="vm-form-group vm-form-group--full">
                  <label className="vm-form-label">I am visiting as *</label>
                  <select
                    name="visitorType"
                    value={formData.visitorType}
                    onChange={handleInputChange}
                    className="vm-form-input"
                    required
                  >
                    <option value="">Select visitor type</option>
                    <option value="individual">Individual / Walk-in Visitor</option>
                    <option value="school">School / Educational Institution</option>
                    <option value="organization">Organization / Company / LGU</option>
                  </select>
                </div>

                {/* Show organization name only if not individual */}
                {formData.visitorType && formData.visitorType !== 'individual' && (
                  <div className="vm-form-group vm-form-group--full">
                    <label className="vm-form-label">
                      {formData.visitorType === 'school' ? 'School Name *' : 'Organization Name *'}
                    </label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      className="vm-form-input"
                      placeholder={formData.visitorType === 'school' ? 'Enter school name' : 'Enter organization name'}
                      required
                    />
                  </div>
                )}

                {/* Number of visitors */}
                {formData.visitorType && (
                  <div className="vm-form-group">
                    <label className="vm-form-label">
                      {formData.visitorType === 'individual' ? 'Number of People in Your Group *' : 'Number of Visitors *'}
                    </label>
                    <input
                      type="number"
                      name="howMany"
                      value={formData.howMany}
                      onChange={handleInputChange}
                      className="vm-form-input"
                      placeholder="How many people?"
                      min="1"
                      required
                    />
                  </div>
                )}

                {/* Classification - only for school */}
                {formData.visitorType === 'school' && (
                  <>
                    <div className="vm-form-group">
                      <label className="vm-form-label">Classification *</label>
                      <select
                        name="classification"
                        value={formData.classification}
                        onChange={handleInputChange}
                        className="vm-form-input"
                        required
                      >
                        <option value="">Select classification</option>
                        <option value="elementary">Elementary</option>
                        <option value="junior-high">Junior High School</option>
                        <option value="senior-high">Senior High School</option>
                        <option value="college">College / University</option>
                      </select>
                    </div>

                    <div className="vm-form-group">
                      <label className="vm-form-label">Year Level *</label>
                      <input
                        type="text"
                        name="yearLevel"
                        value={formData.yearLevel}
                        onChange={handleInputChange}
                        className="vm-form-input"
                        placeholder="e.g., Grade 10, 3rd Year"
                        required
                      />
                    </div>

                    <div className="vm-form-group">
                      <label className="vm-form-label">School Type *</label>
                      <select
                        name="institutional"
                        value={formData.institutional}
                        onChange={handleInputChange}
                        className="vm-form-input"
                        required
                      >
                        <option value="">Select type</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Organization type - only for organization */}
                {formData.visitorType === 'organization' && (
                  <div className="vm-form-group">
                    <label className="vm-form-label">Organization Type *</label>
                    <select
                      name="institutional"
                      value={formData.institutional}
                      onChange={handleInputChange}
                      className="vm-form-input"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="lgu">Local Government Unit (LGU)</option>
                      <option value="ngo">Non-Government Organization (NGO)</option>
                      <option value="private-company">Private Company</option>
                      <option value="government-agency">Government Agency</option>
                    </select>
                  </div>
                )}

                {/* Location - for all */}
                {formData.visitorType && (
                  <div className="vm-form-group vm-form-group--full">
                    <label className="vm-form-label">Location (City, Province) *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="vm-form-input"
                      placeholder="e.g., Manila, Metro Manila"
                      required
                    />
                  </div>
                )}

                {/* Additional details - only for school and organization */}
                {formData.visitorType && formData.visitorType !== 'individual' && (
                  <div className="vm-form-group vm-form-group--full">
                    <label className="vm-form-label">Additional Details <span className="vm-optional">(Optional)</span></label>
                    <textarea
                      name="organizationDetails"
                      value={formData.organizationDetails}
                      onChange={handleInputChange}
                      className="vm-form-textarea"
                      placeholder="Any additional information about your group..."
                      rows="2"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Contact Person Section */}
            <div className="vm-form-section">
              <h3 className="vm-form-section-title">Contact Person</h3>
              <div className="vm-form-grid">
                <div className="vm-form-group vm-form-group--full">
                  <label className="vm-form-label">Full Name *</label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className="vm-form-input"
                    placeholder="Point of contact for coordination"
                    required
                  />
                </div>

                <div className="vm-form-group">
                  <label className="vm-form-label">Email *</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="vm-form-input"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="vm-form-group">
                  <label className="vm-form-label">Phone Number *</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="vm-form-input"
                    placeholder="09XX XXX XXXX"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Visit Details Section */}
            <div className="vm-form-section">
              <h3 className="vm-form-section-title">Visit Details</h3>
              <div className="vm-form-grid">
                <div className="vm-form-group">
                  <label className="vm-form-label">Preferred Date of Visit *</label>
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    className="vm-form-input"
                    required
                  />
                </div>

                <div className="vm-form-group">
                  <label className="vm-form-label">Preferred Time <span className="vm-optional">(Optional)</span></label>
                  <select
                    name="preferredTime"
                    value={formData.preferredTime || ''}
                    onChange={handleInputChange}
                    className="vm-form-input"
                  >
                    <option value="">Select time</option>
                    <option value="morning">Morning (9:00 AM - 12:00 PM)</option>
                    <option value="afternoon">Afternoon (1:00 PM - 5:00 PM)</option>
                  </select>
                </div>

                <div className="vm-form-group vm-form-group--full">
                  <label className="vm-form-label">Purpose of Visit *</label>
                  <select
                    name="purposeOfVisit"
                    value={formData.purposeOfVisit}
                    onChange={handleInputChange}
                    className="vm-form-input"
                    required
                  >
                    <option value="">Select purpose</option>
                    <option value="educational-tour">Educational Tour</option>
                    <option value="research">Research / Study</option>
                    <option value="cultural-appreciation">Cultural Appreciation</option>
                    <option value="team-building">Team Building Activity</option>
                    <option value="partnership">Partnership / Collaboration</option>
                    <option value="benchmarking">Benchmarking / Site Visit</option>
                    <option value="leisure">Leisure / Tourism</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {formData.purposeOfVisit === 'other' && (
                  <div className="vm-form-group vm-form-group--full">
                    <label className="vm-form-label">Please specify purpose *</label>
                    <input
                      type="text"
                      name="purposeOther"
                      value={formData.purposeOther || ''}
                      onChange={handleInputChange}
                      className="vm-form-input"
                      placeholder="Please describe your purpose of visit"
                      required
                    />
                  </div>
                )}

                <div className="vm-form-group vm-form-group--full">
                  <label className="vm-form-label">Special Requests / Additional Notes <span className="vm-optional">(Optional)</span></label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    className="vm-form-textarea"
                    placeholder="Any special accommodations, accessibility needs, or additional information..."
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="vm-form-actions">
              <button type="submit" className="vm-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" className="vm-cancel-btn" onClick={() => navigate(-1)} disabled={isSubmitting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Visit Info Section */}
      <section className="vm-info-section">
        <div className="vm-info-container">
          <div className="vm-info-grid">
            <div className="vm-info-card">
              <div className="vm-info-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="vm-info-title">Opening Hours</h3>
              <p className="vm-info-text">Monday - Friday</p>
              <p className="vm-info-text">9:00 AM - 4:00 PM</p>
              <p className="vm-info-note">Closed on Weekends</p>
            </div>

            <div className="vm-info-card">
              <div className="vm-info-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <h3 className="vm-info-title">Location</h3>
              <p className="vm-info-text">Old City Hall Building</p>
              <p className="vm-info-text">ML Tagarao cor. Allarey St., Brgy. 5, Lucena City</p>
              <p className="vm-info-note">Free parking available</p>
            </div>

            <div className="vm-info-card">
              <div className="vm-info-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="vm-info-title">Admission</h3>
              <p className="vm-info-text">Students: Free</p>
              <p className="vm-info-text">Adults: Free</p>
              <p className="vm-info-note">Walk-in/Reserve</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VisitMuseo;
