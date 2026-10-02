import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign
} from 'lucide-react';
import { 
  fetchVendorsApi, 
  fetchVendorMetricsApi, 
  createVendorApi, 
  updateVendorApi, 
  deleteVendorApi,
  fetchCategoriesApi,
  createCategoryApi
} from '../../services/api';
import './VendorDetails.css';

export const VendorDetails = () => {
  const [vendors, setVendors] = useState([]);
  const [metrics, setMetrics] = useState({
    total_vendors: 0,
    total_inward_procurement: 0,
    outstanding_payables: 0,
    active_advance_balance: 0
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [toast, setToast] = useState(null);

  // Vendor Form
  const [vendorForm, setVendorForm] = useState({
    supplier_company: '',
    category_id: '',
    category_name: '',
    contact_person: '',
    phone: '',
    email: '',
    place: '',
    gst_in: '',
    total_purchase: '',
    advance_paid: '',
    outstanding: '',
    status: 'Active'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vList, vMetrics, cats] = await Promise.all([
        fetchVendorsApi(searchQuery, selectedCategory),
        fetchVendorMetricsApi(),
        fetchCategoriesApi()
      ]);
      setVendors(vList);
      setMetrics(vMetrics);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCategory]);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setVendorForm({
      supplier_company: '',
      category_id: categories[0]?.category_id || categories[0]?.id || '',
      category_name: categories[0]?.name || '',
      contact_person: '',
      phone: '',
      email: '',
      place: '',
      gst_in: '',
      total_purchase: '',
      advance_paid: '',
      outstanding: '',
      status: 'Active'
    });
    setShowVendorModal(true);
  };

  const handleOpenEditModal = (vendor, e) => {
    if (e) e.stopPropagation();
    setEditingVendor(vendor);
    setVendorForm({
      supplier_company: vendor.supplier_company || '',
      category_id: vendor.category_id || '',
      category_name: vendor.category_name || '',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      place: vendor.place || '',
      gst_in: vendor.gst_in || '',
      total_purchase: vendor.total_purchase || '',
      advance_paid: vendor.advance_paid || '',
      outstanding: vendor.outstanding || '',
      status: vendor.status || 'Active'
    });
    setShowVendorModal(true);
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    if (!vendorForm.supplier_company.trim()) {
      showNotification('Supplier company name is required', 'error');
      return;
    }

    try {
      if (editingVendor) {
        await updateVendorApi(editingVendor.vendor_id || editingVendor.id, vendorForm);
        showNotification(`Vendor "${vendorForm.supplier_company}" updated successfully!`);
      } else {
        await createVendorApi(vendorForm);
        showNotification(`Vendor "${vendorForm.supplier_company}" created successfully!`);
      }
      setShowVendorModal(false);
      setEditingVendor(null);
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to save vendor', 'error');
    }
  };

  const handleDeleteVendor = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await deleteVendorApi(id);
        showNotification('Vendor deleted successfully');
        await loadData();
      } catch (err) {
        showNotification(err.message || 'Failed to delete vendor', 'error');
      }
    }
  };

  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const newCat = await createCategoryApi({ name: newCatName.trim() });
      showNotification(`Category "${newCat.name}" created!`);
      setNewCatName('');
      setShowCategoryModal(false);
      const updatedCats = await fetchCategoriesApi();
      setCategories(updatedCats);
      setVendorForm(prev => ({
        ...prev,
        category_id: newCat.category_id || newCat.id,
        category_name: newCat.name
      }));
    } catch (err) {
      showNotification(err.message || 'Failed to add category', 'error');
    }
  };

  return (
    <div className="vendor-details-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`vendor-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Products &amp; Stock</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Vendor Details</span>
          </nav>
          <h1 className="dashboard-main-title">
            Vendor Directory & Procurement Ledger
          </h1>
          <p className="dashboard-sub-title">
            Supplier directory, category mappings, GST verification, total procurement purchases, and outstanding payables.
          </p>
        </div>

        <div className="page-header-actions">
          <button 
            className="action-btn btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={15} />
            <span>Add New Vendor</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Row */}
      <div className="vendor-metrics-grid">
        <div className="vendor-metric-card">
          <div className="metric-icon-wrap blue">
            <Users size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Vendors</span>
            <span className="metric-val">{metrics.total_vendors} Suppliers</span>
            <span className="metric-sub">Active procurement partners</span>
          </div>
        </div>

        <div className="vendor-metric-card">
          <div className="metric-icon-wrap green">
            <DollarSign size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Inward Procurement</span>
            <span className="metric-val">₹{Number(metrics.total_inward_procurement || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">Cumulative purchase invoices</span>
          </div>
        </div>

        <div className="vendor-metric-card">
          <div className="metric-icon-wrap red">
            <FileText size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Outstanding Payables</span>
            <span className="metric-val red-text">₹{Number(metrics.outstanding_payables || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">Pending supplier dues</span>
          </div>
        </div>

        <div className="vendor-metric-card">
          <div className="metric-icon-wrap amber">
            <Building2 size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Active Advance Balance</span>
            <span className="metric-val amber-text">₹{Number(metrics.active_advance_balance || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">Prepaid supplier deposits</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="vendor-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Code, Company, Place, Contact, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="category-pill-strip">
          <span className="filter-tag-label">Category:</span>
          <button 
            className={`pill-btn ${selectedCategory === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.category_id || c.id}
              className={`pill-btn ${selectedCategory === c.name ? 'active' : ''}`}
              onClick={() => setSelectedCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Data Table */}
      <div className="vendor-table-card">
        <div className="table-responsive-wrapper">
          <table className="vendors-data-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Code</th>
                <th>Supplier Company</th>
                <th>Category</th>
                <th>Contact Details</th>
                <th>Place</th>
                <th>GST IN</th>
                <th>Total Purchase</th>
                <th>Advance Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th style={{ minWidth: '95px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="empty-table-cell">
                    Loading vendors from database...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-table-cell">
                    <div className="empty-state-box">
                      <Building2 size={36} className="empty-icon" />
                      <h4>No Vendors Found</h4>
                      <p>No supplier records found matching your filter. Click "+ Add New Vendor" to register your first supplier.</p>
                      <button className="action-btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '10px' }}>
                        <Plus size={14} />
                        <span>Add First Vendor</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const outBal = parseFloat(v.outstanding || 0);
                  return (
                    <tr key={v.vendor_id || v.id}>
                      <td>
                        <span className="vendor-code-badge">{v.code || `#${v.vendor_id || v.id}`}</span>
                      </td>
                      <td className="company-cell">
                        <strong>{v.supplier_company}</strong>
                        {v.contact_person && (
                          <small className="contact-person-sub">Contact: {v.contact_person}</small>
                        )}
                      </td>
                      <td>
                        <span className="category-tag-badge">
                          {v.category_name || 'General'}
                          {v.category_id && <span className="cat-id-sub"> (#{v.category_id})</span>}
                        </span>
                      </td>
                      <td className="contact-info-cell">
                        {v.phone && (
                          <div className="contact-line">
                            <Phone size={12} />
                            <span>{v.phone}</span>
                          </div>
                        )}
                        {v.email && (
                          <div className="contact-line">
                            <Mail size={12} />
                            <span>{v.email}</span>
                          </div>
                        )}
                        {!v.phone && !v.email && <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {v.place ? (
                          <div className="place-line">
                            <MapPin size={12} />
                            <span>{v.place}</span>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {v.gst_in ? (
                          <span className="gst-badge">{v.gst_in}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="amount-cell">
                        ₹{Number(v.total_purchase || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="amount-cell advance">
                        ₹{Number(v.advance_paid || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="amount-cell">
                        <span className={`outstanding-tag ${outBal > 0 ? 'due' : 'settled'}`}>
                          ₹{Number(outBal).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${v.status === 'Active' ? 'in-stock' : 'out-stock'}`}>
                          {v.status || 'Active'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="table-icon-action edit"
                          title="Edit Vendor"
                          onClick={(e) => handleOpenEditModal(v, e)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          className="table-icon-action delete"
                          title="Delete Vendor"
                          onClick={(e) => handleDeleteVendor(v.vendor_id || v.id, e)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Vendor Details */}
      {showVendorModal && (
        <div className="modal-backdrop" onClick={() => setShowVendorModal(false)}>
          <div className="modal-dialog vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>{editingVendor ? `Edit Vendor: ${editingVendor.supplier_company}` : 'Add New Vendor Details'}</h3>
                {editingVendor && (
                  <span className="vendor-code-badge">
                    {editingVendor.code || `#${editingVendor.vendor_id || editingVendor.id}`}
                  </span>
                )}
              </div>
              <button className="modal-close-btn" onClick={() => setShowVendorModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="modal-form">
              <div className="modal-scrollable-body">
                {/* Supplier Company */}
                <div className="form-group">
                  <label>Supplier Company Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Apex Electrical Supplies Pvt Ltd"
                    value={vendorForm.supplier_company}
                    onChange={(e) => setVendorForm({ ...vendorForm, supplier_company: e.target.value })}
                  />
                </div>

                {/* Category Mapping */}
                <div className="form-group">
                  <div className="label-with-link-row">
                    <label>Category Mapping (Product / Procurement Category) *</label>
                    <button 
                      type="button" 
                      className="inline-link-btn"
                      onClick={() => setShowCategoryModal(true)}
                    >
                      + New Category
                    </button>
                  </div>
                  <select 
                    value={vendorForm.category_name}
                    required
                    onChange={(e) => {
                      const selName = e.target.value;
                      const selCat = categories.find(c => c.name === selName);
                      setVendorForm({
                        ...vendorForm,
                        category_name: selName,
                        category_id: selCat ? (selCat.category_id || selCat.id) : ''
                      });
                    }}
                  >
                    {categories.length === 0 ? (
                      <option value="">No Categories Found in SQL (+ Add Category)</option>
                    ) : (
                      <>
                        <option value="">-- Select Category to Map --</option>
                        {categories.map((c) => (
                          <option key={c.category_id || c.id} value={c.name}>
                            {c.name} (Category ID: #{c.category_id || c.id})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {vendorForm.category_id && (
                    <small className="form-hint-text">
                      Mapped to: <strong>{vendorForm.category_name}</strong> (Category ID: #{vendorForm.category_id})
                    </small>
                  )}
                </div>

                {/* Contact Person & Phone */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input 
                      type="text"
                      placeholder="e.g. Suresh Kumar"
                      value={vendorForm.contact_person}
                      onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input 
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email & Place */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email"
                      placeholder="e.g. orders@supplier.com"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Place / City</label>
                    <input 
                      type="text"
                      placeholder="e.g. Mumbai, Maharashtra"
                      value={vendorForm.place}
                      onChange={(e) => setVendorForm({ ...vendorForm, place: e.target.value })}
                    />
                  </div>
                </div>

                {/* GST IN & Status */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>GST IN</label>
                    <input 
                      type="text"
                      placeholder="e.g. 27AABCU9603R1ZM"
                      value={vendorForm.gst_in}
                      onChange={(e) => setVendorForm({ ...vendorForm, gst_in: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Vendor Status</label>
                    <select 
                      value={vendorForm.status}
                      onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Ledger: Total Purchase, Advance Paid, Outstanding */}
                <div className="ledger-section-box">
                  <h4 className="ledger-section-title">Procurement & Financial Ledger</h4>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label>Total Purchase (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={vendorForm.total_purchase}
                        onChange={(e) => {
                          const tot = e.target.value;
                          const adv = vendorForm.advance_paid || 0;
                          setVendorForm({
                            ...vendorForm,
                            total_purchase: tot,
                            outstanding: tot !== '' ? Math.max(0, parseFloat(tot) - parseFloat(adv || 0)) : ''
                          });
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Advance Paid (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={vendorForm.advance_paid}
                        onChange={(e) => {
                          const adv = e.target.value;
                          const tot = vendorForm.total_purchase || 0;
                          setVendorForm({
                            ...vendorForm,
                            advance_paid: adv,
                            outstanding: tot !== '' ? Math.max(0, parseFloat(tot || 0) - parseFloat(adv || 0)) : ''
                          });
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Outstanding (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={vendorForm.outstanding}
                        onChange={(e) => setVendorForm({ ...vendorForm, outstanding: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowVendorModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                >
                  {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Category Modal */}
      {showCategoryModal && (
        <div className="modal-backdrop" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-dialog category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Category</h3>
              <button className="modal-close-btn" onClick={() => setShowCategoryModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCategory} className="modal-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="e.g. Raw Material, Packaging, Spices"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
