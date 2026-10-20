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
  RefreshCw,
  KeyRound,
  ChevronDown
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopNavTimeWidget } from './TopNavTimeWidget';
import { ResetPasswordModal } from './ResetPasswordModal.jsx';
import { ProductsHub } from '../pages/products/ProductsHub';
import { PurchasesHub } from '../pages/stock/PurchasesHub';
import { CustomersHub } from '../pages/customers/CustomersHub';
import { SalesHub } from '../pages/sales/SalesHub';
import { UsersHub } from '../pages/users/UsersHub';
import { InvoiceManagement } from '../pages/invoices/InvoiceManagement';
import { SchemesHub } from '../pages/schemes/SchemesHub';
import { DashboardPreview } from '../pages/DashboardPreview';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { BranchManagement } from '../pages/settings/BranchManagement';
import { ReportsHub } from '../pages/reports/ReportsHub';
import { fetchCompanySettings, fetchBranchesApi, API_BASE } from '../services/api';
import { exportDashboardToExcel } from '../services/excelExport';
import { getFirstAccessibleMenu, isUserAdmin, isSuperAdmin } from '../utils/permissions';
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
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
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

  const isAdmin = isUserAdmin(user);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (!isAdmin) {
      const uBr = user?.branch_id ? String(user.branch_id) : '1';
      try {
        localStorage.setItem('sf_nexus_active_branch', uBr);
      } catch (e) {}
      return uBr;
    }
    try {
      const saved = localStorage.getItem('sf_nexus_active_branch');
      if (saved) return saved;
    } catch (e) {}
    return 'all';
  });

  useEffect(() => {
    fetchBranchesApi().then(b => {
      setBranches(b || []);
    }).catch(e => console.warn('Branches fetch:', e));
  }, []);

  const handleBranchSwitch = (bId) => {
    if (!isAdmin) return; // Prevent non-admin branch switching
    setSelectedBranchId(bId);
    try {
      localStorage.setItem('sf_nexus_active_branch', bId);
      window.dispatchEvent(new CustomEvent('activeBranchChanged', { detail: bId }));
    } catch (e) {}
  };

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

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  const performLiveSync = async (isManual = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // 1. Check server connectivity
      const res = await fetch(`${API_BASE}/health`).catch(() => null);
      const isReachable = res && res.ok;
      setIsOnline(isReachable);

      if (isReachable) {
        // 2. Refresh company settings and branches silently
        const [settings, bList] = await Promise.all([
          fetchCompanySettings().catch(() => null),
          fetchBranchesApi().catch(() => null),
        ]);
        if (settings) {
          setCompanySettings(settings);
          localStorage.setItem('salesforce_company_settings', JSON.stringify(settings));
        }
        if (Array.isArray(bList) && bList.length > 0) {
          setBranches(bList);
        }
      }

      // 3. Broadcast global appDataSync event so active views re-fetch live data without full reload
      window.dispatchEvent(new CustomEvent('appDataSync', { 
        detail: { 
          timestamp: Date.now(),
          branchId: selectedBranchId,
          isManual
        } 
      }));

      setLastSyncTime(Date.now());
      if (isManual) {
        showToast('All live data and mobile orders synchronized!', 'success');
      }
    } catch (err) {
      console.warn('Live sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Continuous background live synchronization (Every 15s whenever online, plus on tab focus and network recovery)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performLiveSync(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        performLiveSync(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 15s auto-sync interval
    const intervalTimer = setInterval(() => {
      if (navigator.onLine) {
        performLiveSync(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(intervalTimer);
    };
  }, [selectedBranchId]);

  const isSuper = isSuperAdmin(user);
  const displayName = isSuper
    ? (user?.name && user.name !== 'admin' && user.name !== 'Administrator' ? user.name : 'Super Administrator')
    : (user?.name || 'Administrator');
  const displayRole = user?.role || 'Administrator';
  const displayRoleBadge = (() => {
    if (isSuper || user?.role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (isAdmin || user?.role === 'ADMIN') return 'ADMIN';
    return (user?.role_code || user?.role || 'USER').toUpperCase();
  })();
  const avatarLetter = displayName.charAt(0).toUpperCase() || 'S';

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

            {/* Branch Switcher or Branch Locked Badge */}
            <div className="top-nav-branch-selector">
              {isAdmin ? (
                <div className="branch-dropdown-wrapper">
                  <Building2 size={15} color="#2563eb" />
                  <select 
                    value={selectedBranchId} 
                    onChange={(e) => handleBranchSwitch(e.target.value)}
                    className="top-nav-branch-select"
                    title="Switch Branch Filter"
                  >
                    <option value="all">All Branches (Consolidated)</option>
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.branch_code} - {b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="branch-locked-badge" title="Authorized Branch Assignment">
                  <Building2 size={14} color="#16a34a" />
                  <span>
                    {branches.find(b => String(b.branch_id) === String(selectedBranchId))?.branch_name || user?.branch_name || 'Main Branch'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Icons */}
          <div className="top-nav-right">
            {/* Live Auto-Sync Status Badge */}
            <button 
              className={`nav-sync-btn ${isSyncing ? 'syncing' : ''} ${!isOnline ? 'offline' : ''}`}
              title="Continuous Live Sync with Mobile & Backend (Always Active - Click to sync now)"
              onClick={() => performLiveSync(true)}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw size={13} className="spin-icon" />
              ) : (
                <span className={isOnline ? 'sync-live-dot' : 'sync-offline-dot'} />
              )}
              <span>{isSyncing ? 'Syncing...' : isOnline ? 'Live Synced' : 'Offline'}</span>
            </button>
            {/* Live Time Clock Widget (Right near User as in reference image) */}
            <TopNavTimeWidget />

            {/* User Profile Pill */}
            <div className="user-profile-pill-container">
              <button 
                className="user-profile-pill-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                title="User Profile & Account Options"
              >
                <div className="user-avatar-circle">
                  {avatarLetter}
                </div>
                <div className="user-pill-text">
                  <span className="user-pill-name">{displayName}</span>
                  <span className="user-pill-role-badge">{displayRoleBadge}</span>
                </div>
                <ChevronDown size={15} className={`user-pill-chevron ${showUserDropdown ? 'open' : ''}`} />
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
                    className="dropdown-action-item"
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowResetPasswordModal(true);
                    }}
                  >
                    <KeyRound size={14} style={{ color: '#2563eb' }} />
                    <span>Reset Password</span>
                  </button>
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
              selectedBranchId={selectedBranchId}
            />
          )}

          {/* Branch Management Main Hub */}
          {(activeView === 'branches' || activeView === 'branch-management') && (
            <BranchManagement />
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
              selectedBranchId={selectedBranchId}
            />
          )}

          {/* 4. Sales Hub (Salesman, Vehicle Management, Route Master, Route Mapping, Operations) */}
          {(activeView === 'sales' || 
            activeView === 'sales-salesman' ||
            activeView === 'sales-vehicles' || 
            activeView === 'sales-routes' || 
            activeView === 'sales-mappings' || 
            activeView === 'sales-stock-adding' || 
            activeView === 'sales-stock-requests' || 
            activeView === 'sales-v2v-transfers' || 
            activeView === 'sales-live-track' || 
            activeView === 'sales-returns' || 
            activeView === 'sales-expenses' ||
            activeView === 'master' ||
            activeView === 'master-salesman' ||
            activeView === 'master-vehicles' ||
            activeView === 'master-routes' ||
            activeView === 'master-mappings') && (
            <SalesHub 
              initialTab={activeView}
              onTabChange={(tab) => setActiveView(tab)}
              user={user}
              companySettings={companySettings}
              selectedBranchId={selectedBranchId}
            />
          )}

          {/* 5. Schemes & Offers Hub */}
          {(activeView === 'schemes' || 
            activeView === 'schemes-list' || 
            activeView === 'schemes-simulator' || 
            activeView === 'schemes-add') && (
            <SchemesHub 
              initialTab={activeView}
              onTabChange={(tab) => setActiveView(tab)}
              user={user}
              selectedBranchId={selectedBranchId}
            />
          )}

          {/* 6. Invoices */}
          {(activeView === 'invoices-list' || activeView === 'invoices') && (
            <InvoiceManagement 
              user={user} 
              companySettings={companySettings} 
              selectedBranchId={selectedBranchId}
            />
          )}

          {/* 6. Reports Hub */}
          {(activeView === 'reports' || activeView.startsWith('reports-')) && (
            <ReportsHub 
              initialTab={activeView}
              user={user}
              selectedBranchId={selectedBranchId}
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

          {/* Settings (STRICTLY SuperAdmin Only - Hidden and Restricted from Normal Admin) */}
          {(activeView === 'settings' || activeView === 'settings-company' || activeView === 'settings-templates' || activeView === 'settings-limits') && (
            isSuperAdmin(user) ? (
              <SettingsPage 
                user={user}
                initialTab={activeView === 'settings-templates' ? 'templates' : activeView === 'settings-limits' ? 'limits' : 'company'}
                onSettingsUpdate={(updated) => setCompanySettings(updated)}
              />
            ) : (
              <div style={{
                padding: '60px 24px',
                textAlign: 'center',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                maxWidth: '600px',
                margin: '40px auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  marginBottom: '16px'
                }}>
                  🔒
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                  Settings Access Restricted
                </h3>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                  The Settings menu and license configuration controls are restricted strictly to the <strong>Super Administrator</strong>.
                  Please contact your system provider to adjust user creation limits or business profile settings.
                </p>
                <button
                  onClick={() => setActiveView('dashboard')}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        user={user}
        onPasswordResetSuccess={() => {
          setNotification({
            type: 'success',
            msg: 'Password updated and saved to database successfully!'
          });
          setTimeout(() => setNotification(null), 4000);
        }}
      />
    </div>
  );
};
