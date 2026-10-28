import { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  User,
  Package,
  Layers,
  Calendar,
  ImageOff
} from 'lucide-react';
import './ProductCard.css';

/**
 * ProductCard Component
 * Displays product cover image, name, donor username, and donor verification status.
 *
 * Props:
 * - product: Object containing:
 *   - coverImage: URL string for the product image
 *   - name: Product name string
 *   - username / donorUsername / donor.username: String of donor username
 *   - verified / donorVerified / donor.verified: Boolean of donor verification status
 *   - quantity / available: (optional) Number of items available
 *   - description: (optional) Short description text
 *   - accessLevel: (optional) Access level number or label
 *   - listedAt: (optional) Date string
 * - onClick: (optional) Click handler function for the card
 */
function ProductCard({ product = {}, onClick }) {
  const [imageError, setImageError] = useState(false);

  // Extract fields gracefully with fallbacks
  const {
    coverImage,
    name = 'Unnamed Product',
    username,
    donorUsername,
    donor,
    verified,
    donorVerified,
    isVerified,
    quantity,
    available,
    description,
    accessLevel,
    listedAt
  } = product;

  // Resolve donor username
  const donorName = donorUsername || (donor && donor.username) || username || 'Anonymous Donor';

  // Resolve donor verification status (handles boolean or nested object)
  const isDonorVerified = Boolean(
    verified !== undefined
      ? verified
      : donorVerified !== undefined
      ? donorVerified
      : isVerified !== undefined
      ? isVerified
      : donor && donor.verified !== undefined
      ? donor.verified
      : false
  );

  const displayQuantity = quantity !== undefined ? quantity : available;

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <article
      className="product-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 1. Cover Image Container with Status Overlay */}
      <div className="product-image-wrap">
        {!imageError && coverImage ? (
          <img
            src={coverImage}
            alt={name}
            className="product-cover-img"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="product-image-fallback">
            <ImageOff size={32} className="fallback-icon" />
            <span>No Image Available</span>
          </div>
        )}

        {/* Verification Floating Badge over image */}
        <div className="image-badge-overlay">
          <span
            className={`donor-badge ${
              isDonorVerified ? 'donor-badge-verified' : 'donor-badge-unverified'
            }`}
          >
            {isDonorVerified ? (
              <>
                <CheckCircle size={13} className="badge-icon" />
                <span>Verified Donor</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} className="badge-icon" />
                <span>Unverified Donor</span>
              </>
            )}
          </span>
        </div>

        {displayQuantity !== undefined && (
          <div className="quantity-badge">
            <Package size={12} />
            <span>{displayQuantity} left</span>
          </div>
        )}
      </div>

      {/* 2. Product Details Body */}
      <div className="product-body">
        <h3 className="product-name" title={name}>
          {name}
        </h3>

        {description && (
          <p className="product-description" title={description}>
            {description}
          </p>
        )}

        {/* 3. Donor Attribution & Verification Footer */}
        <div className="product-donor-row">
          <div className="donor-profile">
            <div className="donor-avatar">
              <User size={15} />
            </div>
            <div className="donor-info">
              <span className="donor-label">Donated by</span>
              <span className="donor-username" title={donorName}>
                @{donorName}
              </span>
            </div>
          </div>

          <div className="donor-status-indicator">
            {isDonorVerified ? (
              <span className="status-pill pill-verified" title="Verified community donor">
                <CheckCircle size={12} />
                <span>Verified</span>
              </span>
            ) : (
              <span className="status-pill pill-unverified" title="Unverified community donor">
                <AlertCircle size={12} />
                <span>Unverified</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
