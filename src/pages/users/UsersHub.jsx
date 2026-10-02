import React, { useState, useEffect } from 'react';
import { UserCheck, Shield } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { getUserFromStorage, hasSubmenuPermission } from '../../utils/permissions';
import '../../components/ModuleHubTabs.css';

export const UsersHub = ({
  initialTab = 'users-list',
  onTabChange,
  user
}) => {
  const currentUser = user || getUserFromStorage();

  const allTabs = [
    { key: 'users-list', label: 'User Management', icon: UserCheck },
    { key: 'roles-list', label: 'Role Management', icon: Shield }
  ];

  const visibleTabs = allTabs.filter(tab => hasSubmenuPermission(currentUser, tab.key, 'users'));

  const normalizeTab = (t) => {
    const list = visibleTabs.length > 0 ? visibleTabs : allTabs;
    if (!t || t === 'users') return list[0]?.key || 'users-list';
    const found = list.find(tab => tab.key === t);
    return found ? found.key : (list[0]?.key || 'users-list');
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
        {activeTab === 'users-list' && (
          <UserManagement />
        )}

        {activeTab === 'roles-list' && (
          <RoleManagement />
        )}
      </div>
    </div>
  );
};

