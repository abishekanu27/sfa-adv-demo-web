import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  PackagePlus, 
  Inbox, 
  ArrowRightLeft, 
  Activity, 
  RotateCcw, 
  Receipt 
} from 'lucide-react';
import { VehicleManagement } from './VehicleManagement';
import { SalesmanRouteMapping } from './SalesmanRouteMapping';
import { SalesmanStockAdding } from './SalesmanStockAdding';
import { SalesmanStockRequests } from './SalesmanStockRequests';
import { VanToVanRequests } from './VanToVanRequests';
import { SalesmanLiveTrack } from './SalesmanLiveTrack';
import { ReturnStock } from './ReturnStock';
import { SalesExpenses } from './SalesExpenses';
import { getUserFromStorage, hasSubmenuPermission } from '../../utils/permissions';
import '../../components/ModuleHubTabs.css';

export const SalesHub = ({
  initialTab = 'sales-vehicles',
  onTabChange,
  user,
  companySettings
}) => {
  const currentUser = user || getUserFromStorage();

  const allTabs = [
    { key: 'sales-vehicles', label: 'Vehicle Adding', icon: Truck },
    { key: 'sales-mappings', label: 'Salesman & Route Mapping', icon: MapPin },
    { key: 'sales-stock-adding', label: 'Stock Adding', icon: PackagePlus },
    { key: 'sales-stock-requests', label: 'Stock Requests', icon: Inbox },
    { key: 'sales-v2v-transfers', label: 'Van to Van Transfers', icon: ArrowRightLeft },
    { key: 'sales-live-track', label: 'Salesman Live Track', icon: Activity },
    { key: 'sales-returns', label: 'Return Stock', icon: RotateCcw },
    { key: 'sales-expenses', label: 'Expenses', icon: Receipt }
  ];

  const visibleTabs = allTabs.filter(tab => hasSubmenuPermission(currentUser, tab.key, 'sales'));

  const normalizeTab = (t) => {
    const list = visibleTabs.length > 0 ? visibleTabs : allTabs;
    if (!t || t === 'sales') return list[0]?.key || 'sales-vehicles';
    const found = list.find(tab => tab.key === t);
    return found ? found.key : (list[0]?.key || 'sales-vehicles');
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
        {activeTab === 'sales-vehicles' && (
          <VehicleManagement />
        )}

        {activeTab === 'sales-mappings' && (
          <SalesmanRouteMapping />
        )}

        {activeTab === 'sales-stock-adding' && (
          <SalesmanStockAdding />
        )}

        {activeTab === 'sales-stock-requests' && (
          <SalesmanStockRequests user={user} />
        )}

        {activeTab === 'sales-v2v-transfers' && (
          <VanToVanRequests user={user} />
        )}

        {activeTab === 'sales-live-track' && (
          <SalesmanLiveTrack user={user} />
        )}

        {activeTab === 'sales-returns' && (
          <ReturnStock companySettings={companySettings} />
        )}

        {activeTab === 'sales-expenses' && (
          <SalesExpenses user={user} companySettings={companySettings} />
        )}
      </div>
    </div>
  );
};
export default SalesHub;
