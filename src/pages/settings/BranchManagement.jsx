import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
  Warehouse,
  Users,
  ShieldCheck,
  RefreshCw,
  Power,
  FileText
} from 'lucide-react';
import {
  fetchBranchesApi,
  createBranchApi,
  updateBranchApi,
  toggleBranchStatusApi,
  deleteBranchApi
} from '../../services/api';
import { KERALA_DISTRICTS } from '../../data/locationData';
import './BranchManagement.css';

export const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    branch_code: '',
    branch_name: '',
    company_id: 'default_company',
    address: '',
    city: 'Palakkad',
    district: 'Palakkad',
    state: 'Kerala',
    pincode: '',
    phone: '',
    email: '',
    manager_name: '',
    gstin: '',
    status: 'Active'
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await fetchBranchesApi({
        search: searchQuery,
        status: statusFilter
      });
      setBranches(data);
    } catch (err) {
      showToast(err.message || 'Failed to load branches', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingBranch(null);
    // Generate next branch code suggestion based on current count
    const nextNum = (branches.length + 1).toString().padStart(3, '0');
    setFormData({
      branch_code: `BR-REG-${nextNum}`,
      branch_name: '',
      company_id: 'default_company',
      address: '',
      city: 'Kochi',
      district: 'Ernakulam',
      state: 'Kerala',
      pincode: '',
      phone: '',
      email: '',
      manager_name: '',
      gstin: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_code: branch.branch_code || '',
      branch_name: branch.branch_name || '',
      company_id: branch.company_id || 'default_company',
      address: branch.address || '',
      city: branch.city || '',
      district: branch.district || '',
      state: branch.state || 'Kerala',
      pincode: branch.pincode || '',
      phone: branch.phone || '',
      email: branch.email || '',
      manager_name: branch.manager_name || '',
      gstin: branch.gstin || '',
      status: branch.status || (branch.is_active ? 'Active' : 'Inactive')
    });
    setIsModalOpen(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!formData.branch_code || !formData.branch_name) {
      showToast('Branch code and branch name are required.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingBranch) {
        await updateBranchApi(editingBranch.branch_id, formData);
        showToast('Branch updated successfully.');
      } else {
        await createBranchApi(formData);
        showToast('New branch created successfully.');
      }
      setIsModalOpen(false);
      loadBranches();
      window.dispatchEvent(new CustomEvent('branchesUpdated'));
    } catch (err) {
      showToast(err.message || 'Failed to save branch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (branch) => {
    try {
      await toggleBranchStatusApi(branch.branch_id);
      showToast(`Branch status toggled.`);
      loadBranches();
      window.dispatchEvent(new CustomEvent('branchesUpdated'));
    } catch (err) {
      showToast(err.message || 'Failed to update branch status', 'error');
    }
  };

  const handleDeleteBranch = async (branch) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branch.branch_name}" (${branch.branch_code})?`)) return;
    try {
      await deleteBranchApi(branch.branch_id);
      showToast('Branch deleted successfully.');
      loadBranches();
      window.dispatchEvent(new CustomEvent('branchesUpdated'));
    } catch (err) {
      showToast(err.message || 'Cannot delete branch because records depend on it.', 'error');
    }
  };

  // Metrics
  const totalBranches = branches.length;
  const activeBranches = branches.filter(b => b.is_active || b.status === 'Active').length;
  const totalWarehouses = branches.reduce((sum, b) => sum + (parseInt(b.warehouse_count, 10) || 0), 0);
  const totalCustomers = branches.reduce((sum, b) => sum + (parseInt(b.customer_count, 10) || 0), 0);

  return (
    <div className="branch-management-view">
      {/* Toast */}
      {toast && (
        <div className={`enterprise-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="branch-header-banner">
        <div className="banner-left">
          <div className="banner-icon-box">
            <Building2 size={24} color="#2563eb" />
          </div>
          <div>
            <h2 className="banner-title">Branch Management</h2>
            <p className="banner-desc">
              Configure multi-branch infrastructure, regional depots, operational tax entities, and territorial boundaries.
            </p>
          </div>
        </div>

        <button className="add-branch-btn" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="branch-kpi-row">
        <div className="branch-kpi-card">
          <div className="kpi-icon-circ" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Building2 size={20} />
          </div>
          <div>
            <span className="kpi-tag">Total Registered Branches</span>
            <span className="kpi-val">{totalBranches}</span>
          </div>
        </div>

        <div className="branch-kpi-card">
          <div className="kpi-icon-circ" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="kpi-tag">Active Branches</span>
            <span className="kpi-val">{activeBranches}</span>
          </div>
        </div>

        <div className="branch-kpi-card">
          <div className="kpi-icon-circ" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Warehouse size={20} />
          </div>
          <div>
            <span className="kpi-tag">Linked Warehouses</span>
            <span className="kpi-val">{totalWarehouses}</span>
          </div>
        </div>

        <div className="branch-kpi-card">
          <div className="kpi-icon-circ" style={{ background: '#fff7ed', color: '#ea580c' }}>
            <Users size={20} />
          </div>
          <div>
            <span className="kpi-tag">Associated Customers</span>
            <span className="kpi-val">{totalCustomers}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="branch-filter-bar">
        <div className="branch-search-input-box">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search branches by code, name, city, or manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="branch-filters-group">
          <div className="filter-pill-select">
            <Filter size={14} color="#64748b" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="branch-table-container">
        {loading ? (
          <div className="branch-table-loading">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading branch entities...</span>
          </div>
        ) : branches.length === 0 ? (
          <div className="branch-table-empty">
            <Building2 size={44} color="#cbd5e1" />
            <h4>No Branches Found</h4>
            <p>No branch records match your filter criteria. Click "Add New Branch" to create one.</p>
          </div>
        ) : (
          <table className="branch-table">
            <thead>
              <tr>
                <th>Branch Details</th>
                <th>Location / Region</th>
                <th>Manager & Contact</th>
                <th>Tax & GSTIN</th>
                <th>Resources</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => {
                const isActive = branch.is_active || branch.status === 'Active';
                return (
                  <tr key={branch.branch_id}>
                    <td>
                      <div className="branch-cell-title">
                        <div className="branch-avatar">
                          {branch.branch_code.slice(-3)}
                        </div>
                        <div>
                          <strong className="branch-name-text">{branch.branch_name}</strong>
                          <span className="branch-code-badge">{branch.branch_code}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="branch-loc-cell">
                        <span className="loc-city">
                          <MapPin size={13} color="#2563eb" /> {branch.city || 'Kerala'}
                        </span>
                        <span className="loc-address-text">
                          {branch.district ? `${branch.district}, ${branch.state}` : (branch.address || 'Central Depot')}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="branch-contact-cell">
                        {branch.manager_name && (
                          <span className="mgr-name">
                            <Users size={12} /> {branch.manager_name}
                          </span>
                        )}
                        {branch.phone && (
                          <span className="sub-contact">
                            <Phone size={12} /> {branch.phone}
                          </span>
                        )}
                        {branch.email && (
                          <span className="sub-contact">
                            <Mail size={12} /> {branch.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="tax-cell">
                        {branch.gstin ? (
                          <span className="gstin-badge">{branch.gstin}</span>
                        ) : (
                          <span className="gstin-empty">No GSTIN</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="branch-stats-cell">
                        <span className="stat-pill">
                          <Warehouse size={12} /> {branch.warehouse_count || 0} Wh
                        </span>
                        <span className="stat-pill">
                          <Users size={12} /> {branch.salesman_count || 0} Reps
                        </span>
                      </div>
                    </td>

                    <td>
                      <button
                        className={`status-toggle-pill ${isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(branch)}
                        title="Click to toggle active status"
                      >
                        <Power size={11} />
                        <span>{isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="branch-row-actions">
                        <button
                          className="branch-action-btn edit"
                          onClick={() => handleOpenEdit(branch)}
                          title="Edit Branch"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="branch-action-btn delete"
                          onClick={() => handleDeleteBranch(branch)}
                          title="Delete Branch"
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

      {/* Modal: Add / Edit Branch */}
      {isModalOpen && (
        <div className="branch-modal-overlay">
          <div className="branch-modal-card">
            <div className="branch-modal-header">
              <div className="modal-title-box">
                <Building2 size={20} color="#2563eb" />
                <h3>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h3>
              </div>
              <button className="modal-close-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="branch-modal-body">
              {/* Basic Branch Details */}
              <div className="section-divider-title">Branch Identity & Code</div>
              <div className="modal-form-grid">
                <div className="form-item">
                  <label>Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-KCH-002"
                    value={formData.branch_code}
                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value.toUpperCase() })}
                  />
                  <small className="field-hint">Unique identifier for branch transactions.</small>
                </div>

                <div className="form-item">
                  <label>Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kochi Regional Hub"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Location & Territory Details */}
              <div className="section-divider-title">Location & Territory</div>
              <div className="modal-form-grid">
                <div className="form-item">
                  <label>City / Town *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kochi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>District *</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  >
                    {KERALA_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-item" style={{ gridColumn: 'span 2' }}>
                  <label>Physical Address</label>
                  <input
                    type="text"
                    placeholder="Street address, building name, locality"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Taxation & Compliance */}
              <div className="section-divider-title">Taxation & Contact</div>
              <div className="modal-form-grid">
                <div className="form-item">
                  <label>Branch GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 32AABCS1429B1Z8"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-item">
                  <label>Branch In-Charge / Manager</label>
                  <input
                    type="text"
                    placeholder="Manager name"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98460 11223"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="branch@salesforce.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-action-bar">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BranchManagement;
