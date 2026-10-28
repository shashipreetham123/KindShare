import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Save,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Calendar,
  User,
  Shield,
  Layers,
  Image as ImageIcon,
  Loader2,
  Lock,
  Plus,
  Minus
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import './MyProduct.css';

const ACCESS_LEVELS = [
  { value: 4, label: 'Everyone (Public)' },
  { value: 1, label: 'Individuals Only' },
  { value: 2, label: 'Organizations Only' },
  { value: 3, label: 'Businesses Only' }
];

function MyProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const context = useOutletContext() || {};
  const { user } = context;

  // Initial passed state if navigating from InventoryCard/List
  const initialData = location.state && location.state.product ? location.state.product : null;

  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modals state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updateConfirmNote, setUpdateConfirmNote] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [id, setId] = useState(initialData ? initialData._id || initialData.id : productId || '');
  const [name, setName] = useState(initialData ? initialData.name || '' : '');
  const [description, setDescription] = useState(initialData ? initialData.description || '' : '');
  const [quantity, setQuantity] = useState(initialData ? initialData.quantity || initialData.available || 1 : 1);
  const [coverImage, setCoverImage] = useState(initialData ? initialData.coverImage || '' : '');
  const [accessLevel, setAccessLevel] = useState(initialData ? initialData.accessLevel || 4 : 4);
  const [imagesInput, setImagesInput] = useState(
    initialData && Array.isArray(initialData.images) ? initialData.images.join(', ') : ''
  );

  // Immutable attributes
  const [username, setUsername] = useState(initialData ? initialData.username || '' : '');
  const [listedAt, setListedAt] = useState(initialData ? initialData.listedAt : null);

  // Fetch product data if not passed or needed
  useEffect(() => {
    async function loadProduct() {
      const targetId = productId || (initialData && (initialData._id || initialData.id));
      if (!targetId) {
        setError('No Product ID specified.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Fetch via /user/product/:productId which checks both id and user ownership
        const res = await api.get(`/user/product/${targetId}`);
        const found = res.data;

        if (!found) {
          setError('Product not found or has already been removed.');
          return;
        }

        setId(found._id);
        setName(found.name || '');
        setDescription(found.description || '');
        setQuantity(found.quantity !== undefined ? found.quantity : found.available || 1);
        setCoverImage(found.coverImage || '');
        setAccessLevel(found.accessLevel !== undefined ? found.accessLevel : 4);
        setImagesInput(Array.isArray(found.images) ? found.images.join(', ') : '');
        setUsername(found.username || '');
        setListedAt(found.listedAt || null);
      } catch (err) {
        console.error('Failed to load product:', err);
        setError(err.message || 'Unable to load product information or access is denied.');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  // Go back to previous page
  const handleCancel = () => {
    navigate(-1);
  };

  // Pre-validate and open Update Confirmation Modal
  const handleOpenUpdateModal = (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (!description.trim()) {
      setError('Product Description is required.');
      return;
    }
    if (Number(quantity) <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (!coverImage.trim()) {
      setError('Cover Image URL is required.');
      return;
    }

    setShowUpdateModal(true);
  };

  // Confirmed Update: (PUT /user/product)
  const handleConfirmUpdate = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg('');

      const parsedImages = imagesInput
        ? imagesInput
            .split(',')
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
        : [];

      const payload = {
        _id: id,
        name: name.trim(),
        description: description.trim(),
        quantity: Number(quantity),
        coverImage: coverImage.trim(),
        accessLevel: Number(accessLevel),
        images: parsedImages
      };

      const res = await api.put('/user/product', payload);

      setShowUpdateModal(false);
      setUpdateConfirmNote('');
      setSuccessMsg(res.message || 'Product updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error('Update failed:', err);
      setError(err.message || 'Failed to update product. Please verify fields.');
      setShowUpdateModal(false);
    } finally {
      setSaving(false);
    }
  };

  // Confirmed Delete: (DELETE /user/product/:productId)
  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setError(null);

      await api.delete(`/user/product/${id}`);
      setShowDeleteModal(false);
      setDeleteConfirmationText('');

      // Navigate back to inventory or previous page
      navigate('/dashboard/inventory', { replace: true });
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err.message || 'Failed to delete product.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const formattedListedAt = listedAt
    ? new Date(listedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Unknown Date';

  if (loading) {
    return (
      <div className="myproduct-loading-container">
        <Loader2 size={36} className="spin-icon" />
        <p>Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="myproduct-page">
      {/* Top Navigation & Breadcrumb */}
      <div className="myproduct-topbar">
        <button type="button" onClick={handleCancel} className="btn-back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <span className="topbar-crumb">Inventory / Edit Product</span>
      </div>

      <div className="myproduct-container">
        {/* Header Title with Status Messages */}
        <div className="myproduct-header">
          <div className="myproduct-title-wrap">
            <Package size={26} className="header-icon" />
            <div>
              <h2>Edit Product Details</h2>
              <p className="myproduct-subtitle">
                Update stock, description, visibility, or remove this item from your listings.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="myproduct-alert alert-error">
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="myproduct-alert alert-success">
            <CheckCircle size={18} className="alert-icon" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleOpenUpdateModal} className="myproduct-form">
          {/* 1. At the Top: Immutable Textbox of Product ID */}
          <div className="form-group-immutable-id">
            <label htmlFor="product-id-input">
              <Lock size={14} className="label-icon" />
              <span>Product ID (Immutable)</span>
            </label>
            <div className="immutable-input-wrap">
              <input
                id="product-id-input"
                type="text"
                value={id || ''}
                readOnly
                disabled
                className="immutable-input id-field"
                title="System-assigned unique identifier"
              />
              <span className="immutable-badge">Read Only</span>
            </div>
          </div>

          {/* 2. Immutable Details Ribbon: Username & ListedAt */}
          <div className="immutable-details-card">
            <div className="immutable-detail-item">
              <span className="detail-label">
                <User size={14} className="detail-icon" />
                <span>Donor Username:</span>
              </span>
              <strong className="detail-value">@{username || (user && user.username) || 'You'}</strong>
              <span className="immutable-tag">Immutable</span>
            </div>

            <div className="immutable-divider" />

            <div className="immutable-detail-item">
              <span className="detail-label">
                <Calendar size={14} className="detail-icon" />
                <span>Listed Date & Time:</span>
              </span>
              <span className="detail-value">{formattedListedAt}</span>
              <span className="immutable-tag">System Logged</span>
            </div>
          </div>

          {/* 3. Form Fields of the Product (Editable) */}
          <div className="editable-fields-section">
            <div className="field-group">
              <label htmlFor="product-name">Product Name *</label>
              <input
                id="product-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Winter Blanket or Canned Food"
                required
                className="form-input"
              />
            </div>

            <div className="form-row-two-col">
              <div className="field-group">
                <label htmlFor="product-quantity">Quantity Available *</label>
                <div className="quantity-counter-wrap">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, Number(prev) - 1))}
                    className="counter-btn"
                    disabled={quantity <= 1}
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    id="product-quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    required
                    className="quantity-input"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Number(prev) + 1)}
                    className="counter-btn"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="product-access">Target Audience / Access Level *</label>
                <select
                  id="product-access"
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(Number(e.target.value))}
                  className="form-select"
                >
                  {ACCESS_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="product-cover">Cover Image URL *</label>
              <div className="image-url-input-wrap">
                <ImageIcon size={16} className="input-inner-icon" />
                <input
                  id="product-cover"
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  required
                  className="form-input with-icon"
                />
              </div>

              {coverImage && (
                <div className="cover-image-preview">
                  <span className="preview-label">Cover Preview:</span>
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="preview-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="product-description">Description *</label>
              <textarea
                id="product-description"
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide helpful details about the product's condition, pickup instructions, etc."
                required
                className="form-textarea"
              />
            </div>

            <div className="field-group">
              <label htmlFor="product-images">Additional Gallery Images (Comma-separated URLs)</label>
              <div className="image-url-input-wrap">
                <Layers size={16} className="input-inner-icon" />
                <input
                  id="product-images"
                  type="text"
                  value={imagesInput}
                  onChange={(e) => setImagesInput(e.target.value)}
                  placeholder="https://img1.jpg, https://img2.jpg"
                  className="form-input with-icon"
                />
              </div>
              <span className="field-help-text">
                Enter multiple URLs separated by commas for extra photos in the gallery.
              </span>
            </div>
          </div>

          {/* 4. Action Buttons: Update, Delete, Cancel */}
          <div className="myproduct-actions-footer">
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteModal(true);
              }}
              className="btn-action-delete"
              disabled={saving || deleting}
            >
              <Trash2 size={16} />
              <span>Delete Product</span>
            </button>

            <div className="actions-right-group">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-action-cancel"
                disabled={saving || deleting}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                className="btn-action-update"
                disabled={saving || deleting}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Update Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 5. Update Confirmation Modal using reusable Modal.jsx */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleConfirmUpdate}
        title="Confirm Product Update"
        type="primary"
        confirmText="Save & Update"
        cancelText="Review Changes"
        confirmIcon={Save}
        isLoading={saving}
        message={`Are you sure you want to update "${name}"?`}
        description={
          <div>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              The modified quantity (<strong>{quantity}</strong>), description, and settings will become live immediately for the community.
            </p>
          </div>
        }
        inputs={[
          {
            name: 'updateNote',
            label: 'Optional Note / Changelog',
            type: 'text',
            value: updateConfirmNote,
            onChange: (e) => setUpdateConfirmNote(e.target.value),
            placeholder: 'e.g. Restocked 5 units, updated pickup times'
          }
        ]}
      />

      {/* 6. Delete Confirmation Modal using reusable Modal.jsx */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmationText('');
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Product Confirmation"
        type="danger"
        confirmText="Yes, Permanently Delete"
        cancelText="Cancel & Keep"
        confirmIcon={Trash2}
        isLoading={deleting}
        message={`Permanently remove "${name}" from inventory?`}
        description={
          <div>
            <p style={{ margin: '0 0 0.5rem 0', color: '#b91c1c' }}>
              This will delist the product and immediately cancel all active requests and reservations tied to it. This action cannot be undone.
            </p>
          </div>
        }
        inputs={[
          {
            name: 'confirmText',
            label: `Type "${name}" to confirm`,
            type: 'text',
            value: deleteConfirmationText,
            onChange: (e) => setDeleteConfirmationText(e.target.value),
            placeholder: `Type ${name}`,
            required: false
          }
        ]}
      />
    </div>
  );
}

export default MyProduct;
