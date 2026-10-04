import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Eye, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  CheckCircle2, 
  Boxes, 
  Layers, 
  DollarSign, 
  AlertTriangle, 
  Download, 
  Search 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchProductsApi, 
  fetchCategoriesApi, 
  createProductApi, 
  updateProductApi,
  createCategoryApi,
  deleteProductApi,
  fetchPriceGroupsApi,
  fetchProductPricesByProductApi,
  updateProductGroupPricesByProductApi
} from '../../services/api';
import { PageLoader } from '../../components/PageLoader';
import './ProductList.css';

export const ProductList = ({ 
  initialCategory = 'All', 
  searchQuery = '', 
  autoOpenProductModal = false, 
  onSelectProduct, 
  onAddStock,
  onGoToCategories 
}) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [toast, setToast] = useState(null);

  // Price groups state for product mapping
  const [priceGroups, setPriceGroups] = useState([]);
  const [groupPrices, setGroupPrices] = useState({});
  const [groupBoxPrices, setGroupBoxPrices] = useState({});
  const [loadingGroupPrices, setLoadingGroupPrices] = useState(false);

  // Form state - purely driven by user input and SQL
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    category_name: '',
    unit: 'Pcs',
    package_type: 'Box',
    items_per_package: '1',
    selling_price: '',
    box_price: '',
    cost_price: '',
    gst_rate: '18% (Standard - CGST 9% + SGST 9%)',
    hsn_code: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        fetchCategoriesApi(),
        fetchProductsApi(selectedCategory, localSearch)
      ]);
      setCategories(cats);
      setProducts(prods);

      // Set default category in form if available and none selected
      if (cats.length > 0 && !productForm.category_name) {
        setProductForm(prev => ({
          ...prev,
          category_id: cats[0].category_id || cats[0].id,
          category_name: cats[0].name
        }));
      }
    } catch (err) {
      console.error('Error loading catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, localSearch]);

  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  // Sync when initialCategory prop changes from external navigation
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (autoOpenProductModal) {
      handleOpenAddModal();
    }
  }, [autoOpenProductModal]);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleCategorySelect = (catName) => {
    setSelectedCategory(catName);
  };

  // Open modal for Adding New Product
  const handleOpenAddModal = async () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      sku: '',
      category_id: categories[0]?.category_id || categories[0]?.id || '',
      category_name: categories[0]?.name || '',
      unit: 'Pcs',
      package_type: 'Box',
      items_per_package: '1',
      selling_price: '',
      box_price: '',
      cost_price: '',
      gst_rate: '18% (Standard - CGST 9% + SGST 9%)',
      hsn_code: ''
    });
    setGroupPrices({});
    setGroupBoxPrices({});
    setShowProductModal(true);
    setLoadingGroupPrices(true);
    try {
      const groups = await fetchPriceGroupsApi();
      setPriceGroups(groups);
    } catch (err) {
      console.warn('Error fetching price groups:', err);
    } finally {
      setLoadingGroupPrices(false);
    }
  };

  // Open modal for Editing Existing Product
  const handleOpenEditModal = async (prod, e) => {
    if (e) e.stopPropagation();
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      sku: prod.sku || '',
      category_id: prod.category_id || '',
      category_name: prod.category_name || '',
      unit: prod.unit || 'Pcs',
      package_type: prod.package_type || 'Box',
      items_per_package: String(prod.items_per_package || 1),
      selling_price: prod.selling_price || '',
      box_price: prod.box_price !== undefined ? String(prod.box_price) : '',
      cost_price: prod.cost_price || '',
      gst_rate: prod.gst_rate || '18% (Standard - CGST 9% + SGST 9%)',
      hsn_code: prod.hsn_code || ''
    });
    setGroupPrices({});
    setGroupBoxPrices({});
    setShowProductModal(true);
    setLoadingGroupPrices(true);

    try {
      const [groups, existingRates] = await Promise.all([
        fetchPriceGroupsApi(),
        fetchProductPricesByProductApi(prod.product_id || prod.id)
      ]);
      setPriceGroups(groups);
      const ratesMap = {};
      const boxRatesMap = {};
      if (Array.isArray(existingRates)) {
        existingRates.forEach(r => {
          ratesMap[r.price_group_id || r.id] = r.selling_price;
          boxRatesMap[r.price_group_id || r.id] = r.box_price || '';
        });
      }
      setGroupPrices(ratesMap);
      setGroupBoxPrices(boxRatesMap);
    } catch (err) {
      console.error('Error fetching group prices for edit:', err);
    } finally {
      setLoadingGroupPrices(false);
    }
  };

  // Submit product (create or update) + save group prices
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showNotification('Product name is required', 'error');
      return;
    }

    try {
      let targetProductId;
      if (editingProduct) {
        targetProductId = editingProduct.product_id || editingProduct.id;
        await updateProductApi(targetProductId, productForm);
      } else {
        const created = await createProductApi(productForm);
        targetProductId = created.product_id || created.id;
      }

      // Save price group overrides
      if (priceGroups.length > 0 && targetProductId) {
        const pricesPayload = priceGroups.map(g => ({
          price_group_id: g.price_group_id || g.id,
          selling_price: groupPrices[g.price_group_id || g.id] !== undefined ? groupPrices[g.price_group_id || g.id] : '',
          box_price: groupBoxPrices[g.price_group_id || g.id] !== undefined ? groupBoxPrices[g.price_group_id || g.id] : ''
        }));
        await updateProductGroupPricesByProductApi(targetProductId, pricesPayload);
      }

      showNotification(
        editingProduct 
          ? `Product "${productForm.name}" updated successfully!` 
          : `Product "${productForm.name}" created successfully!`
      );
      setShowProductModal(false);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to save product', 'error');
    }
  };

  // Quick category creation inside product modal or from filter
  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const newCat = await createCategoryApi({ name: newCatName.trim() });
      showNotification(`Category "${newCat.name}" added!`);
      setNewCatName('');
      setShowCategoryModal(false);
      const updatedCats = await fetchCategoriesApi();
      setCategories(updatedCats);
      setProductForm(prev => ({
        ...prev,
        category_id: newCat.category_id || newCat.id,
        category_name: newCat.name
      }));
    } catch (err) {
      showNotification(err.message || 'Failed to add category', 'error');
    }
  };

  const handleDeleteProduct = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProductApi(id);
        showNotification('Product deleted');
        await loadData();
      } catch (err) {
        showNotification(err.message || 'Failed to delete product', 'error');
      }
    }
  };

  // Inventory & Catalog Metrics (Merged from Total Stock Details)
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (parseFloat(p.current_stock || 0)), 0);
  const totalValuation = products.reduce((acc, p) => {
    const units = parseFloat(p.current_stock || 0);
    const cost = parseFloat(p.cost_price || p.selling_price || 0);
    const val = p.stock_valuation !== undefined && p.stock_valuation !== null
      ? parseFloat(p.stock_valuation)
      : (units * cost);
    return acc + val;
  }, 0);
  const lowStockCount = products.filter(p => parseFloat(p.current_stock || 0) <= 10).length;

  // Export Stock & Catalog to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!products || products.length === 0) {
      showNotification('No product stock data to export', 'error');
      return;
    }
    try {
      const rows = products.map((p) => {
        const stockUnits = parseFloat(p.current_stock || 0);
        const costPrice = parseFloat(p.cost_price || 0);
        const sellingPrice = parseFloat(p.selling_price || 0);
        const valuation = parseFloat(p.stock_valuation !== undefined ? p.stock_valuation : (stockUnits * costPrice));
        const inwardCount = parseInt(p.inward_entries_count || 0);
        const marginPct = p.gross_margin_pct !== undefined ? p.gross_margin_pct : (
          sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0
        );

        return {
          'Product ID': p.product_id || p.id,
          'Product Description': p.name,
          'SKU': p.sku || '',
          'Category': p.category_name || 'General',
          'Cost Price (₹)': costPrice,
          'Selling Price (₹)': sellingPrice,
          'GST Rate': p.gst_rate || '',
          'Total Inward Batches': inwardCount,
          'Gross Margin (%)': `${marginPct}%`,
          'Available Stock in Hand': `${stockUnits} ${p.unit || 'Units'}`,
          'Stock Valuation (₹)': valuation,
          'Status': stockUnits > 0 ? 'In Stock' : 'Out of Stock'
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Product_Stock_Master');
      XLSX.writeFile(wb, `Product_Stock_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Product & Stock master catalog exported to Excel (.xlsx)!');
    } catch (err) {
      console.error('Failed to export:', err);
      showNotification('Failed to export catalog to Excel', 'error');
    }
  };

  return (
    <div className="product-list-page">
      {/* Toast */}
      {toast && (
        <div className={`product-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Products &amp; Stock</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Product Details List</span>
          </nav>
          <h1 className="dashboard-main-title">
            Product Master Catalog
          </h1>
          <p className="dashboard-sub-title">
            Product definitions, category mappings, SKU codes, base pricing, inventory stock valuations, inward accumulation, and group-wise customer rate tiers.
          </p>
        </div>

        <div className="page-header-actions">
          <button 
            className="action-btn btn-export"
            onClick={handleExportExcel}
            title="Export full catalog & stock inventory to Excel"
          >
            <Download size={15} />
            <span>Export Stock (Excel)</span>
          </button>
          <button 
            className="action-btn btn-outline"
            onClick={() => setShowCategoryModal(true)}
          >
            <Plus size={15} />
            <span>Add Category</span>
          </button>
          <button 
            className="action-btn btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={15} />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Merged KPI Metrics Strip from Total Stock Details */}
      <div className="product-stock-metrics-grid">
        <div className="product-stock-metric-card">
          <div className="metric-card-icon blue">
            <Boxes size={22} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-label">Master Catalog Products</span>
            <span className="metric-card-value">{totalProducts} Items</span>
            <span className="metric-card-sub">Active catalog definitions</span>
          </div>
        </div>

        <div className="product-stock-metric-card">
          <div className="metric-card-icon green">
            <Layers size={22} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-label">Total Stock in Warehouse</span>
            <span className="metric-card-value green">{totalStockUnits.toLocaleString('en-IN')} Units</span>
            <span className="metric-card-sub">Combined physical units</span>
          </div>
        </div>

        <div className="product-stock-metric-card">
          <div className="metric-card-icon amber">
            <DollarSign size={22} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-label">Total Inventory Valuation</span>
            <span className="metric-card-value amber">₹{Math.round(totalValuation).toLocaleString('en-IN')}</span>
            <span className="metric-card-sub">Warehouse asset value (COGS)</span>
          </div>
        </div>

        <div className="product-stock-metric-card">
          <div className="metric-card-icon red">
            <AlertTriangle size={22} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-label">Low Stock Alerts</span>
            <span className="metric-card-value red">{lowStockCount} Products</span>
            <span className="metric-card-sub">Inventory below 10 units</span>
          </div>
        </div>
      </div>

      {/* Category Pills & Search Filter */}
      <div className="category-filter-strip">
        <div className="category-filter-left">
          <span className="filter-label-title">Category:</span>
          <div className="filter-pills-list">
            <button 
              className={`category-pill-btn ${selectedCategory === 'All' ? 'active' : ''}`}
              onClick={() => handleCategorySelect('All')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button 
                key={cat.category_id || cat.id} 
                className={`category-pill-btn ${selectedCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
              >
                {cat.name}
              </button>
            ))}
            <button 
              className="category-pill-btn add-pill"
              onClick={() => setShowCategoryModal(true)}
            >
              <Plus size={13} />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        <div className="category-search-box">
          <Search size={14} className="category-search-icon" />
          <input 
            type="text"
            placeholder="Search by Product Name, SKU, Category..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {localSearch && (
            <button className="clear-search-btn" onClick={() => setLocalSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Products Table with all 13 merged columns */}
      <div className="products-table-card">
        <div className="table-responsive-wrapper">
          <table className="products-data-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>Product ID</th>
                <th>Product Description</th>
                <th style={{ width: '90px' }}>SKU</th>
                <th>Category</th>
                <th style={{ width: '105px' }}>Cost Price (₹)</th>
                <th style={{ width: '115px' }}>Piece Price (₹)</th>
                <th style={{ width: '135px' }}>Box / Bag Price (₹)</th>
                <th style={{ width: '125px' }}>GST Rate</th>
                <th style={{ width: '140px' }}>Total Inward Batches</th>
                <th style={{ width: '100px' }}>Gross Margin</th>
                <th style={{ width: '135px' }}>Available Stock in Hand</th>
                <th style={{ width: '125px' }}>Stock Valuation (₹)</th>
                <th style={{ width: '95px' }}>Status</th>
                <th style={{ minWidth: '190px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="14" style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <PageLoader 
                      message="Loading product & stock catalog..." 
                      subtext="Fetching SKU records, live inventory, inward batches, and cost valuations" 
                    />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="14" className="empty-products-cell">
                    <div className="empty-state-wrap">
                      <span className="empty-message-text">No product found matching your search or category filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const stockUnits = parseFloat(prod.current_stock || 0);
                  const costPrice = parseFloat(prod.cost_price || 0);
                  const sellingPrice = parseFloat(prod.selling_price || 0);
                  const valuation = parseFloat(
                    prod.stock_valuation !== undefined && prod.stock_valuation !== null
                      ? prod.stock_valuation
                      : (stockUnits * costPrice)
                  );
                  const inwardCount = parseInt(prod.inward_entries_count || 0);
                  const marginPct = prod.gross_margin_pct !== undefined ? prod.gross_margin_pct : (
                    sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0
                  );

                  return (
                    <tr 
                      key={prod.product_id || prod.id}
                      onClick={() => onSelectProduct && onSelectProduct(prod)}
                      className="clickable-product-row"
                    >
                      <td className="product-id-cell">
                        <span className="product-id-badge">#{prod.product_id || prod.id}</span>
                      </td>
                      <td className="product-desc-cell">
                        <strong>{prod.name}</strong>
                        {prod.hsn_code && <small className="hsn-subtext">HSN: {prod.hsn_code}</small>}
                      </td>
                      <td>
                        <span className="sku-badge">{prod.sku || '—'}</span>
                      </td>
                      <td>
                        <span className="category-tag-badge">
                          {prod.category_name || 'General'}
                          {prod.category_id && <span className="cat-id-sub"> (#{prod.category_id})</span>}
                        </span>
                      </td>
                      <td>₹{costPrice.toLocaleString('en-IN')}</td>
                      <td className="price-bold">
                        ₹{sellingPrice.toLocaleString('en-IN')}
                        <small className="cell-subtext">/{prod.unit || 'Pc'}</small>
                      </td>
                      <td className="price-bold" style={{ color: '#0284c7' }}>
                        ₹{parseFloat(prod.box_price || (sellingPrice * (prod.items_per_package || 1))).toLocaleString('en-IN')}
                        <small className="cell-subtext">/{prod.package_type || 'Box'} ({prod.items_per_package || 1} {prod.unit || 'Pcs'})</small>
                      </td>
                      <td>{prod.gst_rate || '18%'}</td>
                      <td>
                        <span className="batches-count-pill">
                          {inwardCount} Inward {inwardCount === 1 ? 'batch' : 'batches'}
                        </span>
                      </td>
                      <td>
                        <span className="margin-pill">
                          {marginPct}%
                        </span>
                      </td>
                      <td>
                        <span className={`stock-units-pill ${stockUnits > 10 ? 'healthy' : stockUnits > 0 ? 'warning' : 'danger'}`}>
                          {stockUnits.toLocaleString('en-IN')} {prod.unit || 'Units'}
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
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="product-actions-group">
                          <button 
                            className="inline-inward-btn"
                            title={`Inward / Add stock for ${prod.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAddStock) {
                                onAddStock(prod);
                              }
                            }}
                          >
                            <Plus size={13} />
                            <span>Add Stock</span>
                          </button>
                          <button 
                            className="table-icon-action" 
                            title="View Product Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProduct && onSelectProduct(prod);
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            className="table-icon-action edit" 
                            title="Edit Product & Group Prices"
                            onClick={(e) => handleOpenEditModal(prod, e)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="table-icon-action delete" 
                            title="Delete Product"
                            onClick={(e) => handleDeleteProduct(prod.product_id || prod.id, e)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Master Product */}
      {showProductModal && (
        <div className="modal-backdrop" onClick={() => setShowProductModal(false)}>
          <div className="modal-dialog product-modal modal-with-groups" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>{editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Master Product'}</h3>
                {editingProduct && (
                  <span className="product-id-badge" style={{ marginLeft: '8px', verticalAlign: 'middle' }}>
                    Product ID: #{editingProduct.product_id || editingProduct.id}
                  </span>
                )}
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowProductModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="modal-form">
              <div className="modal-scrollable-body">
                {/* Product Name */}
                <div className="form-group">
                  <label>Product Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Copper Cable 90m"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                {/* SKU Code & Cost Price */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>SKU Code</label>
                    <input 
                      type="text" 
                      placeholder="SKU-..."
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Cost Price (COGS ₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      placeholder="e.g. 40"
                      value={productForm.cost_price}
                      onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                    />
                  </div>
                </div>

                {/* Category Mapping */}
                <div className="form-group">
                  <div className="label-with-link-row">
                    <label>Category Mapping (Select Category) *</label>
                    <button 
                      type="button" 
                      className="inline-link-btn"
                      onClick={() => setShowCategoryModal(true)}
                    >
                      + New Category
                    </button>
                  </div>
                  <select 
                    value={productForm.category_name}
                    required
                    onChange={(e) => {
                      const selName = e.target.value;
                      const selCat = categories.find(c => c.name === selName);
                      setProductForm({
                        ...productForm,
                        category_name: selName,
                        category_id: selCat ? (selCat.category_id || selCat.id) : ''
                      });
                    }}
                  >
                    {categories.length === 0 ? (
                      <option value="">No Categories Found in SQL (+ Add Category)</option>
                    ) : (
                      <>
                        <option value="">-- Select Category to Map --</option>
                        {categories.map((c) => (
                          <option key={c.category_id || c.id} value={c.name}>
                            {c.name} (Category ID: #{c.category_id || c.id})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {productForm.category_id && (
                    <small className="form-hint-text">
                      Mapped to: <strong>{productForm.category_name}</strong> (Category ID: #{productForm.category_id})
                    </small>
                  )}
                </div>

                {/* Packaging & Pricing Configuration Card: Measurement Unit, Piece Price, Packaging Type, Units per Box, and Box Selling Price */}
                <div style={{
                  background: '#f8fafc',
                  padding: '16px 16px 14px 16px',
                  borderRadius: '14px',
                  border: '1.5px solid #e2e8f0',
                  marginBottom: '16px'
                }}>
                  {/* Row 1: Measurement Unit & Piece Selling Price */}
                  <div className="form-row-2" style={{ marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: '700', color: '#0f172a' }}>
                        Measurement Unit (KG, gram, litre, etc.) *
                      </label>
                      <select
                        value={productForm.unit || 'Pcs'}
                        onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                        style={{ background: '#ffffff' }}
                      >
                        <option value="KG">KG (Kilogram)</option>
                        <option value="Gram">Gram (g)</option>
                        <option value="Litre">Litre (L)</option>
                        <option value="ML">ML (Millilitre)</option>
                        <option value="Pcs">Pcs (Pieces)</option>
                        <option value="Box">Box</option>
                        <option value="Bag">Bag</option>
                        <option value="Carton">Carton</option>
                        <option value="Tin">Tin</option>
                        <option value="Pkt">Pkt (Packet)</option>
                        <option value="Dozen">Dozen</option>
                        <option value="Meter">Meter</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: '700', color: '#0f172a' }}>
                        Piece Selling Price (₹ / {productForm.unit || 'Pcs'}) *
                      </label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        step="any"
                        placeholder="e.g. 50"
                        value={productForm.selling_price}
                        onChange={(e) => {
                          const val = e.target.value;
                          const items = parseInt(productForm.items_per_package, 10) || 1;
                          const oldCalculated = String((parseFloat(productForm.selling_price) || 0) * items);
                          const shouldAutoUpdateBox = !productForm.box_price || productForm.box_price === oldCalculated;
                          setProductForm({ 
                            ...productForm, 
                            selling_price: val,
                            box_price: shouldAutoUpdateBox && val ? String((parseFloat(val) || 0) * items) : productForm.box_price
                          });
                        }}
                        style={{ background: '#ffffff', fontWeight: '700' }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Packaging Type, Units per Box, and Box Selling Price */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '14px', alignItems: 'flex-start' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: '#0f172a', fontWeight: '700' }}>Packaging Type *</label>
                      <select
                        value={productForm.package_type || 'Box'}
                        onChange={(e) => setProductForm({ ...productForm, package_type: e.target.value })}
                        style={{ background: '#ffffff' }}
                      >
                        <option value="Box">Box</option>
                        <option value="Bag">Bag</option>
                        <option value="Carton">Carton</option>
                        <option value="Tin">Tin</option>
                        <option value="Packet">Packet</option>
                        <option value="Dozen">Dozen</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: '#0f172a', fontWeight: '700' }}>
                        Units per {productForm.package_type || 'Box'} *
                      </label>
                      <input 
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="e.g. 10"
                        value={productForm.items_per_package}
                        onChange={(e) => {
                          const itemsVal = e.target.value;
                          const items = parseInt(itemsVal, 10) || 1;
                          const pieceRate = parseFloat(productForm.selling_price) || 0;
                          const oldCalculated = String(pieceRate * (parseInt(productForm.items_per_package, 10) || 1));
                          const shouldAutoUpdateBox = !productForm.box_price || productForm.box_price === oldCalculated;
                          setProductForm({ 
                            ...productForm, 
                            items_per_package: itemsVal,
                            box_price: shouldAutoUpdateBox && pieceRate > 0 ? String(pieceRate * items) : productForm.box_price
                          });
                        }}
                        style={{ background: '#ffffff' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: '#0284c7', fontWeight: '800' }}>
                        {productForm.package_type || 'Box'} Selling Price (₹) *
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        required
                        placeholder={productForm.selling_price ? `e.g. ${(parseFloat(productForm.selling_price) || 0) * (parseInt(productForm.items_per_package, 10) || 1)}` : '0.00'}
                        value={productForm.box_price}
                        onChange={(e) => setProductForm({ ...productForm, box_price: e.target.value })}
                        style={{ background: '#ffffff', borderColor: '#0284c7', fontWeight: '700' }}
                      />
                      <small style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                        Price for 1 full {productForm.package_type || 'Box'} ({productForm.items_per_package || 1} {productForm.unit || 'Pcs'})
                      </small>
                    </div>
                  </div>
                </div>

                {/* GST Rate & HSN */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>GST Tax Rate (%) *</label>
                    <select 
                      value={productForm.gst_rate}
                      onChange={(e) => setProductForm({ ...productForm, gst_rate: e.target.value })}
                    >
                      <option value="18% (Standard - CGST 9% + SGST 9%)">18% (Standard - CGST 9% + SGST 9%)</option>
                      <option value="12% (CGST 6% + SGST 6%)">12% (CGST 6% + SGST 6%)</option>
                      <option value="5% (CGST 2.5% + SGST 2.5%)">5% (CGST 2.5% + SGST 2.5%)</option>
                      <option value="28% (Luxury / High Tier)">28% (Luxury / High Tier)</option>
                      <option value="0% (Tax Exempt)">0% (Tax Exempt)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>HSN / SAC Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 8536"
                      value={productForm.hsn_code}
                      onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
                    />
                  </div>
                </div>

                {/* Group Wise Selling Price Section */}
                <div className="modal-group-pricing-section">
                  <div className="group-pricing-header">
                    <div>
                      <h4 className="group-pricing-title">Group Wise Selling Price</h4>
                      <p className="group-pricing-subtitle">
                        Custom selling prices for each customer group. Newly created price groups will automatically appear here.
                      </p>
                    </div>
                    <span className="price-group-counter-pill">
                      {priceGroups.length} {priceGroups.length === 1 ? 'Group' : 'Groups'} Configured
                    </span>
                  </div>

                  {loadingGroupPrices ? (
                    <div className="group-pricing-loading">
                      Loading price groups & customer rates...
                    </div>
                  ) : priceGroups.length === 0 ? (
                    <div className="group-pricing-empty">
                      <p>No Selling Price Groups created in database yet.</p>
                      <small>Create price groups in <strong>Products &gt; Selling Price Groups</strong> to set custom customer tier rates.</small>
                    </div>
                  ) : (
                    <div className="group-pricing-cards-container">
                      {priceGroups.map((group) => {
                        const gid = group.price_group_id || group.id;
                        const currentPrice = groupPrices[gid] !== undefined ? groupPrices[gid] : '';
                        const numPrice = parseFloat(currentPrice);
                        const numCost = parseFloat(productForm.cost_price || 0);
                        const effectiveMargin = (!isNaN(numPrice) && numPrice > 0 && numCost > 0)
                          ? Math.round(((numPrice - numCost) / numPrice) * 100)
                          : null;

                        return (
                          <div key={gid} className={`group-pricing-card ${currentPrice ? 'has-custom-rate' : ''}`}>
                            <div className="group-card-header">
                              <div className="group-card-title-wrap">
                                <span className="group-card-name">{group.name}</span>
                                <span className="group-card-badge">Group ID: #{gid}</span>
                              </div>
                              {group.description && (
                                <p className="group-card-desc">{group.description}</p>
                              )}
                            </div>

                            <div className="group-card-body">
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="group-input-wrapper">
                                  <label className="group-input-label">Piece Selling Rate (₹)</label>
                                  <div className="group-currency-input">
                                    <span className="currency-prefix">₹</span>
                                    <input 
                                      type="number"
                                      min="0"
                                      step="any"
                                      placeholder={productForm.selling_price ? `Base (₹${productForm.selling_price})` : '0.00'}
                                      value={currentPrice}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setGroupPrices(prev => ({
                                          ...prev,
                                          [gid]: val
                                        }));
                                      }}
                                      className="group-rate-input"
                                    />
                                  </div>
                                </div>

                                <div className="group-input-wrapper">
                                  <label className="group-input-label">{productForm.package_type || 'Box'} Rate (₹)</label>
                                  <div className="group-currency-input">
                                    <span className="currency-prefix">₹</span>
                                    <input 
                                      type="number"
                                      min="0"
                                      step="any"
                                      placeholder={productForm.box_price ? `Base (₹${productForm.box_price})` : '0.00'}
                                      value={groupBoxPrices[gid] !== undefined ? groupBoxPrices[gid] : ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setGroupBoxPrices(prev => ({
                                          ...prev,
                                          [gid]: val
                                        }));
                                      }}
                                      className="group-rate-input"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="group-rate-meta">
                                {currentPrice && !isNaN(numPrice) && numPrice > 0 ? (
                                  <div className="margin-indicator positive">
                                    <span>Margin: <strong>{effectiveMargin !== null ? `${effectiveMargin}%` : 'N/A'}</strong></span>
                                    <span className="rate-status-tag active">Custom Rate Active</span>
                                  </div>
                                ) : (
                                  <div className="margin-indicator default">
                                    <span>Uses Base M.R.P: <strong>₹{productForm.selling_price || 0}</strong></span>
                                    <span className="rate-status-tag default">Default Rate</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowProductModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                >
                  {editingProduct ? 'Update Product & Group Rates' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Category */}
      {showCategoryModal && (
        <div className="modal-backdrop" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-dialog category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Product Category</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowCategoryModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCategory} className="modal-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="e.g. Solar Equipment, Industrial Tools"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <small className="form-hint-text">
                  This category will be saved with a unique Category ID and immediately available for mapping.
                </small>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
