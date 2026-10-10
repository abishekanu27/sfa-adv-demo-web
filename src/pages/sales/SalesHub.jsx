import React, { useState, useEffect } from 'react';
import { 
  Users,
  Truck, 
  MapPin, 
  PackagePlus, 
  Inbox, 
  ArrowRightLeft, 
  Activity, 
  RotateCcw, 
  Receipt,
  Navigation
} from 'lucide-react';
import { SalesmanMaster } from '../master/SalesmanMaster';
import { VehicleManagement } from './VehicleManagement';
import { RouteManagement } from './RouteManagement';
import { SalesmanRouteMapping } from './SalesmanRouteMapping';
import { SalesmanStockAdding } from './SalesmanStockAdding';
import { SalesmanStockRequests } from './SalesmanStockRequests';
import { VanToVanRequests } from './VanToVanRequests';
import { SalesmanLiveTrack } from './SalesmanLiveTrack';
import { ReturnStock } from './ReturnStock';
import { SalesExpenses } from './SalesExpenses';
import { getUserFromStorage, hasSubmenuPermission, isUserAdmin } from '../../utils/permissions';
import '../../components/ModuleHubTabs.css';

export const SalesHub = ({
  initialTab = 'sales-routes',
  onTabChange,
  user,
  companySettings,
  selectedBranchId
}) => {
  const currentUser = user || getUserFromStorage();

  const allTabs = [
    { key: 'sales-routes', label: 'Route', icon: Navigation },
    { key: 'sales-mappings', label: 'Route Mapping', icon: MapPin },
    { key: 'sales-vehicles', label: 'Vehicle Management', icon: Truck },
    { key: 'sales-stock-adding', label: 'Stock Adding', icon: PackagePlus },
    { key: 'sales-stock-requests', label: 'Stock Requests', icon: Inbox },
    { key: 'sales-v2v-transfers', label: 'Van to Van Transfers', icon: ArrowRightLeft },
    { key: 'sales-live-track', label: 'Salesman Live Track', icon: Activity },
    { key: 'sales-returns', label: 'Return Stock', icon: RotateCcw },
    { key: 'sales-expenses', label: 'Expenses', icon: Receipt }
  ];

  const mapTabKey = (key) => {
    if (!key || key === 'sales') return 'sales-routes';
    if (key === 'master' || key === 'master-routes') return 'sales-routes';
    if (key === 'master-salesman' || key === 'sales-salesman') return 'sales-routes';
    if (key === 'master-vehicles') return 'sales-vehicles';
    if (key === 'master-mappings') return 'sales-mappings';
    return key;
  };

  const visibleTabs = allTabs.filter(tab => {
    if (isUserAdmin(currentUser)) return true;
    const legacyKey = tab.key.replace('sales-', 'master-');
    return hasSubmenuPermission(currentUser, tab.key, 'sales') ||
           hasSubmenuPermission(currentUser, legacyKey, 'master') ||
           hasSubmenuPermission(currentUser, 'sales');
  });

  const normalizeTab = (t) => {
    const mapped = mapTabKey(t);
    const list = visibleTabs.length > 0 ? visibleTabs : allTabs;
    const found = list.find(tab => tab.key === mapped);
    return found ? found.key : (list[0]?.key || 'sales-routes');
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
          {(visibleTabs.length > 0 ? visibleTabs : allTabs).map((tab) => {
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
        {(activeTab === 'sales-routes' || activeTab === 'master-routes') && (
          <RouteManagement onNavigateToMappings={() => handleTabClick('sales-mappings')} selectedBranchId={selectedBranchId} />
        )}

        {(activeTab === 'sales-salesman' || activeTab === 'master-salesman') && (
          <SalesmanMaster selectedBranchId={selectedBranchId} />
        )}

        {(activeTab === 'sales-mappings' || activeTab === 'master-mappings') && (
          <SalesmanRouteMapping onNavigateToRoutes={() => handleTabClick('sales-routes')} selectedBranchId={selectedBranchId} />
        )}

        {(activeTab === 'sales-vehicles' || activeTab === 'master-vehicles') && (
          <VehicleManagement selectedBranchId={selectedBranchId} />
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
