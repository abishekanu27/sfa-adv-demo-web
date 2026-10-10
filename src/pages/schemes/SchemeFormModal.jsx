import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  DollarSign, 
  Gift, 
  Percent, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  Info,
  Building2
} from 'lucide-react';
import { fetchProductsApi, fetchBranchesApi, createSchemeApi, updateSchemeApi } from '../../services/api';

export const SchemeFormModal = ({ isOpen, onClose, onSaved, editScheme = null }) => {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    branch_id: '',
    scheme_type: 'PRODUCT_BASED', // 'PRODUCT_BASED' | 'AMOUNT_BASED'
    
    // Product-Based fields
    trigger_product_id: '',
    trigger_product_name: '',
    trigger_min_qty: 1,
    trigger_unit: 'Pcs',
    trigger_units_per_pkg: 1,
    
    // Amount-Based fields
    min_order_amount: 5000,
    eligible_product_mode: 'ALL_PRODUCTS', // 'ALL_PRODUCTS' | 'SELECTED_PRODUCTS'
    eligible_product_ids: [],
    
    // Shared Reward Configuration
    reward_type: 'FREE_PRODUCT', // 'FREE_PRODUCT' | 'DISCOUNT'
    reward_product_id: '',
    reward_product_name: '',
    reward_qty: 1,
    reward_unit: 'Pcs',
    discount_type: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED_AMOUNT'
    discount_value: 5,
    
    // Repeating / Slabs configuration
    allow_multiple_slabs: true,
    
    // Schedule & Status
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    if (!isOpen) return;

    setLoadingProds(true);
    Promise.all([
      fetchProductsApi().catch(err => {
        console.warn('Failed to load products for scheme form:', err);
        return [];
      }),
      fetchBranchesApi().catch(err => {
        console.warn('Failed to load branches for scheme form:', err);
        return [];
      })
    ]).then(([prods, brs]) => {
      setProducts(prods || []);
      setBranches(brs || []);
    }).finally(() => {
      setLoadingProds(false);
    });

    if (editScheme) {
      const isPrd = editScheme.scheme_type === 'PRODUCT_BASED' || editScheme.scheme_type === 'BOGO_QTY';
      let eligibleIds = [];
      try {
        if (Array.isArray(editScheme.eligible_product_ids)) {
          eligibleIds = editScheme.eligible_product_ids;
        } else if (typeof editScheme.eligible_product_ids === 'string') {
          eligibleIds = JSON.parse(editScheme.eligible_product_ids);
        }
      } catch (e) {}

      setFormData({
        name: editScheme.name || '',
        description: editScheme.description || '',
        branch_id: editScheme.branch_id != null ? String(editScheme.branch_id) : '',
        scheme_type: isPrd ? 'PRODUCT_BASED' : 'AMOUNT_BASED',
        trigger_product_id: editScheme.trigger_product_id ? String(editScheme.trigger_product_id) : '',
        trigger_product_name: editScheme.trigger_product_name || '',
        trigger_min_qty: editScheme.trigger_min_qty != null ? editScheme.trigger_min_qty : 1,
        trigger_unit: editScheme.trigger_unit || 'Pcs',
        trigger_units_per_pkg: editScheme.trigger_units_per_pkg || 1,
        min_order_amount: editScheme.min_order_amount != null ? editScheme.min_order_amount : 5000,
        eligible_product_mode: editScheme.eligible_product_mode || 'ALL_PRODUCTS',
        eligible_product_ids: eligibleIds,
        reward_type: editScheme.reward_type || 'FREE_PRODUCT',
        reward_product_id: editScheme.reward_product_id ? String(editScheme.reward_product_id) : '',
        reward_product_name: editScheme.reward_product_name || '',
        reward_qty: editScheme.reward_qty != null ? editScheme.reward_qty : 1,
        reward_unit: editScheme.reward_unit || 'Pcs',
        discount_type: editScheme.discount_type || 'PERCENTAGE',
        discount_value: editScheme.discount_value != null ? editScheme.discount_value : (editScheme.discount_percentage || 5),
        allow_multiple_slabs: editScheme.allow_multiple_slabs !== false,
        start_date: editScheme.start_date ? String(editScheme.start_date).split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: editScheme.end_date ? String(editScheme.end_date).split('T')[0] : '',
        is_active: editScheme.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        branch_id: '',
        scheme_type: 'PRODUCT_BASED',
        trigger_product_id: '',
        trigger_product_name: '',
        trigger_min_qty: 1,
        trigger_unit: 'Bag',
        trigger_units_per_pkg: 10,
        min_order_amount: 5000,
        eligible_product_mode: 'ALL_PRODUCTS',
        eligible_product_ids: [],
        reward_type: 'FREE_PRODUCT',
        reward_product_id: '',
        reward_product_name: '',
        reward_qty: 1,
        reward_unit: 'Pcs',
        discount_type: 'PERCENTAGE',
        discount_value: 5,
        allow_multiple_slabs: true,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true
      });
    }
    setError('');
  }, [isOpen, editScheme]);

  if (!isOpen) return null;

  // Handle Purchase Product Selection
  const handlePurchaseProductChange = (e) => {
    const prodId = e.target.value;
    const prod = products.find(p => String(p.product_id || p.id) === String(prodId));
    if (prod) {
      const pkgType = prod.package_type || 'Bag';
      const itemsPerPkg = parseInt(prod.items_per_package, 10) || 10;
      setFormData(prev => ({
        ...prev,
        trigger_product_id: prodId,
        trigger_product_name: prod.name,
        trigger_unit: pkgType,
        trigger_units_per_pkg: itemsPerPkg,
        reward_product_id: prev.reward_product_id || prodId,
        reward_product_name: prev.reward_product_name || prod.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        trigger_product_id: '',
        trigger_product_name: '',
        trigger_unit: 'Pcs',
        trigger_units_per_pkg: 1
      }));
    }
  };

  // Handle Reward Product Selection
  const handleRewardProductChange = (e) => {
    const prodId = e.target.value;
    const prod = products.find(p => String(p.product_id || p.id) === String(prodId));
    setFormData(prev => ({
      ...prev,
      reward_product_id: prodId,
      reward_product_name: prod ? prod.name : '',
      reward_unit: prod ? (prod.unit || 'Pcs') : 'Pcs'
    }));
  };

  // Handle Selected Products toggling for Amount-Based scheme
  const handleToggleEligibleProduct = (prodId) => {
    const pIdNum = parseInt(prodId, 10);
    setFormData(prev => {
      const current = prev.eligible_product_ids || [];
      const exists = current.includes(pIdNum);
      const updated = exists ? current.filter(id => id !== pIdNum) : [...current, pIdNum];
      return { ...prev, eligible_product_ids: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a Scheme Name.');
      return;
    }

    if (formData.scheme_type === 'PRODUCT_BASED') {
      if (!formData.trigger_product_id) {
        setError('Please select the Purchase Product.');
        return;
      }
      if (parseFloat(formData.trigger_min_qty) <= 0) {
        setError('Purchase Quantity must be greater than 0.');
        return;
      }
    } else if (formData.scheme_type === 'AMOUNT_BASED') {
      if (parseFloat(formData.min_order_amount) <= 0) {
        setError('Minimum Purchase Amount must be greater than ₹0.');
        return;
      }
      if (formData.eligible_product_mode === 'SELECTED_PRODUCTS' && (!formData.eligible_product_ids || formData.eligible_product_ids.length === 0)) {
        setError('Please select at least one eligible product for the scheme.');
        return;
      }
    }

    if (formData.reward_type === 'FREE_PRODUCT') {
      if (!formData.reward_product_name && !formData.reward_product_id) {
        setError('Please select or specify the Free Reward Product.');
        return;
      }
      if (parseFloat(formData.reward_qty) <= 0) {
        setError('Reward Quantity must be greater than 0.');
        return;
      }
    } else if (formData.reward_type === 'DISCOUNT') {
      if (parseFloat(formData.discount_value) <= 0) {
        setError('Discount Value must be greater than 0.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        ...formData,
        branch_id: formData.branch_id ? parseInt(formData.branch_id, 10) : null,
        trigger_min_qty: parseFloat(formData.trigger_min_qty) || 1,
        trigger_units_per_pkg: parseInt(formData.trigger_units_per_pkg, 10) || 1,
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        reward_qty: parseFloat(formData.reward_qty) || 1,
        discount_value: parseFloat(formData.discount_value) || 0
      };

      if (editScheme) {
        await updateSchemeApi(editScheme.scheme_id || editScheme.id, payload);
      } else {
        await createSchemeApi(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save scheme:', err);
      setError(err.message || 'Error occurred while saving scheme.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTriggerProd = products.find(p => String(p.product_id || p.id) === String(formData.trigger_product_id));

  return (
    <div className="scheme-modal-overlay" onClick={onClose}>
      <div className="scheme-modal-card" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="scheme-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#4f46e5" />
            <h3>{editScheme ? 'Edit Promotional Scheme' : 'Create New Promotional Scheme'}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="scheme-modal-form">
          <div className="scheme-modal-body">
            {error && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                padding: '10px 14px', 
                color: '#dc2626', 
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Scheme Name & Applicable Branch */}
            <div className="scheme-form-field full-width">
              <label>Scheme Name *</label>
              <input 
                type="text"
                className="scheme-form-input"
                placeholder="e.g. Buy 1 Bag Get 1 Free Promo or Purchase Above ₹5,000 Free Bag"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Branch / Depot Applicability */}
            <div className="scheme-form-field full-width">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} color="#2563eb" />
                <span>Applicable Branch / Depot *</span>
              </label>
              <select
                className="scheme-form-select"
                value={formData.branch_id}
                onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
              >
                <option value="">🌐 All Branches (Global - Active across all regional depots)</option>
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>
                    🏢 {b.branch_name} {b.district ? `(${b.district})` : ''}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Choose "All Branches" for company-wide promotions, or select a specific depot to restrict offer to that branch.
              </span>
            </div>

            {/* 1. Scheme Type Selection (Required) */}
            <div className="scheme-form-field full-width">
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                Scheme Type *
              </label>
              <div className="scheme-type-select-cards">
                <div 
                  className={`type-select-card ${formData.scheme_type === 'PRODUCT_BASED' ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, scheme_type: 'PRODUCT_BASED' }))}
                >
                  <strong>
                    <Package size={16} color="#2563eb" />
                    Option 1: Product-Based Scheme
                  </strong>
                  <span>Qualifies when a customer purchases a specified quantity of a particular product.</span>
                </div>

                <div 
                  className={`type-select-card ${formData.scheme_type === 'AMOUNT_BASED' ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, scheme_type: 'AMOUNT_BASED' }))}
                >
                  <strong>
                    <DollarSign size={16} color="#9333ea" />
                    Option 2: Total Amount-Based Scheme
                  </strong>
                  <span>Qualifies when a customer's eligible purchase amount reaches a configured minimum threshold.</span>
                </div>
              </div>
            </div>

            {/* 2. DYNAMIC FIELDS FOR OPTION 1: PRODUCT-BASED SCHEME */}
            {formData.scheme_type === 'PRODUCT_BASED' && (
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px', 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} color="#2563eb" />
                  <span>Product-Based Qualification Rules</span>
                </div>

                <div className="form-group-grid">
                  <div className="scheme-form-field full-width">
                    <label>Purchase Product *</label>
                    <select
                      className="scheme-form-input"
                      value={formData.trigger_product_id}
                      onChange={handlePurchaseProductChange}
                      required
                    >
                      <option value="">-- Select Product the Customer Must Buy --</option>
                      {products.map(p => (
                        <option key={p.product_id || p.id} value={p.product_id || p.id}>
                          {p.name} ({p.sku}) • Pack: {p.items_per_package || 1} {p.unit || 'Pcs'}/{p.package_type || 'Box'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="scheme-form-field">
                    <label>Purchase Quantity *</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="scheme-form-input"
                      placeholder="e.g. 1 or 10"
                      value={formData.trigger_min_qty}
                      onChange={e => setFormData({ ...formData, trigger_min_qty: e.target.value })}
                      required
                    />
                  </div>

                  <div className="scheme-form-field">
                    <label>Unit *</label>
                    <select
                      className="scheme-form-input"
                      value={formData.trigger_unit}
                      onChange={e => setFormData({ ...formData, trigger_unit: e.target.value })}
                    >
                      <option value="Bag">Bag</option>
                      <option value="Box">Box</option>
                      <option value="Carton">Carton</option>
                      <option value="Pieces">Pieces / Loose</option>
                      <option value="Pcs">Pcs</option>
                    </select>
                  </div>

                  {/* Units per Bag / Pack Size conversion */}
                  {(formData.trigger_unit === 'Bag' || formData.trigger_unit === 'Box' || formData.trigger_unit === 'Carton') && (
                    <div className="scheme-form-field full-width" style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>
                            Units per {formData.trigger_unit} (Pack-Size Conversion)
                          </label>
                          <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>
                            Conversion loaded from product configuration. 1 {formData.trigger_unit} = {formData.trigger_units_per_pkg} Pieces.
                          </span>
                        </div>
                        <input 
                          type="number"
                          min="1"
                          step="1"
                          style={{ width: '90px' }}
                          className="scheme-form-input"
                          value={formData.trigger_units_per_pkg}
                          onChange={e => setFormData({ ...formData, trigger_units_per_pkg: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {selectedTriggerProd && (
                  <div style={{ fontSize: '12px', color: '#059669', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
                    💡 Unit conversion rule: Customer qualifies if they purchase {formData.trigger_min_qty} {formData.trigger_unit} (or {(parseFloat(formData.trigger_min_qty || 1) * (parseInt(formData.trigger_units_per_pkg, 10) || 1))} individual pieces).
                  </div>
                )}
              </div>
            )}

            {/* 3. DYNAMIC FIELDS FOR OPTION 2: TOTAL AMOUNT-BASED SCHEME */}
            {formData.scheme_type === 'AMOUNT_BASED' && (
              <div style={{ 
                background: '#fdf4ff', 
                border: '1px solid #f5d0fe', 
                borderRadius: '12px', 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#86198f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={16} color="#a21caf" />
                  <span>Total Amount-Based Qualification Rules</span>
                </div>

                <div className="form-group-grid">
                  <div className="scheme-form-field">
                    <label>Minimum Purchase Amount (₹) *</label>
                    <input 
                      type="number"
                      step="50"
                      min="1"
                      className="scheme-form-input"
                      placeholder="e.g. 5000 or 10000"
                      value={formData.min_order_amount}
                      onChange={e => setFormData({ ...formData, min_order_amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="scheme-form-field">
                    <label>Eligible Products *</label>
                    <select
                      className="scheme-form-input"
                      value={formData.eligible_product_mode}
                      onChange={e => setFormData({ ...formData, eligible_product_mode: e.target.value })}
                    >
                      <option value="ALL_PRODUCTS">All Products (Entire Invoice Value)</option>
                      <option value="SELECTED_PRODUCTS">Selected Products Only</option>
                    </select>
                  </div>

                  {formData.eligible_product_mode === 'SELECTED_PRODUCTS' && (
                    <div className="scheme-form-field full-width" style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>
                        Check Qualifying Eligible Products ({formData.eligible_product_ids?.length || 0} selected):
                      </label>
                      <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {products.map(p => {
                          const pId = parseInt(p.product_id || p.id, 10);
                          const isChecked = (formData.eligible_product_ids || []).includes(pId);
                          return (
                            <label key={pId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleEligibleProduct(pId)}
                              />
                              <span>{p.name} ({p.sku})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. SHARED REWARD TYPE LOGIC */}
            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid #cbd5e1', 
              borderRadius: '12px', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gift size={16} color="#059669" />
                <span>Configured Scheme Reward *</span>
              </div>

              {/* Reward Type Toggle (Free Product vs Discount) */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reward_type: 'FREE_PRODUCT' })}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: formData.reward_type === 'FREE_PRODUCT' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: formData.reward_type === 'FREE_PRODUCT' ? '#ecfdf5' : '#ffffff',
                    color: formData.reward_type === 'FREE_PRODUCT' ? '#047857' : '#475569',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Gift size={15} />
                  <span>Free Product</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reward_type: 'DISCOUNT' })}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: formData.reward_type === 'DISCOUNT' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: formData.reward_type === 'DISCOUNT' ? '#ecfdf5' : '#ffffff',
                    color: formData.reward_type === 'DISCOUNT' ? '#047857' : '#475569',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Percent size={15} />
                  <span>Discount</span>
                </button>
              </div>

              {/* REWARD: FREE PRODUCT FIELDS */}
              {formData.reward_type === 'FREE_PRODUCT' && (
                <div className="form-group-grid">
                  <div className="scheme-form-field">
                    <label>Reward Product (Free Product) *</label>
                    <select
                      className="scheme-form-input"
                      value={formData.reward_product_id}
                      onChange={handleRewardProductChange}
                    >
                      <option value="">-- Generic Promo Gift / Non-Inventory --</option>
                      {products.map(p => (
                        <option key={p.product_id || p.id} value={p.product_id || p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="scheme-form-field">
                    <label>Reward Product Name / Description *</label>
                    <input 
                      type="text"
                      className="scheme-form-input"
                      placeholder="e.g. Free Bag, Product B, Promo Kit"
                      value={formData.reward_product_name}
                      onChange={e => setFormData({ ...formData, reward_product_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="scheme-form-field">
                    <label>Reward Quantity *</label>
                    <input 
                      type="number"
                      min="1"
                      step="1"
                      className="scheme-form-input"
                      placeholder="e.g. 1"
                      value={formData.reward_qty}
                      onChange={e => setFormData({ ...formData, reward_qty: e.target.value })}
                      required
                    />
                  </div>

                  <div className="scheme-form-field">
                    <label>Reward Unit *</label>
                    <select
                      className="scheme-form-input"
                      value={formData.reward_unit}
                      onChange={e => setFormData({ ...formData, reward_unit: e.target.value })}
                    >
                      <option value="Piece">Piece / Loose</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Bag">Bag</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>
                </div>
              )}

              {/* REWARD: DISCOUNT FIELDS */}
              {formData.reward_type === 'DISCOUNT' && (
                <div className="form-group-grid">
                  <div className="scheme-form-field">
                    <label>Discount Type *</label>
                    <select
                      className="scheme-form-input"
                      value={formData.discount_type}
                      onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div className="scheme-form-field">
                    <label>Discount Value *</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="scheme-form-input"
                        placeholder={formData.discount_type === 'PERCENTAGE' ? 'e.g. 5%' : 'e.g. 500'}
                        value={formData.discount_value}
                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                        required
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>
                        {formData.discount_type === 'PERCENTAGE' ? '%' : '₹'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Repeated Rewards Rule */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155' }}>
                <input 
                  type="checkbox"
                  checked={formData.allow_multiple_slabs}
                  onChange={e => setFormData({ ...formData, allow_multiple_slabs: e.target.checked })}
                />
                <span>Support repeated rewards for multiples of purchase (e.g., Buy 10 Get 1, Buy 20 Get 2)</span>
              </label>
            </div>

            {/* Scheme Description */}
            <div className="scheme-form-field full-width">
              <label>Description / Terms (Optional)</label>
              <textarea 
                className="scheme-form-textarea"
                placeholder="Details of promotional terms, retailer requirements, or scheme notes..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Start Date, End Date, Status */}
            <div className="form-group-grid">
              <div className="scheme-form-field">
                <label>Start Date *</label>
                <input 
                  type="date"
                  className="scheme-form-input"
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="scheme-form-field">
                <label>End Date</label>
                <input 
                  type="date"
                  className="scheme-form-input"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div className="scheme-form-field full-width">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Status: <strong>{formData.is_active ? 'Active' : 'Inactive'}</strong> (Immediately ready for sales evaluation)</span>
                </label>
              </div>
            </div>
          </div>

          {/* 5. Submit and Cancel Buttons */}
          <div className="scheme-modal-footer">
            <button 
              type="button" 
              onClick={onClose} 
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#475569'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="add-scheme-primary-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Scheme...' : (editScheme ? 'Update Scheme' : 'Submit Scheme')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
