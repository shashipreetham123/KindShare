import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Inbox,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  Package,
  Calendar,
  AlertCircle,
  Loader2,
  RotateCcw,
  Check,
  X,
  ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import './Request.css';

function Request() {
  const context = useOutletContext() || {};
  const { user } = context;

  const [activeTab, setActiveTab] = useState('donor'); // 'donor' | 'beneficiary'
  const [requestsAsDonor, setRequestsAsDonor] = useState([]);
  const [requestsAsBeneficiary, setRequestsAsBeneficiary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State for Confirming Actions
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    actionType: null, // 'accept' | 'decline' | 'cancel'
    requestItem: null,
    title: '',
    message: '',
    description: '',
    type: 'primary',
    confirmText: '',
    confirmIcon: null
  });

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/user/request');
      const data = res.data || {};
      setRequestsAsDonor(data.asDonor || []);
      setRequestsAsBeneficiary(data.asBeneficiary || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setError(err.message || 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Open Accept Modal (Donor Action)
  const openAcceptModal = (req) => {
    const prodName = req.product ? req.product.name : 'this item';
    setModalConfig({
      isOpen: true,
      actionType: 'accept',
      requestItem: req,
      title: 'Accept Request',
      message: `Accept request from @${req.beneficiaryUsername} for ${req.quantity} unit(s) of "${prodName}"?`,
      description: 'Accepting this request will create an active reservation, decrease your available stock, and notify the beneficiary for handoff.',
      type: 'success',
      confirmText: 'Accept & Reserve',
      confirmIcon: Check
    });
  };

  // Open Decline Modal (Donor Action)
  const openDeclineModal = (req) => {
    const prodName = req.product ? req.product.name : 'this item';
    setModalConfig({
      isOpen: true,
      actionType: 'decline',
      requestItem: req,
      title: 'Decline Request',
      message: `Decline request from @${req.beneficiaryUsername} for "${prodName}"?`,
      description: 'The request will be declined and removed. The requested quantity will remain available in your inventory for other members.',
      type: 'warning',
      confirmText: 'Decline Request',
      confirmIcon: X
    });
  };

  // Open Cancel Modal (Beneficiary Action)
  const openCancelModal = (req) => {
    const prodName = req.product ? req.product.name : 'this item';
    setModalConfig({
      isOpen: true,
      actionType: 'cancel',
      requestItem: req,
      title: 'Cancel Outgoing Request',
      message: `Cancel your request for "${prodName}" sent to @${req.donorUsername}?`,
      description: 'Are you sure you want to withdraw this request? The donor will no longer see this in their pending requests.',
      type: 'danger',
      confirmText: 'Yes, Withdraw Request',
      confirmIcon: XCircle
    });
  };

  // Execute Action from Modal
  const handleConfirmAction = async () => {
    const { actionType, requestItem } = modalConfig;
    if (!requestItem) return;

    const reqId = requestItem._id;
    try {
      setActionLoading(true);
      setError(null);

      if (actionType === 'accept') {
        const res = await api.post(`/user/request/${reqId}/accept`);
        setSuccessMsg(res.message || 'Request accepted successfully! Item is now in your Reserves.');
      } else if (actionType === 'decline') {
        const res = await api.post(`/user/request/${reqId}/decline`);
        setSuccessMsg(res.message || 'Request declined successfully.');
      } else if (actionType === 'cancel') {
        const res = await api.delete(`/user/request/${reqId}`);
        setSuccessMsg(res.message || 'Request cancelled successfully.');
      }

      setModalConfig((prev) => ({ ...prev, isOpen: false }));
      await fetchRequests();

      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error('Request action failed:', err);
      setError(err.message || 'Action could not be completed.');
      setModalConfig((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setActionLoading(false);
    }
  };

  const currentList = activeTab === 'donor' ? requestsAsDonor : requestsAsBeneficiary;

  return (
    <div className="requests-container">
      {/* 1. Header with Title and Section Switcher */}
      <header className="requests-header">
        <div className="requests-title-col">
          <div className="requests-title-row">
            <Inbox className="header-icon" size={26} />
            <div>
              <h1>Order & Item Requests</h1>
              <p className="requests-subtitle">
                Manage incoming orders for your donations and track items you've requested from others.
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs Switcher */}
        <div className="section-tabs-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'donor' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('donor')}
          >
            <Inbox size={16} />
            <span>Incoming (As Donor)</span>
            {requestsAsDonor.length > 0 && (
              <span className="tab-counter-badge">{requestsAsDonor.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'beneficiary' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('beneficiary')}
          >
            <Send size={16} />
            <span>Outgoing (As Beneficiary)</span>
            {requestsAsBeneficiary.length > 0 && (
              <span className="tab-counter-badge">{requestsAsBeneficiary.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="requests-alert alert-error">
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="requests-alert alert-success">
          <CheckCircle size={18} className="alert-icon" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Main Content Area */}
      <main className="requests-main-content">
        {loading ? (
          <div className="requests-loading-state">
            <Loader2 size={36} className="spin-icon" />
            <p>Loading requests...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="requests-empty-state">
            <div className="empty-state-icon-wrap">
              {activeTab === 'donor' ? <Inbox size={48} /> : <Send size={48} />}
            </div>
            <h3>
              {activeTab === 'donor'
                ? 'No Incoming Requests'
                : 'No Outgoing Requests'}
            </h3>
            <p>
              {activeTab === 'donor'
                ? 'You do not have any pending requests from beneficiaries for your listed inventory.'
                : "You haven't requested any items yet. Explore the community marketplace to find goods you need!"}
            </p>
            {activeTab === 'beneficiary' && (
              <Link to="/dashboard/browse" className="btn-browse-link">
                <span>Browse Products</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="requests-cards-grid">
            {currentList.map((req) => {
              const product = req.product || {};
              const formattedDate = req.requestedOn
                ? new Date(req.requestedOn).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Recently';

              return (
                <div key={req._id} className="request-card">
                  {/* Card Top: Product Header */}
                  <div className="request-card-header">
                    <div className="request-product-thumb">
                      {product.coverImage ? (
                        <img
                          src={product.coverImage}
                          alt={product.name || 'Product'}
                          className="thumb-img"
                        />
                      ) : (
                        <div className="thumb-fallback">
                          <Package size={22} />
                        </div>
                      )}
                    </div>

                    <div className="request-product-info">
                      <span className="request-status-badge">
                        <Clock size={12} />
                        <span>Pending Review</span>
                      </span>
                      <h3 className="request-product-name" title={product.name || 'Unknown Item'}>
                        {product.name || 'Product Listing'}
                      </h3>
                      <div className="request-product-meta">
                        <span className="qty-tag">
                          Requested Qty: <strong>{req.quantity}</strong>
                        </span>
                        {product.available !== undefined && (
                          <span className="stock-tag">In stock: {product.available}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Middle: User Attribution */}
                  <div className="request-user-box">
                    <div className="user-box-row">
                      <div className="user-avatar-circle">
                        <User size={15} />
                      </div>
                      <div className="user-info-text">
                        <span className="user-role-label">
                          {activeTab === 'donor' ? 'Requested by Beneficiary:' : 'Donor:'}
                        </span>
                        <div className="user-name-tag">
                          <strong>
                            @{activeTab === 'donor' ? req.beneficiaryUsername : req.donorUsername}
                          </strong>
                          {(activeTab === 'donor' ? req.beneficiaryVerified : req.donorVerified) && (
                            <span className="verified-chip" title="Verified member">
                              <ShieldCheck size={11} /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="request-date-tag">
                      <Calendar size={12} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Card Bottom: Actions depending on Donor vs Beneficiary */}
                  <div className="request-card-actions">
                    {activeTab === 'donor' ? (
                      /* 2) Donor receives Requests from User -> Has Options Accept and Decline */
                      <div className="donor-actions-group">
                        <button
                          type="button"
                          className="btn-decline-req"
                          onClick={() => openDeclineModal(req)}
                        >
                          <X size={15} />
                          <span>Decline</span>
                        </button>

                        <button
                          type="button"
                          className="btn-accept-req"
                          onClick={() => openAcceptModal(req)}
                        >
                          <Check size={15} />
                          <span>Accept & Reserve</span>
                        </button>
                      </div>
                    ) : (
                      /* 3) Beneficiary has Option to Cancel only */
                      <div className="beneficiary-actions-group">
                        <button
                          type="button"
                          className="btn-cancel-req"
                          onClick={() => openCancelModal(req)}
                        >
                          <XCircle size={15} />
                          <span>Cancel Request</span>
                        </button>
                      </div>
                    )}
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
        cancelText="Close"
        confirmIcon={modalConfig.confirmIcon}
        isLoading={actionLoading}
        message={modalConfig.message}
        description={modalConfig.description}
      />
    </div>
  );
}

export default Request;
