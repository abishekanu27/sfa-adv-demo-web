import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Package, Plus, ChevronRight, Layers } from 'lucide-react';
import { fetchProductsApi, deleteProductApi, fetchProductPricesByProductApi, fetchProductStockHistoryApi } from '../../services/api';
import './ProductDetails.css';

export const ProductDetails = ({ product, onBackToList, onSelectProduct, onOpenAddProduct }) => {
  const [currentProduct, setCurrentProduct] = useState(product);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceGroupRates, setPriceGroupRates] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  useEffect(() => {
    setLoading(true);
    fetchProductsApi().then(prods => {
      setAllProducts(prods);
      if (!currentProduct && prods.length > 0) {
        setCurrentProduct(prods[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (currentProduct?.product_id || currentProduct?.id) {
      const pid = currentProduct.product_id || currentProduct.id;
      fetchProductPricesByProductApi(pid)
        .then(rates => setPriceGroupRates(rates))
        .catch(() => setPriceGroupRates([]));

      fetchProductStockHistoryApi(pid)
        .then(history => setStockHistory(history))
        .catch(() => setStockHistory([]));
    }
  }, [currentProduct]);

  const handleProductChange = (e) => {
    const selectedId = e.target.value;
    const found = allProducts.find(p => p.id === selectedId);
    if (found) {
      setCurrentProduct(found);
      if (onSelectProduct) onSelectProduct(found);
    }
  };

  const handleDelete = async () => {
    if (!currentProduct) return;
    if (window.confirm(`Are you sure you want to delete product "${currentProduct.name}"?`)) {
      try {
        await deleteProductApi(currentProduct.id);
        const updated = allProducts.filter(p => p.id !== currentProduct.id);
        setAllProducts(updated);
        if (updated.length > 0) {
          setCurrentProduct(updated[0]);
          if (onSelectProduct) onSelectProduct(updated[0]);
        } else {
          setCurrentProduct(null);
          onBackToList();
        }
      } catch (err) {
        alert('Failed to delete product: ' + err.message);
      }
    }
  };

  // If no products exist in the catalog (Matching Image 2)
  if (!loading && (!currentProduct || allProducts.length === 0)) {
    return (
      <div className="product-details-page empty-state">
        <div className="details-header-row">
          <div className="page-title-left">
            <nav className="breadcrumb-nav">
              <span className="breadcrumb-muted" onClick={onBackToList} style={{ cursor: 'pointer' }}>Products &amp; Stock</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-active">Product Details</span>
            </nav>
            <h1 className="dashboard-main-title">Product Details</h1>
          </div>
        </div>

        <div className="empty-details-card">
          <div style={{ textAlign: 'left', padding: '10px 0 20px 0', color: '#334155', fontSize: '14px', fontWeight: '500' }}>
            No product found.
          </div>
          <Package size={48} className="empty-pkg-icon" />
          <h3>No Product in Catalog</h3>
          <p>No master product records exist in the SQL database yet. Create your first product to see complete specifications.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="action-btn btn-outline" onClick={onBackToList}>
              Browse Product List
            </button>
            {onOpenAddProduct && (
              <button className="action-btn btn-primary" onClick={onOpenAddProduct}>
                <Plus size={15} />
                <span>Add First Product</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading && !currentProduct) {
    return (
      <div className="product-details-page">
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          Loading product specifications from database...
        </div>
      </div>
    );
  }

  const margin = currentProduct.selling_price > 0 
    ? Math.round(((currentProduct.selling_price - currentProduct.cost_price) / currentProduct.selling_price) * 100)
    : 0;

  return (
    <div className="product-details-page">
      {/* Top Breadcrumb & Controls */}
      <div className="details-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted" onClick={onBackToList} style={{ cursor: 'pointer' }}>Products &amp; Stock</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-muted" onClick={onBackToList} style={{ cursor: 'pointer' }}>Product List</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">{currentProduct.name}</span>
          </nav>
          <div className="title-with-badge-row">
            <h1 className="dashboard-main-title">{currentProduct.name}</h1>
            <span className="product-id-badge" style={{ fontSize: '12px', padding: '3px 9px' }}>
              Product ID: #{currentProduct.product_id || currentProduct.id}
            </span>
            <span className="category-tag-badge">
              {currentProduct.category_name || 'General'}
              {currentProduct.category_id && ` (#${currentProduct.category_id})`}
            </span>
            <span className={`status-pill ${currentProduct.status === 'In Stock' ? 'in-stock' : 'out-stock'}`}>
              {currentProduct.status || 'In Stock'}
            </span>
          </div>
          <p className="dashboard-sub-title">SKU: {currentProduct.sku}{currentProduct.hsn_code ? ` • HSN: ${currentProduct.hsn_code}` : ''}</p>
        </div>

        <div className="page-header-actions">
          <button className="action-btn btn-outline" onClick={onBackToList}>
            <ArrowLeft size={15} />
            <span>Back to List</span>
          </button>
          <button className="action-btn btn-delete" onClick={handleDelete}>
            <Trash2 size={15} />
            <span>Delete Product</span>
          </button>
        </div>
      </div>

      {/* Product Selector Dropdown Bar (if multiple products exist) */}
      {allProducts.length > 1 && (
        <div className="product-selector-bar">
          <div className="selector-label-group">
            <span>Viewing Specifications for:</span>
            <select 
              value={currentProduct.product_id || currentProduct.id} 
              onChange={handleProductChange}
              className="product-select-dropdown"
            >
              {allProducts.map(p => (
                <option key={p.product_id || p.id} value={p.product_id || p.id}>
                  #{p.product_id || p.id} — {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {allProducts.length} total products in database
          </span>
        </div>
      )}

      {/* KPI Metric Cards Row */}
      <div className="details-metrics-grid">
        <div className="details-metric-card">
          <span className="metric-label">Selling Price (M.R.P)</span>
          <span className="metric-value">₹{Number(currentProduct.selling_price || 0).toLocaleString('en-IN')}</span>
          <span className="metric-sub">Customer Billing Rate</span>
        </div>

        <div className="details-metric-card">
          <span className="metric-label">Cost Price (COGS)</span>
          <span className="metric-value">₹{Number(currentProduct.cost_price || 0).toLocaleString('en-IN')}</span>
          <span className="metric-sub">Procurement / Landing Cost</span>
        </div>

        <div className="details-metric-card">
          <span className="metric-label">Current Stock In Hand</span>
          <span className="metric-value green-text">{Number(currentProduct.current_stock || 0).toLocaleString('en-IN')} {currentProduct.unit || 'Units'}</span>
          <span className="metric-sub">Fetched from Stock Details</span>
        </div>

        <div className="details-metric-card">
          <span className="metric-label">Selling Price Tiers</span>
          <span className="metric-value">{priceGroupRates.length} Groups</span>
          <span className="metric-sub">Custom customer pricing tiers</span>
        </div>
      </div>

      {/* Specifications Card */}
      <div className="details-specs-card">
        <h3 className="specs-card-title">Catalog & Tax Specifications</h3>
        <div className="specs-grid-2">
          <div className="spec-item">
            <span className="spec-name">Product ID</span>
            <span className="spec-val-code">#{currentProduct.product_id || currentProduct.id}</span>
          </div>
          <div className="spec-item">
            <span className="spec-name">Master SKU Code</span>
            <span className="spec-val-badge">{currentProduct.sku}</span>
          </div>
          <div className="spec-item">
            <span className="spec-name">Measurement Unit</span>
            <span className="spec-val-badge" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              {currentProduct.unit || 'Pcs'}
            </span>
          </div>
          <div className="spec-item">
            <span className="spec-name">Assigned Category</span>
            <span className="spec-val">
              {currentProduct.category_name || 'Unassigned'}
              {currentProduct.category_id ? ` (Category ID: #${currentProduct.category_id})` : ''}
            </span>
          </div>
          <div className="spec-item">
            <span className="spec-name">Category ID</span>
            <span className="spec-val-code">{currentProduct.category_id ? `#${currentProduct.category_id}` : '—'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-name">GST Tax Rate Applicable</span>
            <span className="spec-val">{currentProduct.gst_rate || '—'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-name">HSN / SAC Code</span>
            <span className="spec-val">{currentProduct.hsn_code || '—'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-name">Created Date</span>
            <span className="spec-val">{new Date(currentProduct.created_at || Date.now()).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Customer Selling Price Groups (Tier Rates) Card */}
      <div className="details-specs-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 className="specs-card-title" style={{ margin: 0 }}>Customer Selling Price Groups (Tier Rates)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Custom customer selling rates configured for this product across different price lists.
            </p>
          </div>
        </div>

        {priceGroupRates.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              No custom price groups configured for this product yet. Default M.R.P applies (₹{Number(currentProduct.selling_price || 0).toLocaleString('en-IN')}).
            </span>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="products-data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Price Group ID</th>
                  <th>Rate Tier / Group Name</th>
                  <th>Description</th>
                  <th>Customer Rate (₹)</th>
                  <th>Effective Margin</th>
                </tr>
              </thead>
              <tbody>
                {priceGroupRates.map(r => {
                  const rate = parseFloat(r.selling_price || 0);
                  const cost = parseFloat(currentProduct.cost_price || 0);
                  const tierMargin = rate > 0 ? Math.round(((rate - cost) / rate) * 100) : 0;
                  return (
                    <tr key={r.price_group_id || r.id}>
                      <td>
                        <span className="product-id-badge">#{r.price_group_id || r.id}</span>
                      </td>
                      <td>
                        <strong>{r.group_name}</strong>
                      </td>
                      <td style={{ color: '#64748b' }}>{r.description || '—'}</td>
                      <td>
                        <span className="price-bold" style={{ color: '#16a34a' }}>
                          ₹{Number(rate).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <span className="margin-pill">
                          {tierMargin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warehouse Inward Procurement & Stock History Card */}
      <div className="details-specs-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 className="specs-card-title" style={{ margin: 0 }}>Warehouse Inward Procurement & Stock History</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Historical inward stock entries recorded from Stock Details for this product.
            </p>
          </div>
          <span className="product-id-badge" style={{ fontSize: '11px' }}>
            {stockHistory.length} Inward {stockHistory.length === 1 ? 'Batch' : 'Batches'}
          </span>
        </div>

        {stockHistory.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              No inward stock batches recorded for this product yet. Add inward stock under <strong>Stock &gt; Stock Details</strong>.
            </span>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="products-data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Stock ID</th>
                  <th>Inward Date</th>
                  <th>Vendor / Supplier</th>
                  <th>Packaging Breakdown</th>
                  <th>Inward Units</th>
                  <th>Unit Buy Price</th>
                  <th>Total Procurement Amount</th>
                  <th>Invoice Ref</th>
                </tr>
              </thead>
              <tbody>
                {stockHistory.map(sh => (
                  <tr key={sh.stock_id || sh.id}>
                    <td>
                      <span className="product-id-badge">#{sh.stock_id || sh.id}</span>
                    </td>
                    <td>{new Date(sh.entry_date).toLocaleDateString('en-IN')}</td>
                    <td><strong>{sh.vendor_name || 'Direct Procurement'}</strong></td>
                    <td>{sh.package_qty} {sh.package_type}s × {sh.items_per_package} /{sh.package_type}</td>
                    <td>
                      <span className="margin-pill" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                        {Number(sh.total_qty || 0).toLocaleString('en-IN')} Units
                      </span>
                    </td>
                    <td>₹{Number(sh.buy_price || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span className="price-bold" style={{ color: '#16a34a' }}>
                        ₹{Number(sh.total_buy_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>{sh.invoice_no || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
