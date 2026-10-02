import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Plus,
  X,
  Package,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Phone,
  MapPin,
  Tag,
  Truck,
  User,
  CheckSquare,
  Eye,
  Edit2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import './AdvancedBooking.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AdvancedBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [metrics, setMetrics] = useState({
    total_bookings: 0,
    confirmed_count: 0,
    pending_count: 0,
    dispatched_count: 0,
    delivered_count: 0,
    total_booking_value: 0,
    total_advance_collected: 0,
    total_balance_pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Accordion Expand State for Booking Items
  const [expandedBookingIds, setExpandedBookingIds] = useState(new Set());

  // Add Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: 'Confirmed',
    advance_amount: '0',
    expected_delivery_date: '',
    notes: '',
    priority: 'Normal'
  });

  // Dropdown reference lists
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    package_type: 'Carton',
    package_qty: 1,
    items_per_package: 20,
    unit_price: '',
    advance_amount: '',
    expected_delivery_date: '',
    salesman_id: '',
    priority: 'Normal',
    status: 'Confirmed',
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Bookings & Dropdowns
  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/sales/advance-bookings?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error loading advance bookings:', err);
      showNotification('Failed to load advance bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [custRes, prodRes, smRes] = await Promise.all([
        fetch(`${API_BASE}/customers`),
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/sales/salesmen`)
      ]);
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const smData = await smRes.json();

      const custs = custData.customers || custData.data || [];
      const prods = prodData.products || prodData.data || [];
      const sms = smData.salesmen || smData.data || [];

      setCustomersList(custs);
      setProductsList(prods);
      setSalesmenList(sms);
      return { customers: custs, products: prods, salesmen: sms };
    } catch (err) {
      console.warn('Notice loading reference dropdowns:', err);
      return { customers: [], products: [], salesmen: [] };
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const handleOpenAddModal = async () => {
    const today = new Date();
    const targetDate = new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0];
    
    // Refresh latest live stock
    const refs = await loadReferenceData();
    const currentCusts = refs.customers.length > 0 ? refs.customers : customersList;
    const currentProds = refs.products.length > 0 ? refs.products : productsList;
    const currentSms = refs.salesmen.length > 0 ? refs.salesmen : salesmenList;

    const firstProd = currentProds[0];

    setFormData({
      customer_id: currentCusts[0]?.customer_id || currentCusts[0]?.id || '',
      product_id: firstProd?.product_id || firstProd?.id || '',
      package_type: 'Carton',
      package_qty: 1,
      items_per_package: 20,
      unit_price: firstProd?.selling_price || '',
      advance_amount: '',
      expected_delivery_date: targetDate,
      salesman_id: currentSms[0]?.id || '',
      priority: 'Normal',
      status: 'Confirmed',
      notes: ''
    });
    setShowModal(true);
  };

  const handleCustomerChange = (custId) => {
    setFormData(prev => ({
      ...prev,
      customer_id: custId
    }));
  };

  const handleProductChange = (prodId) => {
    const selectedProd = productsList.find(p => String(p.product_id || p.id) === String(prodId));
    setFormData(prev => ({
      ...prev,
      product_id: prodId,
      unit_price: selectedProd ? selectedProd.selling_price : prev.unit_price
    }));
  };

  const selectedCustomer = customersList.find(c => String(c.customer_id || c.id) === String(formData.customer_id));
  const selectedProduct = productsList.find(p => String(p.product_id || p.id) === String(formData.product_id));
  const availableStock = parseFloat(selectedProduct?.current_stock || 0);

  const calculatedTotalQty = formData.package_type === 'Loose'
    ? parseFloat(formData.package_qty) || 0
    : (parseFloat(formData.package_qty) || 0) * (parseFloat(formData.items_per_package) || 1);

  const remainingStock = availableStock - calculatedTotalQty;
  const isStockExceeded = calculatedTotalQty > availableStock;

  const calculatedTotalAmount = calculatedTotalQty * (parseFloat(formData.unit_price) || 0);
  const calculatedBalance = Math.max(0, calculatedTotalAmount - (parseFloat(formData.advance_amount) || 0));

  const handleSaveBooking = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      showNotification('Please select a customer', 'error');
      return;
    }
    if (!formData.product_id) {
      showNotification('Please select a product', 'error');
      return;
    }
    if (availableStock <= 0) {
      showNotification('Selected product is Out of Stock!', 'error');
      return;
    }
    if (isStockExceeded) {
      showNotification(`Booked quantity (${calculatedTotalQty} units) exceeds available stock (${availableStock} units)!`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/sales/advance-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Advance booking created!');
        setShowModal(false);
        await Promise.all([loadData(), loadReferenceData()]);
      } else {
        showNotification(data.message || 'Failed to save booking', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Failed to connect to server', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/sales/advance-bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || `Booking marked as ${newStatus}`);
        await Promise.all([loadData(), loadReferenceData()]);
      } else {
        showNotification(data.message || 'Failed to update booking status', 'error');
      }
    } catch (err) {
      showNotification('Failed to update booking status', 'error');
    }
  };

  const toggleExpand = (bookingId) => {
    setExpandedBookingIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  };

  const handleOpenEditModal = (b) => {
    setEditBooking(b);
    setEditFormData({
      status: b.status || 'Confirmed',
      advance_amount: b.advance_amount !== null && b.advance_amount !== undefined ? String(b.advance_amount) : '0',
      expected_delivery_date: b.expected_delivery_date ? b.expected_delivery_date.split('T')[0] : '',
      notes: b.notes || '',
      priority: b.priority || 'Normal'
    });
    setShowEditModal(true);
  };

  const handleSaveEditBooking = async (e) => {
    e.preventDefault();
    if (!editBooking) return;
    try {
      setIsSubmittingEdit(true);
      const res = await fetch(`${API_BASE}/sales/advance-bookings/${editBooking.booking_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editFormData.status,
          advance_amount: parseFloat(editFormData.advance_amount) || 0,
          expected_delivery_date: editFormData.expected_delivery_date || null,
          notes: editFormData.notes,
          priority: editFormData.priority
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || `Booking #${editBooking.booking_code} updated successfully`);
        setShowEditModal(false);
        setEditBooking(null);
        await Promise.all([loadData(), loadReferenceData()]);
      } else {
        showNotification(data.message || 'Failed to update booking', 'error');
      }
    } catch (err) {
      showNotification('Failed to update booking', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteBooking = async (bookingId, bookingCode) => {
    if (window.confirm(`Are you sure you want to cancel / delete Booking #${bookingCode}? This will restore the reserved stock.`)) {
      try {
        const res = await fetch(`${API_BASE}/sales/advance-bookings/${bookingId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showNotification(`Booking #${bookingCode} removed and stock restored`);
          await Promise.all([loadData(), loadReferenceData()]);
        }
      } catch (err) {
        showNotification('Failed to delete booking', 'error');
      }
    }
  };

  return (
    <div className="advanced-booking-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`adv-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Customers</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Advanced Booking</span>
          </nav>
          <h1 className="dashboard-main-title">Customer Advanced Bookings</h1>
          <p className="dashboard-sub-title">
            Product reservations, advance payments, packaging units (Bag, Box, Carton, Loose), and scheduled distribution fulfillment.
          </p>
        </div>

        <div className="header-actions">
          <button className="action-btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={15} />
            <span>Add New Booking</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="booking-metrics-grid">
        <div className="booking-metric-card">
          <div className="metric-icon-wrap blue">
            <CalendarCheck size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Bookings</span>
            <span className="metric-val">{metrics.total_bookings} Bookings</span>
            <span className="metric-sub">{metrics.confirmed_count} Confirmed • {metrics.pending_count} Pending</span>
          </div>
        </div>

        <div className="booking-metric-card">
          <div className="metric-icon-wrap green">
            <Truck size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Fulfillment Status</span>
            <span className="metric-val">{metrics.dispatched_count} In Transit</span>
            <span className="metric-sub">{metrics.delivered_count} Successfully Delivered</span>
          </div>
        </div>

        <div className="booking-metric-card">
          <div className="metric-icon-wrap purple">
            <DollarSign size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Booking Value</span>
            <span className="metric-val purple-text">
              ₹{Number(metrics.total_booking_value || 0).toLocaleString('en-IN')}
            </span>
            <span className="metric-sub">Gross reserved goods amount</span>
          </div>
        </div>

        <div className="booking-metric-card">
          <div className="metric-icon-wrap amber">
            <TrendingUp size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Advance Collected</span>
            <span className="metric-val green-text">
              ₹{Number(metrics.total_advance_collected || 0).toLocaleString('en-IN')}
            </span>
            <span className="metric-sub">
              ₹{Number(metrics.total_balance_pending || 0).toLocaleString('en-IN')} pending balance
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="booking-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Booking #, Customer, Product, Town, Route, Salesman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="status-filter-strip">
          <span className="filter-tag-label">Status:</span>
          {['all', 'Confirmed', 'Pending', 'Dispatched', 'Delivered', 'Returned', 'Cancelled'].map((st) => (
            <button
              key={st}
              className={`pill-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Bookings' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="booking-table-card">
        <div className="table-responsive-wrapper">
          <table className="customers-data-table booking-data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Booking Code</th>
                <th style={{ minWidth: '180px' }}>Shop Name</th>
                <th style={{ minWidth: '140px' }}>Salesman</th>
                <th style={{ width: '110px', textAlign: 'center' }}>No. of Products</th>
                <th style={{ width: '120px' }}>Rate & Total</th>
                <th style={{ width: '130px' }}>Advance / Balance</th>
                <th style={{ width: '110px' }}>Booking Date</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="empty-table-cell">
                    Loading advance bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-table-cell">
                    <div className="empty-state-box">
                      <CalendarCheck size={38} className="empty-icon" />
                      <h4>No Advance Bookings Found</h4>
                      <p>No customer advance bookings match your filter criteria. Click "+ Add New Booking" to register a booking.</p>
                      <button className="action-btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '12px' }}>
                        <Plus size={14} />
                        <span>Create First Booking</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const totalAmt = parseFloat(b.total_amount || 0);
                  const advAmt = parseFloat(b.advance_amount || 0);
                  const balAmt = parseFloat(b.balance_amount || 0);

                  let parsedItems = [];
                  if (b.items) {
                    try {
                      parsedItems = typeof b.items === 'string' ? JSON.parse(b.items) : b.items;
                    } catch (e) {
                      parsedItems = [];
                    }
                  }
                  const hasMultiItems = Array.isArray(parsedItems) && parsedItems.length > 0;
                  const numProducts = hasMultiItems ? parsedItems.length : (b.product_name ? 1 : 0);

                  // Items for expanded drawer
                  let itemsToDisplay = [];
                  if (hasMultiItems) {
                    itemsToDisplay = parsedItems;
                  } else {
                    itemsToDisplay = [
                      {
                        product_name: b.product_name || 'Product',
                        product_sku: b.product_sku || '',
                        warehouse_name: b.notes?.includes('[') ? b.notes.split('[')[1]?.split(']')[0] : 'Central Logistics Hub',
                        package_type: b.package_type || 'Loose Units',
                        qty: b.total_qty || 1,
                        unit_price: b.unit_price || 0,
                        total: b.total_amount || 0
                      }
                    ];
                  }

                  const isExpanded = expandedBookingIds.has(b.booking_id);

                  return (
                    <React.Fragment key={b.booking_id}>
                      <tr
                        className={`booking-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleExpand(b.booking_id)}
                        title="Click to view/hide booked items"
                      >
                        <td className="code-cell">
                          <div className="booking-code-wrap">
                            <span className="expand-indicator">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span className="booking-code-badge">{b.booking_code}</span>
                          </div>
                          {b.priority && b.priority !== 'Normal' && (
                            <span className={`priority-tag ${b.priority.toLowerCase()}`}>
                              {b.priority}
                            </span>
                          )}
                        </td>

                        <td className="customer-cell">
                          <div className="customer-cell-inner">
                            <strong>{b.customer_name}</strong>
                            {b.customer_phone && (
                              <div className="meta-line">
                                <Phone size={11} />
                                <span>{b.customer_phone}</span>
                              </div>
                            )}
                            {b.customer_place && (
                              <div className="meta-line">
                                <MapPin size={11} />
                                <span>{b.customer_place}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="salesman-cell">
                          <div className="salesman-cell-inner">
                            <span className="salesman-name">
                              <User size={12} className="salesman-icon" />
                              {b.salesman_name || '—'}
                            </span>
                          </div>
                        </td>

                        <td className="products-count-cell text-center">
                          <div className="products-count-inner">
                            <span className="product-count-number">
                              {numProducts}
                            </span>
                            <small className="product-count-label">
                              {numProducts === 1 ? '1 Item' : `${numProducts} Items`}
                            </small>
                          </div>
                        </td>

                        <td className="rate-cell">
                          <div className="rate-cell-inner">
                            <span className="total-amt">₹{Number(totalAmt).toLocaleString('en-IN')}</span>
                            <small className="unit-rate">
                              {numProducts > 1 ? `${numProducts} items` : `₹${Number(b.unit_price || 0).toLocaleString('en-IN')} / unit`}
                            </small>
                          </div>
                        </td>

                        <td className="advance-cell">
                          <div className="advance-cell-inner">
                            <span className="adv-paid">Adv: ₹{Number(advAmt).toLocaleString('en-IN')}</span>
                            <span className={`bal-due ${balAmt > 0 ? 'due' : 'settled'}`}>
                              Bal: ₹{Number(balAmt).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>

                        <td className="date-cell">
                          <div className="date-cell-inner">
                            <span className="booking-date-text">
                              {b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-GB') : (b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '—')}
                            </span>
                            {b.expected_delivery_date && (
                              <small className="booked-on">
                                Target: {new Date(b.expected_delivery_date).toLocaleDateString('en-GB')}
                              </small>
                            )}
                          </div>
                        </td>

                        <td className="status-cell" onClick={(e) => e.stopPropagation()}>
                          <select
                            className={`booking-status-dropdown ${b.status?.toLowerCase() || 'pending'}`}
                            value={b.status || 'Confirmed'}
                            onChange={(e) => handleStatusChange(b.booking_id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Dispatched">Dispatched</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Returned">Returned</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>

                        <td className="actions-cell text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="customer-actions-inner">
                            <button
                              type="button"
                              className={`table-icon-action view ${isExpanded ? 'active' : ''}`}
                              title={isExpanded ? 'Hide Booked Items' : 'View Booked Items'}
                              onClick={() => toggleExpand(b.booking_id)}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-action edit"
                              title="Edit Booking"
                              onClick={() => handleOpenEditModal(b)}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-action delete"
                              title="Delete / Cancel Booking"
                              onClick={() => handleDeleteBooking(b.booking_id, b.booking_code)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Booked Items Accordion Drawer (Only shown when clicking booking) */}
                      {isExpanded && (
                        <tr className="expanded-booking-row">
                          <td colSpan="9" className="expanded-booking-cell">
                            <div className="booking-items-drawer">
                              <div className="drawer-header">
                                <div className="drawer-title-wrap">
                                  <Package size={16} className="drawer-icon" />
                                  <strong className="drawer-title">
                                    Booked Items for {b.booking_code} ({itemsToDisplay.length} {itemsToDisplay.length === 1 ? 'Product' : 'Products'})
                                  </strong>
                                </div>
                                {b.notes && (
                                  <div className="drawer-notes-tag">
                                    <span>Note: {b.notes}</span>
                                  </div>
                                )}
                              </div>

                              <div className="drawer-table-wrapper">
                                <table className="drawer-items-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '40px' }}>#</th>
                                      <th>Product Name</th>
                                      <th>Warehouse Godown</th>
                                      <th>Packaging</th>
                                      <th style={{ textAlign: 'right', width: '90px' }}>Qty</th>
                                      <th style={{ textAlign: 'right', width: '110px' }}>Unit Price</th>
                                      <th style={{ textAlign: 'right', width: '120px' }}>Total Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {itemsToDisplay.map((item, idx) => (
                                      <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td>
                                          <div className="drawer-product-name">
                                            <strong>{item.product_name}</strong>
                                            {item.product_sku && <span className="drawer-sku-badge">{item.product_sku}</span>}
                                          </div>
                                        </td>
                                        <td>
                                          <span className="drawer-warehouse-pill">
                                            {item.warehouse_name || 'Central Godown'}
                                          </span>
                                        </td>
                                        <td>
                                          <span className="drawer-package-text">
                                            {item.package_type || 'Loose Units'}
                                          </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                          {item.qty}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          ₹{Number(item.unit_price || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                          ₹{Number(item.total || (item.qty * item.unit_price) || 0).toLocaleString('en-IN')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr>
                                      <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700, color: '#475569' }}>Total:</td>
                                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{b.total_qty} units</td>
                                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#475569' }}>Total Bill:</td>
                                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '13px' }}>
                                        ₹{Number(totalAmt).toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Advance Booking */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-dialog advance-booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Create Customer Advance Booking</h3>
                <span className="modal-sub-tag">Reserve stock & record advance payment</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="modal-form">
              <div className="modal-scrollable-body">
                {/* 1. Customer Selection */}
                <div className="form-group">
                  <label>Select Customer / Client *</label>
                  <select
                    className="modal-select"
                    value={formData.customer_id}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Customer --</option>
                    {customersList.map((c) => (
                      <option key={c.customer_id || c.id} value={c.customer_id || c.id}>
                        {c.name} ({c.customer_code || `#${c.customer_id}`}) - {c.local_area || c.place || 'Trade Client'}
                      </option>
                    ))}
                  </select>

                  {/* Selectable Customer Details Display */}
                  {selectedCustomer && (
                    <div className="selected-customer-details-card">
                      <div className="sc-top-row">
                        <div className="sc-name-badge">
                          <User size={14} style={{ color: '#2563eb' }} />
                          <strong>{selectedCustomer.name}</strong>
                          <span className="sc-code">{selectedCustomer.customer_code || `#${selectedCustomer.customer_id || selectedCustomer.id}`}</span>
                        </div>
                        <span className="sc-status">{selectedCustomer.status || 'Active'}</span>
                      </div>
                      <div className="sc-meta-grid">
                        <div className="sc-meta-item">
                          <Phone size={11} />
                          <span>{selectedCustomer.phone || 'No Phone'}</span>
                        </div>
                        <div className="sc-meta-item">
                          <MapPin size={11} />
                          <span>{selectedCustomer.place || selectedCustomer.route_area || selectedCustomer.district || 'General Market'}</span>
                        </div>
                        {selectedCustomer.price_group_name && (
                          <div className="sc-meta-item">
                            <Tag size={11} />
                            <span>Price Group: {selectedCustomer.price_group_name}</span>
                          </div>
                        )}
                        {selectedCustomer.outstanding_balance !== undefined && (
                          <div className="sc-meta-item">
                            <DollarSign size={11} />
                            <span>Balance: ₹{Number(selectedCustomer.outstanding_balance || 0).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Product Selection with Live Available Stock */}
                <div className="form-group">
                  <label>Select Product to Book *</label>
                  <select
                    className="modal-select"
                    value={formData.product_id}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {productsList.map((p) => {
                      const pStock = parseFloat(p.current_stock || 0);
                      return (
                        <option key={p.product_id || p.id} value={p.product_id || p.id}>
                          {p.name} [{p.sku}] — {pStock > 0 ? `In Stock: ${Number(pStock).toLocaleString('en-IN')} Units` : 'Out of Stock (0)'} — MRP: ₹{Number(p.selling_price || 0).toLocaleString('en-IN')}
                        </option>
                      );
                    })}
                  </select>

                  {/* Selectable Product Details & Live Stock Card */}
                  {selectedProduct && (
                    <div className="selected-product-details-card">
                      <div className="sp-header-row">
                        <div className="sp-name-wrap">
                          <Package size={18} style={{ color: '#2563eb' }} />
                          <div className="sp-info-col">
                            <div className="sp-title-line">
                              <strong>{selectedProduct.name}</strong>
                              <span className="sp-sku-tag">{selectedProduct.sku}</span>
                              <span className="sp-cat-tag">({selectedProduct.category_name || 'General'})</span>
                            </div>
                            <small style={{ color: '#64748b' }}>
                              Base MRP: ₹{Number(selectedProduct.selling_price || 0).toLocaleString('en-IN')}
                            </small>
                          </div>
                        </div>

                        <div className="sp-stock-badge-wrap">
                          <span className="sp-stock-label">Stock Details:</span>
                          <span className={`sp-stock-pill ${availableStock > 10 ? 'in-stock' : availableStock > 0 ? 'low-stock' : 'out-of-stock'}`}>
                            {availableStock > 0 ? `${Number(availableStock).toLocaleString('en-IN')} Units Available` : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Packaging Type & Units */}
                <div className="packaging-unit-selector-box">
                  <label className="section-label">Select Packaging Unit *</label>
                  <div className="pkg-radio-group">
                    {['Bag', 'Box', 'Carton', 'Loose'].map((type) => (
                      <label 
                        key={type} 
                        className={`pkg-radio-pill ${formData.package_type === type ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="package_type"
                          value={type}
                          checked={formData.package_type === type}
                          onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>

                  <div className="form-row-2" style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label>
                        {formData.package_type === 'Loose' ? 'Loose Units Quantity *' : `Number of ${formData.package_type}s *`}
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
                        <label>Items / Units per {formData.package_type} *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={formData.items_per_package}
                          onChange={(e) => setFormData({ ...formData, items_per_package: e.target.value })}
                          placeholder="e.g. 20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Live Inventory Reduction & Remaining Calculator */}
                  <div className={`inventory-impact-banner ${isStockExceeded ? 'stock-alert' : 'stock-ok'}`}>
                    <div className="impact-grid">
                      <div className="impact-col">
                        <span className="impact-lbl">Stock Details Available</span>
                        <strong className="impact-val">{Number(availableStock).toLocaleString('en-IN')} Units</strong>
                      </div>
                      <div className="impact-divider">-</div>
                      <div className="impact-col">
                        <span className="impact-lbl">Booking Quantity</span>
                        <strong className="impact-val text-blue">{calculatedTotalQty} Units</strong>
                      </div>
                      <div className="impact-divider">=</div>
                      <div className="impact-col">
                        <span className="impact-lbl">Remaining Warehouse Stock</span>
                        <strong className={`impact-val ${remainingStock < 0 ? 'text-red' : 'text-green'}`}>
                          {Number(remainingStock).toLocaleString('en-IN')} Units
                        </strong>
                      </div>
                    </div>

                    {isStockExceeded && (
                      <div className="stock-warning-message">
                        <AlertCircle size={14} />
                        <span>
                          Requested quantity ({calculatedTotalQty} units) exceeds available stock ({availableStock} units). Please adjust packaging units.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Pricing & Payment Breakdown */}
                <div className="pricing-breakdown-box">
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Agreed Unit Rate (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.unit_price}
                        onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                        placeholder="Rate per piece"
                      />
                    </div>

                    <div className="form-group">
                      <label>Advance Payment Collected (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.advance_amount}
                        onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>

                  <div className="summary-calculation-strip">
                    <div className="calc-item">
                      <span className="calc-lbl">Total Value:</span>
                      <span className="calc-val">₹{Number(calculatedTotalAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="calc-item">
                      <span className="calc-lbl">Advance:</span>
                      <span className="calc-val green-text">₹{Number(formData.advance_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="calc-item highlight">
                      <span className="calc-lbl">Balance Due on Delivery:</span>
                      <span className="calc-val red-text">₹{Number(calculatedBalance).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Schedule & Assignment */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Expected Delivery Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Assigned Sales Executive</label>
                    <select
                      className="modal-select"
                      value={formData.salesman_id}
                      onChange={(e) => setFormData({ ...formData, salesman_id: e.target.value })}
                    >
                      <option value="">-- No Specific Executive --</option>
                      {salesmenList.map((sm) => (
                        <option key={sm.id} value={sm.id}>
                          {sm.name} ({sm.phone || sm.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      className="modal-select"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="Normal">Normal Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent / Express Dispatch</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Initial Status</label>
                    <select
                      className="modal-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Confirmed">Confirmed Booking</option>
                      <option value="Pending">Pending Confirmation</option>
                    </select>
                  </div>
                </div>

                {/* 6. Notes */}
                <div className="form-group">
                  <label>Booking Notes / Delivery Instructions</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Deliver before 11 AM at store loading bay..."
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
                  disabled={isSubmitting || isStockExceeded || availableStock <= 0 || !formData.customer_id || !formData.product_id}
                >
                  <CheckSquare size={14} />
                  <span>{isSubmitting ? 'Saving...' : isStockExceeded ? 'Insufficient Stock' : 'Confirm Advance Booking'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Advance Booking */}
      {showEditModal && editBooking && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog advance-booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Edit Booking #{editBooking.booking_code}</h3>
                <span className="modal-sub-tag">Update booking status, advance payment, priority or notes</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditBooking} className="modal-form">
              <div className="modal-scrollable-body">
                {/* Selected Customer / Booking Info Card */}
                <div className="selected-customer-card" style={{ marginBottom: '16px' }}>
                  <div className="card-top">
                    <div>
                      <span className="card-code">{editBooking.booking_code}</span>
                      <h4 className="card-name">{editBooking.customer_name}</h4>
                    </div>
                    <span className="customer-status-badge active">{editBooking.status || 'Confirmed'}</span>
                  </div>
                  <div className="card-details-grid">
                    <div className="cd-item">
                      <span className="cd-label">Salesman:</span>
                      <span className="cd-val">{editBooking.salesman_name || '—'}</span>
                    </div>
                    <div className="cd-item">
                      <span className="cd-label">Total Booking Value:</span>
                      <span className="cd-val" style={{ fontWeight: 700, color: '#0f172a' }}>
                        ₹{Number(editBooking.total_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Booking Status *</label>
                    <select
                      className="modal-select"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      className="modal-select"
                      value={editFormData.priority}
                      onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    >
                      <option value="Normal">Normal Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent / Express</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Advance Amount Paid (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="modal-input"
                      value={editFormData.advance_amount}
                      onChange={(e) => setEditFormData({ ...editFormData, advance_amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label>Balance Due on Delivery (₹)</label>
                    <input
                      type="text"
                      className="modal-input"
                      readOnly
                      disabled
                      value={`₹${Math.max(0, parseFloat(editBooking.total_amount || 0) - (parseFloat(editFormData.advance_amount) || 0)).toLocaleString('en-IN')}`}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    className="modal-input"
                    value={editFormData.expected_delivery_date}
                    onChange={(e) => setEditFormData({ ...editFormData, expected_delivery_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Booking Notes / Delivery Instructions</label>
                  <textarea
                    rows="3"
                    className="modal-input"
                    style={{ height: 'auto', resize: 'vertical' }}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    placeholder="Enter any special delivery notes or instructions..."
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn btn-outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn btn-primary" disabled={isSubmittingEdit}>
                  <CheckSquare size={14} />
                  <span>{isSubmittingEdit ? 'Saving...' : 'Update Booking'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
