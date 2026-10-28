import { useState, useEffect, useCallback, useTransition } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  X,
  Filter
} from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import './Browse.css';

const LIMIT_OPTIONS = [6, 9, 12, 18];

function Browse() {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { user, isAdmin } = context;

  // Products and Pagination state
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [minQuantity, setMinQuantity] = useState(1);
  const [sortOption, setSortOption] = useState('latest');

  // Floating Filter Panel Visibility
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Debounced fetch trigger
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedUser, setDebouncedUser] = useState('');

  // Handle debouncing for input fields
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUser(usernameFilter);
      setPage(1); // Reset to page 1 on new username search
    }, 350);
    return () => clearTimeout(handler);
  }, [usernameFilter]);

  // Main fetch function
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams();
      params.append('offset', offset);
      params.append('limit', limit);

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }
      if (debouncedUser.trim()) {
        params.append('username', debouncedUser.trim());
      }
      if (minQuantity > 1) {
        params.append('minQuantity', minQuantity);
      }
      if (sortOption) {
        params.append('sort', sortOption);
      }

      // Use the appropriate endpoint based on user role if needed, or /user/product
      const endpoint = isAdmin ? `/admin/product?${params.toString()}` : `/user/product?${params.toString()}`;
      const res = await api.get(endpoint);

      const items = res.data || [];
      setProducts(items);
      setTotalCount(res.total !== undefined ? res.total : items.length);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.message || 'Unable to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, debouncedUser, minQuantity, sortOption, isAdmin]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(usernameFilter.trim()) ||
    minQuantity > 1 ||
    sortOption !== 'latest';

  const handleResetFilters = () => {
    setSearchTerm('');
    setUsernameFilter('');
    setMinQuantity(1);
    setSortOption('latest');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="browse-container">
      {/* 1. Header Toolbar with Sort & Floating Filter Trigger */}
      <header className="browse-header">
        <div className="browse-header-left">
          <h1>Browse Community Offerings</h1>
          <p className="browse-subtitle">
            Showing {totalCount > 0 ? (page - 1) * limit + 1 : 0} -{' '}
            {Math.min(page * limit, totalCount)} of {totalCount} available products
          </p>
        </div>

        <div className="browse-header-actions">
          {/* Sort Dropdown (A-Z, Z-A, Latest, Oldest) */}
          <div className="sort-control-group">
            <label htmlFor="browse-sort-select" className="sort-label">
              <ArrowUpDown size={15} />
              <span>Sort:</span>
            </label>
            <select
              id="browse-sort-select"
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="browse-select"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="a-z">Name (A - Z)</option>
              <option value="z-a">Name (Z - A)</option>
            </select>
          </div>

          {/* Floating Filter Container Trigger Button */}
          <button
            type="button"
            className={`floating-filter-toggle ${isFilterOpen ? 'active' : ''} ${
              hasActiveFilters ? 'has-active' : ''
            }`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
            aria-label="Toggle search filters"
          >
            <Filter size={17} />
            <span>Filters</span>
            {hasActiveFilters && <span className="active-filter-indicator" />}
          </button>
        </div>
      </header>

      {/* 2. Floating Filter Container Modal / Popover */}
      {isFilterOpen && (
        <div className="filter-backdrop" onClick={() => setIsFilterOpen(false)} />
      )}

      <div
        className={`floating-filter-panel ${
          isFilterOpen ? 'filter-panel-open' : 'filter-panel-closed'
        }`}
      >
        <div className="filter-panel-header">
          <div className="filter-panel-title">
            <SlidersHorizontal size={18} className="filter-icon" />
            <h3>Filter Products</h3>
          </div>
          <button
            type="button"
            className="filter-close-btn"
            onClick={() => setIsFilterOpen(false)}
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>

        <div className="filter-panel-body">
          {/* Filter 1: Textbox for Searching Product through name or mongodb id */}
          <div className="filter-field">
            <label htmlFor="filter-search-input">Product Name or ID</label>
            <div className="filter-input-wrap">
              <Search size={16} className="field-icon" />
              <input
                id="filter-search-input"
                type="text"
                placeholder="e.g. Jacket or 65f1..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-text-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="field-clear-btn"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear product search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="field-hint">Search by title or MongoDB ObjectId</span>
          </div>

          {/* Filter 2: Textbox for Searching Products through Username */}
          <div className="filter-field">
            <label htmlFor="filter-username-input">Donor Username</label>
            <div className="filter-input-wrap">
              <User size={16} className="field-icon" />
              <input
                id="filter-username-input"
                type="text"
                placeholder="e.g. sarah_gives"
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                className="filter-text-input"
              />
              {usernameFilter && (
                <button
                  type="button"
                  className="field-clear-btn"
                  onClick={() => setUsernameFilter('')}
                  aria-label="Clear username filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="field-hint">Filter items listed by specific donors</span>
          </div>

          {/* Filter 3: Quantity slider (min = 1) */}
          <div className="filter-field">
            <div className="slider-header-row">
              <label htmlFor="filter-quantity-slider">Minimum Quantity Available</label>
              <span className="slider-value-badge">≥ {minQuantity}</span>
            </div>
            <div className="slider-track-wrap">
              <input
                id="filter-quantity-slider"
                type="range"
                min="1"
                max="50"
                step="1"
                value={minQuantity}
                onChange={(e) => {
                  setMinQuantity(Number(e.target.value));
                  setPage(1);
                }}
                className="quantity-range-slider"
              />
              <div className="slider-markers">
                <span>1</span>
                <span>15</span>
                <span>30</span>
                <span>50+</span>
              </div>
            </div>
          </div>
        </div>

        <div className="filter-panel-footer">
          <button
            type="button"
            onClick={handleResetFilters}
            className="filter-reset-btn"
            disabled={!hasActiveFilters}
          >
            <RotateCcw size={15} />
            <span>Reset All</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            className="filter-apply-btn"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* 3. Main Product Cards Display Area */}
      <main className="browse-main-content">
        {loading ? (
          <div className="browse-loading-state">
            <Loader2 size={36} className="spin-icon" />
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div className="browse-error-state">
            <p className="error-message">{error}</p>
            <button type="button" onClick={fetchProducts} className="retry-btn">
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="browse-empty-state">
            <div className="empty-icon-wrap">
              <Package size={44} />
            </div>
            <h3>No products found</h3>
            <p>
              We couldn't find any products matching your current search and filter criteria.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="reset-empty-btn"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="product-cards-grid">
            {products.map((product) => (
              <ProductCard
                key={product._id || product.name}
                product={product}
                onClick={() => {
                  const id = product._id || product.id;
                  if (id) {
                    navigate(`/dashboard/product/${id}`, { state: { product } });
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* 4. Offset/Limit Multiple Pages Pagination Footer */}
      {!loading && totalCount > 0 && (
        <footer className="browse-pagination-footer">
          <div className="pagination-limit-wrap">
            <span className="limit-label">Show per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="limit-select"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="pagination-pages-wrap">
            <button
              type="button"
              className="page-nav-btn"
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              aria-label="First page"
              title="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              className="page-nav-btn"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page number indicators */}
            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <span key={p} className="page-item-wrapper">
                      {showEllipsis && <span className="page-ellipsis">...</span>}
                      <button
                        type="button"
                        className={`page-num-btn ${p === page ? 'page-active' : ''}`}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
            </div>

            <button
              type="button"
              className="page-nav-btn"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="page-nav-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              aria-label="Last page"
              title="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>

          <div className="pagination-info-text">
            Page {page} of {totalPages}
          </div>
        </footer>
      )}
    </div>
  );
}

export default Browse;
