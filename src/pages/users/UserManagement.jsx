import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Smartphone, 
  Globe, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Lock, 
  Mail, 
  Phone, 
  Briefcase, 
  UserCheck, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  fetchUsersApi, 
  createUserApi, 
  updateUserApi, 
  toggleUserStatusApi, 
  deleteUserApi, 
  fetchRolesApi 
} from '../../services/api';
import './UserManagement.css';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [toast, setToast] = useState(null);

  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role_id: '',
    department: '',
    status: 'ACTIVE'
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [uData, rData] = await Promise.all([
        fetchUsersApi(),
        fetchRolesApi()
      ]);
      setUsers(uData);
      setRoles(rData);

      // Default role to Salesman or first role if not set
      if (rData.length > 0 && !formData.role_id) {
        const salesRole = rData.find(r => r.role_code === 'SALESMAN') || rData[0];
        setFormData(prev => ({ ...prev, role_id: salesRole.role_id }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getDefaultDepartmentForRole = (role) => {
    if (!role) return 'Field Sales & Distribution';
    const code = (role.role_code || '').toUpperCase();
    const name = (role.role_name || '').toLowerCase();

    if (code === 'SM' || code.includes('MANAGER') || name.includes('manager')) {
      return 'Sales Management';
    }
    if (code === 'ADMIN' || name.includes('admin') || name.includes('executive')) {
      return 'Executive Administration';
    }
    if (code === 'ACCOUNTANT' || name.includes('account') || name.includes('finance')) {
      return 'Accounts & Finance';
    }
    if (code === 'INVENTORY_MANAGER' || name.includes('inventory') || name.includes('warehouse')) {
      return 'Warehouse & Logistics';
    }
    if (code === 'SALESMAN' || code === 'SLMN' || role.can_login_mobile) {
      return 'Field Sales & Distribution';
    }
    return role.can_login_web ? 'General Administration' : 'Field Sales & Distribution';
  };

  const openCreateModal = () => {
    const defaultRole = roles.find(r => r.role_code === 'SALESMAN') || roles[0];
    setEditingUser(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      role_id: defaultRole ? defaultRole.role_id : '',
      department: getDefaultDepartmentForRole(defaultRole),
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      password: user.password || '',
      confirm_password: user.password || '',
      role_id: user.role_id || '',
      department: user.department || '',
      status: user.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleRoleChangeInForm = (roleId) => {
    const selected = roles.find(r => r.role_id === roleId);
    let dept = formData.department;
    if (selected) {
      const standardDepartments = [
        'Field Sales & Distribution',
        'Sales Management',
        'Executive Administration',
        'Accounts & Finance',
        'Warehouse & Logistics',
        'General Administration',
        'General',
        ''
      ];
      if (standardDepartments.includes(dept)) {
        dept = getDefaultDepartmentForRole(selected);
      }
    }
    setFormData(prev => ({ ...prev, role_id: roleId, department: dept }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast('Name and email are required.', 'error');
      return;
    }

    if (!editingUser && !formData.password) {
      showToast('Password is required for new user.', 'error');
      return;
    }

    // Validate Password & Confirm Password match
    if ((!editingUser || formData.password) && formData.password !== formData.confirm_password) {
      showToast('Passwords do not match! Both passwords must be identical.', 'error');
      return;
    }

    try {
      if (editingUser) {
        const res = await updateUserApi(editingUser.id, formData);
        showToast(res.message || 'User updated successfully.');
      } else {
        const res = await createUserApi(formData);
        showToast(res.message || 'User created successfully. User is now available in Sales module!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save user.', 'error');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await toggleUserStatusApi(user.id);
      showToast(res.message || `User status updated to ${res.status}`);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to change user status', 'error');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.name}"?`)) return;
    try {
      const res = await deleteUserApi(user.id);
      showToast(res.message || 'User deleted successfully.');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  // Selected Role Info in Modal
  const selectedRoleObj = roles.find(r => r.role_id === formData.role_id);
  const isSelectedRoleSalesman = selectedRoleObj?.role_code === 'SALESMAN' || selectedRoleObj?.can_login_web === false;

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.role_name || '').toLowerCase().includes(q);

    const matchesRole = selectedRoleFilter === 'ALL' || u.role_code === selectedRoleFilter || u.role_id === selectedRoleFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || u.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const salesmanCount = users.filter(u => u.role_code === 'SALESMAN' || u.role === 'SALES_EXECUTIVE' || u.can_login_web === false).length;
  const adminStaffCount = users.filter(u => u.can_login_web !== false).length;

  return (
    <div className="users-page-container">
      {/* Toast */}
      {toast && (
        <div className={`user-mgmt-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="users-header-row">
        <div className="users-header-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Administration</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Users & Access</span>
          </nav>
          <h1 className="users-page-title">Enterprise User Management</h1>
          <p className="users-page-subtitle">
            Create staff accounts, assign enterprise roles, and configure Web Only or Mobile Only access channels.
          </p>
        </div>

        <div className="users-header-actions">
          <button className="btn-refresh" onClick={loadData} title="Reload user list">
            <RefreshCw size={15} />
            <span>Reload</span>
          </button>
          <button className="btn-primary-add" onClick={openCreateModal}>
            <UserPlus size={16} />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="users-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap blue-bg">
            <Users size={20} color="#2563eb" />
          </div>
          <div className="metric-data">
            <span className="metric-label">Total Users</span>
            <span className="metric-value">{totalUsers}</span>
            <span className="metric-sub">Registered platform accounts</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap green-bg">
            <UserCheck size={20} color="#10b981" />
          </div>
          <div className="metric-data">
            <span className="metric-label">Active Users</span>
            <span className="metric-value">{activeUsers}</span>
            <span className="metric-sub">{totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% active access</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap purple-bg">
            <Smartphone size={20} color="#7c3aed" />
          </div>
          <div className="metric-data">
            <span className="metric-label">Salesmen (Mobile Only)</span>
            <span className="metric-value">{salesmanCount}</span>
            <span className="metric-sub">Auto-mapped to Sales modules</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap amber-bg">
            <Globe size={20} color="#2563eb" />
          </div>
          <div className="metric-data">
            <span className="metric-label">Web Only Users</span>
            <span className="metric-value">{adminStaffCount}</span>
            <span className="metric-sub">Admin & office operations</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="users-controls-card">
        <div className="controls-search-group">
          <Search size={16} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by name, username, email, phone or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="controls-filter-group">
          <div className="filter-select-wrap">
            <Filter size={14} className="filter-icon" />
            <select 
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Roles</option>
              {roles.map(r => (
                <option key={r.role_id} value={r.role_code}>{r.role_name}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrap">
            <select 
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-card">
        <div className="table-responsive">
          <table className="enterprise-users-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Contact Information</th>
                <th>Role & Mapping</th>
                <th>Access Channel</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty-state">
                    <div className="spinner-center">Loading enterprise users...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-state">
                    <Users size={36} color="#94a3b8" />
                    <p>No users found matching your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isSalesman = user.role_code === 'SALESMAN' || user.role === 'SALES_EXECUTIVE' || user.can_login_web === false;
                  const initial = (user.name || 'U').charAt(0).toUpperCase();

                  return (
                    <tr key={user.id} className="user-table-row">
                      {/* User Details */}
                      <td>
                        <div className="user-profile-cell">
                          <div className={`user-avatar-circle ${isSalesman ? 'sales-avatar' : 'admin-avatar'}`}>
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : null}
                            <span>{initial}</span>
                          </div>
                          <div className="user-text-wrap">
                            <span className="user-name-text">{user.name}</span>
                            <span className="user-handle-text">@{user.username || user.email.split('@')[0]}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="contact-cell-wrap">
                          <span className="contact-email"><Mail size={13} /> {user.email}</span>
                          <span className="contact-phone"><Phone size={13} /> {user.phone || '—'}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <span className={`role-badge ${isSalesman ? 'badge-salesman' : user.role_code === 'ADMIN' ? 'badge-admin' : 'badge-general'}`}>
                          <ShieldCheck size={13} />
                          {user.role_name || user.role}
                        </span>
                      </td>

                      {/* Channel: Strictly Web Only or Mobile Only */}
                      <td>
                        {isSalesman ? (
                          <span className="channel-pill channel-mobile" title="Restricted to Mobile Application only. Cannot login to Web.">
                            <Smartphone size={13} /> Mobile Only
                          </span>
                        ) : (
                          <span className="channel-pill channel-web" title="Authorized for Web ERP Portal only.">
                            <Globe size={13} /> Web Only
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td>
                        <span className="department-text">
                          <Briefcase size={13} /> {user.department || 'General'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <button 
                          className={`status-toggle-btn ${user.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}
                          onClick={() => handleToggleStatus(user)}
                          title="Click to toggle status"
                        >
                          <span className="status-dot"></span>
                          <span>{user.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-action-btns">
                          <button 
                            className="action-icon-btn edit-btn" 
                            title="Edit user details"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            className="action-icon-btn delete-btn" 
                            title="Delete user"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 size={15} />
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

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="user-modal-box">
            <div className="modal-header-row">
              <div className="modal-title-wrap">
                <UserPlus size={20} color="#2563eb" />
                <h2>{editingUser ? 'Edit User Profile' : 'Create New Enterprise User'}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="user-modal-form">
              {/* Salesman Mobile Advisory Banner */}
              {isSelectedRoleSalesman && (
                <div className="salesman-advisory-alert">
                  <Smartphone size={20} className="alert-icon" />
                  <div className="alert-text">
                    <strong>Salesman Account (Mobile Only):</strong>
                    <p>
                      This user is strictly restricted to <strong>Mobile Application access only</strong> and cannot log into this Web ERP portal. 
                      Once saved, this salesman is <strong>immediately selectable</strong> in Salesman & Route Mapping and Van Stock Allocation!
                    </p>
                  </div>
                </div>
              )}

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
                  <label>Username</label>
                  <input 
                    type="text"
                    placeholder="e.g. anand.sales (auto-generated if blank)"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email"
                    required
                    placeholder="anand@salesforce.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="text"
                    placeholder="+91 98470 11223"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Role Assignment *</label>
                  <select 
                    value={formData.role_id}
                    onChange={(e) => handleRoleChangeInForm(e.target.value)}
                    required
                  >
                    {roles.map(r => (
                      <option key={r.role_id} value={r.role_id}>
                        {r.role_name} {r.can_login_web === false ? '(Mobile Only)' : '(Web Only)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input 
                    type="text"
                    list="department-suggestions"
                    placeholder="e.g. Sales Management"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                  <datalist id="department-suggestions">
                    <option value="Sales Management" />
                    <option value="Field Sales & Distribution" />
                    <option value="Executive Administration" />
                    <option value="Accounts & Finance" />
                    <option value="Warehouse & Logistics" />
                    <option value="General Administration" />
                  </datalist>
                </div>
              </div>

              {/* Password and Confirm Password with Eye Toggles */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>{editingUser ? 'Account Password' : 'Account Password *'}</label>
                  <div className="password-input-wrap">
                    <Lock size={15} className="input-inner-icon" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      placeholder="Enter account password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button 
                      type="button" 
                      className="password-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {editingUser && (
                    <span className="field-hint">Click eye icon to reveal or modify password</span>
                  )}
                </div>

                <div className="form-group">
                  <div className="label-with-match-status">
                    <label>{editingUser ? 'Confirm Password' : 'Confirm Password *'}</label>
                    {formData.confirm_password && (
                      formData.password === formData.confirm_password ? (
                        <span className="password-match-tag success"><CheckCircle2 size={11} /> Passwords match</span>
                      ) : (
                        <span className="password-match-tag error"><AlertCircle size={11} /> Passwords do not match</span>
                      )
                    )}
                  </div>
                  <div className="password-input-wrap">
                    <Lock size={15} className="input-inner-icon" />
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      required={!editingUser || !!formData.password}
                      placeholder="Re-enter password to confirm"
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    />
                    <button 
                      type="button" 
                      className="password-eye-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Account Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE (Authorized to login)</option>
                  <option value="INACTIVE">INACTIVE (Deactivated)</option>
                </select>
              </div>

              <div className="modal-footer-row">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-save">
                  {editingUser ? 'Update User' : 'Create & Map User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagement;
