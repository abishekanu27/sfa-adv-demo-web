import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Smartphone, 
  Globe, 
  Layers, 
  Lock, 
  Users, 
  Check, 
  RefreshCw,
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  ChevronDown,
  ChevronRight,
  Receipt,
  FileText,
  UserPlus,
  Percent,
  CircleDot,
  Settings,
  BarChart3,
  ShoppingCart,
  Navigation,
  TrendingUp,
  Store,
  Tag,
  PackageCheck,
  RotateCcw,
  Wallet,
  ArrowLeftRight,
  CreditCard
} from 'lucide-react';
import { 
  fetchRolesApi, 
  createRoleApi, 
  updateRoleApi, 
  deleteRoleApi 
} from '../../services/api';
import './RoleManagement.css';

// 1. Structured Web Menus & Submenus
export const WEB_MENUS_STRUCTURE = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    submenus: [
      { id: 'dashboard', label: 'Dashboard & Analytics Overview' }
    ]
  },
  {
    id: 'products-stock',
    title: 'Products & Stock',
    icon: Package,
    submenus: [
      { id: 'products-list', label: 'Product Details List' },
      { id: 'stock-categories', label: 'Category Adding' },
      { id: 'products-price-groups', label: 'Selling Price Groups' },
      { id: 'stock-total', label: 'Total Stock Details (Company Stock)' },
      { id: 'stock-warehouses', label: 'Warehouse Details' }
    ]
  },
  {
    id: 'purchases-vendors',
    title: 'Purchases & Vendors',
    icon: ShoppingCart,
    submenus: [
      { id: 'stock-vendors', label: 'Vendor Details' },
      { id: 'stock-details', label: 'Stock Purchase Details (Inward Stock)' },
      { id: 'purchase-orders', label: 'Purchase Orders (PO)' },
      { id: 'warehouse-transfers', label: 'Transfer to Warehouse' },
      { id: 'vendor-payments', label: 'Balance to Pay Vendor' },
      { id: 'stock-invoice-docs', label: 'Vendor Invoice Upload & Download (Purchase Bills)' }
    ]
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: Users,
    submenus: [
      { id: 'customers-details', label: 'Customer Details' },
      { id: 'customers-price-mapping', label: 'Customer & Selling Price Groups Mapping' },
      { id: 'customers-advance-booking', label: 'Advanced Booking' },
      { id: 'customers-credit-notes', label: 'Customer Credit Notes & Returns Adjustment' }
    ]
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: Truck,
    submenus: [
      { id: 'sales-vehicles', label: 'Vehicle Adding' },
      { id: 'sales-mappings', label: 'Salesman & Route Mapping' },
      { id: 'sales-stock-adding', label: 'Stock Adding' },
      { id: 'sales-stock-requests', label: 'Stock Requests (Van Requisitions)' },
      { id: 'sales-v2v-transfers', label: 'Van to Van Stock Transfers' },
      { id: 'sales-live-track', label: 'Salesman Live Tracking (GPS Map)' },
      { id: 'sales-returns', label: 'Return Stock (Van to Depot Inward)' },
      { id: 'sales-expenses', label: 'Salesman Daily Route Expenses' }
    ]
  },
  {
    id: 'invoices',
    title: 'Invoices & Billing',
    icon: FileText,
    submenus: [
      { id: 'invoices-list', label: 'Invoices Management (GST & Non-GST Invoices, Billing & Print)' }
    ]
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: BarChart3,
    submenus: [
      { id: 'reports-gst', label: 'GST Report (GSTR-1 Sales & Tax Summary)' },
      { id: 'reports-customer-wise', label: 'Customer wise report' },
      { id: 'reports-ledger', label: 'Ledger Report (Customer Statement & Balance)' },
      { id: 'reports-payments', label: 'Payment' },
      { id: 'reports-outstanding', label: 'Outstanding' },
      { id: 'reports-total-stocks', label: 'Total stocks' },
      { id: 'reports-collections', label: 'Total collection' },
      { id: 'reports-pending-payments', label: 'Pending payments' },
      { id: 'reports-warehouse-stock', label: 'Warehouse wise stock' },
      { id: 'reports-salesman-stock', label: 'Sales Man wise stock' },
      { id: 'reports-salesman-collections', label: 'Salesman wise Collections' },
      { id: 'reports-damaged', label: 'Damaged Products' },
      { id: 'reports-vendor-stock', label: 'Vendor wise stock' },
      { id: 'reports-vendor-payments', label: 'Vendor wise payments' },
      { id: 'reports-expenses', label: 'Expenses Report (Salesman Field Expenses & In-Hand Cash)' }
    ]
  },
  {
    id: 'users',
    title: 'Users & Roles',
    icon: ShieldCheck,
    submenus: [
      { id: 'users-list', label: 'User Management' },
      { id: 'roles-list', label: 'Role Permissions' }
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    submenus: [
      { id: 'settings-company', label: 'Company Profile & Branding' },
      { id: 'settings-templates', label: 'GST & Invoice Print Templates' }
    ]
  }
];

// 2. Dedicated Mobile Features for Salesman (Enterprise Mobile Application)
export const MOBILE_SALESMAN_FEATURES = [
  // Core Requested Salesman Field Operations
  { id: 'order', label: 'Order', icon: ShoppingCart, desc: 'Field order booking, shopping cart management & customer order confirmation' },
  { id: 'navigation', label: 'Navigation', icon: Navigation, desc: 'GPS turn-by-turn route directions & store geolocation mapping' },
  { id: 'route_wise_sales', label: 'Route wise sales', icon: TrendingUp, desc: 'Route & beat-wise sales tracking, targets & outlet performance' },
  { id: 'route_wise_customers', label: 'Route wise customer details', icon: Store, desc: 'Customer store profiles, outstanding ledger & beat sequence' },
  { id: 'customer_price_selection', label: 'Selling price selection for each customer', icon: Tag, desc: 'Customer-specific selling price groups & tier pricing selection' },
  { id: 'report', label: 'Report', icon: BarChart3, desc: 'Daily salesman transaction logs, collection & route sales reports' },
  { id: 'invoice', label: 'Invoice', icon: Receipt, desc: 'Mobile billing, GST/Non-GST tax invoicing & spot Bluetooth thermal print' },
  { id: 'closing_stock', label: 'Closing stock', icon: PackageCheck, desc: 'End-of-day van physical closing stock verification & reconciliation' },
  { id: 'stocks_return', label: 'Stocks return', icon: RotateCcw, desc: 'Customer sales return, damaged goods & expired product returns' },
  { id: 'expense', label: 'Expense', icon: Wallet, desc: 'Daily route travel expenses, fuel, toll & allowance vouchers' },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'Mobile app preferences, Bluetooth printer configuration & profile' },
  { id: 'data_sync', label: 'Data Sync', icon: RefreshCw, desc: 'Offline/Online two-way data sync & master catalog download' },

  // Supplementary Van Operations & Logistics
  { id: 'van_stock', label: 'Current Stock in Van', icon: Boxes, desc: 'Live van inventory tracking with bag, box, carton & loose units' },
  { id: 'stock_request', label: 'Van Stock Requisition', icon: Package, desc: 'Request replenishment stock from central depot/warehouse' },
  { id: 'van_to_van', label: 'Van to Van Transfer', icon: ArrowLeftRight, desc: 'Request or approve stock transfer with nearby route vans' },
  { id: 'payments', label: 'Payments', icon: CreditCard, desc: 'Cash & digital collection logging and payment receipts' },
  { id: 'customer_adding', label: 'Customer Adding', icon: UserPlus, desc: 'On-the-go customer & retail outlet onboarding' },
  { id: 'mobile_dashboard', label: 'Mobile Dashboard', icon: LayoutDashboard, desc: 'Daily route KPI summaries, targets & field alerts' }
];

export const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State
  const [channelType, setChannelType] = useState('WEB'); // 'WEB' or 'MOBILE'
  const [formData, setFormData] = useState({
    role_name: '',
    role_code: '',
    description: '',
    allowed_modules: []
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await fetchRolesApi();
      setRoles(data);
    } catch (err) {
      showToast(err.message || 'Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setChannelType('WEB');
    setFormData({
      role_name: '',
      role_code: '',
      description: '',
      allowed_modules: [
        'dashboard',
        'products-list',
        'products-price-groups',
        'stock-vendors',
        'stock-details'
      ]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    const isMobile = role.can_login_web === false || role.role_code === 'SALESMAN';
    setChannelType(isMobile ? 'MOBILE' : 'WEB');
    const rawModules = Array.isArray(role.allowed_modules) ? role.allowed_modules : [];
    const normalized = [...rawModules];
    if (isMobile) {
      if (rawModules.includes('mobile_sales')) {
        if (!normalized.includes('order')) normalized.push('order');
        if (!normalized.includes('invoice')) normalized.push('invoice');
      }
      if (rawModules.includes('mobile_reports') && !normalized.includes('report')) {
        normalized.push('report');
      }
    }
    setFormData({
      role_name: role.role_name,
      role_code: role.role_code,
      description: role.description || '',
      allowed_modules: normalized
    });
    setIsModalOpen(true);
  };

  // Switch channel in modal (WEB vs MOBILE)
  const handleChannelSwitch = (type) => {
    setChannelType(type);
    if (type === 'MOBILE') {
      // Default to all mobile features
      setFormData(prev => ({
        ...prev,
        allowed_modules: MOBILE_SALESMAN_FEATURES.map(f => f.id)
      }));
    } else {
      // Default to common web submenus
      setFormData(prev => ({
        ...prev,
        allowed_modules: [
          'dashboard',
          'products-list',
          'products-price-groups',
          'stock-vendors',
          'stock-details'
        ]
      }));
    }
  };

  // Toggle individual submodule
  const toggleSubmenu = (subId) => {
    setFormData(prev => {
      const exists = prev.allowed_modules.includes(subId);
      const updated = exists 
        ? prev.allowed_modules.filter(id => id !== subId)
        : [...prev.allowed_modules, subId];
      return { ...prev, allowed_modules: updated };
    });
  };

  // Toggle all submenus of a web main menu
  const toggleMainMenu = (menu) => {
    const subIds = menu.submenus.map(s => s.id);
    const allSelected = subIds.every(id => formData.allowed_modules.includes(id));

    setFormData(prev => {
      let updated;
      if (allSelected) {
        // Deselect all submenus under this menu
        updated = prev.allowed_modules.filter(id => !subIds.includes(id));
      } else {
        // Select all submenus under this menu
        const newSet = new Set([...prev.allowed_modules, ...subIds]);
        updated = Array.from(newSet);
      }
      return { ...prev, allowed_modules: updated };
    });
  };

  // Select all items
  const handleSelectAll = () => {
    if (channelType === 'MOBILE') {
      setFormData(prev => ({
        ...prev,
        allowed_modules: MOBILE_SALESMAN_FEATURES.map(f => f.id)
      }));
    } else {
      const allWebSubIds = WEB_MENUS_STRUCTURE.flatMap(m => m.submenus.map(s => s.id));
      setFormData(prev => ({
        ...prev,
        allowed_modules: allWebSubIds
      }));
    }
  };

  // Clear all items
  const handleClearAll = () => {
    setFormData(prev => ({
      ...prev,
      allowed_modules: []
    }));
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!formData.role_name || (!editingRole && !formData.role_code)) {
      showToast('Role name and code are required.', 'error');
      return;
    }

    const payload = {
      ...formData,
      channel_type: channelType,
      can_login_web: channelType === 'WEB',
      can_login_mobile: channelType === 'MOBILE'
    };

    try {
      if (editingRole) {
        const res = await updateRoleApi(editingRole.role_id, payload);
        showToast(res.message || 'Role updated successfully.');

        // Immediately update current logged-in user cache if they belong to this role
        try {
          const rawUser = localStorage.getItem('salesforce_user');
          if (rawUser) {
            const curUser = JSON.parse(rawUser);
            if (curUser.role_id === editingRole.role_id || curUser.role === editingRole.role_code || curUser.role_code === editingRole.role_code) {
              const updatedUser = {
                ...curUser,
                allowed_modules: payload.allowed_modules,
                can_login_web: payload.can_login_web,
                can_login_mobile: payload.can_login_mobile
              };
              localStorage.setItem('salesforce_user', JSON.stringify(updatedUser));
              window.dispatchEvent(new CustomEvent('userPermissionsUpdated', { detail: updatedUser }));
            }
          }
        } catch (e) {
          console.error('Failed to sync current user cache', e);
        }
      } else {
        const res = await createRoleApi(payload);
        showToast(res.message || 'Role created successfully.');
      }
      setIsModalOpen(false);
      loadRoles();
    } catch (err) {
      showToast(err.message || 'Failed to save role.', 'error');
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system) {
      showToast(`System role "${role.role_name}" cannot be deleted.`, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the role "${role.role_name}"?`)) return;

    try {
      const res = await deleteRoleApi(role.role_id);
      showToast(res.message || 'Role deleted successfully.');
      loadRoles();
    } catch (err) {
      showToast(err.message || 'Failed to delete role.', 'error');
    }
  };

  // Metrics
  const totalRoles = roles.length;
  const webRolesCount = roles.filter(r => r.can_login_web !== false).length;
  const mobileOnlyCount = roles.filter(r => r.can_login_web === false).length;
  const systemRolesCount = roles.filter(r => r.is_system).length;

  return (
    <div className="roles-page-container">
      {/* Toast */}
      {toast && (
        <div className={`role-mgmt-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="roles-header-row">
        <div className="roles-header-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Administration</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Role Permissions</span>
          </nav>
          <h1 className="roles-page-title">Enterprise Roles & Permissions</h1>
          <p className="roles-page-subtitle">
            Configure granular submenus for Web Portal roles and dedicated mobile field capabilities for Salesman.
          </p>
        </div>

        <div className="roles-header-actions">
          <button className="btn-refresh" onClick={loadRoles} title="Reload roles">
            <RefreshCw size={15} />
            <span>Reload</span>
          </button>
          <button className="btn-primary-add" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="roles-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap blue-bg">
            <ShieldCheck size={20} color="#2563eb" />
          </div>
          <div className="metric-data">
            <span className="metric-label">Defined Roles</span>
            <span className="metric-value">{totalRoles}</span>
            <span className="metric-sub">Configured permission profiles</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap green-bg">
            <Globe size={20} color="#10b981" />
          </div>
          <div className="metric-data">
            <span className="metric-label">Web Only Roles</span>
            <span className="metric-value">{webRolesCount}</span>
            <span className="metric-sub">Web ERP access only</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap purple-bg">
            <Smartphone size={20} color="#7c3aed" />
          </div>
          <div className="metric-data">
            <span className="metric-label">Mobile Only (Sales)</span>
            <span className="metric-value">{mobileOnlyCount}</span>
            <span className="metric-sub">Mobile Application access only</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap amber-bg">
            <Lock size={20} color="#d97706" />
          </div>
          <div className="metric-data">
            <span className="metric-label">System Roles</span>
            <span className="metric-value">{systemRolesCount}</span>
            <span className="metric-sub">Protected essential roles</span>
          </div>
        </div>
      </div>

      {/* Roles Cards Grid */}
      <div className="roles-cards-grid">
        {loading ? (
          <div className="roles-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Loading enterprise roles & permissions...</p>
          </div>
        ) : roles.map(role => {
          const isMobile = role.can_login_web === false || role.role_code === 'SALESMAN';
          const allowedList = Array.isArray(role.allowed_modules) ? role.allowed_modules : [];

          return (
            <div key={role.role_id} className={`role-card-item ${isMobile ? 'salesman-role-card' : ''}`}>
              <div className="role-card-header">
                <div className="role-title-badge-wrap">
                  <div className={`role-avatar-badge ${isMobile ? 'avatar-sales' : 'avatar-standard'}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="role-card-name">{role.role_name}</h3>
                    <span className="role-code-tag">{role.role_code}</span>
                  </div>
                </div>

                <div className="role-header-pills">
                  {role.is_system && (
                    <span className="pill-system-tag">System</span>
                  )}
                  {isMobile ? (
                    <span className="pill-mobile-only" title="Restricted to Mobile Application only. Web Login Blocked.">
                      <Smartphone size={13} /> Mobile Only
                    </span>
                  ) : (
                    <span className="pill-web-only" title="Authorized for Web ERP Portal only.">
                      <Globe size={13} /> Web Only
                    </span>
                  )}
                </div>
              </div>

              <p className="role-card-desc">
                {role.description || 'Enterprise role with configured operational permissions.'}
              </p>

              {/* Submenus / Mobile Features Tag Cloud */}
              <div className="role-modules-section">
                <span className="modules-header-label">
                  <Layers size={13} /> 
                  {isMobile ? `Mobile Features (${allowedList.length}):` : `Permitted Submenus (${allowedList.length}):`}
                </span>

                <div className="module-pills-list">
                  {isMobile ? (
                    MOBILE_SALESMAN_FEATURES.map(feat => {
                      const isPermitted = allowedList.includes(feat.id) ||
                        (feat.id === 'order' && allowedList.includes('mobile_sales')) ||
                        (feat.id === 'invoice' && allowedList.includes('mobile_sales')) ||
                        (feat.id === 'report' && allowedList.includes('mobile_reports'));
                      const Icon = feat.icon;
                      return (
                        <span 
                          key={feat.id}
                          className={`module-pill-tag ${isPermitted ? 'active-mobile-pill' : 'disabled-module'}`}
                        >
                          <Icon size={12} />
                          <span>{feat.label}</span>
                          {isPermitted ? <Check size={10} className="check-icon" /> : null}
                        </span>
                      );
                    })
                  ) : (
                    WEB_MENUS_STRUCTURE.flatMap(m => m.submenus).map(sub => {
                      const isPermitted = allowedList.includes(sub.id) || allowedList.includes('all_access');
                      return (
                        <span 
                          key={sub.id}
                          className={`module-pill-tag ${isPermitted ? 'active-module' : 'disabled-module'}`}
                        >
                          <span>{sub.label}</span>
                          {isPermitted ? <Check size={10} className="check-icon" /> : null}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="role-card-footer">
                <div className="role-user-count">
                  <Users size={14} />
                  <span><strong>{role.assigned_users_count || 0}</strong> user(s) assigned</span>
                </div>

                <div className="role-card-actions">
                  <button 
                    className="btn-edit-role" 
                    onClick={() => openEditModal(role)}
                    title="Edit role & permissions"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>

                  {!role.is_system && (
                    <button 
                      className="btn-delete-role" 
                      onClick={() => handleDeleteRole(role)}
                      title="Delete role"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div 
          className="modal-backdrop" 
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="role-modal-box large-modal" role="dialog" aria-modal="true">
            <form onSubmit={handleSaveRole} className="role-modal-form-wrapper">
              
              {/* Fixed Modal Header */}
              <div className="modal-header-row">
                <div className="modal-title-wrap">
                  <div className="modal-icon-badge">
                    <ShieldCheck size={22} color="#2563eb" />
                  </div>
                  <div className="modal-title-text">
                    <h2>{editingRole ? `Edit Role: ${editingRole.role_name}` : 'Create New Enterprise Role'}</h2>
                    <p className="modal-subtitle">
                      {editingRole 
                        ? 'Modify role access channel, permissions, and operational scope' 
                        : 'Define enterprise role identity, channel exclusivity, and granular permissions'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="modal-close-btn" 
                  onClick={() => setIsModalOpen(false)} 
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="role-modal-body">
                
                {/* 1. Basic Identity Fields */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Role Name <span className="req-star">*</span></label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Sales Coordinator"
                      value={formData.role_name}
                      onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    />
                    <span className="field-hint">Display name used across enterprise user assignments</span>
                  </div>

                  <div className="form-group">
                    <label>
                      Role Code <span className="req-star">*</span> {editingRole?.is_system && <span className="protected-tag">(Protected System Role)</span>}
                    </label>
                    <input 
                      type="text"
                      required
                      disabled={!!editingRole?.is_system}
                      placeholder="e.g. SALES_COORDINATOR"
                      value={formData.role_code}
                      onChange={(e) => setFormData({ ...formData, role_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                      className="mono-input"
                    />
                    <span className="field-hint">Unique system identifier (uppercase, underscores only)</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Role Description</label>
                  <textarea 
                    rows="2"
                    placeholder="Provide details about the responsibilities, clearance, and operational scope for this role..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* 2. Channel Selection: Mutually Exclusive Web Only vs Mobile Only */}
                <div className="channel-access-box">
                  <div className="channel-box-header">
                    <h4 className="section-title">Application Access Channel (Mutually Exclusive)</h4>
                    <span className="channel-strict-badge">Strict Security Boundary</span>
                  </div>
                  <div className="channel-radio-grid">
                    <div 
                      className={`channel-radio-card web-card ${channelType === 'WEB' ? 'selected-channel web-selected' : ''}`}
                      onClick={() => handleChannelSwitch('WEB')}
                    >
                      <div className="channel-card-top">
                        <div className="channel-radio-head">
                          <input 
                            type="radio" 
                            name="channel" 
                            id="channel-web"
                            checked={channelType === 'WEB'} 
                            onChange={() => handleChannelSwitch('WEB')}
                          />
                          <div className="channel-icon-pill web-icon-pill">
                            <Globe size={18} />
                          </div>
                          <div>
                            <label htmlFor="channel-web" className="channel-card-title">Web ERP Portal</label>
                            <span className="channel-exclusive-tag web-tag">Web Only</span>
                          </div>
                        </div>
                        {channelType === 'WEB' && (
                          <span className="active-badge web-active">
                            <Check size={12} /> Active
                          </span>
                        )}
                      </div>
                      <p className="channel-card-desc">
                        Authorized for desktop & tablet browser access. Ideal for Administrator, Accountants, Inventory Managers, and office operations. <strong>Blocked from field mobile login.</strong>
                      </p>
                    </div>

                    <div 
                      className={`channel-radio-card mobile-card ${channelType === 'MOBILE' ? 'selected-channel mobile-selected' : ''}`}
                      onClick={() => handleChannelSwitch('MOBILE')}
                    >
                      <div className="channel-card-top">
                        <div className="channel-radio-head">
                          <input 
                            type="radio" 
                            name="channel" 
                            id="channel-mobile"
                            checked={channelType === 'MOBILE'} 
                            onChange={() => handleChannelSwitch('MOBILE')}
                          />
                          <div className="channel-icon-pill mobile-icon-pill">
                            <Smartphone size={18} />
                          </div>
                          <div>
                            <label htmlFor="channel-mobile" className="channel-card-title">Mobile Application</label>
                            <span className="channel-exclusive-tag mobile-tag">Mobile Only</span>
                          </div>
                        </div>
                        {channelType === 'MOBILE' && (
                          <span className="active-badge mobile-active">
                            <Check size={12} /> Active
                          </span>
                        )}
                      </div>
                      <p className="channel-card-desc">
                        Dedicated solely to field Salesmen and van delivery personnel. Immediately mapped to route mapping and live van stocks. <strong>Strictly blocked from Web ERP login.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Granular Permissions Configuration */}
                <div className="permissions-config-container">
                  <div className="modules-box-header">
                    <div>
                      <h4 className="section-title" style={{ margin: 0 }}>
                        {channelType === 'WEB' ? 'Permitted Web Menus & Submenus' : 'Permitted Salesman Mobile Features'}
                      </h4>
                      <p className="modules-sub-desc">
                        {channelType === 'WEB' 
                          ? 'Select submenus to grant permissions. Main menu headers toggle entire groups at once.'
                          : 'Configure specific on-field capabilities enabled for this salesman profile:'}
                      </p>
                    </div>
                    <div className="preset-buttons">
                      <button type="button" className="btn-preset" onClick={handleSelectAll}>
                        <Check size={13} /> Select All
                      </button>
                      <button type="button" className="btn-preset" onClick={handleClearAll}>
                        <X size={13} /> Clear All
                      </button>
                    </div>
                  </div>

                  {/* If WEB ONLY: Hierarchical Menus & Submenus */}
                  {channelType === 'WEB' && (
                    <div className="web-menus-tree-grid">
                      {WEB_MENUS_STRUCTURE.map(menu => {
                        const MenuIcon = menu.icon;
                        const subIds = menu.submenus.map(s => s.id);
                        const selectedCount = subIds.filter(id => formData.allowed_modules.includes(id)).length;
                        const allSelected = subIds.length > 0 && selectedCount === subIds.length;
                        const someSelected = selectedCount > 0 && !allSelected;

                        return (
                          <div key={menu.id} className={`menu-group-tree-card ${selectedCount > 0 ? 'has-selection' : ''}`}>
                            <div 
                              className={`menu-tree-header ${allSelected ? 'header-all-checked' : someSelected ? 'header-some-checked' : ''}`}
                              onClick={() => toggleMainMenu(menu)}
                            >
                              <div className="tree-header-left">
                                <input 
                                  type="checkbox"
                                  checked={allSelected}
                                  ref={el => { if (el) el.indeterminate = someSelected; }}
                                  onChange={(e) => { e.stopPropagation(); toggleMainMenu(menu); }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="tree-icon-wrap">
                                  <MenuIcon size={15} />
                                </div>
                                <span className="tree-menu-title">{menu.title}</span>
                              </div>
                              <span className={`tree-count-badge ${allSelected ? 'badge-all' : selectedCount > 0 ? 'badge-some' : 'badge-none'}`}>
                                {selectedCount}/{subIds.length}
                              </span>
                            </div>

                            <div className="menu-submenus-list">
                              {menu.submenus.map(sub => {
                                const isChecked = formData.allowed_modules.includes(sub.id);
                                return (
                                  <label 
                                    key={sub.id} 
                                    className={`submenu-checkbox-item ${isChecked ? 'sub-checked' : ''}`}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSubmenu(sub.id)}
                                    />
                                    <span className="sub-label">{sub.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* If MOBILE ONLY: Dedicated Mobile Features */}
                  {channelType === 'MOBILE' && (
                    <div className="mobile-features-grid">
                      {MOBILE_SALESMAN_FEATURES.map(feat => {
                        const isChecked = formData.allowed_modules.includes(feat.id);
                        const FeatIcon = feat.icon;

                        return (
                          <div 
                            key={feat.id}
                            className={`mobile-feature-card ${isChecked ? 'selected-mobile-card' : ''}`}
                            onClick={() => toggleSubmenu(feat.id)}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => { e.stopPropagation(); toggleSubmenu(feat.id); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="mob-card-info">
                              <div className="mob-card-top">
                                <div className="mob-icon-wrap">
                                  <FeatIcon size={16} />
                                </div>
                                <span className="mob-feat-title">{feat.label}</span>
                              </div>
                              <p className="mob-feat-desc">{feat.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Fixed Modal Footer: Always Pinned at Bottom */}
              <div className="modal-footer-row">
                <div className="footer-channel-summary">
                  {channelType === 'WEB' ? (
                    <span className="summary-pill web">
                      <Globe size={13} /> Web Portal Only &bull; {formData.allowed_modules.length} submenus selected
                    </span>
                  ) : (
                    <span className="summary-pill mobile">
                      <Smartphone size={13} /> Mobile App Only &bull; {formData.allowed_modules.length} features active
                    </span>
                  )}
                </div>
                <div className="footer-action-buttons">
                  <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit-save">
                    <CheckCircle2 size={16} />
                    <span>{editingRole ? 'Update Role Settings' : 'Save & Create Role'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

