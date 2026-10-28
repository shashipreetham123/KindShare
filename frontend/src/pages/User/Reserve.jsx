import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  BookmarkCheck,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  X,
  ArrowRight,
  HandHeart,
  Gift,
  AlertTriangle,
  Info,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import './Reserve.css';

function Reserve() {
  const context = useOutletContext() || {};
  const { user } = context;

  // Active section tab: 'donor' (For Donor) or 'beneficiary' (For Beneficiary)
  const [activeTab, setActiveTab] = useState('donor');
  const [reservesAsDonor, setReservesAsDonor] = useState([]);
  const [reservesAsBeneficiary, setReservesAsBeneficiary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // User Info Modal State (shows Beneficiary details to Donor or Donor details to Beneficiary)
  const [userInfoModal, setUserInfoModal] = useState({
    isOpen: false,
    partnerRole: '', // 'Beneficiary' | 'Donor'
    partnerDetails: null
  });

  // Confirmation Modal Configuration (for Complete / Cancel)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    actionType: null, // 'complete' | 'cancel'
    reserveItem: null,
    title: '',
    message: '',
    description: '',
    type: 'primary',
    confirmText: '',
    confirmIcon: null
  });

  // Fetch categorized reserves from backend
  const fetchReserves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/user/reserve');
      const data = res.data || {};
      setReservesAsDonor(data.asDonor || []);
      setReservesAsBeneficiary(data.asBeneficiary || []);
    } catch (err) {
      console.error('Failed to load reservations:', err);
      setError(err.message || 'Unable to load reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReserves();
  }, [fetchReserves]);

  // Open Complete Modal for either Donor or Beneficiary
  const openCompleteModal = (item, role) => {
    const prodName = item.product ? item.product.name : 'this item';
    const partnerRole = role === 'donor' ? 'beneficiary' : 'donor';
    const partnerName = role === 'donor' ? item.beneficiaryUsername : item.donorUsername;
    const partnerAlreadyCompleted = role === 'donor' ? item.beneficiaryCompleted : item.donorCompleted;

    const description = partnerAlreadyCompleted
      ? `@${partnerName} has already marked this transaction as completed. Confirming now will finalize the donation, close the reservation, and log it in your history (inventory quantity will not be restored).`
      : `Marking this transaction as completed notifies @${partnerName} (${partnerRole}). Once both of you click complete, the reservation will be successfully finalized without increasing inventory quantity.`;

    setModalConfig({
      isOpen: true,
      actionType: 'complete',
      reserveItem: item,
      title: 'Complete Reservation',
      message: `Confirm completion of handoff for ${item.quantity} unit(s) of "${prodName}"?`,
      description,
      type: 'success',
      confirmText: 'Yes, Confirm Complete',
      confirmIcon: Check
    });
  };

  // Open Cancel Modal for either Donor or Beneficiary
  const openCancelModal = (item, role) => {
    const prodName = item.product ? item.product.name : 'this item';
    const partnerName = role === 'donor' ? item.beneficiaryUsername : item.donorUsername;

    setModalConfig({
      isOpen: true,
      actionType: 'cancel',
      reserveItem: item,
      title: 'Cancel Reservation',
      message: `Are you sure you want to cancel the reservation for "${prodName}" with @${partnerName}?`,
      description: `Cancelling will delete this active reservation and automatically restore ${item.quantity} unit(s) back to the product's available inventory.`,
      type: 'danger',
      confirmText: 'Yes, Cancel Reservation',
      confirmIcon: XCircle
    });
  };

  // Open User Info Modal to display partner contact details (Username, Phone Number, Email)
  const openUserInfoModal = (item, role) => {
    const isDonor = role === 'donor';
    const partnerRole = isDonor ? 'Beneficiary' : 'Donor';
    const partnerDetails = isDonor ? item.beneficiaryDetails : item.donorDetails;

    setUserInfoModal({
      isOpen: true,
      partnerRole,
      partnerDetails: partnerDetails || {
        username: isDonor ? item.beneficiaryUsername : item.donorUsername,
        email: '',
        phoneNumber: '',
        address: '',
        verified: isDonor ? item.beneficiaryVerified : item.donorVerified
      }
    });
  };

  // Execute Action upon confirmation in Modal
  const handleConfirmAction = async () => {
    const { actionType, reserveItem } = modalConfig;
    if (!reserveItem) return;

    const reserveId = reserveItem._id;
    try {
      setActionLoading(true);
      setError(null);

      if (actionType === 'complete') {
        const res = await api.post(`/user/reserve/${reserveId}/complete`);
        setSuccessMsg(res.message || 'Completion recorded successfully.');
      } else if (actionType === 'cancel') {
        const res = await api.delete(`/user/reserve/${reserveId}`);
        setSuccessMsg(res.message || 'Reservation cancelled and inventory quantity restored.');
      }

      setModalConfig((prev) => ({ ...prev, isOpen: false }));
      await fetchReserves();

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
    } catch (err) {
      console.error('Reservation action failed:', err);
      setError(err.message || 'Action could not be completed.');
      setModalConfig((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setActionLoading(false);
    }
  };

  const currentList = activeTab === 'donor' ? reservesAsDonor : reservesAsBeneficiary;

  return (
    <div className="reserves-container">
      {/* 1. Page Header with Section Switcher */}
      <header className="reserves-header">
        <div className="reserves-title-col">
          <div className="reserves-title-row">
            <BookmarkCheck className="header-icon" size={28} />
            <div>
              <h1>Active Reservations</h1>
              <p className="reserves-subtitle">
                Track pending handoffs, confirm mutual completions, or release reservations back to inventory.
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs Switcher (For Donor and For Beneficiary) */}
        <div className="section-tabs-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'donor' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('donor')}
          >
            <HandHeart size={16} />
            <span>For Donor</span>
            {reservesAsDonor.length > 0 && (
              <span className="tab-counter-badge">{reservesAsDonor.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'beneficiary' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('beneficiary')}
          >
            <Gift size={16} />
            <span>For Beneficiary</span>
            {reservesAsBeneficiary.length > 0 && (
              <span className="tab-counter-badge">{reservesAsBeneficiary.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* Status Alerts */}
      {error && (
        <div className="reserves-alert alert-error">
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="reserves-alert alert-success">
          <CheckCircle2 size={18} className="alert-icon" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Main Content Area */}
      <main className="reserves-main-content">
        {loading ? (
          <div className="reserves-loading-state">
            <Loader2 size={36} className="spin-icon" />
            <p>Loading reservations...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="reserves-empty-state">
            <div className="empty-state-icon-wrap">
              {activeTab === 'donor' ? <HandHeart size={48} /> : <Gift size={48} />}
            </div>
            <h3>
              {activeTab === 'donor'
                ? 'No Active Outgoing Donations'
                : 'No Reserved Items'}
            </h3>
            <p>
              {activeTab === 'donor'
                ? 'You do not have any items currently reserved for beneficiaries.'
                : 'You currently have no active product reservations pending completion.'}
            </p>
            {activeTab === 'beneficiary' && (
              <Link to="/dashboard/browse" className="btn-browse-link">
                <span>Find Items to Request</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="reserves-cards-grid">
            {currentList.map((reserve) => {
              const product = reserve.product || {};
              const isDonor = activeTab === 'donor';

              // User's own confirmation state vs partner's confirmation state
              const myCompleted = isDonor ? reserve.donorCompleted : reserve.beneficiaryCompleted;
              const partnerCompleted = isDonor ? reserve.beneficiaryCompleted : reserve.donorCompleted;
              const partnerUsername = isDonor ? reserve.beneficiaryUsername : reserve.donorUsername;
              const partnerVerified = isDonor ? reserve.beneficiaryVerified : reserve.donorVerified;

              const formattedDate = reserve.reservedOn
                ? new Date(reserve.reservedOn).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Recently';

              return (
                <div key={reserve._id} className="reserve-card">
                  {/* Card Top: Product Image and Details */}
                  <div className="reserve-card-header">
                    <div className="reserve-product-thumb">
                      {product.coverImage ? (
                        <img
                          src={product.coverImage}
                          alt={product.name || 'Product'}
                          className="thumb-img"
                        />
                      ) : (
                        <div className="thumb-fallback">
                          <Package size={24} />
                        </div>
                      )}
                    </div>

                    <div className="reserve-product-info">
                      <div className="reserve-badges-row">
                        <span className="reserve-active-pill">
                          <Clock size={12} /> Reserved
                        </span>
                        {reserve.donorCompleted && (
                          <span className="pill-status-done" title="Donor has confirmed handoff">
                            <Check size={11} /> Donor Confirmed
                          </span>
                        )}
                        {reserve.beneficiaryCompleted && (
                          <span className="pill-status-done" title="Beneficiary has confirmed receipt">
                            <Check size={11} /> Beneficiary Confirmed
                          </span>
                        )}
                      </div>

                      <h3 className="reserve-product-name" title={product.name || 'Unknown Item'}>
                        {product.name || 'Reserved Product'}
                      </h3>

                      <div className="reserve-product-meta">
                        <span className="qty-tag">
                          Reserved Qty: <strong>{reserve.quantity}</strong>
                        </span>
                        {product.available !== undefined && (
                          <span className="stock-tag">
                            Remaining Stock: {product.available}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Middle: Partner Attribution & Status Banner */}
                  <div className="reserve-partner-box">
                    <div className="user-box-row">
                      <div className="user-avatar-circle">
                        <User size={15} />
                      </div>
                      <div className="user-info-text">
                        <span className="user-role-label">
                          {isDonor ? 'Reserved for Beneficiary:' : 'Donated by:'}
                        </span>
                        <div className="user-name-tag">
                          <strong>@{partnerUsername}</strong>
                          {partnerVerified && (
                            <span className="verified-chip" title="Verified member">
                              <ShieldCheck size={11} /> Verified
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn-user-info"
                            onClick={() => openUserInfoModal(reserve, activeTab)}
                            title={`View ${isDonor ? 'Beneficiary' : 'Donor'} Contact Details`}
                            aria-label={`View ${isDonor ? 'Beneficiary' : 'Donor'} Contact Details`}
                          >
                            <Info size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="reserve-date-tag">
                      <Calendar size={12} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Dual-Confirmation Status Banner */}
                  <div className="reserve-status-callout">
                    {myCompleted && !partnerCompleted && (
                      <div className="callout-box callout-waiting">
                        <Clock size={15} />
                        <span>You confirmed handoff. Waiting for @{partnerUsername} to complete.</span>
                      </div>
                    )}
                    {!myCompleted && partnerCompleted && (
                      <div className="callout-box callout-action-needed">
                        <AlertTriangle size={15} />
                        <span>@{partnerUsername} marked this complete! Confirm below to finalize.</span>
                      </div>
                    )}
                    {!myCompleted && !partnerCompleted && (
                      <div className="callout-box callout-info">
                        <CheckCircle2 size={15} />
                        <span>Both parties must click Complete to finalize this donation.</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Both Have Complete and Cancel Button */}
                  <div className="reserve-card-actions">
                    <button
                      type="button"
                      className="btn-cancel-reserve"
                      onClick={() => openCancelModal(reserve, activeTab)}
                      title="Cancelling deletes the reserve and restores inventory quantity"
                    >
                      <XCircle size={15} />
                      <span>Cancel</span>
                    </button>

                    <button
                      type="button"
                      className={`btn-complete-reserve ${myCompleted ? 'btn-complete-confirmed' : ''}`}
                      onClick={() => openCompleteModal(reserve, activeTab)}
                      disabled={myCompleted}
                      title={myCompleted ? 'You have already confirmed completion' : 'Click to complete'}
                    >
                      <Check size={15} />
                      <span>{myCompleted ? 'You Confirmed' : 'Complete'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={modalConfig.title}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText="Keep Reserve"
        confirmIcon={modalConfig.confirmIcon}
        isLoading={actionLoading}
        message={modalConfig.message}
        description={modalConfig.description}
      />

      {/* User Info Details Modal (Shows Beneficiary Details to Donor or Donor Details to Beneficiary) */}
      <Modal
        isOpen={userInfoModal.isOpen}
        onClose={() => setUserInfoModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => setUserInfoModal((prev) => ({ ...prev, isOpen: false }))}
        title={`${userInfoModal.partnerRole} Contact Details`}
        type="info"
        confirmText="Done"
        cancelText=""
      >
        {userInfoModal.partnerDetails && (
          <div className="user-details-modal-body">
            <div className="user-details-hero">
              <div className="user-details-avatar">
                <User size={30} />
              </div>
              <div className="user-details-header-text">
                <div className="user-details-name-wrap">
                  <h4>@{userInfoModal.partnerDetails.username}</h4>
                  {userInfoModal.partnerDetails.verified && (
                    <span className="verified-chip" title="Verified Member">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
                <span className="user-details-badge">
                  {userInfoModal.partnerRole === 'Beneficiary' ? 'Receiving Beneficiary' : 'Listing Donor'}
                </span>
              </div>
            </div>

            <div className="user-details-fields-list">
              {/* Username Field */}
              <div className="user-detail-row">
                <div className="user-detail-icon-wrap">
                  <User size={16} />
                </div>
                <div className="user-detail-content">
                  <span className="user-detail-label">Username</span>
                  <span className="user-detail-val">@{userInfoModal.partnerDetails.username}</span>
                </div>
              </div>

              {/* Email Field */}
              <div className="user-detail-row">
                <div className="user-detail-icon-wrap">
                  <Mail size={16} />
                </div>
                <div className="user-detail-content">
                  <span className="user-detail-label">Email Address</span>
                  {userInfoModal.partnerDetails.email ? (
                    <a
                      href={`mailto:${userInfoModal.partnerDetails.email}`}
                      className="user-detail-link"
                    >
                      {userInfoModal.partnerDetails.email}
                    </a>
                  ) : (
                    <span className="user-detail-empty">Not provided</span>
                  )}
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="user-detail-row">
                <div className="user-detail-icon-wrap">
                  <Phone size={16} />
                </div>
                <div className="user-detail-content">
                  <span className="user-detail-label">Phone Number</span>
                  {userInfoModal.partnerDetails.phoneNumber ? (
                    <a
                      href={`tel:${userInfoModal.partnerDetails.phoneNumber.replace(/\s+/g, '')}`}
                      className="user-detail-link"
                    >
                      {userInfoModal.partnerDetails.phoneNumber}
                    </a>
                  ) : (
                    <span className="user-detail-empty">Not provided</span>
                  )}
                </div>
              </div>

              {/* Address (Optional if present) */}
              {userInfoModal.partnerDetails.address && (
                <div className="user-detail-row">
                  <div className="user-detail-icon-wrap">
                    <MapPin size={16} />
                  </div>
                  <div className="user-detail-content">
                    <span className="user-detail-label">Address</span>
                    <span className="user-detail-val">{userInfoModal.partnerDetails.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Reserve;
