import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  ShieldCheck, 
  Settings, 
  Building2, 
  BarChart3,
  FileText,
  ShoppingCart
} from 'lucide-react';
import { 
  isUserAdmin, 
  hasSubmenuPermission, 
  hasMenuPermission, 
  hasPurchasesVendorsPermission 
} from '../utils/permissions';
import './Sidebar.css';

export const Sidebar = ({ activeView, onViewChange, onLogout, user, companySettings: propCompanySettings }) => {
  const [companySettings, setCompanySettings] = useState(() => {
    if (propCompanySettings) return propCompanySettings;
    try {
      const cached = localStorage.getItem('salesforce_company_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    if (propCompanySettings) {
      setCompanySettings(propCompanySettings);
    }
  }, [propCompanySettings]);

  useEffect(() => {
    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        setCompanySettings(e.detail);
      }
    };
    window.addEventListener('companySettingsUpdated', handleSettingsUpdated);
    return () => window.removeEventListener('companySettingsUpdated', handleSettingsUpdated);
  }, []);

  // 1. Menu 1: Products & Stock
  const isProductsStockActive = [
    'products-stock',
    'products-list', 
    'products-details', 
    'products-add',
    'products-categories',
    'stock-categories',
    'products-price-groups',
    'stock-total',
    'stock-warehouses'
  ].includes(activeView);

  // 2. Menu 2: Purchases & Vendors
  const isPurchasesActive = [
    'purchases-vendors',
    'purchases',
    'stock-vendors', 
    'stock-details', 
    'purchase-orders',
    'warehouse-transfers',
    'vendor-payments'
  ].includes(activeView);

  // 3. Menu 3: Customers
  const isCustomerActive = [
    'customers',
    'customers-details', 
    'customers-price-mapping', 
    'customers-advance-booking', 
    'customers-credit-notes'
  ].includes(activeView);

  // 4. Menu 4: Sales
  const isSalesActive = [
    'sales',
    'sales-vehicles', 
    'sales-routes',
    'sales-mappings', 
    'sales-stock-adding',
    'sales-stock-requests',
    'sales-v2v-transfers',
    'sales-live-track',
    'sales-returns',
    'sales-expenses'
  ].includes(activeView);

  // 5. Menu 5: Invoices
  const isInvoicesActive = (activeView === 'invoices-list' || activeView === 'invoices');

  // 6. Menu 6: Reports
  const isReportsActive = (activeView === 'reports' || activeView.startsWith('reports-'));

  // 7. Menu 7: Users & Roles
  const isUsersActive = ['users', 'users-list', 'roles-list'].includes(activeView);

  // 8. Menu 8: Settings
  const isSettingsActive = ['settings', 'settings-company', 'settings-templates'].includes(activeView);

  // Role-based module visibility checks
  const canAccessVendors = hasPurchasesVendorsPermission(user);

  const canShowSub = (subId, parentId) => {
    return hasSubmenuPermission(user, subId, parentId);
  };

  const canShowGroup = (subIds, parentId) => {
    if (parentId === 'purchases-vendors' && !canAccessVendors) {
      return false;
    }
    return hasMenuPermission(user, subIds, parentId);
  };

  return (
    <aside className="enterprise-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand-header" style={{ justifyContent: 'center', padding: '0 16px' }}>
        <img 
          src="/SoftAir_SFA.png"
          alt="SoftAir SFA" 
          className="sidebar-brand-logo-img" 
          style={{ maxHeight: '46px', maxWidth: '180px', width: 'auto', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* Navigation List: Unified single-button menus like Reports and Invoices */}
      <nav className="sidebar-nav-container">
        {/* 1. Dashboard */}
        {canShowSub('dashboard') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => onViewChange('dashboard')}
            >
              <div className="nav-btn-left">
                <LayoutDashboard size={17} className="nav-icon" />
                <span>Dashboard</span>
              </div>
            </button>
          </div>
        )}

        {/* 2. Products & Stock */}
        {canShowGroup([
          'products-list',
          'stock-categories',
          'products-price-groups',
          'stock-total',
          'stock-warehouses'
        ], 'products-inventory') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isProductsStockActive ? 'active' : ''}`}
              onClick={() => onViewChange('products-stock')}
            >
              <div className="nav-btn-left">
                <Package size={17} className="nav-icon" />
                <span className="group-title-highlight">Products &amp; Stock</span>
              </div>
            </button>
          </div>
        )}

        {/* 3. Purchases & Vendors */}
        {canShowGroup([
          'stock-vendors',
          'stock-details',
          'purchase-orders',
          'warehouse-transfers',
          'vendor-payments'
        ], 'purchases-vendors') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isPurchasesActive ? 'active' : ''}`}
              onClick={() => onViewChange('purchases-vendors')}
            >
              <div className="nav-btn-left">
                <ShoppingCart size={17} className="nav-icon" />
                <span className="group-title-highlight">Purchases &amp; Vendors</span>
              </div>
            </button>
          </div>
        )}

        {/* 4. Customers */}
        {canShowGroup(['customers-details', 'customers-price-mapping', 'customers-advance-booking', 'customers-credit-notes'], 'customers') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isCustomerActive ? 'active' : ''}`}
              onClick={() => onViewChange('customers')}
            >
              <div className="nav-btn-left">
                <Users size={17} className="nav-icon" />
                <span className="group-title-highlight">Customers</span>
              </div>
            </button>
          </div>
        )}

        {/* 5. Sales */}
        {canShowGroup([
          'sales-vehicles', 
          'sales-routes',
          'sales-mappings', 
          'sales-stock-adding',
          'sales-stock-requests',
          'sales-v2v-transfers',
          'sales-live-track',
          'sales-returns',
          'sales-expenses'
        ], 'sales') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isSalesActive ? 'active' : ''}`}
              onClick={() => onViewChange('sales')}
            >
              <div className="nav-btn-left">
                <Truck size={17} className="nav-icon" />
                <span className="group-title-highlight">Sales</span>
              </div>
            </button>
          </div>
        )}

        {/* 6. Invoices */}
        {canShowSub('invoices-list', 'invoices') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isInvoicesActive ? 'active' : ''}`}
              onClick={() => onViewChange('invoices-list')}
            >
              <div className="nav-btn-left">
                <FileText size={17} className="nav-icon" />
                <span className="group-title-highlight">Invoices</span>
              </div>
            </button>
          </div>
        )}

        {/* 7. Reports */}
        {canShowGroup([
          'reports-gst',
          'reports-customer-wise',
          'reports-ledger',
          'reports-payments',
          'reports-outstanding',
          'reports-total-stocks',
          'reports-collections',
          'reports-pending-payments',
          'reports-warehouse-stock',
          'reports-salesman-stock',
          'reports-salesman-collections',
          'reports-damaged',
          'reports-vendor-stock',
          'reports-vendor-payments'
        ], 'reports') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isReportsActive ? 'active' : ''}`}
              onClick={() => onViewChange('reports')}
            >
              <div className="nav-btn-left">
                <BarChart3 size={17} className="nav-icon" />
                <span className="group-title-highlight">Reports</span>
              </div>
            </button>
          </div>
        )}

        {/* 8. Users & Roles */}
        {canShowGroup(['users-list', 'roles-list'], 'users') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isUsersActive ? 'active' : ''}`}
              onClick={() => onViewChange('users')}
            >
              <div className="nav-btn-left">
                <ShieldCheck size={17} className="nav-icon" />
                <span className="group-title-highlight">Users &amp; Roles</span>
              </div>
            </button>
          </div>
        )}

        {/* 9. Settings */}
        {canShowGroup(['settings-company', 'settings-templates'], 'settings') && (
          <div className="nav-group-item">
            <button 
              className={`nav-main-btn ${isSettingsActive ? 'active' : ''}`}
              onClick={() => onViewChange('settings')}
            >
              <div className="nav-btn-left">
                <Settings size={17} className="nav-icon" />
                <span className="group-title-highlight">Settings</span>
              </div>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
};
export default Sidebar;
