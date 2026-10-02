import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Clock, 
  Package, 
  Building2, 
  Download,
  Calendar,
  DollarSign,
  Boxes,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchPurchaseOrdersApi, 
  createPurchaseOrderApi, 
  updatePurchaseOrderStatusApi, 
  deletePurchaseOrderApi,
  fetchVendorsApi,
  fetchWarehousesApi,
  fetchProductsApi,
  fetchCompanySettings
} from '../../services/api';
import { InvoiceTemplateSheet } from '../../components/InvoiceTemplateSheet';
import './PurchaseOrders.css';

export const PurchaseOrders = ({ user, onGoToInwardStock, companySettings: initialCompanySettings }) => {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [companySettings, setCompanySettings] = useState(initialCompanySettings || null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal & Print states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPoDetail, setSelectedPoDetail] = useState(null);
  const [printingPo, setPrintingPo] = useState(null);
  const [printAfterSubmit, setPrintAfterSubmit] = useState(true);
  const [toast, setToast] = useState(null);

  // Form State
  const [poForm, setPoForm] = useState({
    vendor_id: '',
    vendor_name: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    warehouse_name: '',
    status: 'Pending',
    notes: '',
    items: [
      { product_id: '', product_name: '', sku: '', package_type: 'Box', quantity: 10, unit_price: 100, total_price: 1000 }
    ]
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [poRes, vRes, whRes, pRes, compRes] = await Promise.all([
        fetchPurchaseOrdersApi(searchQuery, statusFilter),
        fetchVendorsApi(),
        fetchWarehousesApi(),
        fetchProductsApi(),
        initialCompanySettings ? Promise.resolve(initialCompanySettings) : fetchCompanySettings()
      ]);
      setOrders(poRes || []);
      setVendors(vRes || []);
      setWarehouses(whRes || []);
      setProducts(pRes || []);
      if (compRes) setCompanySettings(compRes);
    } catch (err) {
      console.error('Error loading purchase orders:', err);
      showNotification('Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  // Handle PO line item changes
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...poForm.items];
    const current = { ...updatedItems[index], [field]: value };

    if (field === 'product_id') {
      const prod = products.find(p => String(p.product_id || p.id) === String(value));
      if (prod) {
        current.product_name = prod.name;
        current.sku = prod.sku || '';
        current.unit_price = parseFloat(prod.cost_price || prod.selling_price || 0);
      }
    }

    const qty = parseFloat(current.quantity) || 0;
    const price = parseFloat(current.unit_price) || 0;
    current.total_price = qty * price;

    updatedItems[index] = current;
    setPoForm({ ...poForm, items: updatedItems });
  };

  const addItemRow = () => {
    setPoForm({
      ...poForm,
      items: [
        ...poForm.items,
        { product_id: '', product_name: '', sku: '', package_type: 'Box', quantity: 10, unit_price: 0, total_price: 0 }
      ]
    });
  };

  const removeItemRow = (index) => {
    if (poForm.items.length <= 1) {
      showNotification('At least one item line is required', 'error');
      return;
    }
    const updated = poForm.items.filter((_, i) => i !== index);
    setPoForm({ ...poForm, items: updated });
  };

  const calculateGrandTotal = () => {
    return poForm.items.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
  };

  // Open Print Modal for any PO
  const handlePrintPo = (po) => {
    if (!po) return;
    const ven = vendors.find(v => String(v.vendor_id || v.id) === String(po.vendor_id));
    const rawItems = Array.isArray(po.items) ? po.items : (typeof po.items === 'string' ? JSON.parse(po.items || '[]') : []);
    const enriched = {
      ...po,
      po_number: po.po_number || 'PO-2026-NEW',
      order_date: po.order_date,
      expected_delivery_date: po.expected_delivery_date,
      warehouse_name: po.warehouse_name || '',
      vendor_name: po.vendor_name || ven?.supplier_company || 'Direct Supplier',
      vendor_code: ven?.vendor_code || '',
      vendor_gstin: po.vendor_gstin || ven?.gst_in || ven?.gstin || '',
      vendor_phone: po.vendor_phone || ven?.phone || ven?.mobile || '',
      vendor_address: po.vendor_address || (ven?.place ? `${ven.place}, ${ven.state || 'Kerala'}` : ''),
      notes: po.notes || '',
      status: po.status || 'Pending',
      total_amount: parseFloat(po.total_amount || 0),
      items: rawItems.map(it => ({
        product_name: it.product_name || it.name || 'Product Item',
        sku: it.sku || it.hsn || '',
        hsn: it.sku || it.hsn || '',
        package_type: it.package_type || it.unit || 'Box',
        qty: it.quantity != null ? it.quantity : (it.qty != null ? it.qty : 1),
        quantity: it.quantity != null ? it.quantity : (it.qty != null ? it.qty : 1),
        unit_price: it.unit_price != null ? it.unit_price : (it.rate != null ? it.rate : 0),
        rate: it.unit_price != null ? it.unit_price : (it.rate != null ? it.rate : 0),
        total_price: it.total_price != null ? it.total_price : (it.total != null ? it.total : 0),
        total: it.total_price != null ? it.total_price : (it.total != null ? it.total : 0)
      }))
    };
    setPrintingPo(enriched);
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!poForm.vendor_id && !poForm.vendor_name) {
      showNotification('Please select a supplier / vendor', 'error');
      return;
    }
    if (poForm.items.some(i => !i.product_name && !i.product_id)) {
      showNotification('All item rows must have a valid product selected', 'error');
      return;
    }

    try {
      const payload = {
        ...poForm,
        total_amount: calculateGrandTotal()
      };
      const createdPo = await createPurchaseOrderApi(payload);
      showNotification(`Purchase Order created successfully!`);
      setShowCreateModal(false);

      if (printAfterSubmit) {
        handlePrintPo({
          ...(createdPo || payload),
          po_number: createdPo?.po_number || `PO-${new Date().getFullYear()}-NEW`,
          vendor_name: poForm.vendor_name,
          vendor_id: poForm.vendor_id,
          order_date: poForm.order_date,
          expected_delivery_date: poForm.expected_delivery_date,
          warehouse_name: poForm.warehouse_name,
          notes: poForm.notes,
          total_amount: payload.total_amount,
          items: poForm.items
        });
      }

      // Reset form
      setPoForm({
        vendor_id: '',
        vendor_name: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        warehouse_name: '',
        status: 'Pending',
        notes: '',
        items: [
          { product_id: '', product_name: '', sku: '', package_type: 'Box', quantity: 10, unit_price: 100, total_price: 1000 }
        ]
      });
      loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to create PO', 'error');
    }
  };

  const handleUpdateStatus = async (poId, newStatus) => {
    try {
      await updatePurchaseOrderStatusApi(poId, newStatus);
      showNotification(`PO status updated to ${newStatus}`);
      loadData();
      if (selectedPoDetail && selectedPoDetail.po_id === poId) {
        setSelectedPoDetail({ ...selectedPoDetail, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to update status', 'error');
    }
  };

  const handleDeletePo = async (poId, poNumber) => {
    if (!window.confirm(`Are you sure you want to delete PO #${poNumber}?`)) return;
    try {
      await deletePurchaseOrderApi(poId);
      showNotification(`PO #${poNumber} deleted`);
      loadData();
      if (selectedPoDetail?.po_id === poId) setSelectedPoDetail(null);
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete PO', 'error');
    }
  };

  const handleExportExcel = () => {
    if (!orders || orders.length === 0) {
      showNotification('No purchase orders to export', 'error');
      return;
    }
    const rows = orders.map(o => ({
      'PO Number': o.po_number,
      'Vendor / Supplier': o.vendor_name,
      'Order Date': o.order_date,
      'Expected Delivery': o.expected_delivery_date || 'N/A',
      'Destination Warehouse': o.warehouse_name,
      'Total Amount (₹)': parseFloat(o.total_amount || 0),
      'Status': o.status,
      'Items Count': Array.isArray(o.items) ? o.items.length : 0,
      'Notes': o.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase_Orders');
    XLSX.writeFile(wb, `Purchase_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Purchase orders exported to Excel (.xlsx)');
  };

  // Metrics
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const receivedOrders = orders.filter(o => o.status === 'Received').length;
  const totalValuation = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  return (
    <div className="po-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`po-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="po-header">
        <div className="po-header-left">
          <div className="po-header-icon-wrap">
            <FileText size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="po-title">Purchase Orders (PO)</h1>
            <p className="po-subtitle">
              Issue procurement orders to vendors, monitor expected deliveries, and route items to warehouses.
            </p>
          </div>
        </div>
        <div className="po-header-actions">
          <button className="po-btn-secondary" onClick={handleExportExcel} title="Export to Excel">
            <Download size={16} />
            <span>Export Excel</span>
          </button>
          <button className="po-btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="po-kpi-grid">
        <div className="po-kpi-card">
          <div className="kpi-icon-box bg-blue-subtle">
            <FileText size={20} className="text-blue" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Purchase Orders</span>
            <h3 className="kpi-value">{totalOrders}</h3>
            <span className="kpi-sub">Lifetime raised POs</span>
          </div>
        </div>

        <div className="po-kpi-card">
          <div className="kpi-icon-box bg-amber-subtle">
            <Clock size={20} className="text-amber" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pending / In Review</span>
            <h3 className="kpi-value text-amber">{pendingOrders}</h3>
            <span className="kpi-sub">Awaiting vendor fulfillment</span>
          </div>
        </div>

        <div className="po-kpi-card">
          <div className="kpi-icon-box bg-emerald-subtle">
            <CheckCircle2 size={20} className="text-emerald" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Received / Fulfilled</span>
            <h3 className="kpi-value text-emerald">{receivedOrders}</h3>
            <span className="kpi-sub">Goods delivered to warehouse</span>
          </div>
        </div>

        <div className="po-kpi-card">
          <div className="kpi-icon-box bg-purple-subtle">
            <DollarSign size={20} className="text-purple" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Order Value</span>
            <h3 className="kpi-value">₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
            <span className="kpi-sub">Cumulative procurement value</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="po-controls-card">
        <div className="po-search-box">
          <Search size={16} className="text-muted" />
          <input 
            type="text"
            placeholder="Search by PO #, vendor, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="po-status-pills">
          {['All', 'Pending', 'Approved', 'Received', 'Cancelled'].map((st) => (
            <button
              key={st}
              className={`status-filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="po-table-container">
        <table className="po-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Vendor / Supplier</th>
              <th>Order Date</th>
              <th>Expected Date</th>
              <th>Destination Warehouse</th>
              <th>Items</th>
              <th className="text-right">Total Amount</th>
              <th className="text-center">Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-8">
                  <div className="po-spinner"></div>
                  <p className="text-muted mt-2">Loading purchase orders...</p>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-10">
                  <Package size={40} className="text-muted mb-2 mx-auto" />
                  <p className="font-semibold text-gray-700">No purchase orders found</p>
                  <p className="text-muted text-sm">Raise a new purchase order or adjust filters.</p>
                </td>
              </tr>
            ) : (
              orders.map((po) => {
                const itemsArr = Array.isArray(po.items) ? po.items : [];
                return (
                  <tr key={po.po_id}>
                    <td>
                      <button 
                        className="po-code-link"
                        onClick={() => setSelectedPoDetail(po)}
                        title="Click to view PO details"
                      >
                        {po.po_number}
                      </button>
                    </td>
                    <td>
                      <div className="vendor-cell">
                        <strong>{po.vendor_name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="date-badge">
                        <Calendar size={13} className="text-muted mr-1" />
                        {new Date(po.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      {po.expected_delivery_date ? (
                        <span className="text-sm font-medium">
                          {new Date(po.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-muted text-sm">Immediate</span>
                      )}
                    </td>
                    <td>
                      <span className="warehouse-tag">
                        <Building2 size={12} className="mr-1" />
                        {po.warehouse_name || 'Central Hub'}
                      </span>
                    </td>
                    <td>
                      <span className="items-count-badge">
                        {itemsArr.length} SKU{itemsArr.length === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td className="text-right font-bold text-gray-900">
                      ₹{parseFloat(po.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      <span className={`status-tag status-${(po.status || 'Pending').toLowerCase()}`}>
                        {po.status || 'Pending'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="action-btn-group">
                        <button 
                          className="po-action-btn view-btn"
                          title="View PO Details"
                          onClick={() => setSelectedPoDetail(po)}
                        >
                          View
                        </button>
                        <button 
                          className="po-action-btn print-btn"
                          title="Print Purchase Order"
                          onClick={() => handlePrintPo(po)}
                        >
                          <Printer size={13} />
                          <span>Print</span>
                        </button>
                        {po.status === 'Pending' && (
                          <button 
                            className="po-action-btn approve-btn"
                            title="Approve Order"
                            onClick={() => handleUpdateStatus(po.po_id, 'Approved')}
                          >
                            Approve
                          </button>
                        )}
                        {po.status === 'Approved' && (
                          <button 
                            className="po-action-btn receive-btn"
                            title="Receive Stock"
                            onClick={() => {
                              handleUpdateStatus(po.po_id, 'Received');
                              if (onGoToInwardStock) {
                                if (window.confirm('Marked PO as Received! Do you want to open Stock Inward Register to enter delivery invoice?')) {
                                  onGoToInwardStock();
                                }
                              }
                            }}
                          >
                            Receive
                          </button>
                        )}
                        <button 
                          className="po-action-btn delete-btn"
                          title="Delete PO"
                          onClick={() => handleDeletePo(po.po_id, po.po_number)}
                        >
                          <Trash2 size={14} />
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

      {/* PO Detail Modal */}
      {selectedPoDetail && (
        <div className="po-modal-overlay" onClick={() => setSelectedPoDetail(null)}>
          <div className="po-modal-box po-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-header">
              <div className="modal-title-wrap">
                <FileText size={20} className="text-primary" />
                <h3>Purchase Order: {selectedPoDetail.po_number}</h3>
              </div>
              <button className="po-close-btn" onClick={() => setSelectedPoDetail(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="po-modal-body">
              <div className="po-detail-top-grid">
                <div className="detail-item">
                  <span className="detail-label">Supplier / Vendor:</span>
                  <strong className="detail-val">{selectedPoDetail.vendor_name}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Destination Warehouse:</span>
                  <span className="detail-val">{selectedPoDetail.warehouse_name || 'Central Hub'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Order Date:</span>
                  <span className="detail-val">{selectedPoDetail.order_date}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expected Delivery:</span>
                  <span className="detail-val">{selectedPoDetail.expected_delivery_date || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current Status:</span>
                  <span className={`status-tag status-${(selectedPoDetail.status || 'Pending').toLowerCase()}`}>
                    {selectedPoDetail.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Grand Total:</span>
                  <strong className="detail-val text-primary font-bold">
                    ₹{parseFloat(selectedPoDetail.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {selectedPoDetail.notes && (
                <div className="po-notes-box">
                  <strong>Notes / Instructions:</strong>
                  <p>{selectedPoDetail.notes}</p>
                </div>
              )}

              <h4 className="po-section-heading">Ordered Line Items</h4>
              <div className="po-items-table-wrap">
                <table className="po-inner-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Package</th>
                      <th className="text-right">Quantity</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(selectedPoDetail.items) ? selectedPoDetail.items : []).map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td><strong>{item.product_name}</strong></td>
                        <td><span className="font-mono text-muted">{item.sku || '-'}</span></td>
                        <td>{item.package_type || 'Units'}</td>
                        <td className="text-right font-semibold">{item.quantity}</td>
                        <td className="text-right">₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                        <td className="text-right font-bold text-gray-900">
                          ₹{parseFloat(item.total_price || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="po-modal-footer">
              <div className="status-quick-switch">
                <span>Update Status:</span>
                {['Pending', 'Approved', 'Received', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    disabled={selectedPoDetail.status === st}
                    className={`btn-status-switch ${selectedPoDetail.status === st ? 'active' : ''}`}
                    onClick={() => handleUpdateStatus(selectedPoDetail.po_id, st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <button className="po-btn-secondary" onClick={() => handlePrintPo(selectedPoDetail)}>
                <Printer size={15} />
                <span>Print PO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New PO Modal */}
      {showCreateModal && (
        <div className="po-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="po-modal-box po-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-header">
              <div className="modal-title-wrap">
                <Plus size={20} className="text-primary" />
                <h3>Create New Purchase Order</h3>
              </div>
              <button className="po-close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="po-form">
              <div className="po-form-grid">
                <div className="form-group">
                  <label>Supplier / Vendor *</label>
                  <select
                    required
                    value={poForm.vendor_id}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const ven = vendors.find(v => String(v.vendor_id || v.id) === String(vId));
                      setPoForm({
                        ...poForm,
                        vendor_id: vId,
                        vendor_name: ven ? ven.supplier_company : ''
                      });
                    }}
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_id || v.id} value={v.vendor_id || v.id}>
                        {v.supplier_company} ({v.place || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Destination Warehouse *</label>
                  <select
                    value={poForm.warehouse_name}
                    onChange={(e) => setPoForm({ ...poForm, warehouse_name: e.target.value })}
                  >
                    {warehouses.length > 0 ? (
                      warehouses.map((wh) => (
                        <option key={wh.warehouse_id || wh.id} value={wh.name}>
                          {wh.name} ({wh.code})
                        </option>
                      ))
                    ) : (
                      <option value="">No warehouse registered</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Order Date *</label>
                  <input 
                    type="date" 
                    required
                    value={poForm.order_date}
                    onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input 
                    type="date" 
                    value={poForm.expected_delivery_date}
                    onChange={(e) => setPoForm({ ...poForm, expected_delivery_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="form-items-header">
                <h4>Products & Order Quantities</h4>
                <button type="button" className="add-line-btn" onClick={addItemRow}>
                  <Plus size={14} />
                  <span>Add Product Line</span>
                </button>
              </div>

              <div className="po-item-lines-container">
                {poForm.items.map((row, idx) => (
                  <div key={idx} className="po-item-row">
                    <div className="item-col product-col">
                      <label>Product</label>
                      <select
                        required
                        value={row.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      >
                        <option value="">Select Product...</option>
                        {products.map((p) => (
                          <option key={p.product_id || p.id} value={p.product_id || p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="item-col pkg-col">
                      <label>Package</label>
                      <select
                        value={row.package_type}
                        onChange={(e) => handleItemChange(idx, 'package_type', e.target.value)}
                      >
                        <option value="Box">Box</option>
                        <option value="Bag">Bag</option>
                        <option value="Carton">Carton</option>
                        <option value="Tin">Tin</option>
                        <option value="Units">Units</option>
                      </select>
                    </div>

                    <div className="item-col qty-col">
                      <label>Quantity</label>
                      <input 
                        type="number" 
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                    </div>

                    <div className="item-col price-col">
                      <label>Rate (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        required
                        value={row.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      />
                    </div>

                    <div className="item-col total-col">
                      <label>Line Total (₹)</label>
                      <input 
                        type="text" 
                        disabled 
                        value={`₹${parseFloat(row.total_price || 0).toFixed(2)}`}
                      />
                    </div>

                    <button 
                      type="button" 
                      className="row-del-btn" 
                      onClick={() => removeItemRow(idx)}
                      title="Remove Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total Bar */}
              <div className="po-grand-total-bar">
                <span>Calculated PO Total:</span>
                <h3>₹{calculateGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              </div>

              <div className="form-group mt-4">
                <label>Order Notes / Terms & Delivery Instructions</label>
                <textarea 
                  rows="2"
                  placeholder="e.g., F.O.R. Peenya Warehouse, delivery within 4 days..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                />
              </div>

              {/* Print PO After Submit Checkbox */}
              <div className="po-print-toggle-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="po-print-after-submit" 
                  checked={printAfterSubmit} 
                  onChange={(e) => setPrintAfterSubmit(e.target.checked)}
                  style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#16a34a' }}
                />
                <label htmlFor="po-print-after-submit" style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                  Print Purchase Order document immediately after raising
                </label>
              </div>

              <div className="po-modal-footer">
                <button type="button" className="po-btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="po-btn-primary">
                  <CheckCircle2 size={16} />
                  <span>Raise Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Order Document Print Modal */}
      {printingPo && (
        <div className="po-modal-overlay" onClick={() => setPrintingPo(null)}>
          <div className="po-modal-box po-print-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95vw', padding: '20px' }}>
            <div className="po-modal-header no-print" style={{ marginBottom: '16px' }}>
              <div className="modal-title-wrap">
                <Printer size={20} className="text-primary" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  Purchase Order Document: {printingPo.po_number}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="po-btn-primary"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Print PO</span>
                </button>
                <button
                  type="button"
                  className="po-close-btn"
                  onClick={() => setPrintingPo(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
              <InvoiceTemplateSheet
                activeTemplate="purchase_order"
                companySettings={companySettings}
                showFormatBar={false}
                id="printable-purchase-order"
                invoice={printingPo}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
