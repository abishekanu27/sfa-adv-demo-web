import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, X, Tag, LayoutGrid, List } from 'lucide-react';
import { fetchCategoriesApi, createCategoryApi } from '../../services/api';
import './ProductCategories.css';

export const ProductCategories = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  const loadCategories = async () => {
    setLoading(true);
    const data = await fetchCategoriesApi();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setIsSubmitting(true);
      await createCategoryApi({ name: newCatName.trim() });
      showNotification(`Category "${newCatName.trim()}" created successfully!`);
      setNewCatName('');
      setShowAddModal(false);
      await loadCategories();
    } catch (err) {
      showNotification(err.message || 'Failed to create category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="product-categories-page">
      {/* Toast */}
      {toast && (
        <div className={`categories-toast ${toast.type}`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Products &amp; Stock</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Category Adding</span>
          </nav>
          <h1 className="dashboard-main-title">
            Product Categories Master
          </h1>
          <p className="dashboard-sub-title">
            Organize catalog hierarchy, manage category tags, and add new product classifications.
          </p>
        </div>

        <div className="page-header-actions">
          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>

          <button 
            className="action-btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} />
            <span>Add New Category</span>
          </button>
        </div>
      </div>

      {/* Categories Content: Grid or Table */}
      {loading ? (
        <div className="categories-loading-cell" style={{ marginTop: '10px' }}>Loading categories from database...</div>
      ) : categories.length === 0 ? (
        <div className="categories-loading-cell" style={{ marginTop: '10px' }}>No categories found. Click "+ Add New Category" to create one.</div>
      ) : viewMode === 'grid' ? (
        <div className="categories-cards-grid">
          {categories.map((cat) => (
            <div key={cat.category_id || cat.id} className="category-master-card">
              <div className="card-top-row">
                <div className="cat-top-left">
                  <div className="cat-tag-icon-box">
                    <Tag size={16} fill="#f59e0b" color="#d97706" />
                  </div>
                  <span className="cat-id-badge">ID: #{cat.category_id || cat.id}</span>
                </div>
                <span className="cat-products-count-badge">
                  {cat.product_count || 0} Products
                </span>
              </div>

              <div className="card-body-content">
                <h3 className="category-card-name">{cat.name}</h3>
                <p className="category-card-subtext">{cat.description || 'Active Catalog Classification'}</p>
              </div>

              <div className="card-bottom-divider"></div>

              <button 
                className="browse-products-link"
                onClick={() => onSelectCategory && onSelectCategory(cat.name)}
              >
                <span>Browse Products</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="categories-table-card">
          <div className="table-responsive-wrapper">
            <table className="products-data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Category ID</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Total Products</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.category_id || cat.id}>
                    <td>
                      <span className="product-id-badge">#{cat.category_id || cat.id}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{cat.name}</strong>
                    </td>
                    <td style={{ color: '#64748b' }}>
                      {cat.description || 'Active Catalog Classification'}
                    </td>
                    <td>
                      <span className="cat-products-count-badge">
                        {cat.product_count || 0} Products
                      </span>
                    </td>
                    <td>
                      <span className="status-pill in-stock">
                        {cat.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="browse-products-link"
                        onClick={() => onSelectCategory && onSelectCategory(cat.name)}
                      >
                        <span>Browse Products</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add New Product Category (Matching Screenshot 2) */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Product Category</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="modal-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="e.g. Solar Equipment, Industrial Tools"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="cat-name-input"
                />
                <small className="form-hint-text">
                  This category will be saved and immediately available for filtering and products.
                </small>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={isSubmitting || !newCatName.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
