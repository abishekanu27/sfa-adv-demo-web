import React, { useState, useEffect } from 'react';
import { Users, Layers, CalendarCheck, CreditCard } from 'lucide-react';
import { CustomerDetails } from './CustomerDetails';
import { CustomerPriceGroupMapping } from './CustomerPriceGroupMapping';
import { AdvancedBooking } from './AdvancedBooking';
import { CustomerCreditNotes } from './CustomerCreditNotes';
import { getUserFromStorage, hasSubmenuPermission } from '../../utils/permissions';
import '../../components/ModuleHubTabs.css';

export const CustomersHub = ({
  initialTab = 'customers-details',
  onTabChange,
  companySettings,
  preselectedCustomerId,
  onGoToPriceGroups,
  user,
  selectedBranchId
}) => {
  const currentUser = user || getUserFromStorage();

  const allTabs = [
    { key: 'customers-details', label: 'Customer Details', icon: Users },
    { key: 'customers-price-mapping', label: 'Customer & Price Group Mapping', icon: Layers },
    { key: 'customers-advance-booking', label: 'Advanced Booking', icon: CalendarCheck },
    { key: 'customers-credit-notes', label: 'Credit Notes', icon: CreditCard }
  ];

  const visibleTabs = allTabs.filter(tab => hasSubmenuPermission(currentUser, tab.key, 'customers'));

  const normalizeTab = (t) => {
    const list = visibleTabs.length > 0 ? visibleTabs : allTabs;
    if (!t || t === 'customers') return list[0]?.key || 'customers-details';
    const found = list.find(tab => tab.key === t);
    return found ? found.key : (list[0]?.key || 'customers-details');
  };

  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [internalCreditCustomerId, setInternalCreditCustomerId] = useState(preselectedCustomerId || null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab, visibleTabs.length]);

  useEffect(() => {
    if (preselectedCustomerId) {
      setInternalCreditCustomerId(preselectedCustomerId);
    }
  }, [preselectedCustomerId]);

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
        {activeTab === 'customers-details' && (
          <CustomerDetails 
            onGoToPriceMapping={() => handleTabClick('customers-price-mapping')}
            onIssueCreditNote={(custId) => {
              setInternalCreditCustomerId(custId);
              handleTabClick('customers-credit-notes');
            }}
            selectedBranchId={selectedBranchId}
          />
        )}

        {activeTab === 'customers-price-mapping' && (
          <CustomerPriceGroupMapping 
            onGoToPriceGroups={onGoToPriceGroups}
            onGoToCustomerDetails={() => handleTabClick('customers-details')}
          />
        )}

        {activeTab === 'customers-advance-booking' && (
          <AdvancedBooking selectedBranchId={selectedBranchId} user={currentUser} />
        )}

        {activeTab === 'customers-credit-notes' && (
          <CustomerCreditNotes 
            companySettings={companySettings}
            preselectedCustomerId={internalCreditCustomerId}
          />
        )}
      </div>
    </div>
  );
};
export default CustomersHub;
