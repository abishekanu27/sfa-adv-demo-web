import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Building2, 
  Calendar, 
  Package, 
  Download,
  Clock,
  ArrowRight,
  Boxes,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchWarehouseTransfersApi, 
  createWarehouseTransferApi, 
  deleteWarehouseTransferApi,
  fetchWarehousesApi,
  fetchProductsApi
} from '../../services/api';
import './WarehouseTransfers.css';

export const WarehouseTransfers = ({ user, onGoToWarehouses }) => {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    source_warehouse_id: '',
    source_warehouse_name: 'Central Logistics Hub (Peenya)',
    target_warehouse_id: '',
    target_warehouse_name: 'South Transit Hub (Electronic City)',
    product_id: '',
    product_name: '',
    product_sku: '',
    quantity: 10,
    transfer_date: new Date().toISOString().split('T')[0],
    status: 'Completed',
    reference_no: '',
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [trRes, whRes, pRes] = await Promise.all([
        fetchWarehouseTransfersApi(searchQuery, statusFilter),
        fetchWarehousesApi(),
        fetchProductsApi()
      ]);
      setTransfers(trRes || []);
      setWarehouses(whRes || []);
      setProducts(pRes || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load warehouse transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  const handleProductSelect = (pId) => {
    const prod = products.find(p => String(p.product_id || p.id) === String(pId));
    if (prod) {
      setFormData(prev => ({
        ...prev,
        product_id: pId,
        product_name: prod.name,
        product_sku: prod.sku || ''
      }));
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!formData.source_warehouse_name || !formData.target_warehouse_name) {
      showNotification('Please specify both source and target warehouses', 'error');
      return;
    }
    if (formData.source_warehouse_name === formData.target_warehouse_name) {
      showNotification('Source and target warehouse cannot be the same', 'error');
      return;
    }
    if (!formData.product_name) {
      showNotification('Please select a product to transfer', 'error');
      return;
    }

    try {
      await createWarehouseTransferApi(formData);
      showNotification('Warehouse stock transfer recorded successfully!');
      setShowModal(false);
      setFormData({
        source_warehouse_id: '',
        source_warehouse_name: warehouses[0]?.name || 'Central Logistics Hub (Peenya)',
        target_warehouse_id: '',
        target_warehouse_name: warehouses[1]?.name || 'South Transit Hub (Electronic City)',
        product_id: '',
        product_name: '',
        product_sku: '',
        quantity: 10,
        transfer_date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        reference_no: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to record transfer', 'error');
    }
  };

  const handleDeleteTransfer = async (id, code) => {
    if (!window.confirm(`Delete transfer record #${code}?`)) return;
    try {
      await deleteWarehouseTransferApi(id);
      showNotification(`Transfer #${code} deleted`);
      loadData();
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete transfer', 'error');
    }
  };

  const handleExportExcel = () => {
    if (!transfers || transfers.length === 0) {
      showNotification('No transfers to export', 'error');
      return;
    }
    const rows = transfers.map(t => ({
      'Transfer Code': t.transfer_code,
      'Date': t.transfer_date,
      'Source Warehouse': t.source_warehouse_name,
      'Destination Warehouse': t.target_warehouse_name,
      'Product Name': t.product_name,
      'SKU': t.product_sku || '',
      'Transferred Quantity': parseFloat(t.quantity),
      'Challan / Ref #': t.reference_no || '',
      'Status': t.status,
      'Notes': t.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Warehouse_Transfers');
    XLSX.writeFile(wb, `Warehouse_Transfers_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Warehouse transfers exported to Excel (.xlsx)');
  };

  const totalCount = transfers.length;
  const completedCount = transfers.filter(t => t.status === 'Completed').length;
  const inTransitCount = transfers.filter(t => t.status === 'In Transit').length;
  const totalUnits = transfers.reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);

  return (
    <div className="wt-container">
      {/* Toast */}
      {toast && (
        <div className={`wt-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="wt-header">
        <div className="wt-header-left">
          <div className="wt-header-icon-wrap">
            <ArrowLeftRight size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="wt-title">Transfer to Warehouse</h1>
            <p className="wt-subtitle">
              Manage stock relocations between central logistics hubs, transit depots, and regional distribution warehouses.
            </p>
          </div>
        </div>

        <div className="wt-header-actions">
          <button className="wt-btn-secondary" onClick={handleExportExcel}>
            <Download size={16} />
            <span>Export Excel</span>
          </button>
          <button className="wt-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>New Stock Transfer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="wt-kpi-grid">
        <div className="wt-kpi-card">
          <div className="kpi-icon-box bg-blue-subtle">
            <ArrowLeftRight size={20} className="text-blue" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Transfers</span>
            <h3 className="kpi-value">{totalCount}</h3>
            <span className="kpi-sub">Inter-warehouse movements</span>
          </div>
        </div>

        <div className="wt-kpi-card">
          <div className="kpi-icon-box bg-emerald-subtle">
            <CheckCircle2 size={20} className="text-emerald" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Completed</span>
            <h3 className="kpi-value text-emerald">{completedCount}</h3>
            <span className="kpi-sub">Verified at destination</span>
          </div>
        </div>

        <div className="wt-kpi-card">
          <div className="kpi-icon-box bg-amber-subtle">
            <Clock size={20} className="text-amber" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">In Transit</span>
            <h3 className="kpi-value text-amber">{inTransitCount}</h3>
            <span className="kpi-sub">En route between depots</span>
          </div>
        </div>

        <div className="wt-kpi-card">
          <div className="kpi-icon-box bg-purple-subtle">
            <Boxes size={20} className="text-purple" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Units Moved</span>
            <h3 className="kpi-value">{totalUnits.toLocaleString('en-IN')}</h3>
            <span className="kpi-sub">Cumulative quantity</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="wt-controls-card">
        <div className="wt-search-box">
          <Search size={16} className="text-muted" />
          <input 
            type="text"
            placeholder="Search transfer code, product, warehouse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="wt-status-pills">
          {['All', 'Completed', 'In Transit'].map((st) => (
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

      {/* Table */}
      <div className="wt-table-container">
        <table className="wt-table">
          <thead>
            <tr>
              <th>Transfer Code</th>
              <th>Date</th>
              <th>Route (From ➔ To)</th>
              <th>Product Details</th>
              <th className="text-right">Quantity</th>
              <th>Challan / Ref #</th>
              <th className="text-center">Status</th>
              <th>Notes</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-8">
                  <div className="wt-spinner"></div>
                  <p className="text-muted mt-2">Loading warehouse transfers...</p>
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-10">
                  <Boxes size={40} className="text-muted mb-2 mx-auto" />
                  <p className="font-semibold text-gray-700">No transfers recorded</p>
                  <p className="text-muted text-sm">Initiate an inter-warehouse stock transfer to get started.</p>
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.transfer_id}>
                  <td>
                    <span className="transfer-code-badge">{t.transfer_code}</span>
                  </td>
                  <td>
                    <span className="date-badge">
                      <Calendar size={13} className="text-muted mr-1" />
                      {new Date(t.transfer_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td>
                    <div className="route-cell">
                      <span className="route-wh-from">{t.source_warehouse_name}</span>
                      <ArrowRight size={14} className="route-arrow text-primary" />
                      <span className="route-wh-to">{t.target_warehouse_name}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{t.product_name}</strong>
                    {t.product_sku && <span className="sku-subtext font-mono">SKU: {t.product_sku}</span>}
                  </td>
                  <td className="text-right font-bold text-gray-900">
                    {parseFloat(t.quantity).toLocaleString('en-IN')} units
                  </td>
                  <td>
                    <span className="ref-tag">{t.reference_no || 'Direct'}</span>
                  </td>
                  <td className="text-center">
                    <span className={`status-tag status-${(t.status || 'Completed').toLowerCase().replace(' ', '-')}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <span className="notes-preview text-muted" title={t.notes || ''}>
                      {t.notes || '-'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button 
                      className="wt-action-del-btn"
                      title="Delete record"
                      onClick={() => handleDeleteTransfer(t.transfer_id, t.transfer_code)}
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

      {/* Modal */}
      {showModal && (
        <div className="wt-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="wt-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="wt-modal-header">
              <div className="modal-title-wrap">
                <ArrowLeftRight size={20} className="text-primary" />
                <h3>New Warehouse Stock Transfer</h3>
              </div>
              <button className="wt-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="wt-form">
              <div className="wt-form-grid">
                <div className="form-group">
                  <label>Origin Warehouse (From) *</label>
                  <select
                    required
                    value={formData.source_warehouse_name}
                    onChange={(e) => {
                      const sel = warehouses.find(w => w.name === e.target.value);
                      setFormData({
                        ...formData,
                        source_warehouse_name: e.target.value,
                        source_warehouse_id: sel ? (sel.warehouse_id || sel.id) : null
                      });
                    }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouse_id || w.id} value={w.name}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Destination Warehouse (To) *</label>
                  <select
                    required
                    value={formData.target_warehouse_name}
                    onChange={(e) => {
                      const sel = warehouses.find(w => w.name === e.target.value);
                      setFormData({
                        ...formData,
                        target_warehouse_name: e.target.value,
                        target_warehouse_id: sel ? (sel.warehouse_id || sel.id) : null
                      });
                    }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouse_id || w.id} value={w.name}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Select Product *</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => handleProductSelect(e.target.value)}
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.product_id || p.id} value={p.product_id || p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''} - Stock: {p.current_stock || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Transfer Quantity (Units) *</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Transfer Date *</label>
                  <input 
                    type="date"
                    required
                    value={formData.transfer_date}
                    onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Delivery Challan / Ref #</label>
                  <input 
                    type="text"
                    placeholder="e.g., DC-2026-904"
                    value={formData.reference_no}
                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Transfer Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Completed">Completed (Received at destination)</option>
                    <option value="In Transit">In Transit (Vehicle on road)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Transfer Notes / Transport Details</label>
                <textarea 
                  rows="2"
                  placeholder="e.g., Vehicle KA-04-E-1234, driver contact, storage shelf..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="wt-modal-footer">
                <button type="button" className="wt-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="wt-btn-primary">
                  <CheckCircle2 size={16} />
                  <span>Execute Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
