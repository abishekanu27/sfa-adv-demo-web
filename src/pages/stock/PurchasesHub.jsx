import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, FileSpreadsheet, Truck, Receipt } from 'lucide-react';
import { VendorDetails } from './VendorDetails';
import { StockDetails } from './StockDetails';
import { PurchaseOrders } from './PurchaseOrders';
import { WarehouseTransfers } from './WarehouseTransfers';
import { VendorPaymentsLedger } from './VendorPaymentsLedger';
import { 
  getUserFromStorage, 
  isUserAdmin, 
  hasPurchasesVendorsPermission, 
  hasSubmenuPermission 
} from '../../utils/permissions';
import '../../components/ModuleHubTabs.css';

export const PurchasesHub = ({
  initialTab = 'stock-vendors',
  onTabChange,
  user,
  companySettings,
  stockInwardTargetProduct,
  onClearInitialProduct,
  onGoToWarehouses
}) => {
  const currentUser = user || getUserFromStorage();
  const isAdmin = isUserAdmin(currentUser);
  const canAccessVendors = hasPurchasesVendorsPermission(currentUser);

  const allTabs = [
    { key: 'stock-vendors', label: 'Vendor Details', icon: Users, requiresVendor: true },
    { key: 'stock-details', label: canAccessVendors ? 'Stock Purchase Details' : 'Inward Stock Details', icon: ShoppingBag, requiresVendor: false },
    { key: 'purchase-orders', label: 'Purchase Orders (PO)', icon: FileSpreadsheet, requiresVendor: true },
    { key: 'warehouse-transfers', label: 'Transfer to Warehouse', icon: Truck, requiresVendor: false },
    { key: 'vendor-payments', label: 'Balance to Pay Vendor', icon: Receipt, requiresVendor: true }
  ];

  const visibleTabs = allTabs.filter(tab => {
    if (tab.requiresVendor && !canAccessVendors) return false;
    return hasSubmenuPermission(currentUser, tab.key, 'purchases-vendors');
  });

  const normalizeTab = (t) => {
    const list = visibleTabs.length > 0 ? visibleTabs : allTabs;
    if (!t || t === 'purchases-vendors' || t === 'purchases') return list[0]?.key || 'stock-vendors';
    const found = list.find(tab => tab.key === t);
    return found ? found.key : (list[0]?.key || 'stock-vendors');
  };

  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab, visibleTabs.length]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    if (onTabChange) onTabChange(tabKey);
  };

  return (
    <div className="module-hub-container">
      {/* Top Hub Navigation Bar */}
      <div className="module-hub-header print-hidden">
        <div className="module-hub-tabs-scroll">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`module-hub-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.key)}
              >
                <span className="module-hub-tab-icon">
                  <Icon size={16} />
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="module-hub-content">
        {activeTab === 'stock-vendors' && (
          <VendorDetails user={user} />
        )}

        {activeTab === 'stock-details' && (
          <StockDetails 
            user={user} 
            initialProduct={stockInwardTargetProduct}
            onClearInitialProduct={onClearInitialProduct}
          />
        )}

        {activeTab === 'purchase-orders' && (
          <PurchaseOrders 
            user={user} 
            companySettings={companySettings}
            onGoToInwardStock={() => handleTabClick('stock-details')} 
          />
        )}

        {activeTab === 'warehouse-transfers' && (
          <WarehouseTransfers 
            user={user} 
            onGoToWarehouses={onGoToWarehouses} 
          />
        )}

        {activeTab === 'vendor-payments' && (
          <VendorPaymentsLedger 
            user={user} 
            onGoToVendors={() => handleTabClick('stock-vendors')} 
          />
        )}
      </div>
    </div>
  );
};
export default PurchasesHub;
