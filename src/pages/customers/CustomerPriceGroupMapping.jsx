import React, { useState, useEffect } from 'react';
import {
  Tag,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Eye,
  CheckSquare,
  Square,
  ArrowRight,
  Layers,
  Sparkles,
  X,
  ExternalLink
} from 'lucide-react';
import {
  fetchCustomersApi,
  fetchPriceGroupsApi,
  fetchCustomerMappingSummaryApi,
  updateCustomerPriceGroupApi,
  bulkUpdateCustomerPriceGroupsApi,
  fetchGroupProductPricesApi
} from '../../services/api';
import './CustomerPriceGroupMapping.css';

export const CustomerPriceGroupMapping = ({ onGoToPriceGroups, onGoToCustomerDetails }) => {
  const [customers, setCustomers] = useState([]);
  const [priceGroups, setPriceGroups] = useState([]);
  const [summary, setSummary] = useState({ price_groups: [], unassigned_count: 0 });
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Selection for bulk mapping
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState('');
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  // Rate Inspection Modal
  const [inspectingGroup, setInspectingGroup] = useState(null);
  const [inspectingProducts, setInspectingProducts] = useState([]);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, pgList, summaryData] = await Promise.all([
        fetchCustomersApi(searchQuery, selectedGroupFilter, 'all'),
        fetchPriceGroupsApi(),
        fetchCustomerMappingSummaryApi()
      ]);
      setCustomers(custList);
      setPriceGroups(pgList);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading mapping data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedGroupFilter]);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Single Customer Price Group Change
  const handleSingleGroupChange = async (customerId, newGroupId) => {
    try {
      const targetPg = newGroupId ? parseInt(newGroupId, 10) : null;
      await updateCustomerPriceGroupApi(customerId, targetPg);
      const pgObj = priceGroups.find(p => (p.price_group_id || p.id) === targetPg);
      showNotification(
        pgObj ? `Customer mapped to "${pgObj.name}"` : 'Customer reset to Default Base MRP',
        'success'
      );
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to update mapping', 'error');
    }
  };

  // 2. Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedCustomerIds.length === customers.length && customers.length > 0) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customers.map(c => c.customer_id || c.id));
    }
  };

  // 3. Toggle Single Row Selection
  const handleToggleCustomerSelect = (id) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter(i => i !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  // 4. Bulk Apply Mapping
  const handleApplyBulkMapping = async () => {
    if (selectedCustomerIds.length === 0) {
      showNotification('Please select at least one customer', 'error');
      return;
    }

    try {
      setIsBulkApplying(true);
      const targetPg = bulkTargetGroupId ? parseInt(bulkTargetGroupId, 10) : null;
      const res = await bulkUpdateCustomerPriceGroupsApi(selectedCustomerIds, targetPg);
      showNotification(res.message || 'Bulk mapping updated successfully!');
      setSelectedCustomerIds([]);
      setBulkTargetGroupId('');
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to apply bulk mapping', 'error');
    } finally {
      setIsBulkApplying(false);
    }
  };

  // 5. Inspect Group Rates
  const handleOpenInspectGroup = async (groupOrId, groupName) => {
    let pgId = typeof groupOrId === 'object' ? (groupOrId.price_group_id || groupOrId.id) : groupOrId;
    let name = typeof groupOrId === 'object' ? groupOrId.name : groupName;

    if (!pgId) {
      showNotification('Customer is on Default MRP. No custom group rates assigned.', 'error');
      return;
    }

    setInspectingGroup({ id: pgId, name });
    setLoadingInspect(true);
    try {
      const res = await fetchGroupProductPricesApi(pgId);
      setInspectingProducts(res.data || []);
    } catch (err) {
      showNotification('Failed to load group rate details: ' + err.message, 'error');
    } finally {
      setLoadingInspect(false);
    }
  };

  return (
    <div className="customer-mapping-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`mapping-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Customers</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Customer and Selling Price Groups Mapping</span>
          </nav>
          <h1 className="dashboard-main-title">
            Customer & Selling Price Groups Mapping Matrix
          </h1>
          <p className="dashboard-sub-title">
            Map retail and trade customers to specific rate tiers (e.g. Customer Rate A, Customer Rate B, Wholesale Tier) to automatically apply negotiated price schedules during sales billing.
          </p>
        </div>

        <div className="page-header-actions">
          {onGoToCustomerDetails && (
            <button 
              className="action-btn btn-outline"
              onClick={onGoToCustomerDetails}
            >
              <Users size={15} />
              <span>Customer Details</span>
            </button>
          )}
          {onGoToPriceGroups && (
            <button 
              className="action-btn btn-primary"
              onClick={onGoToPriceGroups}
            >
              <Tag size={15} />
              <span>Manage Price Groups</span>
            </button>
          )}
        </div>
      </div>

      {/* Price Group Distribution Summary Cards */}
      <div className="group-distribution-section">
        <div className="section-title-row">
          <div className="section-title-wrap">
            <Layers size={17} className="text-blue-600" />
            <h3 className="section-title">Rate Tier Distribution & Mapped Accounts</h3>
          </div>
          <span className="section-subtitle">
            Click any group below to quickly filter the customer roster
          </span>
        </div>

        <div className="distribution-cards-grid">
          {/* All Filter Card */}
          <div 
            className={`dist-card ${selectedGroupFilter === 'all' ? 'active-filter' : ''}`}
            onClick={() => setSelectedGroupFilter('all')}
          >
            <div className="dist-card-top">
              <span className="dist-tag all">ALL TIERS</span>
              <span className="dist-count">{customers.length} Accounts</span>
            </div>
            <h4 className="dist-name">All Trade Customers</h4>
            <p className="dist-desc">Complete customer directory across all pricing classifications</p>
            <div className="dist-footer">
              <span className="dist-status-text">
                {selectedGroupFilter === 'all' ? '● Currently viewing' : 'Click to view all'}
              </span>
            </div>
          </div>

          {/* Individual Price Groups */}
          {summary.price_groups.map((pg) => {
            const isCurrent = selectedGroupFilter === String(pg.price_group_id);
            return (
              <div 
                key={pg.price_group_id}
                className={`dist-card ${isCurrent ? 'active-filter' : ''}`}
                onClick={() => setSelectedGroupFilter(String(pg.price_group_id))}
              >
                <div className="dist-card-top">
                  <span className="dist-tag group">GROUP #{pg.price_group_id}</span>
                  <span className="dist-count highlight">{pg.customer_count} Mapped</span>
                </div>
                <h4 className="dist-name">{pg.name}</h4>
                <p className="dist-desc">{pg.description || 'Customer Tier Rate Classification'}</p>
                <div className="dist-footer">
                  <button 
                    type="button" 
                    className="inspect-rates-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInspectGroup(pg.price_group_id, pg.name);
                    }}
                  >
                    <Eye size={13} />
                    <span>Inspect Rates</span>
                  </button>
                  <span className="dist-status-text">
                    {isCurrent ? '● Active Filter' : 'Filter group'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Unassigned / Default Rate Card */}
          <div 
            className={`dist-card ${selectedGroupFilter === 'unassigned' ? 'active-filter' : ''}`}
            onClick={() => setSelectedGroupFilter('unassigned')}
          >
            <div className="dist-card-top">
              <span className="dist-tag default">DEFAULT MRP</span>
              <span className="dist-count">{summary.unassigned_count} Unmapped</span>
            </div>
            <h4 className="dist-name">Default Catalogue Rate</h4>
            <p className="dist-desc">Customers purchasing at standard master catalogue MRP</p>
            <div className="dist-footer">
              <span className="dist-status-text">
                {selectedGroupFilter === 'unassigned' ? '● Active Filter' : 'Filter unmapped'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action & Search Toolbar */}
      <div className="mapping-toolbar-card">
        {/* Bulk Mapping Strip */}
        <div className="bulk-mapping-strip">
          <div className="bulk-select-info">
            <button 
              type="button" 
              className="select-all-btn"
              onClick={handleToggleSelectAll}
            >
              {selectedCustomerIds.length > 0 && selectedCustomerIds.length === customers.length ? (
                <CheckSquare size={16} className="text-blue-600" />
              ) : (
                <Square size={16} className="text-slate-400" />
              )}
              <span>
                {selectedCustomerIds.length === 0 
                  ? 'Select All' 
                  : `Selected ${selectedCustomerIds.length} of ${customers.length}`}
              </span>
            </button>
          </div>

          <div className="bulk-action-controls">
            <span className="bulk-label">Map Selected to:</span>
            <select 
              value={bulkTargetGroupId}
              onChange={(e) => setBulkTargetGroupId(e.target.value)}
              className="bulk-group-select"
              disabled={selectedCustomerIds.length === 0}
            >
              <option value="">-- Select Target Price Group --</option>
              {priceGroups.map((pg) => (
                <option key={pg.price_group_id || pg.id} value={pg.price_group_id || pg.id}>
                  {pg.name} (#{pg.price_group_id || pg.id})
                </option>
              ))}
              <option value="">Default / Unassign (Base MRP)</option>
            </select>

            <button 
              type="button" 
              className="action-btn btn-primary bulk-apply-btn"
              onClick={handleApplyBulkMapping}
              disabled={selectedCustomerIds.length === 0 || isBulkApplying}
            >
              <Sparkles size={14} />
              <span>{isBulkApplying ? 'Applying...' : 'Apply Bulk Mapping'}</span>
            </button>
          </div>
        </div>

        <div className="toolbar-divider"></div>

        {/* Search & Filter Row */}
        <div className="mapping-filter-row">
          <div className="search-input-box">
            <Search size={15} className="search-icon" />
            <input 
              type="text"
              placeholder="Search customers by code, shop name, place, route, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="filter-dropdown-wrap">
            <label className="filter-label">Filter by Rate Group:</label>
            <select 
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="filter-status-select"
            >
              <option value="all">All Groups ({customers.length})</option>
              {priceGroups.map(pg => (
                <option key={pg.price_group_id || pg.id} value={String(pg.price_group_id || pg.id)}>
                  {pg.name}
                </option>
              ))}
              <option value="unassigned">Default / Unassigned ({summary.unassigned_count})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Mapping Table */}
      <div className="mapping-table-card">
        <div className="table-responsive-wrapper">
          <table className="customers-data-table mapping-table">
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>
                  <span title="Select All" onClick={handleToggleSelectAll} style={{ cursor: 'pointer' }}>
                    {selectedCustomerIds.length > 0 && selectedCustomerIds.length === customers.length ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </span>
                </th>
                <th style={{ width: '100px' }}>Customer Code</th>
                <th>Customer / Business Name</th>
                <th>Place & Territory</th>
                <th>Current Mapped Price Group</th>
                <th>Quick Reassign Tier</th>
                <th style={{ width: '150px' }}>Effective Rates</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-table-cell">
                    Loading customer mappings from database...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-table-cell">
                    <div className="empty-state-box">
                      <Tag size={38} className="empty-icon" />
                      <h4>No Customers in Selected Filter</h4>
                      <p>No customers match the current filter or search criteria.</p>
                      <button 
                        className="action-btn btn-primary" 
                        onClick={() => { setSelectedGroupFilter('all'); setSearchQuery(''); }}
                        style={{ marginTop: '12px' }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isSelected = selectedCustomerIds.includes(c.customer_id || c.id);
                  const isMapped = Boolean(c.price_group_id);

                  return (
                    <tr key={c.customer_id || c.id} className={isSelected ? 'selected-row' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          type="button" 
                          className="row-select-checkbox"
                          onClick={() => handleToggleCustomerSelect(c.customer_id || c.id)}
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-blue-600" />
                          ) : (
                            <Square size={16} className="text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td>
                        <span className="cust-code-badge">{c.customer_code}</span>
                      </td>
                      <td className="customer-name-cell">
                        <strong>{c.name}</strong>
                        {c.contact_person && (
                          <small className="contact-person-sub">
                            Prop: {c.contact_person} • {c.phone}
                          </small>
                        )}
                      </td>
                      <td className="place-cell">
                        <div className="place-cell-inner">
                          <span>{c.place || '—'}</span>
                          {c.route_area && (
                            <small className="route-sub">{c.route_area}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={`price-group-pill ${isMapped ? 'assigned' : 'default'}`}>
                          <Tag size={12} />
                          <span>{c.price_group_name || 'Default (MRP)'}</span>
                        </div>
                      </td>
                      <td>
                        <select 
                          className="inline-group-change-select"
                          value={c.price_group_id ? String(c.price_group_id) : ''}
                          onChange={(e) => handleSingleGroupChange(c.customer_id || c.id, e.target.value)}
                        >
                          <option value="">-- Default Base MRP --</option>
                          {priceGroups.map((pg) => (
                            <option key={pg.price_group_id || pg.id} value={pg.price_group_id || pg.id}>
                              {pg.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {isMapped ? (
                          <button 
                            type="button" 
                            className="inspect-btn"
                            title="Inspect product rates for this tier"
                            onClick={() => handleOpenInspectGroup(c.price_group_id, c.price_group_name)}
                          >
                            <Eye size={13} />
                            <span>Inspect Rates</span>
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11.5px' }}>
                            Base Catalog MRP
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-pill ${c.status === 'Active' ? 'in-stock' : 'out-stock'}`}>
                          {c.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Rate Tier Inspection */}
      {inspectingGroup && (
        <div className="modal-backdrop" onClick={() => setInspectingGroup(null)}>
          <div 
            className="modal-dialog inspect-rates-modal" 
            style={{ maxWidth: '960px', width: '95vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Price Group Schedule: {inspectingGroup.name}</h3>
                <span className="modal-subtitle">
                  Price Group ID: #{inspectingGroup.id} • Negotiated rates applied to all mapped customers
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setInspectingGroup(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="inspect-modal-body">
              {loadingInspect ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Loading group pricing matrix...
                </div>
              ) : inspectingProducts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No customized prices configured for this group yet. Products default to base MRP.
                </div>
              ) : (
                <div className="matrix-table-wrapper">
                  <table className="customers-data-table matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Product ID</th>
                        <th>Product & Category</th>
                        <th>SKU</th>
                        <th>Base M.R.P (₹)</th>
                        <th>Group Selling Rate (₹)</th>
                        <th>Effective Discount / Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectingProducts.map((p) => {
                        const customVal = p.group_selling_price;
                        const basePrice = parseFloat(p.base_selling_price || 0);
                        const hasCustom = customVal !== null && customVal !== undefined && !isNaN(parseFloat(customVal));
                        const effPrice = hasCustom ? parseFloat(customVal) : basePrice;
                        const diff = basePrice > 0 ? basePrice - effPrice : 0;
                        const diffPct = basePrice > 0 ? Math.round((diff / basePrice) * 100) : 0;

                        return (
                          <tr key={p.product_id}>
                            <td>
                              <span className="cust-code-badge">#{p.product_id}</span>
                            </td>
                            <td>
                              <strong>{p.name}</strong>
                              <small style={{ display: 'block', color: '#64748b' }}>
                                {p.category_name || 'General'}
                              </small>
                            </td>
                            <td>
                              <span className="sku-badge">{p.sku}</span>
                            </td>
                            <td>
                              <span className="base-price-tag">
                                ₹{basePrice.toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td>
                              {hasCustom ? (
                                <span className="group-rate-highlight">
                                  ₹{effPrice.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-muted">₹{basePrice.toLocaleString('en-IN')} (Base)</span>
                              )}
                            </td>
                            <td>
                              {hasCustom && diff > 0 ? (
                                <span className="discount-pill">
                                  {diffPct}% Off Base (Save ₹{diff.toFixed(2)})
                                </span>
                              ) : hasCustom && diff < 0 ? (
                                <span className="premium-pill">
                                  +{Math.abs(diffPct)}% Premium
                                </span>
                              ) : (
                                <span className="text-muted">Standard Rate</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '18px' }}>
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setInspectingGroup(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
