import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle, 
  X, 
  Trash2, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  Send,
  Building2
} from 'lucide-react';
import { 
  fetchSalesmanStockRequestsApi, 
  createSalesmanStockRequestApi, 
  updateStockRequestStatusApi, 
  deleteStockRequestApi,
  fetchProductsApi,
  fetchWarehousesApi
} from '../../services/api';
import './SalesmanStockRequests.css';

export const SalesmanStockRequests = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReqForAction, setSelectedReqForAction] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve' | 'dispatch' | 'reject'
  const [approvedQty, setApprovedQty] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data for New Request
  const [newRequest, setNewRequest] = useState({
    salesman_id: user?.id || '',
    salesman_name: user?.name || '',
    vehicle_reg_no: '',
    warehouse_name: 'Central Distribution Depot',
    product_id: '',
    package_type: 'Carton',
    requested_qty: '',
    urgency: 'Normal',
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqData, prods, whs] = await Promise.all([
        fetchSalesmanStockRequestsApi({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          search: searchQuery || undefined
        }),
        fetchProductsApi(),
        fetchWarehousesApi()
      ]);
      setRequests(reqData || []);
      setProducts(prods || []);
      setWarehouses(whs || []);
    } catch (err) {
      console.error('Error loading stock requests:', err);
      showNotification('Failed to load stock requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  // Handle Action (Approve / Dispatch / Reject)
  const handleOpenActionModal = (req, type) => {
    setSelectedReqForAction(req);
    setActionType(type);
    setApprovedQty(req.requested_qty);
    setActionNotes(type === 'reject' ? 'Out of stock in regional hub' : 'Approved for delivery');
  };

  const handleExecuteStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedReqForAction) return;

    try {
      setIsSubmitting(true);
      let statusToSet = 'Pending';
      let finalApprovedQty = selectedReqForAction.requested_qty;

      if (actionType === 'approve') {
        statusToSet = 'Approved';
        finalApprovedQty = parseFloat(approvedQty) || selectedReqForAction.requested_qty;
      } else if (actionType === 'dispatch') {
        statusToSet = 'Dispatched';
      } else if (actionType === 'reject') {
        statusToSet = 'Rejected';
      }

      await updateStockRequestStatusApi(selectedReqForAction.request_id, {
        status: statusToSet,
        approved_qty: finalApprovedQty,
        notes: actionNotes
      });

      showNotification(`Request #${selectedReqForAction.request_code} marked as ${statusToSet}!`);
      setSelectedReqForAction(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to update request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Request
  const handleDeleteRequest = async (id, code) => {
    if (window.confirm(`Are you sure you want to delete stock request #${code}?`)) {
      try {
        await deleteStockRequestApi(id);
        showNotification(`Request #${code} removed successfully`);
        await loadData();
      } catch (err) {
        showNotification(err.message || 'Failed to delete request', 'error');
      }
    }
  };

  // Create New Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.product_id || !newRequest.requested_qty) {
      showNotification('Please select a product and enter requested quantity', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await createSalesmanStockRequestApi(newRequest);
      showNotification('Stock requisition submitted successfully to warehouse depot!');
      setShowAddModal(false);
      setNewRequest({
        salesman_id: user?.id || '',
        salesman_name: user?.name || '',
        vehicle_reg_no: '',
        warehouse_name: 'Central Distribution Depot',
        product_id: '',
        package_type: 'Carton',
        requested_qty: '',
        urgency: 'Normal',
        notes: ''
      });
      await loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to submit stock request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI Metrics Calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const dispatchedCount = requests.filter(r => r.status === 'Dispatched').length;

  return (
    <div className="stock-requests-page">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 9999,
          fontWeight: 600,
          fontSize: '13.5px'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Sales Management</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Stock Requests</span>
          </nav>
          <h1 className="dashboard-main-title">
            Salesman Van Stock Requisitions
          </h1>
          <p className="dashboard-sub-title">
            Real-time replenishment requisitions raised by sales executives on the road for morning van loading or midday top-ups from central warehouse.
          </p>
        </div>

        <div className="page-header-actions">
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="requests-metrics-grid">
        <div className="request-metric-card">
          <div className="metric-icon-wrap blue">
            <Boxes size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Requisitions</span>
            <span className="metric-val">{totalCount} Requests</span>
            <span className="metric-sub">All time recorded</span>
          </div>
        </div>

        <div className="request-metric-card">
          <div className="metric-icon-wrap amber">
            <Clock size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending Approval</span>
            <span className="metric-val" style={{ color: '#d97706' }}>{pendingCount} Pending</span>
            <span className="metric-sub">Awaiting warehouse dispatch</span>
          </div>
        </div>

        <div className="request-metric-card">
          <div className="metric-icon-wrap indigo">
            <Truck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Approved & Packing</span>
            <span className="metric-val" style={{ color: '#4f46e5' }}>{approvedCount} In Progress</span>
            <span className="metric-sub">Ready for loading bay</span>
          </div>
        </div>

        <div className="request-metric-card">
          <div className="metric-icon-wrap green">
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Dispatched to Vans</span>
            <span className="metric-val" style={{ color: '#059669' }}>{dispatchedCount} Completed</span>
            <span className="metric-sub">Loaded & confirmed</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Strip */}
      <div className="requests-filter-strip">
        <div className="filter-left-tools">
          <div className="search-box-wrap">
            <Search size={15} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search by Request #, Salesman, Product, Van Reg..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} color="#94a3b8" />
              </button>
            )}
          </div>

          <div className="status-tabs-row">
            {['All', 'Pending', 'Approved', 'Dispatched', 'Rejected'].map(s => (
              <button
                key={s}
                className={`status-tab ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="requests-table-card">
        <div className="table-responsive-wrap">
          <table className="stock-requests-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Request #</th>
                <th>Salesman &amp; Vehicle</th>
                <th>Target Depot</th>
                <th>Product Description</th>
                <th>SKU</th>
                <th>Requested Qty</th>
                <th>Approved Qty</th>
                <th>Urgency</th>
                <th>Date Raised</th>
                <th>Status</th>
                <th style={{ minWidth: '220px', width: '220px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading salesman stock requisitions...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Boxes size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No stock requests found matching criteria</p>
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const statusClass = req.status ? req.status.toLowerCase() : 'pending';
                  const urgencyClass = req.urgency ? req.urgency.toLowerCase() : 'normal';

                  return (
                    <tr key={req.request_id}>
                      <td>
                        <span className="req-code-pill">#{req.request_code}</span>
                      </td>
                      <td>
                        <div className="salesman-cell">
                          <span className="salesman-name-bold">{req.salesman_name}</span>
                          <span className="salesman-van-tag">Van: {req.vehicle_reg_no || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#475569' }}>{req.warehouse_name}</span>
                      </td>
                      <td>
                        <strong>{req.product_name}</strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '11.5px' }}>{req.product_sku || '-'}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{req.requested_qty}</strong> <span style={{ fontSize: '11px', color: '#64748b' }}>{req.package_type}</span>
                      </td>
                      <td>
                        {req.approved_qty ? (
                          <strong style={{ color: '#059669' }}>{req.approved_qty}</strong>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`urgency-badge ${urgencyClass}`}>{req.urgency || 'Normal'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {req.request_date ? new Date(req.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`req-status-badge ${statusClass}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions-btn-group">
                          {req.status === 'Pending' && (
                            <>
                              <button 
                                className="stock-req-action-btn approve"
                                onClick={() => handleOpenActionModal(req, 'approve')}
                                title="Approve and allocate stock directly to salesman van"
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve & Add Stock</span>
                              </button>
                              <button 
                                className="stock-req-action-btn reject"
                                onClick={() => handleOpenActionModal(req, 'reject')}
                                title="Reject Request"
                              >
                                <X size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          {req.status === 'Approved' && (
                            <button 
                              className="stock-req-action-btn dispatch"
                              onClick={() => handleOpenActionModal(req, 'dispatch')}
                              title="Mark Dispatched / Handed Over to Van"
                            >
                              <Truck size={13} />
                              <span>Dispatch</span>
                            </button>
                          )}
                          {req.status === 'Dispatched' && (
                            <span className="action-done-pill fulfilled">
                              <CheckCircle2 size={12} />
                              <span>Dispatched</span>
                            </span>
                          )}
                          {req.status === 'Rejected' && (
                            <span className="action-done-pill rejected">
                              <X size={12} />
                              <span>Rejected</span>
                            </span>
                          )}
                          <button 
                            className="stock-req-action-btn delete"
                            onClick={() => handleDeleteRequest(req.request_id, req.request_code)}
                            title="Delete Request"
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

      {/* MODAL: Raise Stock Request */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Raise Van Stock Requisition</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="modal-body">
                <div className="form-grid-2col">
                  <div>
                    <label>Salesman / Representative *</label>
                    <input 
                      type="text" 
                      value={newRequest.salesman_name} 
                      onChange={(e) => setNewRequest({ ...newRequest, salesman_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label>Assigned Vehicle Reg #</label>
                    <input 
                      type="text" 
                      value={newRequest.vehicle_reg_no} 
                      onChange={(e) => setNewRequest({ ...newRequest, vehicle_reg_no: e.target.value })}
                      placeholder="e.g. KL-07-CD-4521"
                    />
                  </div>
                </div>

                <div className="form-group-full" style={{ marginTop: '14px' }}>
                  <label>Target Dispatch Warehouse / Depot *</label>
                  <select
                    value={newRequest.warehouse_name}
                    onChange={(e) => setNewRequest({ ...newRequest, warehouse_name: e.target.value })}
                  >
                    {warehouses.length > 0 ? (
                      warehouses.map(w => (
                        <option key={w.id} value={w.name}>{w.name} ({w.city})</option>
                      ))
                    ) : (
                      <>
                        <option value="Central Distribution Depot">Central Distribution Depot (Ernakulam)</option>
                        <option value="Malabar Regional Warehouse">Malabar Regional Warehouse (Kozhikode)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group-full">
                  <label>Select Product to Inward *</label>
                  <select
                    value={newRequest.product_id}
                    onChange={(e) => setNewRequest({ ...newRequest, product_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Product from Catalog --</option>
                    {products.map(p => (
                      <option key={p.product_id || p.id} value={p.product_id || p.id}>
                        {p.product_name || p.name} (SKU: {p.sku || 'N/A'}) - Available: {p.current_stock || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2col">
                  <div>
                    <label>Package Type</label>
                    <select
                      value={newRequest.package_type}
                      onChange={(e) => setNewRequest({ ...newRequest, package_type: e.target.value })}
                    >
                      <option value="Carton">Carton</option>
                      <option value="Box">Box</option>
                      <option value="Bag">Bag</option>
                      <option value="Units">Units / Pcs</option>
                    </select>
                  </div>
                  <div>
                    <label>Requested Quantity *</label>
                    <input 
                      type="number" 
                      min="1" 
                      step="any"
                      placeholder="e.g. 50"
                      value={newRequest.requested_qty} 
                      onChange={(e) => setNewRequest({ ...newRequest, requested_qty: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-full" style={{ marginTop: '14px' }}>
                  <label>Urgency Level</label>
                  <select
                    value={newRequest.urgency}
                    onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })}
                  >
                    <option value="Normal">Normal (Next Day Loading)</option>
                    <option value="High">High (Same Day Replenishment)</option>
                    <option value="Urgent">Urgent (Stockout on Route)</option>
                  </select>
                </div>

                <div className="form-group-full">
                  <label>Notes / Specific Instructions</label>
                  <textarea 
                    rows="2"
                    placeholder="e.g. Customer urgent booking in Broadway Beat..."
                    value={newRequest.notes}
                    onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="action-btn"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="action-btn"
                  disabled={isSubmitting}
                  style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600 }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Approve / Dispatch / Reject Action */}
      {selectedReqForAction && (
        <div className="modal-backdrop" onClick={() => setSelectedReqForAction(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {actionType === 'approve' && 'Approve & Fulfill Stock to Van'}
                {actionType === 'dispatch' && 'Confirm Van Loading / Dispatch'}
                {actionType === 'reject' && 'Reject Stock Request'}
              </h3>
              <button className="modal-close-btn" onClick={() => setSelectedReqForAction(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteStatusUpdate}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Request Code:</span>
                    <strong>#{selectedReqForAction.request_code}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Salesman:</span>
                    <span>{selectedReqForAction.salesman_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Product:</span>
                    <strong>{selectedReqForAction.product_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Requested Quantity:</span>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>{selectedReqForAction.requested_qty} {selectedReqForAction.package_type}</span>
                  </div>
                </div>

                {actionType === 'approve' && (
                  <div className="form-group-full">
                    <label>Approved Quantity to Release *</label>
                    <input 
                      type="number" 
                      min="1" 
                      step="any"
                      value={approvedQty}
                      onChange={(e) => setApprovedQty(e.target.value)}
                      required
                    />
                    <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Warehouse inventory stock in hand: {selectedReqForAction.warehouse_current_stock || 'Available'} units
                    </small>
                  </div>
                )}

                <div className="form-group-full">
                  <label>Remarks / Fulfillment Notes</label>
                  <textarea 
                    rows="3"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter dispatch notes, invoice reference, or rejection reason..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="action-btn"
                  onClick={() => setSelectedReqForAction(null)}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="action-btn"
                  disabled={isSubmitting}
                  style={{ 
                    background: actionType === 'reject' ? '#dc2626' : '#059669', 
                    color: '#ffffff', 
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    fontWeight: 600 
                  }}
                >
                  {isSubmitting ? 'Processing...' : (
                    actionType === 'approve' ? 'Approve & Add Stock to Van' :
                    actionType === 'dispatch' ? 'Confirm Dispatched' : 'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
