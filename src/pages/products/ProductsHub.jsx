import React, { useState, useEffect } from 'react';
import { Package, FolderTree, DollarSign, Warehouse } from 'lucide-react';
import { ProductList } from './ProductList';
import { ProductDetails } from './ProductDetails';
import { ProductCategories } from './ProductCategories';
import { SellingPriceGroups } from './SellingPriceGroups';
import { WarehouseDetails } from '../stock/WarehouseDetails';
import { getUserFromStorage, hasSubmenuPermission } from '../../utils/permissions';
import '../../components/ModuleHubTabs.css';

export const ProductsHub = ({
  initialTab = 'products-list',
  onTabChange,
  user,
  initialCategory = 'All',
  searchQuery = '',
  selectedProduct,
  onSelectProduct,
  onAddStock
}) => {
  const currentUser = user || getUserFromStorage();

  const allTabs = [
    { key: 'products-list', label: 'Product Details List', icon: Package },
    { key: 'stock-categories', label: 'Category Adding', icon: FolderTree },
    { key: 'products-price-groups', label: 'Selling Price Groups', icon: DollarSign },
    { key: 'stock-warehouses', label: 'Warehouse Details', icon: Warehouse }
  ];

  const visibleTabs = allTabs.filter(tab => hasSubmenuPermission(currentUser, tab.key, 'products-stock'));

  const normalizeTab = (t) => {
    const list = visibleTabs.length > 0 ? visibleTabs : allTabs;
    if (!t || t === 'products-stock' || t === 'products-inventory' || t === 'products-add' || t === 'stock-total') return list[0]?.key || 'products-list';
    if (t === 'products-categories') return 'stock-categories';
    const found = list.find(tab => tab.key === t);
    return found ? found.key : (list[0]?.key || 'products-list');
  };

  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [internalSelectedProduct, setInternalSelectedProduct] = useState(selectedProduct || null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab, visibleTabs.length]);

  useEffect(() => {
    if (selectedProduct) {
      setInternalSelectedProduct(selectedProduct);
    }
  }, [selectedProduct]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setInternalSelectedProduct(null);
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
        {activeTab === 'products-list' && (
          internalSelectedProduct ? (
            <ProductDetails
              product={internalSelectedProduct}
              onBackToList={() => setInternalSelectedProduct(null)}
              onSelectProduct={(p) => {
                setInternalSelectedProduct(p);
                if (onSelectProduct) onSelectProduct(p);
              }}
              onOpenAddProduct={() => setInternalSelectedProduct(null)}
            />
          ) : (
            <ProductList
              initialCategory={initialCategory}
              searchQuery={searchQuery}
              onSelectProduct={(p) => {
                setInternalSelectedProduct(p);
                if (onSelectProduct) onSelectProduct(p);
              }}
              onAddStock={onAddStock}
              onGoToCategories={() => handleTabClick('stock-categories')}
            />
          )
        )}

        {activeTab === 'stock-categories' && (
          <ProductCategories 
            onSelectCategory={() => handleTabClick('products-list')}
          />
        )}

        {activeTab === 'products-price-groups' && (
          <SellingPriceGroups 
            onSelectProduct={(p) => {
              setInternalSelectedProduct(p);
              setActiveTab('products-list');
              if (onSelectProduct) onSelectProduct(p);
            }}
          />
        )}

        {activeTab === 'stock-warehouses' && (
          <WarehouseDetails user={user} />
        )}
      </div>
    </div>
  );
};
export default ProductsHub;
