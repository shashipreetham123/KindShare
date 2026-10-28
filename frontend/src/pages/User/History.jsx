import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  BookmarkCheck,
  User,
  AlertCircle,
  Loader2,
  RotateCcw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal
} from 'lucide-react';
import api from '../../services/api';
import './History.css';

function History() {
  const context = useOutletContext() || {};
  const { user } = context;

  const [historyList, setHistoryList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination parameters: offset and limit
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10); // default limit: 10 per page

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch logged-in user history using offset and limit
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        offset,
        limit
      };
      if (selectedEventType && selectedEventType !== 'all') {
        params.event = selectedEventType;
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      const res = await api.get('/user/history', { params });
      setHistoryList(res.data || []);
      setTotalCount(res.totalCount !== undefined ? res.totalCount : (res.data ? res.data.length : 0));
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err.message || 'Unable to load activity history.');
    } finally {
      setLoading(false);
    }
  }, [offset, limit, selectedEventType, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Client-side quick filter for the currently loaded page if user searches
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyList;
    const query = searchQuery.toLowerCase().trim();
    return historyList.filter((item) => {
      const eventMatch = (item.event || '').toLowerCase().includes(query);
      const summaryMatch = (item.summaryShort || '').toLowerCase().includes(query);
      return eventMatch || summaryMatch;
    });
  }, [historyList, searchQuery]);

  // Pagination helpers
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const hasPrev = offset > 0;
  const hasNext = offset + limit < totalCount;

  const handlePrevPage = () => {
    if (hasPrev) {
      setOffset((prev) => Math.max(0, prev - limit));
    }
  };

  const handleNextPage = () => {
    if (hasNext) {
      setOffset((prev) => prev + limit);
    }
  };

  const handleFirstPage = () => {
    setOffset(0);
  };

  const handleLastPage = () => {
    const lastOffset = Math.max(0, (totalPages - 1) * limit);
    setOffset(lastOffset);
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setOffset(0); // Reset to first page when changing page size
  };

  // Helper for event icon, badge class, and readable title
  const getEventMeta = (eventStr = '') => {
    const ev = eventStr.toLowerCase();
    if (ev.includes('completed')) {
      return {
        badgeClass: 'ev-badge-completed',
        label: 'Completed',
        icon: CheckCircle2,
        iconColor: '#16a34a'
      };
    }
    if (ev.includes('cancel')) {
      return {
        badgeClass: 'ev-badge-cancelled',
        label: 'Cancelled',
        icon: XCircle,
        iconColor: '#dc2626'
      };
    }
    if (ev.includes('reserve')) {
      return {
        badgeClass: 'ev-badge-reserved',
        label: 'Reservation',
        icon: BookmarkCheck,
        iconColor: '#2563eb'
      };
    }
    if (ev.includes('request')) {
      return {
        badgeClass: 'ev-badge-request',
        label: 'Request',
        icon: Clock,
        iconColor: '#d97706'
      };
    }
    if (ev.includes('product') || ev.includes('inventory')) {
      return {
        badgeClass: 'ev-badge-product',
        label: 'Product',
        icon: Package,
        iconColor: '#7c3aed'
      };
    }
    return {
      badgeClass: 'ev-badge-general',
      label: eventStr || 'Activity',
      icon: HistoryIcon,
      iconColor: '#6366f1'
    };
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEventType('all');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  return (
    <div className="history-container">
      {/* 1. Header with Stats & Offset/Limit Indicators */}
      <header className="history-header">
        <div className="history-title-row">
          <HistoryIcon className="header-icon" size={28} />
          <div>
            <h1>Activity & Transaction History</h1>
            <p className="history-subtitle">
              Comprehensive log of your product donations, requests, reservations, and handoffs.
            </p>
          </div>
        </div>

        {/* Total Records and Limit Selector */}
        <div className="history-header-controls">
          <div className="history-count-badge">
            <span>Total:</span>
            <strong>{totalCount}</strong>
          </div>

          <div className="limit-selector-box">
            <SlidersHorizontal size={14} className="limit-icon" />
            <label htmlFor="limit-select" className="limit-label">Limit:</label>
            <select
              id="limit-select"
              className="limit-select"
              value={limit}
              onChange={handleLimitChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </header>

      {/* 2. Search & Filter Bar */}
      <section className="history-filters-bar">
        {/* Search input */}
        <div className="history-search-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="history-search-input"
            placeholder="Search within page results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Event Type Filter */}
        <div className="history-select-wrap">
          <Filter size={16} className="filter-icon" />
          <select
            className="history-select"
            value={selectedEventType}
            onChange={(e) => {
              setSelectedEventType(e.target.value);
              setOffset(0);
            }}
          >
            <option value="all">All Event Types</option>
            <option value="completed">Completed Handoffs</option>
            <option value="reserve">Reservations</option>
            <option value="cancel">Cancellations</option>
            <option value="request">Requests</option>
            <option value="product">Products</option>
          </select>
        </div>

        {/* Date Filters */}
        <div className="history-date-group">
          <div className="date-input-wrap">
            <span className="date-label">From:</span>
            <input
              type="date"
              className="history-date-input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOffset(0);
              }}
            />
          </div>

          <div className="date-input-wrap">
            <span className="date-label">To:</span>
            <input
              type="date"
              className="history-date-input"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setOffset(0);
              }}
            />
          </div>
        </div>

        {/* Reset button if filters active */}
        {(searchQuery || selectedEventType !== 'all' || startDate || endDate || offset > 0) && (
          <button
            type="button"
            className="btn-reset-filters"
            onClick={handleResetFilters}
            title="Reset filters"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        )}
      </section>

      {/* Error Alert */}
      {error && (
        <div className="history-alert alert-error">
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Main Timeline Content */}
      <main className="history-main-content">
        {loading ? (
          <div className="history-loading-state">
            <Loader2 size={36} className="spin-icon" />
            <p>Loading activity history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="history-empty-state">
            <div className="empty-state-icon-wrap">
              <HistoryIcon size={46} />
            </div>
            <h3>No Activity Records Found</h3>
            <p>
              {searchQuery || selectedEventType !== 'all' || startDate || endDate || offset > 0
                ? 'No activities match your current search and filter criteria.'
                : 'You do not have any logged activities yet. Activities like requests, donations, reservations, and completed transactions will appear here.'}
            </p>
            {(searchQuery || selectedEventType !== 'all' || startDate || endDate || offset > 0) ? (
              <button
                type="button"
                className="btn-clear-empty"
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            ) : (
              <Link to="/dashboard/browse" className="btn-browse-link">
                <span>Browse Products</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="history-timeline-list">
            {filteredHistory.map((item, index) => {
              const meta = getEventMeta(item.event);
              const IconComp = meta.icon;

              const dateObj = item.date ? new Date(item.date) : new Date();
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const formattedTime = dateObj.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={item._id || index} className="history-item-card">
                  {/* Left Column: Icon Indicator & Connection Line */}
                  <div className="history-item-indicator">
                    <div
                      className="history-icon-circle"
                      style={{ backgroundColor: `${meta.iconColor}15`, borderColor: `${meta.iconColor}35` }}
                    >
                      <IconComp size={18} style={{ color: meta.iconColor }} />
                    </div>
                    {index < filteredHistory.length - 1 && <div className="history-line" />}
                  </div>

                  {/* Right Column: Card Content */}
                  <div className="history-card-body">
                    <div className="history-card-header">
                      <div className="history-event-tags">
                        <span className={`event-type-badge ${meta.badgeClass}`}>
                          {item.event ? item.event.toUpperCase() : 'EVENT'}
                        </span>
                      </div>

                      <div className="history-timestamp">
                        <Calendar size={13} />
                        <span>{formattedDate}</span>
                        <span className="time-divider">•</span>
                        <span>{formattedTime}</span>
                      </div>
                    </div>

                    <p className="history-summary-text">
                      {item.summaryShort || 'Activity record updated.'}
                    </p>

                    <div className="history-footer-meta">
                      <div className="history-user-tag">
                        <User size={13} />
                        <span>@{item.username}</span>
                      </div>
                      {item._id && (
                        <span className="history-id-tag">ID: {String(item._id).slice(-8)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. Offset & Limit Pagination Bar */}
      {totalCount > 0 && (
        <footer className="history-pagination-bar">
          <div className="pagination-info">
            <span>
              Showing records <strong>{offset + 1}</strong> to{' '}
              <strong>{Math.min(offset + limit, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong>
            </span>
            <span className="pagination-offset-tag">(Offset: {offset}, Limit: {limit})</span>
          </div>

          <div className="pagination-actions">
            <button
              type="button"
              className="page-btn"
              onClick={handleFirstPage}
              disabled={!hasPrev || loading}
              title="First Page (Offset 0)"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              type="button"
              className="page-btn page-btn-prev"
              onClick={handlePrevPage}
              disabled={!hasPrev || loading}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="page-indicator">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>

            <button
              type="button"
              className="page-btn page-btn-next"
              onClick={handleNextPage}
              disabled={!hasNext || loading}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="page-btn"
              onClick={handleLastPage}
              disabled={!hasNext || loading}
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default History;
