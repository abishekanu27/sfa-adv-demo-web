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
  Boxes,
  Building2,
  Filter
} from 'lucide-react';
import {
  fetchWarehousesApi,
  createWarehouseApi,
  updateWarehouseApi,
  deleteWarehouseApi,
  fetchBranchesApi
} from '../../services/api';
import { getUserFromStorage, isUserAdmin } from '../../utils/permissions';
import './WarehouseDetails.css';

export const WarehouseDetails = () => {
  const user = getUserFromStorage();
  const isAdmin = isUserAdmin(user);
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState(() => (!isAdmin && userBranchId) ? userBranchId : 'all');
  const [showModal, setShowModal] = useState(false);
  const [editingWh, setEditingWh] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    branch_id: (!isAdmin && userBranchId) ? userBranchId : '',
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

  const loadBranches = async () => {
    try {
      const bList = await fetchBranchesApi();
      setBranches(bList || []);
    } catch (e) {
      console.warn('Failed to load branches:', e);
    }
  };

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const data = await fetchWarehousesApi(searchQuery, branchFilter);
      setWarehouses(data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load warehouses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [searchQuery, branchFilter]);

  const handleOpenAdd = () => {
    setEditingWh(null);
    const defaultBranchId = (!isAdmin && userBranchId) ? userBranchId : (branches[0]?.branch_id || '1');
    setFormData({
      code: '',
      name: '',
      branch_id: defaultBranchId,
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
    const defaultBranchId = (!isAdmin && userBranchId) ? userBranchId : (wh.branch_id || branches[0]?.branch_id || '1');
    setFormData({
      code: wh.code,
      name: wh.name,
      branch_id: defaultBranchId,
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

        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Building2 size={14} color="#64748b" />
            <select 
              value={branchFilter} 
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500', color: '#334155', cursor: 'pointer' }}
            >
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_code} - {b.branch_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600, fontSize: '13px' }}>
            <Building2 size={14} color="#16a34a" />
            <span>Assigned Branch: {branches.find(b => String(b.branch_id) === String(userBranchId))?.branch_name || user?.branch_name || 'My Branch'}</span>
            <span style={{ fontSize: '11px', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>🔒 Read-Only</span>
          </div>
        )}
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
                <th>Branch</th>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: '#166534', background: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                      <Building2 size={12} />
                      {wh.branch_name || branches.find(b => b.branch_id === wh.branch_id)?.branch_name || 'Main Branch'}
                    </span>
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
                {/* Mandatory Branch Field */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Assigned Branch *</span>
                    {!isAdmin && (
                      <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        🔒 Read-Only (Sub-Branch Access)
                      </span>
                    )}
                  </label>
                  {isAdmin ? (
                    <select
                      className="form-select"
                      required
                      value={formData.branch_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.branch_id} value={b.branch_id}>
                          {b.branch_code} - {b.branch_name} ({b.city})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <select
                        className="form-select"
                        disabled
                        value={formData.branch_id}
                        style={{ background: '#f8fafc', color: '#334155', cursor: 'not-allowed', borderColor: '#cbd5e1' }}
                      >
                        {branches.map(b => (
                          <option key={b.branch_id} value={b.branch_id}>
                            {b.branch_code} - {b.branch_name} ({b.city})
                          </option>
                        ))}
                      </select>
                      <small style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                        The Assigned Branch is fixed for sub-branch users and cannot be changed.
                      </small>
                    </div>
                  )}
                </div>

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
