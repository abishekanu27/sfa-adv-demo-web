import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Trash2, 
  ArrowRight,
  Repeat,
  MapPin,
  Package
} from 'lucide-react';
import { 
  fetchVanToVanTransfersApi, 
  createVanToVanTransferApi, 
  updateVanToVanTransferStatusApi, 
  deleteVanToVanTransferApi,
  fetchProductsApi,
  fetchUsersApi
} from '../../services/api';
import './VanToVanRequests.css';

export const VanToVanRequests = ({ user }) => {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTransferForAction, setSelectedTransferForAction] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve' | 'complete' | 'cancel'
  const [actionNotes, setActionNotes] = useState('');
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    source_salesman_id: '',
    source_salesman_name: '',
    source_vehicle_reg: '',
    target_salesman_id: '',
    target_salesman_name: '',
    target_vehicle_reg: '',
    product_id: '',
    package_type: 'Box',
    quantity: '',
    reason: '',
    location_of_exchange: '',
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [transfersData, prods, usersData] = await Promise.all([
        fetchVanToVanTransfersApi({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          search: searchQuery || undefined
        }),
        fetchProductsApi(),
        fetchUsersApi()
      ]);
      setTransfers(transfersData || []);
      setProducts(prods || []);
      const salesReps = (usersData || []).filter(u => u.role === 'SALES_EXECUTIVE' || u.role === 'SALESMAN' || u.role === 'SLMN' || (u.department && u.department.toLowerCase().includes('sales')));
      setSalesmenList(salesReps);
      if (salesReps.length > 0) {
        setFormData(prev => ({
          ...prev,
          source_salesman_id: prev.source_salesman_id || salesReps[0].id,
          source_salesman_name: prev.source_salesman_name || salesReps[0].name,
          target_salesman_id: prev.target_salesman_id || (salesReps[1]?.id || salesReps[0].id),
          target_salesman_name: prev.target_salesman_name || (salesReps[1]?.name || salesReps[0].name)
        }));
      }
    } catch (err) {
      console.error('Error loading V2V transfers:', err);
      showNotification('Failed to load van-to-van transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  // Handle Action Trigger
  const handleOpenActionModal = (transfer, type) => {
    setSelectedTransferForAction(transfer);
    setActionType(type);
    setActionNotes(type === 'cancel' ? 'Cancelled due to route mismatch' : 'Approved for field exchange');
  };

  const handleExecuteStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTransferForAction) return;

    try {
      setIsSubmitting(true);
      let statusToSet = 'Pending';
      if (actionType === 'approve') statusToSet = 'Approved';
      if (actionType === 'complete') statusToSet = 'Completed';
      if (actionType === 'cancel') statusToSet = 'Cancelled';

      await updateVanToVanTransferStatusApi(selectedTransferForAction.transfer_id, {
        status: statusToSet,
        notes: actionNotes
      });

      showNotification(`Transfer #${selectedTransferForAction.transfer_code} marked as ${statusToSet}!`);
      setSelectedTransferForAction(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to update transfer status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Transfer
  const handleDeleteTransfer = async (id, code) => {
    if (window.confirm(`Are you sure you want to delete transfer #${code}?`)) {
      try {
        await deleteVanToVanTransferApi(id);
        showNotification(`Transfer #${code} deleted successfully`);
        await loadData();
      } catch (err) {
        showNotification(err.message || 'Failed to delete transfer', 'error');
      }
    }
  };

  // Submit New Transfer
  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity) {
      showNotification('Please select a product and enter transfer quantity', 'error');
      return;
    }
    if (formData.source_salesman_id === formData.target_salesman_id) {
      showNotification('Source and Destination salesmen cannot be identical', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await createVanToVanTransferApi(formData);
      showNotification('Van-to-Van stock transfer requested successfully!');
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to request transfer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI Metrics Calculation
  const totalCount = transfers.length;
  const pendingCount = transfers.filter(t => t.status === 'Pending').length;
  const completedCount = transfers.filter(t => t.status === 'Completed').length;
  const totalUnits = transfers.reduce((sum, t) => sum + (parseFloat(t.quantity) || 0), 0);

  return (
    <div className="v2v-page">
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
            <span className="breadcrumb-active">Van to Van Stock Transfers</span>
          </nav>
          <h1 className="dashboard-main-title">
            Inter-Van Stock Exchange &amp; Transfers
          </h1>
          <p className="dashboard-sub-title">
            Manage peer-to-peer inventory transfers between delivery vans on active beats to resolve immediate stockouts and balance field stock.
          </p>
        </div>

        <div className="page-header-actions">
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="v2v-metrics-grid">
        <div className="v2v-metric-card">
          <div className="metric-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Repeat size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total V2V Requests</span>
            <span className="metric-val">{totalCount} Requests</span>
            <span className="metric-sub">Peer transfers logged</span>
          </div>
        </div>

        <div className="v2v-metric-card">
          <div className="metric-icon-wrap amber">
            <Clock size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending Approval</span>
            <span className="metric-val" style={{ color: '#d97706' }}>{pendingCount} Pending</span>
            <span className="metric-sub">Awaiting manager consent</span>
          </div>
        </div>

        <div className="v2v-metric-card">
          <div className="metric-icon-wrap green">
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Completed Transfers</span>
            <span className="metric-val" style={{ color: '#059669' }}>{completedCount} Exchanged</span>
            <span className="metric-sub">Stock handoff confirmed</span>
          </div>
        </div>

        <div className="v2v-metric-card">
          <div className="metric-icon-wrap blue">
            <Package size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Units Rebalanced</span>
            <span className="metric-val" style={{ color: '#2563eb' }}>{totalUnits} Units</span>
            <span className="metric-sub">Inter-route goods shifted</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="v2v-filter-strip">
        <div className="filter-left-tools">
          <div className="search-box-wrap">
            <Search size={15} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search Transfer #, Salesman, Product, Van Reg..."
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
            {['All', 'Pending', 'Approved', 'Completed', 'Cancelled'].map(s => (
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

      {/* Table Card */}
      <div className="v2v-table-card">
        <div className="table-responsive-wrap">
          <table className="v2v-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Transfer #</th>
                <th>Source Van (Sender)</th>
                <th></th>
                <th>Target Van (Receiver)</th>
                <th>Product Description</th>
                <th>Transfer Qty</th>
                <th>Exchange Location</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ minWidth: '220px', width: '220px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading van to van transfer requisitions...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Repeat size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No van-to-van transfer records found</p>
                  </td>
                </tr>
              ) : (
                transfers.map(t => {
                  const statusClass = t.status ? t.status.toLowerCase() : 'pending';
                  return (
                    <tr key={t.transfer_id}>
                      <td>
                        <span className="v2v-code-badge">#{t.transfer_code}</span>
                      </td>
                      <td>
                        <div className="van-node">
                          <span className="van-node-name">{t.source_salesman_name}</span>
                          <span className="van-node-sub">Van: {t.source_vehicle_reg || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="transfer-arrow-icon">
                          <ArrowRight size={15} />
                        </div>
                      </td>
                      <td>
                        <div className="van-node">
                          <span className="van-node-name">{t.target_salesman_name}</span>
                          <span className="van-node-sub">Van: {t.target_vehicle_reg || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{t.product_name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          SKU: {t.product_sku || '-'}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#7c3aed', fontSize: '14px' }}>{t.quantity}</strong>{' '}
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>{t.package_type}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="#94a3b8" />
                          {t.location_of_exchange || 'Mid-route checkpoint'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {t.requested_at ? new Date(t.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`v2v-status-badge ${statusClass}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions-btn-group">
                          {(t.status === 'Pending' || t.status === 'Requested' || t.status === 'Pending Handover') && (
                            <>
                              <button 
                                className="v2v-action-btn approve"
                                onClick={() => handleOpenActionModal(t, 'approve')}
                                title="Approve Van-to-Van Transfer"
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                              <button 
                                className="v2v-action-btn reject"
                                onClick={() => handleOpenActionModal(t, 'cancel')}
                                title="Cancel Transfer"
                              >
                                <X size={13} />
                                <span>Cancel</span>
                              </button>
                            </>
                          )}
                          {t.status === 'Approved' && (
                            <button 
                              className="v2v-action-btn complete"
                              onClick={() => handleOpenActionModal(t, 'complete')}
                              title="Mark Handover Completed"
                            >
                              <CheckCircle2 size={13} />
                              <span>Complete</span>
                            </button>
                          )}
                          {t.status === 'Completed' && (
                            <span className="action-done-pill fulfilled">
                              <CheckCircle2 size={12} />
                              <span>Transferred</span>
                            </span>
                          )}
                          {t.status === 'Cancelled' && (
                            <span className="action-done-pill rejected">
                              <X size={12} />
                              <span>Cancelled</span>
                            </span>
                          )}
                          <button 
                            className="v2v-action-btn delete"
                            onClick={() => handleDeleteTransfer(t.transfer_id, t.transfer_code)}
                            title="Delete Transfer"
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

      {/* MODAL: Initiate Van-to-Van Transfer */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Initiate Van to Van Stock Transfer</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer}>
              <div className="modal-body">
                <div className="form-grid-2col">
                  <div>
                    <label>Source Van Salesman (Sender) *</label>
                    <select
                      value={formData.source_salesman_id}
                      onChange={(e) => {
                        const sel = salesmenList.find(s => s.id === e.target.value);
                        setFormData({
                          ...formData,
                          source_salesman_id: e.target.value,
                          source_salesman_name: sel ? sel.name : 'Sender Salesman'
                        });
                      }}
                      required
                    >
                      {salesmenList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.department || 'Sales'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Source Vehicle Reg #</label>
                    <input 
                      type="text" 
                      value={formData.source_vehicle_reg}
                      onChange={(e) => setFormData({ ...formData, source_vehicle_reg: e.target.value })}
                      placeholder="e.g. KL-11-AB-1234"
                    />
                  </div>
                </div>

                <div className="form-grid-2col" style={{ marginTop: '14px' }}>
                  <div>
                    <label>Target Van Salesman (Recipient) *</label>
                    <select
                      value={formData.target_salesman_id}
                      onChange={(e) => {
                        const sel = salesmenList.find(s => s.id === e.target.value);
                        setFormData({
                          ...formData,
                          target_salesman_id: e.target.value,
                          target_salesman_name: sel ? sel.name : 'Recipient Salesman'
                        });
                      }}
                      required
                    >
                      {salesmenList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.department || 'Sales'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Target Vehicle Reg #</label>
                    <input 
                      type="text" 
                      value={formData.target_vehicle_reg}
                      onChange={(e) => setFormData({ ...formData, target_vehicle_reg: e.target.value })}
                      placeholder="e.g. KL-07-CD-4521"
                    />
                  </div>
                </div>

                <div className="form-group-full" style={{ marginTop: '14px' }}>
                  <label>Select Product to Transfer *</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.product_id || p.id} value={p.product_id || p.id}>
                        {p.product_name || p.name} (SKU: {p.sku || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2col">
                  <div>
                    <label>Package Type</label>
                    <select
                      value={formData.package_type}
                      onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                    >
                      <option value="Box">Box</option>
                      <option value="Carton">Carton</option>
                      <option value="Bag">Bag</option>
                      <option value="Units">Units</option>
                    </select>
                  </div>
                  <div>
                    <label>Transfer Quantity *</label>
                    <input 
                      type="number" 
                      min="1" 
                      step="any"
                      placeholder="e.g. 25"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-full" style={{ marginTop: '14px' }}>
                  <label>Location of Physical Handover / Checkpoint</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Edappally Toll Junction / NH-66 Bypass Petrol Pump"
                    value={formData.location_of_exchange}
                    onChange={(e) => setFormData({ ...formData, location_of_exchange: e.target.value })}
                  />
                </div>

                <div className="form-group-full">
                  <label>Transfer Reason / Note</label>
                  <textarea 
                    rows="2"
                    placeholder="e.g. Urgent customer requirement in Broadway Beat..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  style={{ background: '#7c3aed', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600 }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Approve / Complete / Cancel Action */}
      {selectedTransferForAction && (
        <div className="modal-backdrop" onClick={() => setSelectedTransferForAction(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {actionType === 'approve' && 'Authorize Van-to-Van Transfer'}
                {actionType === 'complete' && 'Confirm Physical Handover Completed'}
                {actionType === 'cancel' && 'Cancel Transfer Request'}
              </h3>
              <button className="modal-close-btn" onClick={() => setSelectedTransferForAction(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteStatusUpdate}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Transfer Code:</span>
                    <strong>#{selectedTransferForAction.transfer_code}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Transfer:</span>
                    <span>{selectedTransferForAction.source_salesman_name} ➔ {selectedTransferForAction.target_salesman_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Product & Qty:</span>
                    <strong style={{ color: '#7c3aed' }}>{selectedTransferForAction.quantity} {selectedTransferForAction.package_type} of {selectedTransferForAction.product_name}</strong>
                  </div>
                </div>

                <div className="form-group-full">
                  <label>Remarks / Verification Note</label>
                  <textarea 
                    rows="3"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter approval note, handover confirmation, or reason..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="action-btn"
                  onClick={() => setSelectedTransferForAction(null)}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="action-btn"
                  disabled={isSubmitting}
                  style={{ 
                    background: actionType === 'cancel' ? '#dc2626' : '#7c3aed', 
                    color: '#ffffff', 
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    fontWeight: 600 
                  }}
                >
                  {isSubmitting ? 'Updating...' : `Confirm ${actionType.toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
