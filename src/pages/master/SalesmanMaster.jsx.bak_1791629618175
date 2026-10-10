import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  Smartphone,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Warehouse,
  Truck,
  MapPin,
  RefreshCw,
  Eye,
  EyeOff,
  Compass
} from 'lucide-react';
import {
  fetchUsersApi,
  createUserApi,
  updateUserApi,
  toggleUserStatusApi,
  deleteUserApi,
  fetchRolesApi,
  fetchBranchesApi,
  fetchWarehousesApi
} from '../../services/api';
import { KERALA_DISTRICTS, getLocalAreasForKeralaDistrict } from '../../data/locationData';
import './SalesmanMaster.css';

export const SalesmanMaster = ({ selectedBranchId }) => {
  const [salesmen, setSalesmen] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState(() => selectedBranchId && selectedBranchId !== 'all' ? String(selectedBranchId) : 'all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    branch_id: '',
    assigned_warehouse_id: '',
    assigned_location: 'Palakkad',
    assigned_beats: [],
    assigned_vehicle_id: '',
    status: 'ACTIVE'
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [uData, rData, bData, whData, vehRes, routeRes] = await Promise.all([
        fetchUsersApi(),
        fetchRolesApi(),
        fetchBranchesApi(),
        fetchWarehousesApi(),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sales/vehicles`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sales/routes`).then(r => r.json()).catch(() => ({ success: false }))
      ]);

      setRoles(rData || []);
      setBranches(bData || []);
      setWarehouses(whData || []);
      if (vehRes?.success) setVehicles(vehRes.vehicles || []);
      if (routeRes?.success) setRoutes(routeRes.routes || []);

      // Filter only salesmen / field sales reps
      const fieldReps = (uData || []).filter(u => 
        u.role_code === 'SALESMAN' || 
        u.role === 'SALES_EXECUTIVE' || 
        u.role_name?.toLowerCase().includes('sales') ||
        u.can_login_web === false
      );
      setSalesmen(fieldReps);
    } catch (err) {
      showToast(err.message || 'Failed to load salesman data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleBranchesUpdated = () => {
      fetchBranchesApi().then(bData => {
        if (bData) setBranches(bData);
      }).catch(console.error);
    };
    window.addEventListener('branchesUpdated', handleBranchesUpdated);
    return () => window.removeEventListener('branchesUpdated', handleBranchesUpdated);
  }, []);

  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'all') {
      setBranchFilter(String(selectedBranchId));
    }
  }, [selectedBranchId]);

  const handleOpenAdd = () => {
    setEditingSalesman(null);
    setShowPassword(false);
    const defaultBranch = branches[0]?.branch_id || 1;
    const defaultLoc = 'Palakkad';
    const locBeats = getLocalAreasForKeralaDistrict(defaultLoc).slice(0, 3);

    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      branch_id: defaultBranch,
      assigned_warehouse_id: warehouses.find(w => w.branch_id === defaultBranch)?.warehouse_id || warehouses[0]?.warehouse_id || '',
      assigned_location: defaultLoc,
      assigned_beats: locBeats,
      assigned_vehicle_id: '',
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sm) => {
    setEditingSalesman(sm);
    setShowPassword(false);
    setFormData({
      name: sm.name || '',
      username: sm.username || '',
      email: sm.email || '',
      phone: sm.phone || '',
      password: sm.password || '',
      confirm_password: sm.password || '',
      branch_id: sm.branch_id || branches[0]?.branch_id || 1,
      assigned_warehouse_id: sm.assigned_warehouse_id || '',
      assigned_location: sm.assigned_location || 'Palakkad',
      assigned_beats: Array.isArray(sm.assigned_beats) ? sm.assigned_beats : [],
      assigned_vehicle_id: sm.assigned_vehicle_id || '',
      status: sm.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleLocationChange = (loc) => {
    const beats = getLocalAreasForKeralaDistrict(loc).slice(0, 3);
    setFormData(prev => ({
      ...prev,
      assigned_location: loc,
      assigned_beats: beats
    }));
  };

  const handleToggleBeat = (beat) => {
    setFormData(prev => {
      const exists = prev.assigned_beats.includes(beat);
      return {
        ...prev,
        assigned_beats: exists 
          ? prev.assigned_beats.filter(b => b !== beat)
          : [...prev.assigned_beats, beat]
      };
    });
  };

  const handleBranchChange = (branchId) => {
    const bId = parseInt(branchId, 10);
    const branchWhs = warehouses.filter(w => w.branch_id === bId);
    setFormData(prev => ({
      ...prev,
      branch_id: bId,
      assigned_warehouse_id: branchWhs[0]?.warehouse_id || ''
    }));
  };

  const handleSaveSalesman = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast('Name and email are required.', 'error');
      return;
    }

    if (!editingSalesman && !formData.password) {
      showToast('Password is required for new salesman.', 'error');
      return;
    }

    if ((!editingSalesman || formData.password) && formData.password !== formData.confirm_password) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const salesRole = roles.find(r => r.role_code === 'SALESMAN') || roles[0];
      const payload = {
        ...formData,
        role_id: salesRole?.role_id,
        role: 'SALES_EXECUTIVE',
        department: 'Field Sales & Distribution',
        branch_id: parseInt(formData.branch_id, 10) || 1,
        assigned_branches: [parseInt(formData.branch_id, 10) || 1]
      };

      if (editingSalesman) {
        const res = await updateUserApi(editingSalesman.id, payload);
        showToast(res.message || 'Salesman updated successfully.');
      } else {
        const res = await createUserApi(payload);
        showToast(res.message || 'Salesman created successfully with branch & beat assignments!');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save salesman', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sm) => {
    try {
      const res = await toggleUserStatusApi(sm.id);
      showToast(res.message || 'Salesman status updated.');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (sm) => {
    if (!window.confirm(`Are you sure you want to remove salesman "${sm.name}"?`)) return;
    try {
      await deleteUserApi(sm.id);
      showToast('Salesman removed successfully.');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to remove salesman', 'error');
    }
  };

  // Filtered List
  const filteredSalesmen = salesmen.filter(sm => {
    const matchesSearch = !searchQuery.trim() || 
      (sm.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sm.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sm.phone || '').includes(searchQuery) ||
      (sm.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch = branchFilter === 'all' || String(sm.branch_id) === String(branchFilter);
    const matchesStatus = statusFilter === 'all' || (sm.status || 'ACTIVE').toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const availableBeatsForLocation = getLocalAreasForKeralaDistrict(formData.assigned_location || 'Palakkad');
  const warehousesForSelectedBranch = warehouses.filter(w => !formData.branch_id || w.branch_id === parseInt(formData.branch_id, 10));

  return (
    <div className="salesman-master-container">
      {/* Toast */}
      {toast && (
        <div className={`enterprise-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="salesman-header-panel">
        <div className="salesman-title-group">
          <div className="salesman-icon-badge">
            <Users size={22} color="#2563eb" />
          </div>
          <div>
            <h2 className="salesman-main-title">Salesman Master</h2>
            <p className="salesman-sub-title">
              Manage field sales representatives, branch allocations, warehouse/van links, and beat assignments.
            </p>
          </div>
        </div>

        <button className="salesman-primary-btn" onClick={handleOpenAdd}>
          <UserPlus size={16} />
          <span>Add Salesman</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="salesman-kpi-grid">
        <div className="salesman-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={20} />
          </div>
          <div>
            <span className="kpi-label">Total Salesmen</span>
            <span className="kpi-value">{salesmen.length}</span>
          </div>
        </div>

        <div className="salesman-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <Smartphone size={20} />
          </div>
          <div>
            <span className="kpi-label">Active on Field</span>
            <span className="kpi-value">
              {salesmen.filter(s => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length}
            </span>
          </div>
        </div>

        <div className="salesman-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Building2 size={20} />
          </div>
          <div>
            <span className="kpi-label">Branches Covered</span>
            <span className="kpi-value">
              {new Set(salesmen.map(s => s.branch_id).filter(Boolean)).size || 1}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="salesman-filter-toolbar">
        <div className="salesman-search-box">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="salesman-filter-selects">
          <div className="filter-item">
            <Building2 size={15} color="#64748b" />
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_code} - {b.branch_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <Filter size={15} color="#64748b" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Salesman Table */}
      <div className="salesman-table-container">
        {loading ? (
          <div className="salesman-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading salesman registry...</span>
          </div>
        ) : filteredSalesmen.length === 0 ? (
          <div className="salesman-empty-state">
            <Users size={48} color="#cbd5e1" />
            <h3>No Salesmen Found</h3>
            <p>No salesmen match your current filter criteria. Click "Add Salesman" to register a field rep.</p>
          </div>
        ) : (
          <table className="salesman-table">
            <thead>
              <tr>
                <th>Salesman</th>
                <th>Contact</th>
                <th>Branch Assignment</th>
                <th>Warehouse / Van</th>
                <th>Territory & Beats</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalesmen.map(sm => {
                const branchObj = branches.find(b => b.branch_id === sm.branch_id);
                const whObj = warehouses.find(w => w.warehouse_id === sm.assigned_warehouse_id);
                const beats = Array.isArray(sm.assigned_beats) ? sm.assigned_beats : [];

                return (
                  <tr key={sm.id}>
                    <td>
                      <div className="salesman-profile-cell">
                        <div className="salesman-avatar">
                          {(sm.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="salesman-name">{sm.name}</strong>
                          <span className="salesman-username">@{sm.username || sm.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="salesman-contact-cell">
                        {sm.phone && (
                          <span>
                            <Phone size={13} /> {sm.phone}
                          </span>
                        )}
                        {sm.email && (
                          <span className="email-subtext">
                            <Mail size={13} /> {sm.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="branch-tag">
                        <Building2 size={13} />
                        {branchObj ? `${branchObj.branch_code} (${branchObj.city || branchObj.branch_name})` : (sm.branch_name || 'Main Branch')}
                      </span>
                    </td>

                    <td>
                      <div className="wh-van-cell">
                        <span className="wh-tag">
                          <Warehouse size={13} />
                          {whObj ? whObj.name : 'Main Depot'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="territory-cell">
                        <strong className="loc-name">
                          <MapPin size={13} color="#2563eb" /> {sm.assigned_location || 'Kerala'}
                        </strong>
                        {beats.length > 0 && (
                          <div className="beats-pills-wrap">
                            {beats.slice(0, 2).map((beat, idx) => (
                              <span key={idx} className="beat-mini-pill">{beat}</span>
                            ))}
                            {beats.length > 2 && (
                              <span className="beat-more-pill">+{beats.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        className={`status-pill ${sm.status === 'ACTIVE' ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(sm)}
                        title="Click to toggle status"
                      >
                        {sm.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-wrap">
                        <button
                          className="action-icon-btn edit"
                          onClick={() => handleOpenEdit(sm)}
                          title="Edit Salesman"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="action-icon-btn delete"
                          onClick={() => handleDelete(sm)}
                          title="Delete Salesman"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Add / Edit Salesman */}
      {isModalOpen && (
        <div className="salesman-modal-overlay">
          <div className="salesman-modal-card">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Users size={20} color="#2563eb" />
                <h3>{editingSalesman ? 'Edit Salesman' : 'Add New Salesman'}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSalesman} className="modal-body-form">
              {/* Personal Details */}
              <div className="form-section-title">Personal & Login Credentials</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Krishna"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Username / Login ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. anand_sales"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="anand@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{editingSalesman ? 'New Password (Optional)' : 'Password *'}</label>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={editingSalesman ? 'Leave blank to preserve password' : 'Enter login password'}
                      required={!editingSalesman}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="pwd-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  />
                </div>
              </div>

              {/* Branch & Warehouse Assignment */}
              <div className="form-section-title">Branch & Warehouse Allocation</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Assigned Branch *</label>
                  <select
                    required
                    value={formData.branch_id}
                    onChange={(e) => handleBranchChange(e.target.value)}
                  >
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.branch_code} - {b.branch_name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Stock Sourcing Warehouse *</label>
                  <select
                    value={formData.assigned_warehouse_id}
                    onChange={(e) => setFormData({ ...formData, assigned_warehouse_id: e.target.value })}
                  >
                    <option value="">Select Warehouse Depot</option>
                    {warehousesForSelectedBranch.map(w => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.code} - {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location & Beats Assignment */}
              <div className="form-section-title">Territory Location & Beats</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Operating District / Territory *</label>
                  <select
                    value={formData.assigned_location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                  >
                    {KERALA_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Select Authorized Beats ({formData.assigned_beats.length} selected)</label>
                  <div className="beats-selector-panel">
                    {availableBeatsForLocation.map(beat => {
                      const isSelected = formData.assigned_beats.includes(beat);
                      return (
                        <button
                          key={beat}
                          type="button"
                          className={`beat-select-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleBeat(beat)}
                        >
                          {isSelected ? '✓ ' : '+ '}{beat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingSalesman ? 'Update Salesman' : 'Register Salesman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SalesmanMaster;
