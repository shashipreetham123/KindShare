import { useState } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  PackagePlus,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  Image as ImageIcon,
  User,
  ShieldCheck,
  Info,
  Check,
  Eye,
  X
} from 'lucide-react';
import api from '../../services/api';
import './AddProduct.css';

const ACCESS_LEVELS = [
  { value: 4, label: 'Everyone (Public Community)', desc: 'Visible to all registered users (Individuals, Organizations, Businesses)' },
  { value: 1, label: 'Individuals Only', desc: 'Reserved only for individual citizens and community members' },
  { value: 2, label: 'Organizations Only', desc: 'Reserved only for verified nonprofit organizations and charities' },
  { value: 3, label: 'Businesses Only', desc: 'Reserved only for verified business entities' }
];

function AddProduct() {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { user } = context;

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [coverImage, setCoverImage] = useState('');
  const [accessLevel, setAccessLevel] = useState(4);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [currentAdditionalUrl, setCurrentAdditionalUrl] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Add additional gallery image
  const handleAddImage = (e) => {
    e.preventDefault();
    const trimmed = currentAdditionalUrl.trim();
    if (!trimmed) return;
    if (additionalImages.includes(trimmed) || trimmed === coverImage) {
      return;
    }
    setAdditionalImages((prev) => [...prev, trimmed]);
    setCurrentAdditionalUrl('');
  };

  const handleRemoveImage = (indexToRemove) => {
    setAdditionalImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleQuickQuantity = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const validateForm = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!description.trim()) errs.description = 'Description is required';
    if (!coverImage.trim()) errs.coverImage = 'Cover image URL is required';
    if (!quantity || Number(quantity) <= 0) errs.quantity = 'Quantity must be at least 1';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        quantity: Number(quantity),
        coverImage: coverImage.trim(),
        accessLevel: Number(accessLevel),
        images: additionalImages
      };

      const res = await api.post('/user/product', payload);
      const createdProduct = res.data || {};

      setSuccessMsg(res.message || 'Product listed and added to inventory successfully!');

      setTimeout(() => {
        // Navigate to user's inventory to see their new item
        navigate('/dashboard/inventory');
      }, 1500);
    } catch (err) {
      console.error('Failed to add product:', err);
      setError(err.message || 'Failed to insert product into database. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-product-container">
      {/* 1. Header */}
      <header className="add-product-header">
        <div className="add-product-title-row">
          <Link to="/dashboard/inventory" className="btn-back-link" title="Back to Inventory">
            <ArrowLeft size={18} />
          </Link>
          <div className="header-icon-badge">
            <PackagePlus size={24} className="header-icon" />
          </div>
          <div>
            <h1>List a New Product</h1>
            <p className="add-product-subtitle">
              Add food, supplies, goods, or resources to donate to the KindShare community marketplace.
            </p>
          </div>
        </div>

        <div className="logged-user-chip">
          <User size={14} />
          <span>Listing as: <strong>@{user ? user.username : 'You'}</strong></span>
        </div>
      </header>

      {/* Feedback Alerts */}
      {error && (
        <div className="add-product-alert alert-error">
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="add-product-alert alert-success">
          <CheckCircle2 size={18} className="alert-icon" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Form Grid (Main Form + Live Preview Sidebar) */}
      <form onSubmit={handleSubmit} className="add-product-form-layout">
        {/* Left Column: Form Fields */}
        <div className="form-card-main">
          {/* Section: Basic Information */}
          <div className="form-section">
            <h3 className="section-title">
              <Layers size={18} />
              <span>General Information</span>
            </h3>

            {/* Product Name */}
            <div className="form-group">
              <label htmlFor="prod-name" className="form-label">
                Product Name <span className="req-star">*</span>
              </label>
              <input
                id="prod-name"
                type="text"
                className={`form-input ${validationErrors.name ? 'input-error' : ''}`}
                placeholder="e.g., Organic Fresh Apples (5kg), Winter Blankets, Canned Soup"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: null }));
                }}
                disabled={loading}
                required
              />
              {validationErrors.name && (
                <span className="error-hint">{validationErrors.name}</span>
              )}
            </div>

            {/* Product Description */}
            <div className="form-group">
              <label htmlFor="prod-desc" className="form-label">
                Description & Condition <span className="req-star">*</span>
              </label>
              <textarea
                id="prod-desc"
                rows={4}
                className={`form-textarea ${validationErrors.description ? 'input-error' : ''}`}
                placeholder="Provide details such as expiry date, storage recommendations, packaging condition, or pickup instructions..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (validationErrors.description) setValidationErrors((prev) => ({ ...prev, description: null }));
                }}
                disabled={loading}
                required
              />
              {validationErrors.description && (
                <span className="error-hint">{validationErrors.description}</span>
              )}
            </div>

            {/* Quantity Controls */}
            <div className="form-group">
              <label htmlFor="prod-qty" className="form-label">
                Available Quantity <span className="req-star">*</span>
              </label>
              <div className="quantity-control-row">
                <button
                  type="button"
                  className="btn-qty-step"
                  onClick={() => handleQuickQuantity(-1)}
                  disabled={quantity <= 1 || loading}
                >
                  -
                </button>
                <input
                  id="prod-qty"
                  type="number"
                  min="1"
                  className={`form-input qty-number-input ${validationErrors.quantity ? 'input-error' : ''}`}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) ? '' : Math.max(1, val));
                    if (validationErrors.quantity) setValidationErrors((prev) => ({ ...prev, quantity: null }));
                  }}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="btn-qty-step"
                  onClick={() => handleQuickQuantity(1)}
                  disabled={loading}
                >
                  +
                </button>
                <div className="qty-quick-presets">
                  <button type="button" className="btn-preset" onClick={() => setQuantity(5)}>+5</button>
                  <button type="button" className="btn-preset" onClick={() => setQuantity(10)}>+10</button>
                  <button type="button" className="btn-preset" onClick={() => setQuantity(25)}>+25</button>
                </div>
              </div>
              {validationErrors.quantity && (
                <span className="error-hint">{validationErrors.quantity}</span>
              )}
            </div>
          </div>

          {/* Section: Images */}
          <div className="form-section">
            <h3 className="section-title">
              <ImageIcon size={18} />
              <span>Product Images</span>
            </h3>

            {/* Cover Image URL */}
            <div className="form-group">
              <label htmlFor="prod-cover" className="form-label">
                Cover Image URL <span className="req-star">*</span>
              </label>
              <div className="image-url-input-wrap">
                <input
                  id="prod-cover"
                  type="url"
                  className={`form-input ${validationErrors.coverImage ? 'input-error' : ''}`}
                  placeholder="https://images.unsplash.com/... or direct image link"
                  value={coverImage}
                  onChange={(e) => {
                    setCoverImage(e.target.value);
                    if (validationErrors.coverImage) setValidationErrors((prev) => ({ ...prev, coverImage: null }));
                  }}
                  disabled={loading}
                  required
                />
              </div>
              <span className="form-field-hint">
                Provide a clean, direct web URL for the main image thumbnail.
              </span>
              {validationErrors.coverImage && (
                <span className="error-hint">{validationErrors.coverImage}</span>
              )}
            </div>

            {/* Additional Gallery Images */}
            <div className="form-group">
              <label className="form-label">Additional Gallery Images (Optional)</label>
              <div className="add-image-inline-form">
                <input
                  type="url"
                  className="form-input"
                  placeholder="Paste additional image URL..."
                  value={currentAdditionalUrl}
                  onChange={(e) => setCurrentAdditionalUrl(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="btn-add-img"
                  onClick={handleAddImage}
                  disabled={!currentAdditionalUrl.trim() || loading}
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>

              {/* Gallery Image Badges */}
              {additionalImages.length > 0 && (
                <div className="gallery-badges-grid">
                  {additionalImages.map((imgUrl, idx) => (
                    <div key={idx} className="gallery-badge-item">
                      <img src={imgUrl} alt={`gallery-${idx}`} className="gallery-thumb-mini" />
                      <span className="gallery-url-truncate" title={imgUrl}>
                        {imgUrl.slice(0, 30)}...
                      </span>
                      <button
                        type="button"
                        className="btn-remove-gallery-img"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove image"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Access Level */}
          <div className="form-section">
            <h3 className="section-title">
              <ShieldCheck size={18} />
              <span>Who Can Request This Item? (Access Level)</span>
            </h3>

            <div className="access-level-options-list">
              {ACCESS_LEVELS.map((level) => {
                const isSelected = accessLevel === level.value;
                return (
                  <label
                    key={level.value}
                    className={`access-radio-card ${isSelected ? 'access-radio-card-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="accessLevel"
                      value={level.value}
                      checked={isSelected}
                      onChange={() => setAccessLevel(level.value)}
                      disabled={loading}
                    />
                    <div className="access-radio-content">
                      <div className="access-radio-label-row">
                        <strong>{level.label}</strong>
                        {isSelected && <Check size={16} className="checked-icon" />}
                      </div>
                      <p className="access-radio-desc">{level.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions-bar">
            <Link to="/dashboard/inventory" className="btn-cancel-form">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-submit-product"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Publish to Marketplace</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Card Preview Sidebar */}
        <aside className="form-sidebar-preview">
          <div className="preview-sticky-card">
            <div className="preview-card-header">
              <Eye size={16} className="preview-icon" />
              <h4>Live Marketplace Preview</h4>
            </div>

            <div className="preview-product-card">
              {/* Cover Image Container */}
              <div className="preview-image-wrap">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={name || 'Preview'}
                    className="preview-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="preview-img-fallback">
                    <ImageIcon size={38} />
                    <span>Cover Image Preview</span>
                  </div>
                )}
                <span className="preview-qty-badge">
                  Qty: {quantity || 1}
                </span>
              </div>

              {/* Preview Content */}
              <div className="preview-card-details">
                <span className="preview-donor-tag">
                  By: @{user ? user.username : 'you'}
                </span>
                <h3 className="preview-title">
                  {name || 'Product Title Goes Here'}
                </h3>
                <p className="preview-description">
                  {description || 'Product details, condition, and pickup information will be previewed here as you fill out the form.'}
                </p>

                <div className="preview-meta-row">
                  <span className="preview-access-pill">
                    {ACCESS_LEVELS.find((l) => l.value === accessLevel)?.label || 'Everyone'}
                  </span>
                  {additionalImages.length > 0 && (
                    <span className="preview-images-pill">
                      +{additionalImages.length} photo{additionalImages.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="preview-tip-box">
              <Info size={16} />
              <p>
                Once added, this product is immediately saved to the MongoDB inventory and eligible users will be able to submit requests for it.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

export default AddProduct;
