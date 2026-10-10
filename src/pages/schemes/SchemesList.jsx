import React, { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  Gift, 
  Percent, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle,
  ArrowRight, 
  Sparkles, 
  SlidersHorizontal,
  Building2 
} from 'lucide-react';
import { 
  fetchSchemesApi, 
  toggleSchemeStatusApi, 
  deleteSchemeApi,
  fetchBranchesApi 
} from '../../services/api';
import { SchemeFormModal } from './SchemeFormModal';

export const SchemesList = ({ onOpenSimulator, selectedBranchId }) => {
  const [schemes, setSchemes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState(selectedBranchId || 'ALL');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchBranchesApi().then(res => {
      setBranches(res || []);
    }).catch(err => {
      console.warn('Failed to load branches in SchemesList:', err);
    });
  }, []);

  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'all') {
      setBranchFilter(selectedBranchId);
    }
  }, [selectedBranchId]);

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const activeBranchParam = branchFilter !== 'ALL' && branchFilter !== 'all' 
        ? branchFilter 
        : (selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : undefined);

      const data = await fetchSchemesApi({
        search: searchTerm,
        type: selectedType,
        status: showActiveOnly ? 'active' : 'all',
        branch_id: activeBranchParam
      });
      setSchemes(data);
    } catch (err) {
      console.error('Failed to load schemes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, [searchTerm, selectedType, showActiveOnly, branchFilter, selectedBranchId]);

  const showNotification = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleStatus = async (scheme) => {
    try {
      const res = await toggleSchemeStatusApi(scheme.scheme_id || scheme.id);
      showNotification(`Scheme "${scheme.name}" is now ${res.is_active ? 'Active' : 'Inactive'}`);
      loadSchemes();
    } catch (err) {
      showNotification(err.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (scheme) => {
    if (!window.confirm(`Are you sure you want to delete scheme "${scheme.name}"?`)) return;
    try {
      await deleteSchemeApi(scheme.scheme_id || scheme.id);
      showNotification(`Scheme deleted successfully!`);
      loadSchemes();
    } catch (err) {
      showNotification(err.message || 'Failed to delete scheme', 'error');
    }
  };

  const handleEdit = (scheme) => {
    setEditingScheme(scheme);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingScheme(null);
    setIsModalOpen(true);
  };

  // KPIs
  const totalSchemes = schemes.length;
  const activeCount = schemes.filter(s => s.is_active).length;
  const productBasedCount = schemes.filter(s => s.scheme_type === 'PRODUCT_BASED' || s.scheme_type === 'BOGO_QTY').length;
  const amountBasedCount = schemes.filter(s => s.scheme_type === 'AMOUNT_BASED' || s.scheme_type === 'MIN_ORDER_VALUE').length;

  return (
    <div className="schemes-hub-page">
      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          <CheckCircle2 size={16} />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="schemes-kpi-grid">
        <div className="scheme-kpi-card">
          <div className="kpi-left">
            <span className="kpi-title">Active Live Schemes</span>
            <span className="kpi-val" style={{ color: '#059669' }}>{activeCount} / {totalSchemes}</span>
          </div>
          <div className="kpi-icon-box emerald">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="scheme-kpi-card">
          <div className="kpi-left">
            <span className="kpi-title">Product-Based Schemes</span>
            <span className="kpi-val" style={{ color: '#2563eb' }}>{productBasedCount}</span>
          </div>
          <div className="kpi-icon-box blue">
            <Package size={22} />
          </div>
        </div>

        <div className="scheme-kpi-card">
          <div className="kpi-left">
            <span className="kpi-title">Amount-Based Schemes</span>
            <span className="kpi-val" style={{ color: '#9333ea' }}>{amountBasedCount}</span>
          </div>
          <div className="kpi-icon-box purple">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="scheme-kpi-card">
          <div className="kpi-left">
            <span className="kpi-title">Pack-Size Unit Engine</span>
            <span className="kpi-val" style={{ fontSize: '15px', color: '#4f46e5', fontWeight: '700' }}>
              Bag / Box Aware
            </span>
          </div>
          <div className="kpi-icon-box amber">
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="schemes-toolbar-card">
        <div className="toolbar-filters-left">
          <div className="scheme-search-input-wrap">
            <Search size={16} />
            <input 
              type="text"
              className="scheme-search-input"
              placeholder="Search scheme name, product, code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="type-filter-pills">
            <button 
              type="button" 
              className={`filter-pill ${selectedType === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedType('ALL')}
            >
              All Schemes
            </button>
            <button 
              type="button" 
              className={`filter-pill ${selectedType === 'PRODUCT_BASED' ? 'active' : ''}`}
              onClick={() => setSelectedType('PRODUCT_BASED')}
            >
              Product-Based Schemes
            </button>
            <button 
              type="button" 
              className={`filter-pill ${selectedType === 'AMOUNT_BASED' ? 'active' : ''}`}
              onClick={() => setSelectedType('AMOUNT_BASED')}
            >
              Amount-Based Schemes
            </button>
          </div>

          {/* Branch Filter Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            padding: '5px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1'
          }}>
            <Building2 size={14} color="#0284c7" />
            <select 
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '12px',
                fontWeight: '600',
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">🏢 All Branches & Depots</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} {b.district ? `(${b.district})` : ''}
                </option>
              ))}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569', cursor: 'pointer', marginLeft: '6px' }}>
            <input 
              type="checkbox"
              checked={showActiveOnly}
              onChange={e => setShowActiveOnly(e.target.checked)}
              style={{ width: '15px', height: '15px' }}
            />
            <span>Active only</span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenSimulator && (
            <button 
              type="button" 
              onClick={onOpenSimulator}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '12.5px',
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <SlidersHorizontal size={15} />
              <span>Simulate / Test Schemes</span>
            </button>
          )}

          <button 
            type="button" 
            className="add-scheme-primary-btn"
            onClick={handleOpenAdd}
          >
            <Plus size={16} />
            <span>Create New Scheme</span>
          </button>
        </div>
      </div>

      {/* Schemes Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          Loading promotional schemes...
        </div>
      ) : schemes.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px dashed #cbd5e1',
          borderRadius: '14px',
          padding: '60px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <Gift size={24} />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>No Schemes Configured</h4>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: 0 }}>
            {searchTerm || selectedType !== 'ALL' 
              ? 'No schemes match your filter criteria. Try clearing the filter.' 
              : 'Add your first Product-Based or Total Amount-Based promotional scheme with automated rewards.'}
          </p>
          <button 
            type="button" 
            className="add-scheme-primary-btn"
            onClick={handleOpenAdd}
            style={{ marginTop: '8px' }}
          >
            <Plus size={16} />
            <span>Create Scheme</span>
          </button>
        </div>
      ) : (
        <div className="schemes-cards-grid">
          {schemes.map((sc) => {
            const isProductBased = sc.scheme_type === 'PRODUCT_BASED' || sc.scheme_type === 'BOGO_QTY';
            const isFreeProd = sc.reward_type === 'FREE_PRODUCT';

            return (
              <div key={sc.scheme_id || sc.id} className={`scheme-card ${!sc.is_active ? 'inactive' : ''}`}>
                <div>
                  <div className="scheme-card-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="scheme-code-badge">{sc.scheme_code}</span>
                      {sc.branch_id ? (
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Building2 size={11} />
                          {sc.branch_name || `Branch #${sc.branch_id}`}
                        </span>
                      ) : (
                        <span style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🌐 All Branches
                        </span>
                      )}
                    </div>

                    <span className={`scheme-type-badge ${isProductBased ? 'bogo' : 'slab'}`}>
                      {isProductBased ? <Package size={12} /> : <DollarSign size={12} />}
                      <span>{isProductBased ? 'Product-Based Scheme' : 'Total Amount-Based Scheme'}</span>
                    </span>
                  </div>

                  <div className="scheme-card-title">{sc.name}</div>
                  <div className="scheme-card-desc">
                    {sc.description || (isProductBased 
                      ? `Purchase ${sc.trigger_min_qty} ${sc.trigger_unit} of ${sc.trigger_product_name}` 
                      : `Purchase above ₹${parseFloat(sc.min_order_amount || 0).toLocaleString()}`)}
                  </div>

                  {/* Visual Rule Flow Diagram */}
                  <div className="scheme-rule-flow">
                    <div className="flow-step">
                      <span className="flow-step-label">Qualifying Rule</span>
                      <span className="flow-step-content">
                        {isProductBased && (
                          <>
                            Buy {sc.trigger_min_qty} {sc.trigger_unit || 'Pcs'} of {sc.trigger_product_name || 'Product'}
                            {sc.trigger_units_per_pkg > 1 && (
                              <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                                (1 {sc.trigger_unit} = {sc.trigger_units_per_pkg} Pieces)
                              </span>
                            )}
                          </>
                        )}
                        {!isProductBased && (
                          <>
                            Purchase ≥ ₹{parseFloat(sc.min_order_amount || 0).toLocaleString()}
                            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                              {sc.eligible_product_mode === 'SELECTED_PRODUCTS' ? 'Selected Products' : 'All Products'}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    <ArrowRight size={16} className="flow-arrow" />

                    <div className="flow-step">
                      <span className="flow-step-label">Scheme Reward</span>
                      <span className="flow-step-content highlight">
                        {isFreeProd ? (
                          <>🎁 {sc.reward_qty} {sc.reward_unit || 'Pcs'} of {sc.reward_product_name || 'Free Item'} FREE</>
                        ) : (
                          <>💰 {sc.discount_type === 'PERCENTAGE' ? `${sc.discount_value || sc.discount_percentage}% OFF` : `₹${sc.discount_value || sc.discount_amount} OFF`}</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="scheme-card-footer">
                  <div className="scheme-meta-left">
                    <button 
                      type="button" 
                      className={`status-toggle-btn ${sc.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(sc)}
                      title="Click to toggle Active / Inactive"
                    >
                      {sc.is_active ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                      <span>{sc.is_active ? 'Active' : 'Inactive'}</span>
                    </button>

                    {sc.start_date && (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        From {new Date(sc.start_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="scheme-actions-right">
                    <button 
                      type="button" 
                      className="scheme-action-btn"
                      onClick={() => handleEdit(sc)}
                      title="Edit Scheme"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      type="button" 
                      className="scheme-action-btn delete"
                      onClick={() => handleDelete(sc)}
                      title="Delete Scheme"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Scheme Modal */}
      <SchemeFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadSchemes}
        editScheme={editingScheme}
      />
    </div>
  );
};
