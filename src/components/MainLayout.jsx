import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Moon, 
  Sun, 
  Bell, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  RefreshCw
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ProductsHub } from '../pages/products/ProductsHub';
import { PurchasesHub } from '../pages/stock/PurchasesHub';
import { CustomersHub } from '../pages/customers/CustomersHub';
import { SalesHub } from '../pages/sales/SalesHub';
import { UsersHub } from '../pages/users/UsersHub';
import { InvoiceManagement } from '../pages/invoices/InvoiceManagement';
import { DashboardPreview } from '../pages/DashboardPreview';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { ReportsHub } from '../pages/reports/ReportsHub';
import { fetchCompanySettings } from '../services/api';
import { exportDashboardToExcel } from '../services/excelExport';
import { getFirstAccessibleMenu } from '../utils/permissions';
import { TopLoadingBar } from './PageLoader';
import './MainLayout.css';

export const MainLayout = ({ user, onLogout }) => {
  const firstMenu = getFirstAccessibleMenu(user);

  // Initialize activeView from localStorage or URL hash to preserve current menu on refresh,
  // defaulting to the user's first accessible menu
  const [activeView, setActiveView] = useState(() => {
    try {
      const hash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
      if (hash) return hash;
      const saved = localStorage.getItem('sf_nexus_active_view');
      if (saved) return saved;
    } catch (e) {}
    return firstMenu;
  });

  const [isNavigating, setIsNavigating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companySettings, setCompanySettings] = useState(() => {
    try {
      const cached = localStorage.getItem('salesforce_company_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [creditNoteCustomerId, setCreditNoteCustomerId] = useState(null);
  const [stockInwardTargetProduct, setStockInwardTargetProduct] = useState(null);

  const handleGoToAddStock = (product) => {
    setStockInwardTargetProduct(product);
    setActiveView('stock-details');
  };

  // Automatically save active menu whenever it changes and update URL hash
  useEffect(() => {
    try {
      if (activeView) {
        localStorage.setItem('sf_nexus_active_view', activeView);
        window.location.hash = activeView;
      }
    } catch (e) {}
  }, [activeView]);

  // Handle browser back / forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (h && h !== activeView) {
        setActiveView(h);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeView]);

  useEffect(() => {
    fetchCompanySettings().then(settings => {
      if (settings) {
        setCompanySettings(settings);
        localStorage.setItem('salesforce_company_settings', JSON.stringify(settings));
      }
    }).catch(err => {
      console.error('Failed to load company settings:', err);
    });

    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        setCompanySettings(e.detail);
      }
    };
    window.addEventListener('companySettingsUpdated', handleSettingsUpdated);
    return () => window.removeEventListener('companySettingsUpdated', handleSettingsUpdated);
  }, []);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 450);
    return () => clearTimeout(timer);
  }, [activeView]);

  const handleSyncApp = async () => {
    setIsSyncing(true);
    try {
      localStorage.setItem('sf_nexus_active_view', activeView);
      window.location.hash = activeView;
      showToast('Syncing application data...', 'success');
      const settings = await fetchCompanySettings();
      if (settings) setCompanySettings(settings);
    } catch (err) {
      console.warn('Sync issue:', err);
    }
    // Fast refresh to reload all live data while preserving exact active menu
    setTimeout(() => {
      window.location.reload();
    }, 450);
  };

  const displayName = user?.name || 'Administrator';
  const displayRole = user?.role || 'Administrator';
  const avatarLetter = displayName.charAt(0).toUpperCase() || 'A';

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleExcelExport = () => {
    try {
      exportDashboardToExcel();
      showToast('Data sheet exported successfully in Excel (.xlsx)!');
    } catch {
      showToast('Exporting data sheet...', 'success');
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setActiveView('products-details');
  };

  const handleCategorySelectFromMaster = (categoryName) => {
    setActiveCategory(categoryName);
    setActiveView('products-list');
  };

  return (
    <div className={`app-layout-root ${isDarkMode ? 'dark-theme' : ''}`}>
      {/* Top Navigation Progress Bar */}
      <TopLoadingBar visible={isNavigating} />

      {/* Toast Notification */}
      {notification && (
        <div className={`enterprise-toast ${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar 
        activeView={activeView} 
        user={user}
        companySettings={companySettings}
        onViewChange={(view) => {
          setActiveView(view);
          if (view === 'products-categories') {
            setActiveCategory('All');
          }
        }} 
        onLogout={onLogout} 
      />

      {/* Main Right Area */}
      <div className="app-layout-main">
        {/* Top Navigation Bar with Dynamic Company Branding */}
        <header className="enterprise-top-nav">
          <div className="top-nav-left">
            {/* Dynamic Company Branding instead of static Sales force ERP */}
            <div 
              className="top-nav-company-brand" 
              title={companySettings?.legal_name || companySettings?.company_name || ''}
            >
              {companySettings?.logo_url ? (
                <img 
                  src={companySettings.logo_url} 
                  alt={companySettings.company_name || 'Logo'} 
                  className="nav-company-logo-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  onLoad={(e) => { e.target.style.display = 'block'; }}
                />
              ) : (
                <div className="nav-company-badge">
                  <Building2 size={16} color="#ffffff" />
                </div>
              )}
              <div className="nav-company-text">
                <span className="nav-company-name">
                  {companySettings?.company_name || ''}
                </span>
                {companySettings?.gstin?.trim() ? (
                  <span className="nav-company-gstin">GSTIN: {companySettings.gstin.trim()}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Icons */}
          <div className="top-nav-right">
            {/* Sync / Refresh Button */}
            <button 
              className={`nav-sync-btn ${isSyncing ? 'syncing' : ''}`}
              title="Sync & Refresh (Keeps current active view)"
              onClick={handleSyncApp}
              disabled={isSyncing}
            >
              <RefreshCw size={14} className={isSyncing ? 'spin-icon' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
            {/* User Profile Pill */}
            <div className="user-profile-pill-container">
              <button 
                className="user-profile-pill-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <div className="purple-avatar-circle">
                  {avatarLetter}
                </div>
                <div className="user-pill-text">
                  <span className="user-pill-name">{displayName}</span>
                  <span className="user-pill-role">{displayRole}</span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showUserDropdown && (
                <div className="user-profile-dropdown">
                  <div className="dropdown-user-header">
                    <strong>{displayName}</strong>
                    <small>{user?.email || 'admin@salesforce.com'}</small>
                    {user?.phone && (
                      <small className="phone-line">{user.phone}</small>
                    )}
                  </div>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-logout-item"
                    onClick={onLogout}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="layout-content-container">
          {/* Dashboard */}
          {activeView === 'dashboard' && (
            <DashboardPreview 
              user={user} 
              isEmbedded={true} 
              onLogout={onLogout} 
            />
          )}

          {/* 1. Products & Stock Hub */}
          {(activeView === 'products-stock' || 
            activeView === 'products-inventory' ||
            activeView === 'products-list' || 
            activeView === 'products-details' || 
            activeView === 'products-add' || 
            activeView === 'products-categories' || 
            activeView === 'stock-categories' || 
            activeView === 'products-price-groups' || 
            activeView === 'stock-total' || 
            activeView === 'stock-warehouses') && (
            <ProductsHub 
              initialTab={activeView}
              onTabChange={(tab) => setActiveView(tab)}
              user={user}
              initialCategory={activeCategory}
              searchQuery={searchQuery}
              selectedProduct={selectedProduct}
              onSelectProduct={handleSelectProduct}
              onAddStock={handleGoToAddStock}
            />
          )}

          {/* 2. Purchases & Vendors Hub */}
          {(activeView === 'purchases-vendors' || 
            activeView === 'purchases' ||
            activeView === 'stock-vendors' || 
            activeView === 'stock-details' || 
            activeView === 'purchase-orders' || 
            activeView === 'warehouse-transfers' || 
            activeView === 'vendor-payments') && (
            <PurchasesHub 
              initialTab={activeView}
              onTabChange={(tab) => setActiveView(tab)}
              user={user}
              companySettings={companySettings}
              stockInwardTargetProduct={stockInwardTargetProduct}
              onClearInitialProduct={() => setStockInwardTargetProduct(null)}
              onGoToWarehouses={() => setActiveView('stock-warehouses')}
            />
          )}

          {/* 3. Customers Hub */}
          {(activeView === 'customers' || 
            activeView === 'customers-details' || 
            activeView === 'customers-price-mapping' || 
            activeView === 'customers-advance-booking' || 
            activeView === 'customers-credit-notes') && (
            <CustomersHub 
              initialTab={activeView}
              onTabChange={(tab) => setActiveView(tab)}
              user={user}
              companySettings={companySettings}
              preselectedCustomerId={creditNoteCustomerId}
              onGoToPriceGroups={() => setActiveView('products-price-groups')}
            />
          )}

          {/* 4. Sales Hub */}
          {(activeView === 'sales' || 
            activeView === 'sales-vehicles' || 
            activeView === 'sales-routes' || 
            activeView === 'sales-mappings' || 
            activeView === 'sales-stock-adding' || 
            activeView === 'sales-stock-requests' || 
            activeView === 'sales-v2v-transfers' || 
            activeView === 'sales-live-track' || 
            activeView === 'sales-returns' || 
            activeView === 'sales-expenses') && (
            <SalesHub 
              initialTab={activeView}
              onTabChange={(tab) => setActiveView(tab)}
              user={user}
              companySettings={companySettings}
            />
          )}

          {/* 5. Invoices */}
          {(activeView === 'invoices-list' || activeView === 'invoices') && (
            <InvoiceManagement 
              user={user} 
              companySettings={companySettings} 
            />
          )}

          {/* 6. Reports Hub */}
          {(activeView === 'reports' || activeView.startsWith('reports-')) && (
            <ReportsHub 
              initialTab={activeView}
              user={user}
            />
          )}

          {/* 7. Users & Roles Hub */}
          {(activeView === 'users' || activeView === 'users-list' || activeView === 'roles-list') && (
            <UsersHub 
              initialTab={activeView}
              onTabChange={(tab) => setActiveView(tab)}
              user={user}
            />
          )}

          {/* 8. Settings */}
          {(activeView === 'settings' || activeView === 'settings-company' || activeView === 'settings-templates') && (
            <SettingsPage 
              initialTab={activeView === 'settings-templates' ? 'templates' : 'company'}
              onSettingsUpdate={(updated) => setCompanySettings(updated)}
            />
          )}
        </main>
      </div>
    </div>
  );
};
