import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  X, 
  Plus, 
  Layers, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchTotalStockApi, 
  fetchCategoriesApi 
} from '../../services/api';
import './TotalStockDetails.css';

export const TotalStockDetails = ({ onGoToInwardStock }) => {
  const [stockData, setStockData] = useState([]);
  const [metrics, setMetrics] = useState({
    total_products: 0,
    total_stock_units: 0,
    total_valuation: 0,
    low_stock_count: 0
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, cats] = await Promise.all([
        fetchTotalStockApi(searchQuery, selectedCategory),
        fetchCategoriesApi()
      ]);
      setStockData(stockRes.data || []);
      setMetrics(stockRes.metrics || {
        total_products: 0,
        total_stock_units: 0,
        total_valuation: 0,
        low_stock_count: 0
      });
      setCategories(cats);
    } catch (err) {
      console.error('Error loading total stock details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!stockData || stockData.length === 0) return;
    try {
      const rows = stockData.map((p) => ({
        'Product ID': p.product_id || p.id,
        'Product Name': p.product_name,
        'SKU': p.sku || '',
        'Category': p.category_name || 'General',
        'Cost Price (₹)': parseFloat(p.cost_price || 0),
        'Selling Price (₹)': parseFloat(p.selling_price || 0),
        'Inward Batches': parseInt(p.inward_entries_count || 0),
        'Available Stock Units': parseFloat(p.current_stock || 0),
        'Stock Valuation (₹)': parseFloat(p.stock_valuation || 0),
        'Stock Status': parseFloat(p.current_stock || 0) > 0 ? 'In Stock' : 'Out of Stock'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Total_Stock_Master');
      XLSX.writeFile(wb, `Total_Stock_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Failed to export total stock:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCategory]);

  return (
    <div className="total-stock-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Products &amp; Stock</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Total Stock Details</span>
          </nav>
          <h1 className="dashboard-main-title">
            Total Stock & Warehouse Inventory Master
          </h1>
          <p className="dashboard-sub-title">
            Consolidated live inventory balances, inward accumulation, cost valuations, and stock availability across all master products.
          </p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="action-btn"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 14px', 
              background: '#059669', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 600, 
              fontSize: '0.85rem' 
            }}
            onClick={handleExportExcel}
            title="Export Consolidated Stock to Excel"
          >
            <Download size={15} />
            <span>Export Stock (Excel)</span>
          </button>
          {onGoToInwardStock && (
            <button 
              className="action-btn btn-primary"
              onClick={onGoToInwardStock}
            >
              <Plus size={15} />
              <span>Inward New Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="total-stock-metrics-grid">
        <div className="total-stock-metric-card">
          <div className="metric-icon-wrap blue">
            <Boxes size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Master Catalog Products</span>
            <span className="metric-val">{metrics.total_products} Items</span>
            <span className="metric-sub">Active catalog definitions</span>
          </div>
        </div>

        <div className="total-stock-metric-card">
          <div className="metric-icon-wrap green">
            <Layers size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Stock in Warehouse</span>
            <span className="metric-val green-text">{Number(metrics.total_stock_units || 0).toLocaleString('en-IN')} Units</span>
            <span className="metric-sub">Combined physical units</span>
          </div>
        </div>

        <div className="total-stock-metric-card">
          <div className="metric-icon-wrap amber">
            <DollarSign size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Inventory Valuation</span>
            <span className="metric-val amber-text">₹{Number(metrics.total_valuation || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">Warehouse asset value (COGS)</span>
          </div>
        </div>

        <div className="total-stock-metric-card">
          <div className="metric-icon-wrap red">
            <AlertTriangle size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Low Stock Alerts</span>
            <span className="metric-val red-text">{metrics.low_stock_count} Products</span>
            <span className="metric-sub">Inventory below 10 units</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="total-stock-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Product Name, SKU, Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="category-pill-strip">
          <span className="filter-tag-label">Category:</span>
          <button 
            className={`pill-btn ${selectedCategory === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.category_id || c.id}
              className={`pill-btn ${selectedCategory === c.name ? 'active' : ''}`}
              onClick={() => setSelectedCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Total Stock Table */}
      <div className="total-stock-table-card">
        <div className="table-responsive-wrapper">
          <table className="total-stocks-data-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Product ID</th>
                <th>Product Description</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Cost Price (₹)</th>
                <th>Selling Price (₹)</th>
                <th>Total Inward Batches</th>
                <th>Available Stock In Hand</th>
                <th>Stock Valuation (₹)</th>
                <th>Status</th>
                <th style={{ minWidth: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="empty-table-cell">
                    Calculating total stock from database...
                  </td>
                </tr>
              ) : stockData.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-table-cell">
                    <div className="empty-state-box">
                      <Boxes size={36} className="empty-icon" />
                      <h4>No Products Found</h4>
                      <p>No products matched your search or category filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                stockData.map((p) => {
                  const stockUnits = parseFloat(p.current_stock || 0);
                  const valuation = parseFloat(p.stock_valuation || 0);
                  return (
                    <tr key={p.product_id || p.id}>
                      <td>
                        <span className="product-id-badge">#{p.product_id || p.id}</span>
                      </td>
                      <td className="product-desc-cell">
                        <strong>{p.product_name}</strong>
                      </td>
                      <td>
                        <span className="sku-badge">{p.sku || '—'}</span>
                      </td>
                      <td>
                        <span className="category-tag-badge">
                          {p.category_name || 'General'}
                          {p.category_id && <span className="cat-id-sub"> (#{p.category_id})</span>}
                        </span>
                      </td>
                      <td>₹{Number(p.cost_price || 0).toLocaleString('en-IN')}</td>
                      <td className="price-bold">₹{Number(p.selling_price || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span className="batches-count-pill">
                          {p.inward_entries_count || 0} Inward {p.inward_entries_count === 1 ? 'batch' : 'batches'}
                        </span>
                      </td>
                      <td>
                        <span className={`stock-units-pill ${stockUnits > 10 ? 'healthy' : stockUnits > 0 ? 'warning' : 'danger'}`}>
                          {stockUnits.toLocaleString('en-IN')} Units
                        </span>
                      </td>
                      <td className="amount-cell green">
                        ₹{valuation.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`status-pill ${stockUnits > 0 ? 'in-stock' : 'out-stock'}`}>
                          {stockUnits > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {onGoToInwardStock && (
                          <button 
                            className="inline-inward-btn"
                            title="Inward Stock for this Product"
                            onClick={onGoToInwardStock}
                          >
                            <Plus size={13} />
                            <span>Add Stock</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
