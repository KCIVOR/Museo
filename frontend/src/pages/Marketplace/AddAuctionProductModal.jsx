import React, { useState } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ConfirmModal from '../Shared/ConfirmModal.jsx';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import EditAuctionItemModal from './EditAuctionItemModal';
import './css/addProductModal.css';

const API = import.meta.env.VITE_API_BASE;

// Helper: Convert local datetime to ISO string
function localToISO(localDatetimeString) {
  if (!localDatetimeString) return null;
  const dt = new Date(localDatetimeString);
  return dt.toISOString();
}

const AddAuctionProductModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(0); // Step 0: Choice, Step 1: Item (create/select), Step 2: Auction
  const [itemChoice, setItemChoice] = useState(null); // 'create' or 'existing'
  const [existingItems, setExistingItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  const [formData, setFormData] = useState({
    // Item details
    title: '',
    description: '',
    medium: '',
    dimensions: '',
    year_created: '',
    weight_kg: '',
    is_original: true,
    is_framed: false,
    condition: 'excellent',
    categories: [],
    tags: [],
    // Auction details
    startPrice: '',
    reservePrice: '',
    minIncrement: '',
    startAt: '',
    endAt: '',
  });
  
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auctionItemId, setAuctionItemId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Delete confirm modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchExistingItems = async () => {
    setLoadingItems(true);
    try {
      const response = await fetch(`${API}/auctions/items/my-items`, {
        method: 'GET',
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setExistingItems(result.data || []);
      } else {
        setErrors({ submit: result.error || 'Failed to load items' });
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setErrors({ submit: 'Failed to load your items' });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleChoiceSelect = (choice) => {
    setItemChoice(choice);
    if (choice === 'existing') {
      fetchExistingItems();
    }
    setStep(1);
  };

  const handleSelectExistingItem = (item) => {
    setAuctionItemId(item.auctionItemId);
    setStep(2);
  };

  const openDeleteConfirm = (itemId, e) => {
    e?.stopPropagation();
    setDeleteTargetId(itemId);
    setDeleteConfirmOpen(true);
  };

  const performDeleteItem = async () => {
    const itemId = deleteTargetId;
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    if (!itemId) return;
    try {
      const response = await fetch(`${API}/auctions/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setExistingItems(existingItems.filter(item => item.auctionItemId !== itemId));
      } else {
        setErrors({ submit: result.error || 'Failed to delete item' });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrors({ submit: 'Failed to delete item' });
    }
  };

  const handleEditItem = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = (updatedItem) => {
    // Update the item in the list
    setExistingItems(existingItems.map(item => 
      item.auctionItemId === updatedItem.auctionItemId ? updatedItem : item
    ));
    setIsEditModalOpen(false);
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

  const handleArrayInputChange = (e, field) => {
    const items = e.target.value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!formData.medium) newErrors.medium = 'Medium is required';
    if (!formData.dimensions) newErrors.dimensions = 'Dimensions are required';
    if (formData.categories.length === 0) newErrors.categories = 'Add at least one category';
    if (images.length === 0) newErrors.images = 'Upload at least one image';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.startPrice || parseFloat(formData.startPrice) <= 0) {
      newErrors.startPrice = 'Valid starting price required (pesos)';
    }
    if (!formData.reservePrice || parseFloat(formData.reservePrice) <= 0) {
      newErrors.reservePrice = 'Valid reserve price required (pesos)';
    }
    if (formData.reservePrice && formData.startPrice && 
        parseFloat(formData.reservePrice) < parseFloat(formData.startPrice)) {
      newErrors.reservePrice = 'Reserve price must be ≥ starting price';
    }
    if (!formData.minIncrement || parseFloat(formData.minIncrement) < 0) {
      newErrors.minIncrement = 'Minimum increment required (pesos)';
    }
    if (!formData.startAt) newErrors.startAt = 'Start time required';
    if (!formData.endAt) newErrors.endAt = 'End time required';
    if (formData.endAt && formData.startAt && new Date(formData.endAt) <= new Date(formData.startAt)) {
      newErrors.endAt = 'End time must be after start time';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('medium', formData.medium);
      submitData.append('dimensions', formData.dimensions);
      submitData.append('year_created', formData.year_created || '');
      submitData.append('weight_kg', formData.weight_kg || '');
      submitData.append('is_original', formData.is_original);
      submitData.append('is_framed', formData.is_framed);
      submitData.append('condition', formData.condition);
      submitData.append('categories', JSON.stringify(formData.categories));
      submitData.append('tags', JSON.stringify(formData.tags));

      images.forEach((image) => {
        submitData.append('images', image.file);
      });

      const response = await fetch(`${API}/auctions/items`, {
        method: 'POST',
        credentials: 'include',
        body: submitData
      });

      const result = await response.json();
      if (result.success && result.data?.auctionItemId) {
        setAuctionItemId(result.data.auctionItemId);
        setStep(2);
        setErrors({});
      } else {
        setErrors({ submit: result.error || 'Failed to create auction item' });
      }
    } catch (error) {
      console.error('Error creating auction item:', error);
      setErrors({ submit: 'An error occurred while creating the auction item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStep2 = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      const auctionData = {
        auctionItemId,
        startPrice: parseFloat(formData.startPrice),
        reservePrice: parseFloat(formData.reservePrice),
        minIncrement: parseFloat(formData.minIncrement),
        startAt: localToISO(formData.startAt),
        endAt: localToISO(formData.endAt)
      };

      const response = await fetch(`${API}/auctions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auctionData)
      });

      const result = await response.json();
      if (result.success) {
        setFormData({
          title: '', description: '', medium: '', dimensions: '', year_created: '',
          weight_kg: '', is_original: true, is_framed: false, condition: 'excellent',
          categories: [], tags: [], startPrice: '', reservePrice: '', minIncrement: '',
          startAt: '', endAt: '',
        });
        setImages([]);
        setErrors({});
        setStep(1);
        setAuctionItemId(null);
        onSuccess && onSuccess(result);
        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to create auction' });
      }
    } catch (error) {
      console.error('Error creating auction:', error);
      setErrors({ submit: 'An error occurred while creating the auction' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '', description: '', medium: '', dimensions: '', year_created: '',
      weight_kg: '', is_original: true, is_framed: false, condition: 'excellent',
      categories: [], tags: [], startPrice: '', reservePrice: '', minIncrement: '',
      startAt: '', endAt: '',
    });
    setImages([]);
    setErrors({});
    setStep(0);
    setItemChoice(null);
    setAuctionItemId(null);
    setExistingItems([]);
    onClose();
  };

  return (
    <>
    <MuseoModal
      open={isOpen}
      onClose={handleClose}
      title={
        step === 0 ? "Create Auction" :
        step === 1 ? (itemChoice === 'create' ? "Add Auction - Step 1: Item Details" : "Add Auction - Step 1: Select Item") :
        "Add Auction - Step 2: Auction Settings"
      }
      subtitle={
        step === 0 ? "Choose how to create your auction" :
        step === 1 ? (itemChoice === 'create' ? "Describe your artwork" : "Select an existing item") :
        "Set auction parameters (Manila timezone)"
      }
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={step === 1 && itemChoice === 'create' ? handleSubmitStep1 : step === 2 ? handleSubmitStep2 : undefined} className="add-product-form">
          {step === 0 ? (
            <>
              {/* STEP 0: CHOICE */}
              <div className="choice-grid">
                <button
                  type="button"
                  className="choice-card"
                  onClick={() => handleChoiceSelect('create')}
                >
                  <svg className="choice-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
                  </svg>
                  <h4 className="choice-card__title">Create New Item</h4>
                  <p className="choice-card__description">
                    Upload images and describe a new artwork to auction
                  </p>
                </button>

                <button
                  type="button"
                  className="choice-card"
                  onClick={() => handleChoiceSelect('existing')}
                >
                  <svg className="choice-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6-6 6 6M6 9v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V9" />
                    <path d="M10 13h4v6h-4z" />
                  </svg>
                  <h4 className="choice-card__title">Use Existing Item</h4>
                  <p className="choice-card__description">
                    Select from your previously created items
                  </p>
                </button>
              </div>
            </>
          ) : step === 1 && itemChoice === 'existing' ? (
            <>
              {/* STEP 1: SELECT EXISTING ITEM */}
              {loadingItems ? (
                <div className="item-grid-loading">
                  <p>Loading your items...</p>
                </div>
              ) : existingItems.length === 0 ? (
                <div className="item-grid-empty">
                  <p>No items found. Create a new item instead.</p>
                </div>
              ) : (
                <div className="item-grid">
                  {existingItems.map((item) => (
                    <div
                      key={item.auctionItemId}
                      className="item-card"
                      onClick={() => handleSelectExistingItem(item)}
                    >
                      <div className="item-card__image-wrapper">
                        {item.primary_image ? (
                          <img 
                            src={item.primary_image} 
                            alt={item.title} 
                            className="item-card__image"
                          />
                        ) : (
                          <div className="item-card__image-placeholder">No Image</div>
                        )}
                      </div>
                      
                      <div className="item-card__content">
                        <h4 className="item-card__title">{item.title}</h4>
                        <p className="item-card__meta">{item.medium}</p>
                        <p className="item-card__meta">{item.dimensions}</p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="item-card__actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={(e) => handleEditItem(item, e)}
                          title="Edit item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={(e) => openDeleteConfirm(item.auctionItemId, e)}
                          title="Delete item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.submit && (
                <div className="museo-notice museo-notice--error">
                  {errors.submit}
                </div>
              )}
            </>
          ) : step === 1 && itemChoice === 'create' ? (
            <>
              {/* STEP 1: CREATE NEW ITEM */}
              <ImageUploadZone
                type="multiple"
                maxFiles={10}
                title="Product Images"
                hint="Support: JPG, PNG up to 10MB • Maximum 10 images • First image will be primary"
                value={images}
                onChange={setImages}
                error={errors.images}
              />

              <div className="form-section">
                <h3 className="section-title">Basic Information</h3>
                
                <div className="museo-form-group">
                  <label htmlFor="title" className="museo-label museo-label--required">
                    Product Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Sunset Over Mountains"
                    className={`museo-input ${errors.title ? 'museo-input--error' : ''}`}
                  />
                  {errors.title && <span className="museo-form-error">{errors.title}</span>}
                </div>

                <div className="museo-form-group">
                  <label htmlFor="description" className="museo-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Describe your product in detail..."
                    className="museo-textarea"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Product Details</h3>
                
                <div className="form-row">
                  <div className="museo-form-group">
                    <label htmlFor="medium" className="museo-label museo-label--required">
                      Medium
                    </label>
                    <input
                      type="text"
                      id="medium"
                      name="medium"
                      value={formData.medium}
                      onChange={handleInputChange}
                      placeholder="e.g., Oil on Canvas"
                      className={`museo-input ${errors.medium ? 'museo-input--error' : ''}`}
                    />
                    {errors.medium && <span className="museo-form-error">{errors.medium}</span>}
                  </div>

                  <div className="museo-form-group">
                    <label htmlFor="dimensions" className="museo-label museo-label--required">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      placeholder="e.g., 50x70 cm"
                      className={`museo-input ${errors.dimensions ? 'museo-input--error' : ''}`}
                    />
                    {errors.dimensions && <span className="museo-form-error">{errors.dimensions}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="museo-form-group">
                    <label htmlFor="year_created" className="museo-label">
                      Year Created
                    </label>
                    <input
                      type="number"
                      id="year_created"
                      name="year_created"
                      value={formData.year_created}
                      onChange={handleInputChange}
                      placeholder="e.g., 2020"
                      min="1900"
                      max={new Date().getFullYear()}
                      className="museo-input"
                    />
                  </div>

                  <div className="museo-form-group">
                    <label htmlFor="weight_kg" className="museo-label">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      id="weight_kg"
                      name="weight_kg"
                      value={formData.weight_kg}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.1"
                      min="0"
                      className="museo-input"
                    />
                  </div>
                </div>

                <div className="museo-form-group">
                  <label htmlFor="condition" className="museo-label museo-label--required">
                    Condition
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="museo-select"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>

                <div className="form-row checkbox-row">
                  <label className="museo-checkbox-label">
                    <input
                      type="checkbox"
                      id="is_original"
                      name="is_original"
                      checked={formData.is_original}
                      onChange={handleInputChange}
                      className="museo-checkbox"
                    />
                    <span>Original Artwork</span>
                  </label>

                  <label className="museo-checkbox-label">
                    <input
                      type="checkbox"
                      id="is_framed"
                      name="is_framed"
                      checked={formData.is_framed}
                      onChange={handleInputChange}
                      className="museo-checkbox"
                    />
                    <span>Framed</span>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Categorization</h3>
                
                <div className="museo-form-group">
                  <label htmlFor="categories" className="museo-label museo-label--required">
                    Categories
                  </label>
                  <input
                    type="text"
                    id="categories"
                    placeholder="e.g., Painting, Contemporary Art"
                    value={formData.categories.join(', ')}
                    onChange={(e) => handleArrayInputChange(e, 'categories')}
                    className={`museo-input ${errors.categories ? 'museo-input--error' : ''}`}
                  />
                  <span className="museo-form-helper">Separate with commas</span>
                  {errors.categories && <span className="museo-form-error">{errors.categories}</span>}
                </div>

                <div className="museo-form-group">
                  <label htmlFor="tags" className="museo-label">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    placeholder="e.g., abstract, modern"
                    value={formData.tags.join(', ')}
                    onChange={(e) => handleArrayInputChange(e, 'tags')}
                    className="museo-input"
                  />
                  <span className="museo-form-helper">Separate with commas</span>
                </div>
              </div>

              {errors.submit && (
                <div className="museo-notice museo-notice--error">
                  {errors.submit}
                </div>
              )}
            </>
          ) : (
            <>
              {/* STEP 2: AUCTION SETTINGS */}
              <div className="form-section">
                <h3 className="section-title">Auction Pricing</h3>
                
                <div className="form-row">
                  <div className="museo-form-group">
                    <label htmlFor="startPrice" className="museo-label museo-label--required">
                      Starting Price (₱)
                    </label>
                    <input
                      type="number"
                      id="startPrice"
                      name="startPrice"
                      value={formData.startPrice}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`museo-input ${errors.startPrice ? 'museo-input--error' : ''}`}
                    />
                    {errors.startPrice && <span className="museo-form-error">{errors.startPrice}</span>}
                  </div>

                  <div className="museo-form-group">
                    <label htmlFor="reservePrice" className="museo-label museo-label--required">
                      Reserve Price (₱)
                    </label>
                    <input
                      type="number"
                      id="reservePrice"
                      name="reservePrice"
                      value={formData.reservePrice}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`museo-input ${errors.reservePrice ? 'museo-input--error' : ''}`}
                    />
                    {errors.reservePrice && <span className="museo-form-error">{errors.reservePrice}</span>}
                  </div>
                </div>

                <div className="museo-form-group">
                  <label htmlFor="minIncrement" className="museo-label museo-label--required">
                    Minimum Bid Increment (₱)
                  </label>
                  <input
                    type="number"
                    id="minIncrement"
                    name="minIncrement"
                    value={formData.minIncrement}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`museo-input ${errors.minIncrement ? 'museo-input--error' : ''}`}
                  />
                  {errors.minIncrement && <span className="museo-form-error">{errors.minIncrement}</span>}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Auction Duration (Manila Timezone)</h3>
                
                <div className="form-row">
                  <div className="museo-form-group">
                    <label htmlFor="startAt" className="museo-label museo-label--required">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      id="startAt"
                      name="startAt"
                      value={formData.startAt}
                      onChange={handleInputChange}
                      className={`museo-input ${errors.startAt ? 'museo-input--error' : ''}`}
                    />
                    {errors.startAt && <span className="museo-form-error">{errors.startAt}</span>}
                  </div>

                  <div className="museo-form-group">
                    <label htmlFor="endAt" className="museo-label museo-label--required">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      id="endAt"
                      name="endAt"
                      value={formData.endAt}
                      onChange={handleInputChange}
                      className={`museo-input ${errors.endAt ? 'museo-input--error' : ''}`}
                    />
                    {errors.endAt && <span className="museo-form-error">{errors.endAt}</span>}
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="museo-notice museo-notice--error">
                  {errors.submit}
                </div>
              )}
            </>
          )}
        </form>
      </MuseoModalBody>

      {!(step === 1 && itemChoice === 'existing') && (
        <MuseoModalActions>
          <button 
            className="btn btn-sm btn-ghost"
            onClick={step === 0 ? handleClose : () => setStep(step - 1)}
            disabled={isSubmitting}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          
          {step === 1 && itemChoice === 'create' && (
            <button 
              className="btn btn-sm btn-primary"
              type="submit"
              onClick={handleSubmitStep1}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Next: Auction Settings'}
            </button>
          )}

          {step === 2 && (
            <button 
              className="btn btn-sm btn-primary"
              type="submit"
              onClick={handleSubmitStep2}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Create Auction'}
            </button>
          )}
        </MuseoModalActions>
      )}
    </MuseoModal>

    {/* Edit Item Modal */}
    {editingItem && (
      <EditAuctionItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={editingItem}
        onSuccess={handleEditSuccess}
      />
    )}

    {/* Delete Confirmation Modal */}
    <ConfirmModal
      open={deleteConfirmOpen}
      title="Delete Item"
      message="Are you sure you want to delete this item?"
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={performDeleteItem}
      onCancel={() => { setDeleteConfirmOpen(false); setDeleteTargetId(null); }}
    />
    </>
  );
};

export default AddAuctionProductModal;
