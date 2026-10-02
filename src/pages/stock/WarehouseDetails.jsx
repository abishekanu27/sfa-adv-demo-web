import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  MapPin,
  User,
  Phone,
  Maximize2,
  Boxes
} from 'lucide-react';
import {
  fetchWarehousesApi,
  createWarehouseApi,
  updateWarehouseApi,
  deleteWarehouseApi
} from '../../services/api';
import './WarehouseDetails.css';

export const WarehouseDetails = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWh, setEditingWh] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    manager_name: '',
    phone: '',
    capacity_sqft: 15000,
    status: 'Active'
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const data = await fetchWarehousesApi(searchQuery);
      setWarehouses(data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load warehouses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, [searchQuery]);

  const handleOpenAdd = () => {
    setEditingWh(null);
    setFormData({
      code: '',
      name: '',
      location: '',
      manager_name: '',
      phone: '',
      capacity_sqft: 15000,
      status: 'Active'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (wh) => {
    setEditingWh(wh);
    setFormData({
      code: wh.code,
      name: wh.name,
      location: wh.location,
      manager_name: wh.manager_name || '',
      phone: wh.phone || '',
      capacity_sqft: wh.capacity_sqft || 10000,
      status: wh.status || 'Active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWh) {
        await updateWarehouseApi(editingWh.warehouse_id, formData);
        showNotification(`Warehouse "${formData.name}" updated successfully!`);
      } else {
        await createWarehouseApi(formData);
        showNotification(`Warehouse "${formData.name}" created successfully!`);
      }
      setShowModal(false);
      loadWarehouses();
    } catch (err) {
      showNotification(err.message || 'Error saving warehouse', 'error');
    }
  };

  const handleDelete = async (wh) => {
    if (!window.confirm(`Are you sure you want to remove warehouse "${wh.name}"?`)) return;
    try {
      await deleteWarehouseApi(wh.warehouse_id);
      showNotification(`Warehouse "${wh.name}" deleted`);
      loadWarehouses();
    } catch (err) {
      showNotification('Failed to delete warehouse', 'error');
    }
  };

  const totalCapacity = warehouses.reduce((acc, w) => acc + (parseFloat(w.capacity_sqft) || 0), 0);
  const totalStockUnits = warehouses.reduce((acc, w) => acc + (parseFloat(w.total_inventory_units) || 0), 0);

  return (
    <div className="wh-page-container">
      {/* Toast */}
      {toast && (
        <div className={`enterprise-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="wh-page-header">
        <div className="wh-header-title">
          <div className="wh-header-icon">
            <Warehouse size={24} />
          </div>
          <div>
            <h1>Warehouse &amp; Depot Management</h1>
            <p>Configure central fulfillment centers, regional stockyards, and distribution hub facilities</p>
          </div>
        </div>

        <button className="inv-btn inv-btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Add Warehouse</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="wh-kpi-grid">
        <div className="wh-kpi-card">
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
            Total Depots
          </span>
          <div className="wh-kpi-val">{warehouses.length} Facilities</div>
        </div>
        <div className="wh-kpi-card">
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
            Total Floor Space
          </span>
          <div className="wh-kpi-val">{totalCapacity.toLocaleString()} Sq.Ft</div>
        </div>
        <div className="wh-kpi-card">
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
            Stored Stock Units
          </span>
          <div className="wh-kpi-val">{totalStockUnits.toLocaleString()} Units</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="wh-filter-bar">
        <div className="wh-search-input-wrap">
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="wh-search-input"
            placeholder="Search warehouse by name, code, location or manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="wh-table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading warehouses...</div>
        ) : warehouses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No warehouses registered yet. Click <strong>"Add Warehouse"</strong> to register your first depot.
          </div>
        ) : (
          <table className="wh-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Warehouse Name</th>
                <th>Location / Address</th>
                <th>Manager</th>
                <th>Contact</th>
                <th>Capacity (Sq.Ft)</th>
                <th>Stored SKUs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => (
                <tr key={wh.warehouse_id}>
                  <td>
                    <span className="wh-code-badge">{wh.code}</span>
                  </td>
                  <td>
                    <strong>{wh.name}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                      <MapPin size={13} color="#64748b" />
                      <span>{wh.location}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} color="#64748b" />
                      <span>{wh.manager_name || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} color="#64748b" />
                      <span>{wh.phone || '-'}</span>
                    </div>
                  </td>
                  <td>{parseFloat(wh.capacity_sqft || 0).toLocaleString()} sq.ft</td>
                  <td>
                    <span style={{ fontWeight: '600', color: '#0369a1' }}>
                      {wh.stored_sku_count || 0} SKUs
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${wh.status === 'Active' ? 'paid' : 'unpaid'}`}>
                      {wh.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="icon-action-btn"
                        title="Edit Warehouse"
                        onClick={() => handleOpenEdit(wh)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="icon-action-btn delete"
                        title="Delete Warehouse"
                        onClick={() => handleDelete(wh)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingWh ? 'Edit Warehouse Facility' : 'Register New Warehouse Facility'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Warehouse Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. WH-004 (Auto if blank)"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Warehouse Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Ernakulam Marine Drive Depot"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Full Location / Physical Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Plot No 42, Industrial Development Area, Aluva, Ernakulam"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Depot Manager Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rajesh Nair"
                      value={formData.manager_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, manager_name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 98470 55443"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label>Capacity (Sq.Ft)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="15000"
                      value={formData.capacity_sqft}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity_sqft: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Operational Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="Active">Active Facility</option>
                      <option value="Maintenance">Under Maintenance</option>
                      <option value="Inactive">Inactive / Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="inv-btn inv-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inv-btn inv-btn-primary"
                >
                  {editingWh ? 'Save Changes' : 'Register Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default WarehouseDetails;
