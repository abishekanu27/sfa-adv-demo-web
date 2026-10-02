import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Boxes, 
  Calendar, 
  Package, 
  ArrowDownRight, 
  DollarSign, 
  Layers, 
  Building2,
  UploadCloud,
  FileText,
  Eye,
  ExternalLink,
  Download,
  FileSpreadsheet,
  Warehouse
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchStockEntriesApi, 
  createStockEntryApi, 
  deleteStockEntryApi,
  fetchProductsApi,
  fetchCategoriesApi,
  fetchVendorsApi,
  fetchWarehousesApi,
  bulkImportStockApi
} from '../../services/api';
import { 
  hasPurchasesVendorsPermission, 
  isUserAdmin, 
  getUserFromStorage 
} from '../../utils/permissions';
import './StockDetails.css';

export const StockDetails = ({ user, initialProduct, onClearInitialProduct }) => {
  const [stockEntries, setStockEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Role Permission Gate
  const currentUser = user || getUserFromStorage();
  const isAdmin = isUserAdmin(currentUser);
  const allowedModules = currentUser?.allowed_modules || [];
  const canAccessVendors = hasPurchasesVendorsPermission(currentUser);
  const canManageInvoices = (isAdmin || (Array.isArray(allowedModules) && allowedModules.includes('stock-invoice-docs'))) && canAccessVendors;

  // Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedStockRows, setImportedStockRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Export Stock to Excel (.xlsx)
  const handleExportStockExcel = () => {
    try {
      if (stockEntries.length === 0) {
        showNotification('No stock entries to export', 'error');
        return;
      }

      const rows = stockEntries.map(s => {
        const row = {
          'Stock ID': s.stock_id || s.id,
          'Date': s.entry_date,
          'Product Name': s.product_name,
          'SKU': s.product_sku || '',
          'Category': s.category_name || '',
          'Warehouse': s.warehouse_name || 'Central Logistics Hub',
          'Warehouse Code': s.warehouse_code || ''
        };
        if (canAccessVendors) {
          row['Vendor / Supplier'] = s.vendor_name || '';
        }
        row['Package Type'] = s.package_type;
        row['Package Qty'] = parseFloat(s.package_qty);
        row['Items Per Package'] = parseFloat(s.items_per_package);
        row['Total Units'] = parseFloat(s.total_qty);
        if (canAccessVendors) {
          row['Buy Price (₹)'] = parseFloat(s.buy_price);
          row['Total Buy Amount (₹)'] = parseFloat(s.total_buy_amount);
          row['Invoice #'] = s.invoice_no || '';
        }
        row['Storage Location / Notes'] = s.notes || '';
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inward_Stock');
      XLSX.writeFile(wb, `Stock_Inward_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Stock inward register exported successfully in Excel (.xlsx)!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to export stock', 'error');
    }
  };

  // Download Sample Stock Inward Template
  const handleDownloadStockTemplate = () => {
    try {
      const sampleData = [
        {
          'Product Name': products[0]?.name || 'Premium Coconut Oil (1L Pouch)',
          'Product SKU': products[0]?.sku || 'COCO-1L',
          'Warehouse': warehouses[0]?.name || 'Central Logistics Hub (Peenya)',
          ...(canAccessVendors ? { 'Vendor Name': vendors[0]?.supplier_company || 'Kerala Agro Industries' } : {}),
          'Package Type': 'Carton',
          'Package Quantity': 10,
          'Items Per Package': 20,
          ...(canAccessVendors ? { 'Buy Price': 180, 'Invoice Number': 'INV-SAMPLE-01' } : {}),
          'Notes': 'Sample stock import row'
        },
        {
          'Product Name': products[1]?.name || 'Whole Wheat Atta 10kg',
          'Product SKU': products[1]?.sku || 'ATTA-10K',
          'Warehouse': warehouses[1]?.name || warehouses[0]?.name || 'South Transit Hub',
          ...(canAccessVendors ? { 'Vendor Name': vendors[1]?.supplier_company || 'Malabar Foods Private Ltd' } : {}),
          'Package Type': 'Bag',
          'Package Quantity': 15,
          'Items Per Package': 1,
          ...(canAccessVendors ? { 'Buy Price': 390, 'Invoice Number': 'INV-SAMPLE-02' } : {}),
          'Notes': 'Bulk flour shipment'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock_Template');
      XLSX.writeFile(wb, 'Stock_Inward_Import_Template.xlsx');
      showNotification('Sample stock template downloaded!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to download template', 'error');
    }
  };

  // Parse Excel / CSV file on upload
  const handleStockFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[wsName]);

        if (rawJson.length === 0) {
          showNotification('The uploaded file contains no rows', 'error');
          return;
        }

        const parsed = rawJson.map((row, idx) => {
          const prodName = row['Product Name'] || row['product_name'] || row['Name'] || '';
          const sku = row['Product SKU'] || row['SKU'] || row['sku'] || '';
          const whName = row['Warehouse'] || row['warehouse_name'] || row['Warehouse Name'] || '';
          const vendorName = row['Vendor Name'] || row['Vendor'] || row['vendor_name'] || 'Direct Procurement';
          const pkgType = row['Package Type'] || row['package_type'] || 'Box';
          const pkgQty = parseFloat(row['Package Quantity'] || row['package_qty'] || row['Qty'] || 1);
          const itemsPkg = parseFloat(row['Items Per Package'] || row['items_per_package'] || 1);
          const buyPrice = parseFloat(row['Buy Price'] || row['buy_price'] || row['Price'] || 0);
          const invNo = row['Invoice Number'] || row['invoice_no'] || '';
          const totalQty = pkgQty * itemsPkg;
          const totalAmount = totalQty * buyPrice;

          return {
            id: idx + 1,
            product_name: prodName,
            product_sku: sku,
            warehouse_name: whName,
            vendor_name: vendorName,
            package_type: pkgType,
            package_qty: pkgQty,
            items_per_package: itemsPkg,
            total_qty: totalQty,
            buy_price: buyPrice,
            total_buy_amount: totalAmount,
            invoice_no: invNo,
            isValid: Boolean(prodName || sku)
          };
        });

        setImportedStockRows(parsed);
        showNotification(`Parsed ${parsed.length} rows from file. Review before importing.`);
      } catch (err) {
        console.error('Error parsing file:', err);
        showNotification('Failed to parse file. Ensure it is valid Excel (.xlsx) or CSV.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Stock Import
  const handleConfirmStockImport = async () => {
    if (importedStockRows.length === 0) return;
    setIsImporting(true);
    try {
      const sanitizedRows = importedStockRows.map(r => ({
        ...r,
        vendor_id: canAccessVendors ? (r.vendor_id || null) : null,
        vendor_name: canAccessVendors ? (r.vendor_name || '') : '',
        buy_price: canAccessVendors ? (parseFloat(r.buy_price) || 0) : 0,
      }));
      const res = await bulkImportStockApi(sanitizedRows);
      showNotification(res.message || `Successfully imported ${res.imported_count || importedStockRows.length} stock entries!`);
      setShowImportModal(false);
      setImportedStockRows([]);
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to import stock records', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const [stockForm, setStockForm] = useState({
    product_id: '',
    product_name: '',
    product_sku: '',
    category_id: '',
    category_name: '',
    warehouse_id: '',
    warehouse_name: '',
    vendor_id: '',
    vendor_name: '',
    buy_price: '',
    package_type: 'Box',
    package_qty: '1',
    items_per_package: '1',
    unit: 'Pcs',
    invoice_no: '',
    invoice_file_data: '',
    invoice_file_name: '',
    invoice_file_size: '',
    notes: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  // Invoice File State
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (viewingInvoice) setViewingInvoice(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingInvoice]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entries, prods, cats, vList, whList] = await Promise.all([
        fetchStockEntriesApi(searchQuery, selectedCategory),
        fetchProductsApi(),
        fetchCategoriesApi(),
        fetchVendorsApi(),
        fetchWarehousesApi()
      ]);
      setStockEntries(entries);
      setProducts(prods);
      setCategories(cats);
      setVendors(vList);
      setWarehouses(whList);
    } catch (err) {
      console.error('Error loading stock details data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCategory]);

  // Auto-open Add Stock modal when navigated with initialProduct
  useEffect(() => {
    if (initialProduct && products.length > 0) {
      const targetProdId = initialProduct.product_id || initialProduct.id;
      const matchedProd = products.find(p => String(p.product_id || p.id) === String(targetProdId)) || initialProduct;
      const firstWh = warehouses[0];
      const firstVendor = canAccessVendors ? vendors[0] : null;

      setStockForm({
        product_id: matchedProd.product_id || matchedProd.id,
        product_name: matchedProd.name || matchedProd.product_name,
        product_sku: matchedProd.sku || '',
        category_id: matchedProd.category_id || '',
        category_name: matchedProd.category_name || '',
        warehouse_id: firstWh ? (firstWh.warehouse_id || firstWh.id) : '',
        warehouse_name: firstWh ? firstWh.name : '',
        vendor_id: firstVendor ? (firstVendor.vendor_id || firstVendor.id) : '',
        vendor_name: firstVendor ? firstVendor.supplier_company : '',
        buy_price: canAccessVendors ? (matchedProd.cost_price || '') : '',
        package_type: 'Box',
        package_qty: '10',
        items_per_package: '50',
        unit: matchedProd.unit || 'Pcs',
        invoice_no: '',
        invoice_file_data: '',
        invoice_file_name: '',
        invoice_file_size: '',
        notes: '',
        entry_date: new Date().toISOString().split('T')[0]
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowStockModal(true);
      showNotification(`Ready to add stock for "${matchedProd.name || matchedProd.product_name}"`);
      if (onClearInitialProduct) {
        onClearInitialProduct();
      }
    }
  }, [initialProduct, products]);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const processInvoiceFile = (file) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showNotification('Invoice file size exceeds 25MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const sizeStr = file.size < 1024 * 1024 
        ? `${Math.round(file.size / 1024)} KB` 
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setStockForm(prev => ({
        ...prev,
        invoice_file_data: ev.target.result,
        invoice_file_name: file.name,
        invoice_file_size: sizeStr
      }));
      showNotification(`Vendor invoice "${file.name}" attached successfully!`);
    };
    reader.onerror = () => {
      showNotification('Failed to read invoice file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleInvoiceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processInvoiceFile(file);
    }
  };

  const handleRemoveInvoiceFile = (e) => {
    if (e) e.stopPropagation();
    setStockForm(prev => ({
      ...prev,
      invoice_file_data: '',
      invoice_file_name: '',
      invoice_file_size: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenAddModal = () => {
    const firstProd = products[0];
    const firstWh = warehouses[0];
    const firstVendor = canAccessVendors ? vendors[0] : null;
    setStockForm({
      product_id: firstProd ? (firstProd.product_id || firstProd.id) : '',
      product_name: firstProd ? firstProd.name : '',
      product_sku: firstProd ? firstProd.sku : '',
      category_id: firstProd ? firstProd.category_id : '',
      category_name: firstProd ? firstProd.category_name : '',
      warehouse_id: firstWh ? (firstWh.warehouse_id || firstWh.id) : '',
      warehouse_name: firstWh ? firstWh.name : '',
      vendor_id: firstVendor ? (firstVendor.vendor_id || firstVendor.id) : '',
      vendor_name: firstVendor ? firstVendor.supplier_company : '',
      buy_price: canAccessVendors && firstProd ? (firstProd.cost_price || '') : '',
      package_type: 'Box',
      package_qty: '10',
      items_per_package: '50',
      unit: firstProd ? (firstProd.unit || 'Pcs') : 'Pcs',
      invoice_no: '',
      invoice_file_data: '',
      invoice_file_name: '',
      invoice_file_size: '',
      notes: '',
      entry_date: new Date().toISOString().split('T')[0]
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowStockModal(true);
  };

  // When user picks a product in the dropdown
  const handleProductSelect = (productId) => {
    const prod = products.find(p => String(p.product_id || p.id) === String(productId));
    if (prod) {
      setStockForm(prev => ({
        ...prev,
        product_id: prod.product_id || prod.id,
        product_name: prod.name,
        product_sku: prod.sku || '',
        category_id: prod.category_id || '',
        category_name: prod.category_name || '',
        unit: prod.unit || prev.unit || 'Pcs',
        buy_price: canAccessVendors ? (prod.cost_price || prev.buy_price) : ''
      }));
    }
  };

  // When user picks a warehouse in the dropdown
  const handleWarehouseSelect = (warehouseId) => {
    const wh = warehouses.find(item => String(item.warehouse_id || item.id) === String(warehouseId));
    if (wh) {
      setStockForm(prev => ({
        ...prev,
        warehouse_id: wh.warehouse_id || wh.id,
        warehouse_name: wh.name
      }));
    } else {
      setStockForm(prev => ({ ...prev, warehouse_id: '', warehouse_name: '' }));
    }
  };

  // When user picks a vendor in the dropdown
  const handleVendorSelect = (vendorId) => {
    const v = vendors.find(item => String(item.vendor_id || item.id) === String(vendorId));
    if (v) {
      setStockForm(prev => ({
        ...prev,
        vendor_id: v.vendor_id || v.id,
        vendor_name: v.supplier_company
      }));
    } else {
      setStockForm(prev => ({ ...prev, vendor_id: '', vendor_name: '' }));
    }
  };

  // Derived calculation
  const pkgQty = parseFloat(stockForm.package_qty || 0);
  const itemsPerPkg = parseFloat(stockForm.items_per_package || 0);
  const calcTotalUnits = Math.round(pkgQty * itemsPerPkg * 100) / 100;
  const unitBuyPrice = parseFloat(stockForm.buy_price || 0);
  const calcTotalValue = Math.round(calcTotalUnits * unitBuyPrice * 100) / 100;

  // Dynamic capacity label based on package type
  const getCapacityLabel = () => {
    const type = (stockForm.package_type || '').toLowerCase();
    if (type.includes('bag')) return 'In-bag QTY (units/capacity per bag) *';
    if (type.includes('box')) return 'In-box QTY (units per box) *';
    if (type.includes('cartoon') || type.includes('carton')) return 'In-carton QTY (units per carton) *';
    if (type.includes('drum')) return 'In-drum QTY (liters/units per drum) *';
    if (type.includes('pack')) return 'In-pack QTY (units per pack) *';
    return 'In-package QTY (units per package) *';
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!stockForm.product_id) {
      showNotification('Please select a product for stock inward', 'error');
      return;
    }
    if (!stockForm.warehouse_id) {
      showNotification('Please select a destination SQL Warehouse under Storage Location', 'error');
      return;
    }
    if (calcTotalUnits <= 0) {
      showNotification('Total inward quantity must be greater than 0', 'error');
      return;
    }

    try {
      const payload = {
        ...stockForm,
        vendor_id: canAccessVendors ? (stockForm.vendor_id || null) : null,
        vendor_name: canAccessVendors ? (stockForm.vendor_name || '') : '',
        buy_price: canAccessVendors ? (parseFloat(stockForm.buy_price) || 0) : 0,
        invoice_no: canAccessVendors ? (stockForm.invoice_no || '') : '',
        invoice_file_data: canAccessVendors ? (stockForm.invoice_file_data || '') : '',
        invoice_file_name: canAccessVendors ? (stockForm.invoice_file_name || '') : '',
        invoice_file_size: canAccessVendors ? (stockForm.invoice_file_size || '') : ''
      };
      await createStockEntryApi(payload);
      showNotification(`Stock inward of ${calcTotalUnits} units added! Stored at ${stockForm.warehouse_name || 'Warehouse'}.`);
      setShowStockModal(false);
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to add stock inward', 'error');
    }
  };

  const handleDeleteStock = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Delete this stock inward record? This will revert the added units from the product inventory.')) {
      try {
        await deleteStockEntryApi(id);
        showNotification('Stock entry deleted and inventory adjusted');
        await loadData();
      } catch (err) {
        showNotification(err.message || 'Failed to delete stock entry', 'error');
      }
    }
  };

  // Metrics summary
  const totalInwardUnits = stockEntries.reduce((sum, s) => sum + parseFloat(s.total_qty || 0), 0);
  const totalInwardVal = stockEntries.reduce((sum, s) => sum + parseFloat(s.total_buy_amount || 0), 0);

  return (
    <div className="stock-details-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`stock-toast ${toast.type}`}>
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
            <span className="breadcrumb-active">Stock Details</span>
          </nav>
          <h1 className="dashboard-main-title">
            Stock Inward & Warehouse Procurement Details
          </h1>
          <p className="dashboard-sub-title">
            Record inward shipments, container packaging (Bags, Cartons, Boxes), per-package capacity, and automatic inventory updates.
          </p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="action-btn btn-outline"
            onClick={handleExportStockExcel}
            title="Export stock inward entries to Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>Export Stock</span>
          </button>
          <button 
            className="action-btn btn-outline"
            onClick={() => { setShowImportModal(true); setImportedStockRows([]); }}
            title="Import stock inward entries from Excel / CSV"
          >
            <UploadCloud size={15} />
            <span>Import Stock</span>
          </button>
          <button 
            className="action-btn btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={15} />
            <span>Add New Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stock-metrics-grid">
        <div className="stock-metric-card">
          <div className="metric-icon-wrap blue">
            <Boxes size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Inward Entries</span>
            <span className="metric-val">{stockEntries.length} Inward Batches</span>
            <span className="metric-sub">Processed warehouse shipments</span>
          </div>
        </div>

        <div className="stock-metric-card">
          <div className="metric-icon-wrap green">
            <Layers size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Inward Units</span>
            <span className="metric-val">{totalInwardUnits.toLocaleString('en-IN')} Units</span>
            <span className="metric-sub">Cumulative units added to stock</span>
          </div>
        </div>

        {canAccessVendors && (
          <div className="stock-metric-card">
            <div className="metric-icon-wrap amber">
              <DollarSign size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Procurement Value</span>
              <span className="metric-val amber-text">₹{Number(totalInwardVal || 0).toLocaleString('en-IN')}</span>
              <span className="metric-sub">Total purchase landing valuation</span>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="stock-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Product, SKU, Vendor, Invoice #..."
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

      {/* Stock Inward Table */}
      <div className="stock-table-card">
        <div className="table-responsive-wrapper">
          <table className="stocks-data-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>Stock ID</th>
                <th>Date</th>
                <th>Product Description</th>
                <th>Category</th>
                <th>Warehouse / Storage</th>
                {canAccessVendors && <th>Vendor / Supplier</th>}
                {canAccessVendors && <th>Buy Price</th>}
                <th>Packaging Breakdown</th>
                <th>Total Inward QTY</th>
                {canAccessVendors && <th>Total Amount</th>}
                {canAccessVendors && <th>Invoice / Ref</th>}
                <th style={{ minWidth: '70px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canAccessVendors ? 12 : 8} className="empty-table-cell">
                    Loading stock records from SQL database...
                  </td>
                </tr>
              ) : stockEntries.length === 0 ? (
                <tr>
                  <td colSpan={canAccessVendors ? 12 : 8} className="empty-table-cell">
                    <div className="empty-state-box">
                      <Boxes size={38} className="empty-icon" />
                      <h4>No Inward Stock Records</h4>
                      <p>No warehouse stock has been inwarded yet. Click "+ Add New Stock" to record incoming products and update inventory.</p>
                      <button className="action-btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '10px' }}>
                        <Plus size={14} />
                        <span>Add First Stock</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                stockEntries.map((s) => (
                  <tr key={s.stock_id || s.id}>
                    <td>
                      <span className="stock-id-badge">#{s.stock_id || s.id}</span>
                    </td>
                    <td>
                      <div className="date-cell">
                        <Calendar size={12} />
                        <span>{new Date(s.entry_date || s.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="product-desc-cell">
                      <strong>{s.product_name}</strong>
                      {s.product_sku && <small className="sku-sub">SKU: {s.product_sku}</small>}
                    </td>
                    <td>
                      <span className="category-tag-badge">
                        {s.category_name || 'General'}
                        {s.category_id && <span className="cat-id-sub"> (#{s.category_id})</span>}
                      </span>
                    </td>
                    <td>
                      <div className="warehouse-badge-cell">
                        <div className="wh-badge-header">
                          <Warehouse size={13} className="wh-icon" />
                          <span className="wh-name-text">{s.warehouse_name || 'Central Logistics Hub'}</span>
                        </div>
                        <div className="wh-badge-sub">
                          {s.warehouse_code && <span className="wh-code-pill">{s.warehouse_code}</span>}
                          {s.notes && <span className="wh-rack-note" title={s.notes}>{s.notes}</span>}
                        </div>
                      </div>
                    </td>
                    {canAccessVendors && (
                      <td>
                        {s.vendor_name ? (
                          <span className="vendor-name-tag">
                            <Building2 size={12} />
                            <span>{s.vendor_name}</span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    )}
                    {canAccessVendors && (
                      <td className="amount-cell">
                        ₹{Number(s.buy_price || 0).toLocaleString('en-IN')}
                      </td>
                    )}
                    <td>
                      <div className="packaging-breakdown-pill">
                        <span className="pkg-count">{s.package_qty} {s.package_type}s</span>
                        <span className="pkg-cross">×</span>
                        <span className="pkg-cap">{s.items_per_package} / {s.package_type}</span>
                      </div>
                    </td>
                    <td>
                      <span className="total-qty-badge">
                        {Number(s.total_qty || 0).toLocaleString('en-IN')} {s.unit || 'Units'}
                      </span>
                    </td>
                    {canAccessVendors && (
                      <td className="amount-cell green">
                        ₹{Number(s.total_buy_amount || 0).toLocaleString('en-IN')}
                      </td>
                    )}
                    {canAccessVendors && (
                      <td>
                        {canManageInvoices && (s.invoice_file_data || s.invoice_url) ? (
                          <button 
                            type="button"
                            className="invoice-badge-clickable"
                            title="Click to view or download Vendor Invoice document"
                            onClick={() => setViewingInvoice(s)}
                          >
                            <FileText size={12} className="inv-badge-icon" />
                            <span className="inv-badge-text">{s.invoice_no || 'View Bill'}</span>
                            <Download size={11} className="inv-badge-dl" />
                          </button>
                        ) : s.invoice_no ? (
                          <span className="invoice-badge">{s.invoice_no}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    )}
                    <td className="actions-cell">
                      <button 
                        className="table-icon-action delete"
                        title="Delete Stock Entry (Revert Stock)"
                        onClick={(e) => handleDeleteStock(s.stock_id || s.id, e)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Stock (Inward Procurement) */}
      {showStockModal && (
        <div className="modal-backdrop" onClick={() => setShowStockModal(false)}>
          <div className="modal-dialog stock-modal" style={{ maxWidth: '900px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Add New Stock (Inward Procurement)</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowStockModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="modal-form">
              <div className="modal-scrollable-body">
                {/* Select Product */}
                <div className="form-group">
                  <label>Select Product *</label>
                  <select 
                    value={stockForm.product_id}
                    required
                    onChange={(e) => handleProductSelect(e.target.value)}
                  >
                    {products.length === 0 ? (
                      <option value="">No Products Found in Catalog</option>
                    ) : (
                      <>
                        <option value="">-- Choose Product to Inward --</option>
                        {products.map((p) => (
                          <option key={p.product_id || p.id} value={p.product_id || p.id}>
                            #{p.product_id || p.id} — {p.name} ({p.sku || 'No SKU'})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Category Mapping & Supplier */}
                {canAccessVendors ? (
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Category Mapping *</label>
                      <select 
                        value={stockForm.category_name}
                        required
                        onChange={(e) => {
                          const selName = e.target.value;
                          const selCat = categories.find(c => c.name === selName);
                          setStockForm({
                            ...stockForm,
                            category_name: selName,
                            category_id: selCat ? (selCat.category_id || selCat.id) : ''
                          });
                        }}
                      >
                        {categories.map((c) => (
                          <option key={c.category_id || c.id} value={c.name}>
                            {c.name} (Category ID: #{c.category_id || c.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Vendor / Supplier</label>
                      <select 
                        value={stockForm.vendor_id}
                        onChange={(e) => handleVendorSelect(e.target.value)}
                      >
                        <option value="">-- Direct / Unassigned Supplier --</option>
                        {vendors.map((v) => (
                          <option key={v.vendor_id || v.id} value={v.vendor_id || v.id}>
                            {v.supplier_company} (Code: {v.code || `#${v.vendor_id || v.id}`})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Category Mapping *</label>
                    <select 
                      value={stockForm.category_name}
                      required
                      onChange={(e) => {
                        const selName = e.target.value;
                        const selCat = categories.find(c => c.name === selName);
                        setStockForm({
                          ...stockForm,
                          category_name: selName,
                          category_id: selCat ? (selCat.category_id || selCat.id) : ''
                        });
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c.category_id || c.id} value={c.name}>
                          {c.name} (Category ID: #{c.category_id || c.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Packaging & Unit Configuration */}
                {canAccessVendors ? (
                  <>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Buy Price (₹ / unit) *</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          step="any"
                          placeholder="e.g. 120.00"
                          value={stockForm.buy_price}
                          onChange={(e) => setStockForm({ ...stockForm, buy_price: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Packaging Type (Bag, Box, Carton, etc.) *</label>
                        <select 
                          value={stockForm.package_type}
                          onChange={(e) => setStockForm({ ...stockForm, package_type: e.target.value })}
                        >
                          <option value="Box">Box</option>
                          <option value="Bag">Bag</option>
                          <option value="Cartoon">Cartoon (Carton)</option>
                          <option value="Drum">Drum</option>
                          <option value="Pack">Pack</option>
                          <option value="Case">Case</option>
                          <option value="Piece">Piece / Loose Unit</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Measurement Unit (KG, gram, litre, etc.) *</label>
                        <select 
                          value={stockForm.unit || 'Pcs'}
                          onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
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

                      <div className="form-group">
                        <label>Total Packaging Quantity ({stockForm.package_type}s) *</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          step="any"
                          placeholder={`e.g. 10 ${stockForm.package_type}s`}
                          value={stockForm.package_qty}
                          onChange={(e) => setStockForm({ ...stockForm, package_qty: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>{getCapacityLabel()}</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        step="any"
                        placeholder="e.g. 50"
                        value={stockForm.items_per_package}
                        onChange={(e) => setStockForm({ ...stockForm, items_per_package: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Packaging Type (Bag, Box, Carton, etc.) *</label>
                        <select 
                          value={stockForm.package_type}
                          onChange={(e) => setStockForm({ ...stockForm, package_type: e.target.value })}
                        >
                          <option value="Box">Box</option>
                          <option value="Bag">Bag</option>
                          <option value="Cartoon">Cartoon (Carton)</option>
                          <option value="Drum">Drum</option>
                          <option value="Pack">Pack</option>
                          <option value="Case">Case</option>
                          <option value="Piece">Piece / Loose Unit</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Measurement Unit (KG, gram, litre, etc.) *</label>
                        <select 
                          value={stockForm.unit || 'Pcs'}
                          onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
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
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Total Packaging Quantity ({stockForm.package_type}s) *</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          step="any"
                          placeholder={`e.g. 10 ${stockForm.package_type}s`}
                          value={stockForm.package_qty}
                          onChange={(e) => setStockForm({ ...stockForm, package_qty: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>{getCapacityLabel()}</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          step="any"
                          placeholder="e.g. 50"
                          value={stockForm.items_per_package}
                          onChange={(e) => setStockForm({ ...stockForm, items_per_package: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Live Real-time Calculation Summary Box */}
                <div className="stock-calc-summary-card">
                  <div className="calc-header">
                    <ArrowDownRight size={16} />
                    <span>Real-time Inward Stock Quantity Calculation</span>
                  </div>
                  <div className="calc-body-row">
                    <div className="calc-item">
                      <span className="calc-label">Total Calculated Inward QTY:</span>
                      <span className="calc-val-big">{calcTotalUnits} {stockForm.unit || 'Units'}</span>
                      <small className="calc-formula">
                        ({pkgQty} {stockForm.package_type}s × {itemsPerPkg} {stockForm.unit || 'units'} per {stockForm.package_type})
                      </small>
                    </div>

                    {canAccessVendors && (
                      <div className="calc-item">
                        <span className="calc-label">Total Procurement Value:</span>
                        <span className="calc-val-big green-text">₹{calcTotalValue.toLocaleString('en-IN')}</span>
                        <small className="calc-formula">
                          ({calcTotalUnits} {stockForm.unit || 'Units'} × ₹{unitBuyPrice || 0})
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice No & Inward Date */}
                {canAccessVendors ? (
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Invoice / Delivery Challan Ref</label>
                      <input 
                        type="text" 
                        placeholder="e.g. INV-2026-884"
                        value={stockForm.invoice_no}
                        onChange={(e) => setStockForm({ ...stockForm, invoice_no: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Inward Received Date *</label>
                      <input 
                        type="date" 
                        required
                        value={stockForm.entry_date}
                        onChange={(e) => setStockForm({ ...stockForm, entry_date: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Inward Received Date *</label>
                    <input 
                      type="date" 
                      required
                      value={stockForm.entry_date}
                      onChange={(e) => setStockForm({ ...stockForm, entry_date: e.target.value })}
                    />
                  </div>
                )}

                {/* Optional Vendor Invoice Upload - Role Permission Gated */}
                {canManageInvoices && canAccessVendors && (
                  <div className="form-group invoice-upload-group">
                    <div className="invoice-upload-label-row">
                      <label>Vendor Invoice / Bill Attachment (Saved to SQL)</label>
                      <span className="upload-tip-text">PNG, JPG, WEBP or PDF (max 25MB)</span>
                    </div>

                    {!stockForm.invoice_file_data ? (
                      <div 
                        className={`invoice-upload-dropzone ${isDragOver ? 'dragover' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          if (e.dataTransfer.files?.[0]) processInvoiceFile(e.dataTransfer.files[0]);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf"
                          onChange={handleInvoiceFileChange}
                        />
                        <div className="dropzone-content-box">
                          <div className="dropzone-icon-circle">
                            <UploadCloud size={20} />
                          </div>
                          <div className="dropzone-text-block">
                            <p className="dropzone-primary-text">
                              <strong>Click to browse</strong> or drag &amp; drop Vendor Bill
                            </p>
                            <p className="dropzone-sub-text">
                              Saved to SQL for accounting verification &amp; tax compliance
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="invoice-attached-banner">
                        <div className="attached-left">
                          {stockForm.invoice_file_data.startsWith('data:application/pdf') || stockForm.invoice_file_name?.toLowerCase().endsWith('.pdf') ? (
                            <div className="file-badge-icon pdf">
                              <FileText size={20} />
                              <span>PDF</span>
                            </div>
                          ) : (
                            <div className="file-badge-thumb">
                              <img src={stockForm.invoice_file_data} alt="Invoice preview" />
                            </div>
                          )}
                          <div className="attached-info">
                            <span className="attached-filename" title={stockForm.invoice_file_name}>
                              {stockForm.invoice_file_name || 'Vendor_Invoice'}
                            </span>
                            <div className="attached-tags">
                              {stockForm.invoice_file_size && (
                                <span className="file-size-pill">{stockForm.invoice_file_size}</span>
                              )}
                              <span className="file-ready-pill">✓ Saved in SQL on Submit</span>
                            </div>
                          </div>
                        </div>

                        <div className="attached-actions">
                          <button 
                            type="button" 
                            className="attached-btn preview"
                            title="Preview Document"
                            onClick={() => setViewingInvoice({
                              stock_id: 'Draft',
                              product_name: stockForm.product_name,
                              vendor_name: stockForm.vendor_name,
                              invoice_no: stockForm.invoice_no,
                              entry_date: stockForm.entry_date,
                              total_qty: calcTotalUnits,
                              total_buy_amount: calcTotalValue,
                              invoice_file_data: stockForm.invoice_file_data,
                              invoice_file_name: stockForm.invoice_file_name
                            })}
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                          <button 
                            type="button" 
                            className="attached-btn remove"
                            title="Remove Invoice"
                            onClick={handleRemoveInvoiceFile}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Storage Location (SQL Warehouse) & Specific Rack / Bin */}
                <div className="form-row two-cols">
                  <div className="form-group">
                    <label>
                      <Warehouse size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-1px', color: '#0284c7' }} />
                      Storage Location (Destination SQL Warehouse) *
                    </label>
                    <select
                      value={stockForm.warehouse_id}
                      onChange={(e) => handleWarehouseSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Select Destination Warehouse --</option>
                      {warehouses.map(w => {
                        const wId = w.warehouse_id || w.id;
                        const locText = w.district ? `(${w.district})` : (w.city ? `(${w.city})` : (w.location ? `(${w.location})` : ''));
                        return (
                          <option key={wId} value={wId}>
                            {w.code ? `[${w.code}] ` : ''}{w.name} {locText}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bay / Rack / Specific Storage Notes</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rack B-4, Bin 12, Batch #401"
                      value={stockForm.notes}
                      onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowStockModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                >
                  Save Stock Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View & Download Vendor Invoice Document */}
      {viewingInvoice && (
        <div className="modal-backdrop invoice-viewer-backdrop" onClick={() => setViewingInvoice(null)}>
          <div className="modal-dialog invoice-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-viewer-header">
              <div className="viewer-title-left">
                <div className="viewer-badge-icon">
                  <FileText size={19} />
                </div>
                <div>
                  <h3 className="viewer-title">Vendor Purchase Invoice</h3>
                  <p className="viewer-subtitle">
                    {viewingInvoice.stock_id ? `Stock Inward #${viewingInvoice.stock_id}` : 'Draft Batch'} • {viewingInvoice.product_name} • {viewingInvoice.vendor_name || 'Direct Supplier'}
                  </p>
                </div>
              </div>

              <div className="viewer-actions-right">
                {(viewingInvoice.invoice_file_data || viewingInvoice.invoice_url) && (
                  <>
                    <a 
                      href={viewingInvoice.invoice_file_data || viewingInvoice.invoice_url} 
                      download={viewingInvoice.invoice_file_name || `Vendor_Invoice_${viewingInvoice.invoice_no || 'doc'}`}
                      className="viewer-action-btn primary"
                      title="Download Original Invoice File for Verification"
                    >
                      <Download size={14} />
                      <span>Download Bill</span>
                    </a>
                    <button 
                      type="button"
                      className="viewer-action-btn"
                      title="Open Full Window"
                      onClick={() => {
                        const fileData = viewingInvoice.invoice_file_data || viewingInvoice.invoice_url;
                        const win = window.open();
                        if (win) {
                          if (fileData.startsWith('data:image')) {
                            win.document.write(`<title>Invoice ${viewingInvoice.invoice_no || ''}</title><body style="margin:0;background:#0b0f19;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${fileData}" style="max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 10px 40px rgba(0,0,0,0.5);"/></body>`);
                          } else {
                            win.location.href = fileData;
                          }
                        }
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>Full View</span>
                    </button>
                  </>
                )}
                <button 
                  type="button" 
                  className="modal-close-btn" 
                  onClick={() => setViewingInvoice(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Inward Details Meta Strip */}
            <div className="viewer-meta-strip">
              <div className="meta-strip-cell">
                <span className="meta-strip-label">Invoice Ref #</span>
                <span className="meta-strip-val code">{viewingInvoice.invoice_no || 'N/A'}</span>
              </div>
              <div className="meta-strip-cell">
                <span className="meta-strip-label">Supplier / Vendor</span>
                <span className="meta-strip-val">{viewingInvoice.vendor_name || 'Direct Supplier'}</span>
              </div>
              <div className="meta-strip-cell">
                <span className="meta-strip-label">Inward Date</span>
                <span className="meta-strip-val">{new Date(viewingInvoice.entry_date || viewingInvoice.created_at || Date.now()).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="meta-strip-cell">
                <span className="meta-strip-label">Inward Units</span>
                <span className="meta-strip-val bold blue">{Number(viewingInvoice.total_qty || 0).toLocaleString('en-IN')} Units</span>
              </div>
              <div className="meta-strip-cell">
                <span className="meta-strip-label">Total Purchase Amount</span>
                <span className="meta-strip-val bold green">₹{Number(viewingInvoice.total_buy_amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Document Viewer Frame / Canvas */}
            <div className="viewer-doc-viewport">
              {(viewingInvoice.invoice_file_data || viewingInvoice.invoice_url) ? (
                (viewingInvoice.invoice_file_data || viewingInvoice.invoice_url).startsWith('data:application/pdf') || viewingInvoice.invoice_file_name?.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={viewingInvoice.invoice_file_data || viewingInvoice.invoice_url} 
                    title="Vendor Invoice PDF Viewer" 
                    className="viewer-pdf-iframe"
                  />
                ) : (
                  <div className="viewer-image-box">
                    <img 
                      src={viewingInvoice.invoice_file_data || viewingInvoice.invoice_url} 
                      alt="Vendor Invoice Document" 
                      className="viewer-preview-img"
                    />
                  </div>
                )
              ) : (
                <div className="viewer-no-doc">
                  <FileText size={40} className="empty-icon" />
                  <p>No invoice document was attached to this stock inward record.</p>
                </div>
              )}
            </div>

            <div className="viewer-footer">
              <span className="viewer-footer-info">
                📎 {viewingInvoice.invoice_file_name || 'Vendor_Invoice_Document'}
              </span>
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setViewingInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Stock Inward Bulk Import from Excel / CSV */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal-dialog stock-modal" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Bulk Import Stock Inward Entries</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Upload inventory batches from vendor packing lists or spreadsheet sheets
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-scrollable-body" style={{ padding: '20px' }}>
              {/* Step 1: Download Template */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Step 1: Download Sample Spreadsheet Template</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Includes mandatory column headers (Product Name, SKU, Vendor, Package Type, Quantity, Buy Price)
                  </p>
                </div>
                <button
                  type="button"
                  className="action-btn btn-outline"
                  onClick={handleDownloadStockTemplate}
                >
                  <Download size={14} />
                  <span>Download .xlsx Template</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div style={{ background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
                <UploadCloud size={32} color="#3b82f6" style={{ margin: '0 auto 8px auto' }} />
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0f172a' }}>Choose Excel (.xlsx) or CSV File to Import</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>Drag and drop here or click to browse files</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleStockFileSelect}
                  style={{ display: 'none' }}
                  id="stock-import-file-input"
                />
                <label
                  htmlFor="stock-import-file-input"
                  className="action-btn btn-primary"
                  style={{ display: 'inline-flex', cursor: 'pointer' }}
                >
                  Select File from Computer
                </label>
              </div>

              {/* Step 3: Preview Parsed Rows */}
              {importedStockRows.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>
                    Parsed Preview ({importedStockRows.length} Items Found)
                  </h4>
                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>#</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Product</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>SKU</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Package</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Total Units</th>
                          {canAccessVendors && <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Buy Price</th>}
                          {canAccessVendors && <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Vendor</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {importedStockRows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px' }}>{i + 1}</td>
                            <td style={{ padding: '6px 8px', fontWeight: '600' }}>{r.product_name || <span style={{ color: '#ef4444' }}>Missing Name</span>}</td>
                            <td style={{ padding: '6px 8px' }}>{r.product_sku || '-'}</td>
                            <td style={{ padding: '6px 8px' }}>{r.package_qty} {r.package_type}</td>
                            <td style={{ padding: '6px 8px', fontWeight: '700', color: '#0284c7' }}>{r.total_qty}</td>
                            {canAccessVendors && <td style={{ padding: '6px 8px' }}>₹{r.buy_price}</td>}
                            {canAccessVendors && <td style={{ padding: '6px 8px' }}>{r.vendor_name}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => { setShowImportModal(false); setImportedStockRows([]); }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-save"
                disabled={importedStockRows.length === 0 || isImporting}
                onClick={handleConfirmStockImport}
              >
                {isImporting ? 'Importing...' : `Confirm & Inward ${importedStockRows.length} Stock Entries`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

