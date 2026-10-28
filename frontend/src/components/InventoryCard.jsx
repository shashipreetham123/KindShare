import { useState } from 'react';
import {
  Package,
  Layers,
  Calendar,
  ImageOff,
  Tag,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import './InventoryCard.css';

/**
 * Access level mapping helper
 */
const ACCESS_LEVEL_LABELS = {
  1: { label: 'Individuals Only', badgeClass: 'access-individual' },
  2: { label: 'Organizations Only', badgeClass: 'access-organization' },
  3: { label: 'Businesses Only', badgeClass: 'access-business' },
  4: { label: 'Everyone', badgeClass: 'access-everyone' }
};

/**
 * InventoryCard Component
 * Specifically tailored for user/admin inventory management.
 * Shows Name, Quantity, CoverImage, along with expandable/optional item details.
 *
 * Props:
 * - item / product: Object containing:
 *   - coverImage: Image URL
 *   - name: Product/Item name
 *   - quantity / available: Current quantity in stock
 *   - description: (optional) Item description
 *   - accessLevel: (optional) Access level integer (1-4)
 *   - listedAt: (optional) Date string or Date object
 *   - images: (optional) Array of secondary image URLs
 *   - _id / id: (optional) MongoDB identifier
 * - onEdit: (optional) Callback when Edit button is clicked
 * - onDelete: (optional) Callback when Delete button is clicked
 * - onClick: (optional) Click handler for the card
 */
function InventoryCard({ item = {}, product, onEdit, onDelete, onClick }) {
  const [imageError, setImageError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fallback between item or product prop
  const data = item && Object.keys(item).length > 0 ? item : product || {};

  const {
    _id,
    id,
    name = 'Unnamed Item',
    coverImage,
    quantity,
    available,
    description,
    accessLevel,
    listedAt,
    images = []
  } = data;

  const displayQuantity = quantity !== undefined ? quantity : available !== undefined ? available : 0;
  const isOutOfStock = displayQuantity <= 0;
  const isLowStock = displayQuantity > 0 && displayQuantity <= 3;

  const accessInfo = ACCESS_LEVEL_LABELS[accessLevel] || {
    label: 'Everyone',
    badgeClass: 'access-everyone'
  };

  const formattedDate = listedAt
    ? new Date(listedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  const handleImageError = () => {
    setImageError(true);
  };

  const toggleDetails = (e) => {
    e.stopPropagation();
    setShowDetails((prev) => !prev);
  };

  return (
    <article
      className={`inventory-card ${isOutOfStock ? 'inventory-out-of-stock' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 1. Cover Image Wrap */}
      <div className="inventory-image-wrap">
        {!imageError && coverImage ? (
          <img
            src={coverImage}
            alt={name}
            className="inventory-cover-img"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="inventory-image-fallback">
            <ImageOff size={32} className="fallback-icon" />
            <span>No Cover Image</span>
          </div>
        )}

        {/* Stock Status Badge Overlay */}
        <div className="inventory-stock-badge-overlay">
          <span
            className={`stock-badge ${
              isOutOfStock
                ? 'stock-badge-empty'
                : isLowStock
                ? 'stock-badge-low'
                : 'stock-badge-in'
            }`}
          >
            <Package size={12} />
            <span>
              {isOutOfStock ? 'Out of Stock' : `${displayQuantity} In Stock`}
            </span>
          </span>
        </div>

        {/* Access Level Badge */}
        {accessLevel !== undefined && (
          <div className="inventory-access-badge-overlay">
            <span className={`access-pill ${accessInfo.badgeClass}`}>
              <Shield size={11} />
              <span>{accessInfo.label}</span>
            </span>
          </div>
        )}
      </div>

      {/* 2. Main Content Body */}
      <div className="inventory-body">
        <div className="inventory-header-row">
          <h3 className="inventory-name" title={name}>
            {name}
          </h3>
          <span className="inventory-quantity-tag">
            <strong>Qty:</strong> {displayQuantity}
          </span>
        </div>

        {description && (
          <p className="inventory-description" title={description}>
            {description}
          </p>
        )}

        {/* Optional Metadata Row */}
        <div className="inventory-meta-row">
          {formattedDate && (
            <div className="inventory-meta-item" title="Listed date">
              <Calendar size={13} className="meta-icon" />
              <span>Listed {formattedDate}</span>
            </div>
          )}

          {images && images.length > 0 && (
            <div className="inventory-meta-item" title="Additional gallery photos">
              <Layers size={13} className="meta-icon" />
              <span>{images.length} photo{images.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Optional Details Toggle Button */}
        <button
          type="button"
          className="inventory-details-toggle"
          onClick={toggleDetails}
          aria-expanded={showDetails}
        >
          <Info size={14} />
          <span>{showDetails ? 'Hide Details' : 'View Optional Details'}</span>
          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Collapsible Optional Details Drawer */}
        {showDetails && (
          <div className="inventory-optional-details">
            {(_id || id) && (
              <div className="details-entry">
                <span className="details-label">ID:</span>
                <code className="details-code">{String(_id || id)}</code>
              </div>
            )}
            <div className="details-entry">
              <span className="details-label">Audience:</span>
              <span className="details-value">{accessInfo.label}</span>
            </div>
            {listedAt && (
              <div className="details-entry">
                <span className="details-label">Exact Date:</span>
                <span className="details-value">{new Date(listedAt).toLocaleString()}</span>
              </div>
            )}
            {images.length > 0 && (
              <div className="details-gallery">
                <span className="details-label">Gallery Preview:</span>
                <div className="gallery-thumbnails">
                  {images.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`${name} thumb ${idx + 1}`}
                      className="gallery-thumb-img"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional Action Controls (Edit/Delete) if provided */}
        {(onEdit || onDelete) && (
          <div className="inventory-actions-row">
            {onEdit && (
              <button
                type="button"
                className="btn-inventory-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(data);
                }}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="btn-inventory-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(data);
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default InventoryCard;
