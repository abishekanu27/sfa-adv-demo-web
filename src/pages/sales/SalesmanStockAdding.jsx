import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Package,
  Plus,
  Search,
  X,
  Trash2,
  Phone,
  Truck,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  DollarSign,
  CheckSquare,
  Edit
} from 'lucide-react';
import './SalesmanStockAdding.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const SalesmanStockAdding = () => {
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState({
    total_allocations: 0,
    total_units_loaded: 0,
    total_inventory_value: 0,
    bag_loads: 0,
    box_loads: 0,
    carton_loads: 0,
    loose_loads: 0
  });
  const [salesmen, setSalesmen] = useState([]);
  const [products, setProducts] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalesmanFilter, setSelectedSalesmanFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [editForm, setEditForm] = useState({
    package_qty: 1,
    items_per_package: 1,
    unit_cost: '',
    batch_no: '',
    status: 'Loaded',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    salesman_id: '',
    product_id: '',
    package_type: 'Carton',
    unit: 'Pcs',
    package_qty: 5,
    items_per_package: 20,
    unit_cost: '',
    batch_no: '',
    status: 'Loaded',
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSalesmanFilter !== 'all') params.append('salesman_id', selectedSalesmanFilter);

      const res = await fetch(`${API_BASE}/sales/stocks?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStocks(data.stocks || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error loading salesman stocks:', err);
      showNotification('Failed to load salesman stock allocations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [smRes, prodRes, mapRes] = await Promise.all([
        fetch(`${API_BASE}/sales/salesmen`),
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/sales/mappings`)
      ]);
      const smData = await smRes.json();
      const prodData = await prodRes.json();
      const mapData = await mapRes.json();

      const sms = smData.salesmen || smData.data || [];
      const prods = prodData.products || prodData.data || [];
      const maps = mapData.mappings || mapData.data || [];

      setSalesmen(sms);
      setProducts(prods);
      setMappings(maps);
      return { salesmen: sms, products: prods, mappings: maps };
    } catch (err) {
      console.warn('Notice loading stock dropdowns:', err);
      return { salesmen: [], products: [], mappings: [] };
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSalesmanFilter]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const handleOpenAddModal = async () => {
    // Re-fetch latest live stock before opening modal
    const refs = await loadReferenceData();
    const currentSms = refs.salesmen.length > 0 ? refs.salesmen : salesmen;
    const currentProds = refs.products.length > 0 ? refs.products : products;

    const defaultSm = currentSms[0]?.id || '';
    const defaultProd = currentProds[0];
    const autoBatch = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    setFormData({
      salesman_id: defaultSm,
      product_id: defaultProd?.product_id || defaultProd?.id || '',
      package_type: 'Carton',
      unit: defaultProd?.unit || 'Pcs',
      package_qty: 5,
      items_per_package: 20,
      unit_cost: defaultProd?.cost_price || defaultProd?.selling_price || '',
      batch_no: autoBatch,
      status: 'Loaded',
      notes: ''
    });
    setShowModal(true);
  };

  const handleProductSelect = (prodId) => {
    const selProd = products.find(p => String(p.product_id || p.id) === String(prodId));
    setFormData(prev => ({
      ...prev,
      product_id: prodId,
      unit: selProd?.unit || 'Pcs',
      unit_cost: selProd ? (selProd.cost_price || selProd.selling_price) : prev.unit_cost
    }));
  };

  // Find assigned vehicle for selected salesman
  const mappedVehicleInfo = mappings.find(m => String(m.salesman_id) === String(formData.salesman_id));

  const selectedProduct = products.find(p => String(p.product_id || p.id) === String(formData.product_id));
  const availableWarehouseStock = parseFloat(selectedProduct?.current_stock || 0);

  const calculatedTotalUnits = formData.package_type === 'Loose'
    ? parseFloat(formData.package_qty) || 0
    : (parseFloat(formData.package_qty) || 0) * (parseFloat(formData.items_per_package) || 1);

  const remainingWarehouseStock = availableWarehouseStock - calculatedTotalUnits;
  const isStockOverAllocated = calculatedTotalUnits > availableWarehouseStock;

  const calculatedTotalValue = calculatedTotalUnits * (parseFloat(formData.unit_cost) || 0);

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!formData.salesman_id) {
      showNotification('Please select a salesman', 'error');
      return;
    }
    if (!formData.product_id) {
      showNotification('Please select a product', 'error');
      return;
    }
    if (availableWarehouseStock <= 0) {
      showNotification('Selected product has 0 available units in warehouse!', 'error');
      return;
    }
    if (isStockOverAllocated) {
      showNotification(`Cannot allocate ${calculatedTotalUnits} units. Only ${availableWarehouseStock} units available in warehouse!`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/sales/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Stock added to salesman successfully!');
        setShowModal(false);
        await Promise.all([loadData(), loadReferenceData()]);
      } else {
        showNotification(data.message || 'Failed to add stock', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStock = (stock) => {
    if (stock.synced_with_mobile) {
      alert("Salesman synced with Mobile cannot be edited");
      return;
    }
    setEditingStock(stock);
    setEditForm({
      package_qty: stock.package_qty || 1,
      items_per_package: stock.items_per_package || 1,
      unit_cost: stock.unit_cost || '',
      batch_no: stock.batch_no || '',
      status: stock.status || 'Loaded',
      notes: stock.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEditStock = async (e) => {
    e.preventDefault();
    if (!editingStock) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/sales/stocks/${editingStock.allocation_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update stock');
      }
      showNotification(`Stock allocation #${editingStock.allocation_code} updated successfully`);
      setShowEditModal(false);
      setEditingStock(null);
      await Promise.all([loadData(), loadReferenceData()]);
    } catch (err) {
      if (err.message && err.message.includes('synced with Mobile')) {
        alert("Salesman synced with Mobile cannot be edited");
      } else {
        showNotification(err.message || 'Failed to update stock allocation', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStock = async (allocationId, code, stock) => {
    if (stock && stock.synced_with_mobile) {
      alert("Salesman synced with Mobile cannot be edited");
      return;
    }
    if (window.confirm(`Delete stock allocation entry ${code}? This will restore units to warehouse stock.`)) {
      try {
        const res = await fetch(`${API_BASE}/sales/stocks/${allocationId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showNotification(`Stock entry ${code} deleted and warehouse stock restored`);
          await Promise.all([loadData(), loadReferenceData()]);
        } else {
          if (data.message && data.message.includes('synced with Mobile')) {
            alert("Salesman synced with Mobile cannot be edited");
          } else {
            showNotification(data.message || 'Failed to delete stock entry', 'error');
          }
        }
      } catch (err) {
        showNotification('Failed to delete stock entry', 'error');
      }
    }
  };

  // Filter stocks by search
  const filteredStocks = stocks.filter((s) => {
    return (
      (s.salesman_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.product_sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.allocation_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.vehicle_reg_no || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="salesman-stock-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`sales-stock-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Sales</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Stock Adding</span>
          </nav>
          <h1 className="dashboard-main-title">Salesman Wise Stock Adding</h1>
          <p className="dashboard-sub-title">
            Allocate and load distribution inventory into salesman delivery vans. Quantity can be added by <strong>Bag</strong>, <strong>Box</strong>, <strong>Carton</strong>, or <strong>Loose</strong> units.
          </p>
        </div>

        <div className="header-actions">
          <button className="action-btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={15} />
            <span>Add Stock to Salesman / Vehicle</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="stock-metrics-grid">
        <div className="stock-metric-card">
          <div className="metric-icon-wrap blue">
            <Boxes size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Loaded Units</span>
            <span className="metric-val">{Number(summary.total_units_loaded || 0).toLocaleString('en-IN')} Units</span>
            <span className="metric-sub">{summary.total_allocations} van loading batches</span>
          </div>
        </div>

        <div className="stock-metric-card">
          <div className="metric-icon-wrap purple">
            <DollarSign size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Van Inventory Value</span>
            <span className="metric-val purple-text">
              ₹{Number(summary.total_inventory_value || 0).toLocaleString('en-IN')}
            </span>
            <span className="metric-sub">Total allocated stock valuation</span>
          </div>
        </div>

        <div className="stock-metric-card">
          <div className="metric-icon-wrap green">
            <Package size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Cartons & Boxes</span>
            <span className="metric-val green-text">
              {summary.carton_loads} Cartons • {summary.box_loads} Boxes
            </span>
            <span className="metric-sub">Packaged master case units</span>
          </div>
        </div>

        <div className="stock-metric-card">
          <div className="metric-icon-wrap amber">
            <Layers size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Bags & Loose Units</span>
            <span className="metric-val amber-text">
              {summary.bag_loads} Bags • {summary.loose_loads} Loose
            </span>
            <span className="metric-sub">Sack packaging & loose pieces</span>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="stock-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Salesman, Product, SKU, Batch #, Van Reg..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="salesman-filter-select-wrap">
          <label className="filter-tag-label">Filter by Salesman:</label>
          <select 
            value={selectedSalesmanFilter}
            onChange={(e) => setSelectedSalesmanFilter(e.target.value)}
            className="filter-salesman-select"
          >
            <option value="all">All Sales Executives</option>
            {salesmen.map((sm) => (
              <option key={sm.id} value={sm.id}>
                {sm.name} ({sm.phone || sm.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Table Card */}
      <div className="stock-table-card">
        <div className="table-responsive-wrapper">
          <table className="customers-data-table salesman-stock-table">
            <thead>
              <tr>
                <th style={{ width: '95px' }}>Load Code</th>
                <th style={{ minWidth: '180px' }}>Salesman & Van</th>
                <th style={{ minWidth: '180px' }}>Product Details</th>
                <th style={{ minWidth: '160px' }}>Packaging & Qty</th>
                <th style={{ width: '110px' }}>Total Units</th>
                <th style={{ width: '130px' }}>Valuation</th>
                <th style={{ width: '110px' }}>Batch No</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="empty-table-cell">
                    Loading allocated van stocks...
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-table-cell">
                    <div className="empty-state-box">
                      <Boxes size={38} className="empty-icon" />
                      <h4>No Stock Allocations Found</h4>
                      <p>No inventory loaded for the selected filter. Click "+ Add Stock to Salesman / Vehicle" to allocate products.</p>
                      <button className="action-btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '12px' }}>
                        <Plus size={14} />
                        <span>Add First Stock Load</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStocks.map((s) => {
                  const totalVal = parseFloat(s.total_value || 0);

                  return (
                    <tr key={s.allocation_id}>
                      <td className="code-cell">
                        <span className="load-code-badge">{s.allocation_code}</span>
                      </td>

                      <td className="salesman-van-cell">
                        <div className="salesman-van-cell-inner">
                          <div className="sm-name-line">
                            <User size={12} className="text-blue-600" />
                            <strong>{s.salesman_name}</strong>
                          </div>
                          {s.vehicle_reg_no ? (
                            <span className="van-reg-tag">
                              <Truck size={10} /> {s.vehicle_reg_no}
                            </span>
                          ) : (
                            <small className="text-muted">No Vehicle Assigned</small>
                          )}
                        </div>
                      </td>

                      <td className="product-cell">
                        <div className="product-cell-inner">
                          <strong>{s.product_name}</strong>
                          {s.product_sku && (
                            <span className="sku-badge">{s.product_sku}</span>
                          )}
                        </div>
                      </td>

                      <td className="packaging-cell">
                        <div className="packaging-cell-inner">
                          <span className={`pkg-badge ${s.package_type?.toLowerCase() || 'loose'}`}>
                            {s.package_type === 'Loose'
                              ? `${s.total_qty} Loose Units`
                              : `${s.package_qty} ${s.package_type}s`}
                          </span>
                          {s.package_type !== 'Loose' && (
                            <small className="items-per-sub">
                              {s.items_per_package} units per {s.package_type}
                            </small>
                          )}
                        </div>
                      </td>

                      <td className="units-cell">
                        <div className="units-cell-inner">
                          <span className="total-unit-bold">{Number(s.total_qty || 0).toLocaleString('en-IN')}</span>
                          <small className="unit-label">{s.unit || 'Units'}</small>
                        </div>
                      </td>

                      <td className="value-cell">
                        <div className="value-cell-inner">
                          <span className="total-val-text">₹{Number(totalVal).toLocaleString('en-IN')}</span>
                          <small className="cost-rate">@ ₹{Number(s.unit_cost || 0).toLocaleString('en-IN')}</small>
                        </div>
                      </td>

                      <td className="batch-cell">
                        <div className="batch-cell-inner">
                          <span className="batch-badge">{s.batch_no || '—'}</span>
                          <small className="date-sub">
                            {s.allocation_date ? new Date(s.allocation_date).toLocaleDateString('en-GB') : '—'}
                          </small>
                        </div>
                      </td>

                      <td className="status-cell text-center">
                        <span className={`status-pill ${s.status === 'Loaded' ? 'in-stock' : 'low-stock'}`}>
                          {s.status || 'Loaded'}
                        </span>
                      </td>

                      <td className="actions-cell text-center">
                        <div className="customer-actions-inner">
                          <button
                            type="button"
                            className="table-icon-action edit"
                            title={s.synced_with_mobile ? "Synced with Mobile - Locked" : "Edit Stock Allocation"}
                            onClick={() => handleEditStock(s)}
                            style={s.synced_with_mobile ? { background: '#f8fafc' } : {}}
                          >
                            <Edit size={13} color={s.synced_with_mobile ? "#94a3b8" : "#2563eb"} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-action delete"
                            title={s.synced_with_mobile ? "Synced with Mobile - Locked" : "Remove Stock Allocation"}
                            onClick={() => handleDeleteStock(s.allocation_id, s.allocation_code, s)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Stock to Salesman / Vehicle */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-dialog stock-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Allocate Stock to Salesman / Vehicle</h3>
                <span className="modal-sub-tag">Load products by Bag, Box, Carton, or Loose pieces</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="modal-form">
              <div className="modal-scrollable-body">
                {/* 1. Salesman Selection */}
                <div className="form-group">
                  <label>Select Sales Executive *</label>
                  <select
                    className="modal-select"
                    value={formData.salesman_id}
                    onChange={(e) => setFormData({ ...formData, salesman_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Salesman --</option>
                    {salesmen.map((sm) => (
                      <option key={sm.id} value={sm.id}>
                        {sm.name} ({sm.phone || sm.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-detected Vehicle info */}
                {mappedVehicleInfo && (
                  <div className="auto-vehicle-strip">
                    <Truck size={15} className="text-blue-600" />
                    <span>
                      Mapped Vehicle: <strong>{mappedVehicleInfo.vehicle_reg_no}</strong> ({mappedVehicleInfo.vehicle_model || 'Van'}) • Route: {mappedVehicleInfo.district}
                    </span>
                  </div>
                )}

                {/* 2. Product Selection with Live Warehouse Availability */}
                <div className="form-group">
                  <label>Select Product to Allocate *</label>
                  <select
                    className="modal-select"
                    value={formData.product_id}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Product to Allocate --</option>
                    {products.map((p) => {
                      const curStock = parseFloat(p.current_stock || 0);
                      return (
                        <option key={p.product_id || p.id} value={p.product_id || p.id}>
                          {p.name} [{p.sku}] — {curStock > 0 ? `Available: ${Number(curStock).toLocaleString('en-IN')} ${p.unit || 'Units'}` : 'Out of Stock (0)'} — Valuation: ₹{Number(p.cost_price || p.selling_price || 0).toLocaleString('en-IN')}
                        </option>
                      );
                    })}
                  </select>

                  {/* Live Available Stock Card */}
                  {selectedProduct && (
                    <div className="live-warehouse-stock-card">
                      <div className="lws-header-row">
                        <div className="lws-product-meta">
                          <Boxes size={18} style={{ color: '#2563eb' }} />
                          <div className="lws-title-wrap">
                            <div className="lws-title-line">
                              <strong>{selectedProduct.name}</strong>
                              <span className="lws-sku-tag">{selectedProduct.sku}</span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>({selectedProduct.category_name || 'General'})</span>
                            </div>
                            <small style={{ color: '#64748b' }}>
                              Unit Cost Valuation: ₹{Number(selectedProduct.cost_price || selectedProduct.selling_price || 0).toLocaleString('en-IN')} / {selectedProduct.unit || 'Unit'}
                            </small>
                          </div>
                        </div>

                        <div className="lws-badge-col">
                          <span className="lws-label">Warehouse Live Qty:</span>
                          <span className={`lws-stock-pill ${availableWarehouseStock > 10 ? 'in-stock' : availableWarehouseStock > 0 ? 'low-stock' : 'out-of-stock'}`}>
                            {availableWarehouseStock > 0 ? `${Number(availableWarehouseStock).toLocaleString('en-IN')} ${selectedProduct.unit || 'Units'} Available` : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Packaging Unit Selector (Bag, Box, Carton, Loose) */}
                <div className="packaging-unit-selector-box">
                  <label className="section-label">Packaging Type * (Choose Bag, Box, Carton, or Loose)</label>
                  <div className="pkg-radio-group">
                    {['Bag', 'Box', 'Carton', 'Loose'].map((pkg) => (
                      <label 
                        key={pkg}
                        className={`pkg-radio-pill ${formData.package_type === pkg ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="package_type"
                          value={pkg}
                          checked={formData.package_type === pkg}
                          onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                        />
                        <span>{pkg}</span>
                      </label>
                    ))}
                  </div>

                  <div className="form-row-2" style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label>
                        {formData.package_type === 'Loose' ? `Loose Quantity (${formData.unit || selectedProduct?.unit || 'Units'}) *` : `Number of ${formData.package_type}s *`}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={formData.package_qty}
                        onChange={(e) => setFormData({ ...formData, package_qty: e.target.value })}
                        placeholder="e.g. 5"
                      />
                    </div>

                    {formData.package_type !== 'Loose' && (
                      <div className="form-group">
                        <label>Capacity / Items per {formData.package_type} ({formData.unit || selectedProduct?.unit || 'Units'}) *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={formData.items_per_package}
                          onChange={(e) => setFormData({ ...formData, items_per_package: e.target.value })}
                          placeholder="e.g. 24"
                        />
                      </div>
                    )}
                  </div>

                  {/* Live Total Qty Availability & Balance Banner */}
                  <div className={`live-allocation-calc-banner ${isStockOverAllocated ? 'stock-alert' : 'stock-ok'}`}>
                    <div className="lws-calc-grid">
                      <div className="lws-calc-col">
                        <span className="lws-calc-lbl">Warehouse Available</span>
                        <strong className="lws-calc-val">{Number(availableWarehouseStock).toLocaleString('en-IN')} {selectedProduct?.unit || 'Units'}</strong>
                      </div>
                      <div className="lws-divider">-</div>
                      <div className="lws-calc-col">
                        <span className="lws-calc-lbl">Van Allocation Load</span>
                        <strong className="lws-calc-val text-blue">{calculatedTotalUnits} {selectedProduct?.unit || 'Units'}</strong>
                      </div>
                      <div className="lws-divider">=</div>
                      <div className="lws-calc-col">
                        <span className="lws-calc-lbl">Projected Warehouse Balance</span>
                        <strong className={`lws-calc-val ${remainingWarehouseStock < 0 ? 'text-red' : 'text-green'}`}>
                          {Number(remainingWarehouseStock).toLocaleString('en-IN')} {selectedProduct?.unit || 'Units'}
                        </strong>
                      </div>
                    </div>

                    {isStockOverAllocated && (
                      <div className="lws-warning-box">
                        <AlertCircle size={14} />
                        <span>
                          Allocation load ({calculatedTotalUnits} {selectedProduct?.unit || 'units'}) exceeds available warehouse stock ({availableWarehouseStock} {selectedProduct?.unit || 'units'})! Please reduce quantity.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Valuation & Batch */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Unit Valuation / Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                      placeholder="e.g. 1450"
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Allocated Value (₹)</label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${Number(calculatedTotalValue).toLocaleString('en-IN')}`}
                      style={{ background: '#f8fafc', fontWeight: '700', color: '#0f172a' }}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Batch Number</label>
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-A1"
                      value={formData.batch_no}
                      onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Allocation Status</label>
                    <select
                      className="modal-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Loaded">Loaded (Ready for Dispatch)</option>
                      <option value="In Transit">In Transit on Beat</option>
                      <option value="Sold">Sold / Reconciled</option>
                    </select>
                  </div>
                </div>

                {/* 5. Notes */}
                <div className="form-group">
                  <label>Loading Remarks / Van Voucher Notes</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Morning dispatch for Broadway wholesale route..."
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="action-btn btn-primary" 
                  disabled={isSubmitting || isStockOverAllocated || availableWarehouseStock <= 0 || !formData.salesman_id || !formData.product_id}
                >
                  <CheckSquare size={14} />
                  <span>{isSubmitting ? 'Allocating...' : isStockOverAllocated ? 'Insufficient Stock' : 'Confirm Van Stock Load'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Stock Allocation */}
      {showEditModal && editingStock && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog stock-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit size={18} style={{ color: '#2563eb' }} />
                  <h3>Edit Van Stock Allocation</h3>
                </div>
                <div className="modal-subtitle-strip">
                  <span className="load-code-badge">{editingStock.allocation_code}</span>
                  <span className="sm-name-sub">
                    <User size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                    {editingStock.salesman_name}
                  </span>
                  {editingStock.vehicle_reg_no && (
                    <span className="van-reg-tag">
                      <Truck size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                      {editingStock.vehicle_reg_no}
                    </span>
                  )}
                </div>
              </div>
              <button className="modal-close-btn" type="button" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditStock} className="modal-form">
              <div className="modal-scrollable-body">
                {/* Product Summary Card */}
                <div className="edit-product-summary-card">
                  <div className="eps-icon-wrap">
                    <Package size={20} color="#2563eb" />
                  </div>
                  <div className="eps-details">
                    <div className="eps-name-row">
                      <strong className="eps-product-name">{editingStock.product_name}</strong>
                      {editingStock.product_sku && <span className="lws-sku-tag">{editingStock.product_sku}</span>}
                    </div>
                    <span className="eps-category-text">
                      Category: {editingStock.category_name || 'General'} • Packaging: {editingStock.package_type || 'Carton'}
                    </span>
                  </div>
                </div>

                {/* 2-Column Inputs */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Package Quantity ({editingStock.package_type || 'Packages'}) *</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={editForm.package_qty}
                      onChange={(e) => setEditForm({ ...editForm, package_qty: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Units per Package (Capacity) *</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={editForm.items_per_package}
                      onChange={(e) => setEditForm({ ...editForm, items_per_package: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Live Calculated Units & Valuation Banner */}
                <div className="edit-calc-preview-banner">
                  <div className="ecp-item">
                    <span className="ecp-label">Calculated Live Units</span>
                    <strong className="ecp-val text-blue">
                      {((parseFloat(editForm.package_qty) || 0) * (parseFloat(editForm.items_per_package) || 1)).toLocaleString('en-IN')} {editingStock.unit || 'Units'}
                    </strong>
                    <small className="ecp-sub">
                      ({editForm.package_qty || 0} {editingStock.package_type || 'pkgs'} × {editForm.items_per_package || 1}/pkg)
                    </small>
                  </div>
                  <div className="ecp-divider">|</div>
                  <div className="ecp-item">
                    <span className="ecp-label">Calculated Total Valuation</span>
                    <strong className="ecp-val text-green">
                      ₹{(((parseFloat(editForm.package_qty) || 0) * (parseFloat(editForm.items_per_package) || 1)) * (parseFloat(editForm.unit_cost) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                    <small className="ecp-sub">
                      (@ ₹{parseFloat(editForm.unit_cost || 0).toFixed(2)}/unit)
                    </small>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Unit Valuation Rate (₹ / unit) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.unit_cost}
                      onChange={(e) => setEditForm({ ...editForm, unit_cost: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Batch / Lot #</label>
                    <input
                      type="text"
                      value={editForm.batch_no}
                      onChange={(e) => setEditForm({ ...editForm, batch_no: e.target.value })}
                      placeholder="e.g. BATCH-2026-001"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="Loaded">Loaded (Ready for Dispatch)</option>
                    <option value="In Transit">In Transit on Beat</option>
                    <option value="Sold">Sold / Reconciled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes / Storage Instructions</label>
                  <textarea
                    rows="2"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="e.g. Morning dispatch to beat route..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn btn-outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn btn-primary" disabled={isSubmitting}>
                  <CheckSquare size={15} />
                  <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
