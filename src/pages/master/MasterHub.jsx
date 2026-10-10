import React, { useState, useEffect } from 'react';
import {
  Users,
  Truck,
  Navigation,
  MapPin,
  Database
} from 'lucide-react';
import { SalesmanMaster } from './SalesmanMaster';
import { VehicleManagement } from '../sales/VehicleManagement';
import { RouteManagement } from '../sales/RouteManagement';
import { SalesmanRouteMapping } from '../sales/SalesmanRouteMapping';
import { getUserFromStorage, hasSubmenuPermission } from '../../utils/permissions';
import '../../components/ModuleHubTabs.css';

export const MasterHub = ({
  initialTab = 'master-salesman',
  onTabChange,
  user,
  companySettings
}) => {
  const currentUser = user || getUserFromStorage();

  const allTabs = [
    { key: 'master-salesman', label: 'Salesman Adding', icon: Users },
    { key: 'master-vehicles', label: 'Vehicle Adding', icon: Truck },
    { key: 'master-routes', label: 'Route Master', icon: Navigation },
    { key: 'master-mappings', label: 'Salesman & Route Mapping', icon: MapPin }
  ];

  // Map backwards-compatible keys if passed (e.g., sales-vehicles -> master-vehicles)
  const mapTabKey = (key) => {
    if (key === 'sales-vehicles') return 'master-vehicles';
    if (key === 'sales-routes') return 'master-routes';
    if (key === 'sales-mappings') return 'master-mappings';
    if (key === 'master' || !key) return 'master-salesman';
    return key;
  };

  const visibleTabs = allTabs.filter(tab => {
    // Check permission for master or mapped sales key
    const altKey = tab.key.replace('master-', 'sales-');
    return hasSubmenuPermission(currentUser, tab.key, 'master') || 
           hasSubmenuPermission(currentUser, altKey, 'master') ||
           hasSubmenuPermission(currentUser, altKey, 'sales');
  });

  const normalizeTab = (t) => {
    const mapped = mapTabKey(t);
    const list = visibleTabs.length > 0 ? visibleTabs : allTabs;
    const found = list.find(tab => tab.key === mapped);
    return found ? found.key : (list[0]?.key || 'master-salesman');
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
        {activeTab === 'master-salesman' && (
          <SalesmanMaster />
        )}

        {activeTab === 'master-vehicles' && (
          <VehicleManagement />
        )}

        {activeTab === 'master-routes' && (
          <RouteManagement onNavigateToMappings={() => handleTabClick('master-mappings')} />
        )}

        {activeTab === 'master-mappings' && (
          <SalesmanRouteMapping onNavigateToRoutes={() => handleTabClick('master-routes')} />
        )}
      </div>
    </div>
  );
};

export default MasterHub;
