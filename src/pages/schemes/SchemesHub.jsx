import React, { useState, useEffect } from 'react';
import { Gift, SlidersHorizontal, Sparkles } from 'lucide-react';
import { SchemesList } from './SchemesList';
import { SchemeSimulator } from './SchemeSimulator';
import '../../components/ModuleHubTabs.css';
import './SchemesHub.css';

export const SchemesHub = ({
  initialTab = 'schemes-list',
  onTabChange,
  user,
  selectedBranchId
}) => {
  const tabs = [
    { key: 'schemes-list', label: 'Active Schemes & Offers', icon: Gift },
    { key: 'schemes-simulator', label: 'Offer Simulator & Tester', icon: SlidersHorizontal }
  ];

  const [activeTab, setActiveTab] = useState(
    initialTab === 'schemes-simulator' ? 'schemes-simulator' : 'schemes-list'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'schemes-simulator' ? 'schemes-simulator' : 'schemes-list');
    }
  }, [initialTab]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    if (onTabChange) onTabChange(tabKey);
  };

  return (
    <div className="module-hub-container">
      {/* Top Hub Navigation Bar */}
      <div className="module-hub-header print-hidden">
        <div className="module-hub-tabs-scroll">
          {tabs.map((tab) => {
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
      <div className="module-hub-content" style={{ padding: '20px' }}>
        {activeTab === 'schemes-list' && (
          <SchemesList 
            onOpenSimulator={() => handleTabClick('schemes-simulator')}
            selectedBranchId={selectedBranchId}
          />
        )}

        {activeTab === 'schemes-simulator' && (
          <SchemeSimulator />
        )}
      </div>
    </div>
  );
};

export default SchemesHub;
