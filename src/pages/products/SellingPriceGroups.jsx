import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, SlidersHorizontal, CheckCircle2, AlertCircle, Tag, ArrowRight, DollarSign } from 'lucide-react';
import { 
  fetchPriceGroupsApi, 
  createPriceGroupApi, 
  deletePriceGroupApi, 
  fetchGroupProductPricesApi, 
  updateGroupProductPricesApi 
} from '../../services/api';
import './SellingPriceGroups.css';

export const SellingPriceGroups = ({ onSelectProduct }) => {
  const [priceGroups, setPriceGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Price Configuration Modal State
  const [activeGroupForPrices, setActiveGroupForPrices] = useState(null);
  const [groupProducts, setGroupProducts] = useState([]);
  const [editedPrices, setEditedPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  const loadPriceGroups = async () => {
    setLoading(true);
    try {
      const data = await fetchPriceGroupsApi();
      setPriceGroups(data);
    } catch (err) {
      console.error('Error loading price groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriceGroups();
  }, []);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // 1. Create Price Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await createPriceGroupApi({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || 'Customer Tier Price Classification'
      });
      showNotification(`Price Group "${created.name}" created successfully!`);
      setNewGroupName('');
      setNewGroupDesc('');
      setShowAddModal(false);
      await loadPriceGroups();
    } catch (err) {
      showNotification(err.message || 'Failed to create price group', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Delete Price Group
  const handleDeleteGroup = async (groupId, groupName, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete price group "${groupName}"?`)) {
      try {
        await deletePriceGroupApi(groupId);
        showNotification('Price group deleted');
        await loadPriceGroups();
      } catch (err) {
        showNotification(err.message || 'Failed to delete price group', 'error');
      }
    }
  };

  // 3. Open Configure Prices Modal
  const handleOpenConfigurePrices = async (group) => {
    setActiveGroupForPrices(group);
    setLoadingPrices(true);
    try {
      const res = await fetchGroupProductPricesApi(group.price_group_id || group.id);
      setGroupProducts(res.data || []);
      
      // Initialize price edits
      const priceMap = {};
      (res.data || []).forEach(p => {
        priceMap[p.product_id] = p.group_selling_price !== null && p.group_selling_price !== undefined ? p.group_selling_price : '';
      });
      setEditedPrices(priceMap);
    } catch (err) {
      showNotification('Failed to load products for group: ' + err.message, 'error');
    } finally {
      setLoadingPrices(false);
    }
  };

  // 4. Save Prices for Group
  const handleSavePrices = async (e) => {
    e.preventDefault();
    if (!activeGroupForPrices) return;

    try {
      setIsSavingPrices(true);
      const payload = Object.entries(editedPrices).map(([prodId, val]) => ({
        product_id: parseInt(prodId, 10),
        selling_price: val
      }));

      await updateGroupProductPricesApi(activeGroupForPrices.price_group_id || activeGroupForPrices.id, payload);
      showNotification(`Selling prices for "${activeGroupForPrices.name}" saved successfully!`);
      setActiveGroupForPrices(null);
      await loadPriceGroups();
    } catch (err) {
      showNotification(err.message || 'Failed to save prices', 'error');
    } finally {
      setIsSavingPrices(false);
    }
  };

  return (
    <div className="selling-price-groups-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`price-group-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Products &amp; Stock</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Selling Price Groups</span>
          </nav>
          <h1 className="dashboard-main-title">
            Selling Price Groups Master
          </h1>
          <p className="dashboard-sub-title">
            Create customer-specific rate tiers (e.g. Customer Rate A, Customer Rate B, Wholesale) and manage custom selling prices for catalog products.
          </p>
        </div>

        <div className="page-header-actions">
          <button 
            className="action-btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} />
            <span>Add New Price Group</span>
          </button>
        </div>
      </div>

      {/* Price Groups Master Table Card */}
      <div className="price-groups-table-card">
        <div className="table-responsive-wrapper">
          <table className="products-data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Price Group ID</th>
                <th>Price Group Name</th>
                <th>Description</th>
                <th>Configured Products</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-price-groups-cell">
                    Loading selling price groups from database...
                  </td>
                </tr>
              ) : priceGroups.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-price-groups-cell">
                    <div className="empty-state-wrap">
                      <Tag size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
                      <strong style={{ color: '#334155', fontSize: '15px' }}>No Selling Price Groups Found</strong>
                      <span className="empty-message-text" style={{ marginTop: '6px' }}>
                        Create your first rate tier (e.g., "Customer Rate A", "Customer Rate B", "Wholesale Tier") to assign custom selling prices.
                      </span>
                      <button 
                        className="action-btn btn-primary" 
                        style={{ marginTop: '14px' }}
                        onClick={() => setShowAddModal(true)}
                      >
                        <Plus size={15} />
                        <span>Create First Price Group</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                priceGroups.map((group) => (
                  <tr key={group.price_group_id || group.id}>
                    <td>
                      <span className="product-id-badge">#{group.price_group_id || group.id}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '13px' }}>{group.name}</strong>
                    </td>
                    <td style={{ color: '#64748b' }}>
                      {group.description || 'Customer Tier Price Classification'}
                    </td>
                    <td>
                      <span className="products-count-badge">
                        {group.products_count || 0} Products Configured
                      </span>
                    </td>
                    <td>
                      <span className="status-pill in-stock">
                        {group.status || 'Active'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="configure-prices-btn"
                        title="Set Custom Product Prices"
                        onClick={() => handleOpenConfigurePrices(group)}
                      >
                        <SlidersHorizontal size={14} />
                        <span>Set Prices</span>
                      </button>
                      <button 
                        className="table-icon-action delete" 
                        title="Delete Price Group"
                        onClick={(e) => handleDeleteGroup(group.price_group_id || group.id, group.name, e)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add New Selling Price Group */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog price-group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Selling Price Group</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="modal-form">
              <div className="form-group">
                <label>Price Group Name *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="e.g. Customer Rate A, Wholesale Tier, Super Stockist"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <small className="form-hint-text">
                  This rate group can be assigned to customers so they purchase products at this price.
                </small>
              </div>

              <div className="form-group">
                <label>Description / Notes</label>
                <input 
                  type="text" 
                  placeholder="e.g. Special contracted pricing for Category A retail distributors"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                />
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
                  disabled={isSubmitting || !newGroupName.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Price Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Configure Custom Product Prices Matrix */}
      {activeGroupForPrices && (
        <div className="modal-backdrop" onClick={() => setActiveGroupForPrices(null)}>
          <div 
            className="modal-dialog price-matrix-modal" 
            style={{ maxWidth: '1040px', width: '95vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Set Product Prices — {activeGroupForPrices.name}</h3>
                <span className="modal-subtitle">
                  Price Group ID: #{activeGroupForPrices.price_group_id || activeGroupForPrices.id} • Set customized selling prices for products under this customer tier.
                </span>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setActiveGroupForPrices(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePrices} className="modal-form">
              {loadingPrices ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Loading catalog products...
                </div>
              ) : groupProducts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No master products found in database. Create products first to set price group rates.
                </div>
              ) : (
                <div className="matrix-table-wrapper">
                  <table className="products-data-table matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>Product ID</th>
                        <th>Product &amp; Category</th>
                        <th style={{ width: '100px' }}>SKU</th>
                        <th style={{ width: '130px' }}>Base M.R.P (₹)</th>
                        <th style={{ width: '210px' }}>Custom Rate for Group (₹)</th>
                        <th style={{ width: '150px' }}>Effective Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupProducts.map((p) => {
                        const customVal = editedPrices[p.product_id];
                        const effPrice = customVal !== '' && customVal !== undefined && !isNaN(parseFloat(customVal))
                          ? parseFloat(customVal)
                          : parseFloat(p.base_selling_price || 0);
                        const costPrice = parseFloat(p.cost_price || 0);
                        const marginPct = effPrice > 0 
                          ? Math.round(((effPrice - costPrice) / effPrice) * 100) 
                          : 0;

                        return (
                          <tr key={p.product_id}>
                            <td>
                              <span className="product-id-badge">#{p.product_id}</span>
                            </td>
                            <td className="matrix-product-cell">
                              <strong>{p.name}</strong>
                              <small style={{ display: 'block', color: '#64748b' }}>
                                {p.category_name || 'General'}
                              </small>
                            </td>
                            <td>
                              <span className="sku-badge">{p.sku}</span>
                            </td>
                            <td>
                              <span className="base-price-tag">
                                ₹{Number(p.base_selling_price || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td>
                              <div className="custom-price-input-wrap">
                                <span className="currency-prefix">₹</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  placeholder={String(p.base_selling_price || 0)}
                                  value={customVal ?? ''}
                                  onChange={(e) => {
                                    setEditedPrices({
                                      ...editedPrices,
                                      [p.product_id]: e.target.value
                                    });
                                  }}
                                  className="custom-price-input"
                                />
                              </div>
                            </td>
                            <td>
                              <span className="margin-pill">
                                {marginPct}%
                              </span>
                              {customVal !== '' && customVal !== undefined && (
                                <small style={{ display: 'block', fontSize: '10.5px', color: '#2563eb', fontWeight: '600' }}>
                                  Custom Rate Active
                                </small>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setActiveGroupForPrices(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={isSavingPrices || groupProducts.length === 0}
                >
                  {isSavingPrices ? 'Saving Rates...' : 'Save All Group Prices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
