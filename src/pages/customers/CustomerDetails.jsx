import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Tag,
  SlidersHorizontal,
  DollarSign,
  ShieldCheck,
  CreditCard,
  Building,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Receipt,
  Navigation
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  fetchCustomersApi,
  fetchCustomerMetricsApi,
  fetchNextCustomerCodeApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
  updateCustomerPriceGroupApi,
  fetchPriceGroupsApi,
  bulkImportCustomersApi
} from '../../services/api';
import {
  getKeralaDistricts,
  getLocalAreasForKeralaDistrict
} from '../../data/locationData';
import './CustomerDetails.css';

export const CustomerDetails = ({ onGoToPriceMapping, onIssueCreditNote }) => {
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({
    total_customers: 0,
    active_customers: 0,
    total_outstanding: 0,
    price_groups_mapped: 0,
    unassigned_customers: 0,
    gst_customers_count: 0,
    non_gst_customers_count: 0,
    gst_outstanding: 0,
    non_gst_outstanding: 0
  });
  const [priceGroups, setPriceGroups] = useState([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [taxFilter, setTaxFilter] = useState('all'); // 'all' | 'gst' | 'non_gst'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedCustomerRows, setImportedCustomerRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [mappingCustomer, setMappingCustomer] = useState(null);
  const [quickPriceGroupId, setQuickPriceGroupId] = useState('');
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [taxType, setTaxType] = useState('GST'); // 'GST' | 'NON_GST'

  // Customer Form
  const [formData, setFormData] = useState({
    customer_code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    state: 'Kerala',
    district: 'Ernakulam',
    local_area: 'Broadway Wholesale Market',
    place: 'Broadway Wholesale Market, Ernakulam, Kerala',
    address: '',
    route_area: 'Broadway Wholesale Market Beat (Ernakulam)',
    gst_in: '',
    credit_limit: '',
    credit_days: '30',
    outstanding_balance: '',
    price_group_id: '',
    latitude: '',
    longitude: '',
    status: 'Active'
  });

  const handleDetectBrowserLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Browser geolocation is not supported on this browser', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7)
        }));
        showNotification(`GPS captured: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      (err) => {
        showNotification(`Could not acquire GPS: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const composePlace = (area, dist) => {
    return [area, dist, 'Kerala'].filter(Boolean).join(', ');
  };

  const handleDistrictChange = (selectedDistrict) => {
    const areas = getLocalAreasForKeralaDistrict(selectedDistrict);
    const defaultArea = areas[0] || '';

    setFormData(prev => ({
      ...prev,
      district: selectedDistrict,
      local_area: defaultArea,
      place: composePlace(defaultArea, selectedDistrict),
      route_area: defaultArea ? `${defaultArea} Beat (${selectedDistrict})` : ''
    }));
    setIsCustomArea(false);
  };

  const handleLocalAreaChange = (selectedArea) => {
    if (selectedArea === '__custom__') {
      setIsCustomArea(true);
      setFormData(prev => ({
        ...prev,
        local_area: '',
        place: composePlace('', prev.district)
      }));
      return;
    }
    setIsCustomArea(false);
    setFormData(prev => ({
      ...prev,
      local_area: selectedArea,
      place: composePlace(selectedArea, prev.district),
      route_area: `${selectedArea} Beat (${prev.district})`
    }));
  };

  const handleCustomAreaInput = (customVal) => {
    setFormData(prev => ({
      ...prev,
      local_area: customVal,
      place: composePlace(customVal, prev.district),
      route_area: customVal ? `${customVal} Beat (${prev.district})` : prev.route_area
    }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, custMetrics, pgs] = await Promise.all([
        fetchCustomersApi(searchQuery, selectedGroupFilter, selectedStatusFilter, taxFilter),
        fetchCustomerMetricsApi(),
        fetchPriceGroupsApi()
      ]);
      setCustomers(custList);
      setMetrics(custMetrics);
      setPriceGroups(pgs);
    } catch (err) {
      console.error('Error loading customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedGroupFilter, selectedStatusFilter, taxFilter]);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    const defaultDistrict = 'Ernakulam';
    const areas = getLocalAreasForKeralaDistrict(defaultDistrict);
    const defaultArea = areas[0] || 'Broadway Wholesale Market';
    setTaxType(taxFilter === 'non_gst' ? 'NON_GST' : 'GST');

    // Auto-calculate unique random customer code like CI47HB153
    const generateRandomCustomerCode = () => {
      const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let randomPart = '';
      for (let i = 0; i < 7; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `CI${randomPart}`;
    };
    let initialCode = generateRandomCustomerCode();
    while (customers.some(c => c.customer_code === initialCode)) {
      initialCode = generateRandomCustomerCode();
    }

    setFormData({
      customer_code: initialCode,
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      state: 'Kerala',
      district: defaultDistrict,
      local_area: defaultArea,
      place: composePlace(defaultArea, defaultDistrict),
      address: '',
      route_area: `${defaultArea} Beat (${defaultDistrict})`,
      gst_in: '',
      credit_limit: '',
      credit_days: '30',
      outstanding_balance: '',
      price_group_id: priceGroups[0]?.price_group_id || '',
      latitude: '',
      longitude: '',
      status: 'Active'
    });
    setIsCustomArea(false);
    setShowCustomerModal(true);

    // Fetch authoritative sequence code from PostgreSQL backend
    fetchNextCustomerCodeApi().then(code => {
      if (code) {
        setFormData(prev => ({ ...prev, customer_code: code }));
      }
    }).catch(() => {});
  };

  // Open Edit Modal
  const handleOpenEditModal = (c, e) => {
    if (e) e.stopPropagation();
    setEditingCustomer(c);
    const distVal = c.district || 'Ernakulam';
    const areaVal = c.local_area || (c.place ? c.place.split(',')[0].trim() : '');
    const districtAreas = getLocalAreasForKeralaDistrict(distVal);
    const isCustom = Boolean(areaVal && !districtAreas.includes(areaVal));
    const hasGst = Boolean(c.gst_in && c.gst_in.trim() && !['URP', 'NON-GST'].includes(c.gst_in.trim().toUpperCase()));
    setTaxType(hasGst ? 'GST' : 'NON_GST');

    setFormData({
      customer_code: c.customer_code || '',
      name: c.name || '',
      contact_person: c.contact_person || '',
      phone: c.phone || '',
      email: c.email || '',
      state: 'Kerala',
      district: distVal,
      local_area: areaVal,
      place: c.place || composePlace(areaVal, distVal),
      address: c.address || '',
      route_area: c.route_area || (areaVal ? `${areaVal} Beat (${distVal})` : ''),
      gst_in: c.gst_in || '',
      credit_limit: c.credit_limit || '',
      credit_days: c.credit_days || '30',
      outstanding_balance: c.outstanding_balance || '',
      price_group_id: c.price_group_id || '',
      latitude: c.latitude != null ? String(c.latitude) : '',
      longitude: c.longitude != null ? String(c.longitude) : '',
      status: c.status || 'Active'
    });
    setIsCustomArea(isCustom);
    setShowCustomerModal(true);
  };

  // Open Quick Price Group Mapping Modal
  const handleOpenQuickMapModal = (c, e) => {
    if (e) e.stopPropagation();
    setMappingCustomer(c);
    setQuickPriceGroupId(c.price_group_id ? String(c.price_group_id) : '');
  };

  // Save Customer (Create or Update)
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('Customer / Business Name is required', 'error');
      return;
    }
    if (!formData.phone.trim()) {
      showNotification('Contact Phone is required', 'error');
      return;
    }

    const payload = {
      ...formData,
      gst_in: taxType === 'GST' ? (formData.gst_in || '').trim().toUpperCase() : ''
    };

    try {
      setIsSubmitting(true);
      if (editingCustomer) {
        await updateCustomerApi(editingCustomer.customer_id || editingCustomer.id, payload);
        showNotification(`Customer "${payload.name}" updated successfully!`);
      } else {
        await createCustomerApi(payload);
        showNotification(`Customer "${payload.name}" added successfully!`);
      }
      setShowCustomerModal(false);
      setEditingCustomer(null);
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to save customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Quick Price Group Mapping
  const handleSaveQuickMap = async (e) => {
    e.preventDefault();
    if (!mappingCustomer) return;
    try {
      setIsSubmitting(true);
      await updateCustomerPriceGroupApi(
        mappingCustomer.customer_id || mappingCustomer.id,
        quickPriceGroupId ? parseInt(quickPriceGroupId, 10) : null
      );
      showNotification(`Price Group updated for "${mappingCustomer.name}"!`);
      setMappingCustomer(null);
      await loadData();
    } catch (err) {
      showNotification(err.message || 'Failed to update mapping', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      try {
        await deleteCustomerApi(id);
        showNotification(`Customer "${name}" removed successfully`);
        await loadData();
      } catch (err) {
        showNotification(err.message || 'Failed to delete customer', 'error');
      }
    }
  };

  // Export Customers to Excel
  const handleExportCustomersExcel = () => {
    if (!customers || customers.length === 0) {
      showNotification('No customer records to export', 'error');
      return;
    }
    try {
      const rows = customers.map((c) => ({
        'Customer Code': c.customer_code || `CUST-${c.id}`,
        'Customer / Business Name': c.name,
        'Contact Person': c.contact_person || '',
        'Phone': c.phone || '',
        'Email': c.email || '',
        'GST Type': (c.gst_in && c.gst_in.trim()) ? 'GST Registered' : 'Non-GST Consumer/Unregistered',
        'GSTIN': c.gst_in || '',
        'District': c.district || 'Ernakulam',
        'Local Area / Beat': c.local_area || c.route_area || '',
        'Place': c.place || '',
        'Address': c.address || '',
        'Credit Limit (₹)': parseFloat(c.credit_limit || 0),
        'Credit Days': parseInt(c.credit_days || 30, 10),
        'Outstanding Balance (₹)': parseFloat(c.outstanding_balance || 0),
        'Price Group': c.price_group_name || 'Standard Default',
        'Status': c.status || 'Active'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      XLSX.writeFile(wb, `Customer_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Customer directory exported to Excel (.xlsx) successfully!');
    } catch (err) {
      console.error('Failed to export customers:', err);
      showNotification('Failed to export customers to Excel', 'error');
    }
  };

  // Download Sample Customer Template
  const handleDownloadCustomerTemplate = () => {
    try {
      const sampleData = [
        {
          'Customer Code (Optional)': 'CUST-0101',
          'Business Name*': 'Malabar Supermarket',
          'Contact Person': 'Shabeer Ali',
          'Phone*': '9847123456',
          'Email': 'malabar.stores@gmail.com',
          'GSTIN': '32ABCDE1234F1Z5',
          'District': 'Ernakulam',
          'Local Area': 'Broadway Wholesale Market',
          'Address': 'Broadway, Marine Drive, Kochi',
          'Credit Limit': 100000,
          'Credit Days': 30,
          'Outstanding Balance': 0,
          'Price Group Name': 'Retail A',
          'Status': 'Active'
        },
        {
          'Customer Code (Optional)': 'CUST-0102',
          'Business Name*': 'Kozhikode Fresh Mart',
          'Contact Person': 'Ramesh Kumar',
          'Phone*': '9895234567',
          'Email': 'freshmart.clt@gmail.com',
          'GSTIN': '',
          'District': 'Kozhikode',
          'Local Area': 'SM Street',
          'Address': 'SM Street, Calicut',
          'Credit Limit': 50000,
          'Credit Days': 15,
          'Outstanding Balance': 0,
          'Price Group Name': 'Standard',
          'Status': 'Active'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customer_Template');
      XLSX.writeFile(wb, 'Customer_Import_Template.xlsx');
      showNotification('Customer import template downloaded successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to download template', 'error');
    }
  };

  // Select and Parse Excel File for Customers
  const handleCustomerFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[wsName]);

        if (!rawJson || rawJson.length === 0) {
          showNotification('No data rows found in selected spreadsheet', 'error');
          return;
        }

        const parsed = rawJson.map((row) => {
          const name = row['Business Name*'] || row['Customer Name*'] || row['Customer Name'] || row['Business Name'] || row['Name'] || '';
          const code = row['Customer Code (Optional)'] || row['Customer Code'] || row['code'] || '';
          const contact = row['Contact Person'] || row['Contact'] || name;
          const phone = String(row['Phone*'] || row['Phone'] || row['Mobile'] || '').trim();
          const email = row['Email'] || '';
          const gstin = String(row['GSTIN'] || row['GSTIN (Optional)'] || row['gst_in'] || '').trim();
          const district = row['District'] || 'Ernakulam';
          const localArea = row['Local Area'] || row['Area'] || row['Beat'] || '';
          const address = row['Address'] || row['Full Address'] || localArea;
          const creditLimit = parseFloat(row['Credit Limit'] || 50000);
          const creditDays = parseInt(row['Credit Days'] || 30, 10);
          const outstanding = parseFloat(row['Outstanding Balance'] || 0);
          const priceGroup = row['Price Group Name'] || row['Price Group'] || '';
          const status = row['Status'] || 'Active';

          return {
            customer_code: code,
            name,
            contact_person: contact,
            phone,
            email,
            gst_in: gstin,
            district,
            local_area: localArea,
            address,
            place: [localArea, district, 'Kerala'].filter(Boolean).join(', '),
            route_area: localArea ? `${localArea} Beat (${district})` : `${district} Route`,
            credit_limit: creditLimit,
            credit_days: creditDays,
            outstanding_balance: outstanding,
            price_group_name: priceGroup,
            status
          };
        }).filter(r => r.name && r.phone);

        if (parsed.length === 0) {
          showNotification('Could not find valid rows with Customer Name and Phone', 'error');
          return;
        }

        setImportedCustomerRows(parsed);
        showNotification(`Parsed ${parsed.length} customers ready for import!`);
      } catch (err) {
        console.error('Error parsing customer Excel file:', err);
        showNotification('Invalid spreadsheet file format', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Execute Bulk Customer Import
  const handleExecuteCustomerImport = async () => {
    if (importedCustomerRows.length === 0) return;
    try {
      setIsImporting(true);
      const res = await bulkImportCustomersApi(importedCustomerRows);
      showNotification(res.message || `Successfully imported ${res.imported_count || importedCustomerRows.length} customers!`);
      setShowImportModal(false);
      setImportedCustomerRows([]);
      loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to import customers', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="customer-details-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`customer-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Customers</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Customer Details</span>
          </nav>
          <h1 className="dashboard-main-title">
            Customer Directory & Accounts
          </h1>
          <p className="dashboard-sub-title">
            Manage enterprise retailers, wholesale outlets, credit policies, contact books, and customer selling price group assignments.
          </p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="action-btn"
            onClick={handleExportCustomersExcel}
            title="Export full customer directory to Excel"
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
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>
          <button
            className="action-btn"
            onClick={() => setShowImportModal(true)}
            title="Bulk import customers from Excel or CSV spreadsheet"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 14px', 
              background: '#eff6ff', 
              color: '#2563eb', 
              border: '1px solid #93c5fd', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 600, 
              fontSize: '0.85rem' 
            }}
          >
            <UploadCloud size={14} />
            <span>Import Customers</span>
          </button>
          {onGoToPriceMapping && (
            <button
              className="action-btn btn-outline"
              onClick={onGoToPriceMapping}
              title="Go to Customer & Selling Price Groups Mapping"
            >
              <Tag size={15} />
              <span>Price Groups Mapping</span>
            </button>
          )}
          {onIssueCreditNote && (
            <button
              className="action-btn"
              onClick={() => onIssueCreditNote(null)}
              title="Manage and issue customer credit notes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <Receipt size={14} />
              <span>Credit Notes</span>
            </button>
          )}
          <button 
            className="action-btn btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={15} />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* GST / Non-GST Classification Navigation Strip */}
      <div className="customer-classification-strip">
        <div className="classification-tabs-group">
          <button
            className={`classification-tab-btn ${taxFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTaxFilter('all')}
          >
            <Building size={16} />
            <span className="tab-title">All Customers</span>
            <span className="tab-count-badge all">{metrics.total_customers || 0}</span>
          </button>

          <button
            className={`classification-tab-btn gst ${taxFilter === 'gst' ? 'active' : ''}`}
            onClick={() => setTaxFilter('gst')}
          >
            <ShieldCheck size={16} />
            <span className="tab-title">GST Customers List</span>
            <span className="tab-count-badge gst">{metrics.gst_customers_count || 0}</span>
          </button>

          <button
            className={`classification-tab-btn non-gst ${taxFilter === 'non_gst' ? 'active' : ''}`}
            onClick={() => setTaxFilter('non_gst')}
          >
            <Users size={16} />
            <span className="tab-title">Non-GST Customers List</span>
            <span className="tab-count-badge non-gst">{metrics.non_gst_customers_count || 0}</span>
          </button>
        </div>

        <div className="classification-summary-pill">
          {taxFilter === 'all' && (
            <span>Directory: <strong>{customers.length}</strong> Accounts (GST &amp; Non-GST)</span>
          )}
          {taxFilter === 'gst' && (
            <span className="text-emerald-700">
              Filtered: <strong>{customers.length}</strong> Verified <strong>GST Registered</strong> B2B Accounts
            </span>
          )}
          {taxFilter === 'non_gst' && (
            <span className="text-amber-700">
              Filtered: <strong>{customers.length}</strong> <strong>Non-GST / URP</strong> Retail Accounts
            </span>
          )}
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="customer-metrics-grid">
        <div className="customer-metric-card">
          <div className="metric-icon-wrap blue">
            <Building size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Customers</span>
            <span className="metric-val">{metrics.total_customers} Accounts</span>
            <span className="metric-sub">Registered trade clients</span>
          </div>
        </div>

        <div className="customer-metric-card">
          <div className="metric-icon-wrap green">
            <ShieldCheck size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">GST Registered</span>
            <span className="metric-val text-emerald-700">{metrics.gst_customers_count || 0} B2B</span>
            <span className="metric-sub">Verified GSTIN Accounts</span>
          </div>
        </div>

        <div className="customer-metric-card">
          <div className="metric-icon-wrap amber">
            <Users size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Non-GST / Retail</span>
            <span className="metric-val text-amber-700">{metrics.non_gst_customers_count || 0} URP</span>
            <span className="metric-sub">Unregistered Person (URP)</span>
          </div>
        </div>

        <div className="customer-metric-card">
          <div className="metric-icon-wrap red">
            <DollarSign size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Outstanding Receivables</span>
            <span className="metric-val red-text">₹{Number(metrics.total_outstanding || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">Pending credit balances</span>
          </div>
        </div>

        <div className="customer-metric-card">
          <div className="metric-icon-wrap purple">
            <Tag size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Price Groups Mapped</span>
            <span className="metric-val purple-text">{metrics.price_groups_mapped} / {metrics.total_customers}</span>
            <span className="metric-sub">{metrics.unassigned_customers} on default catalogue rate</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="customer-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Code, Customer / Shop Name, Contact, Phone, Place, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="price-group-filter-strip">
          <span className="filter-tag-label">Rate Group:</span>
          <button
            className={`pill-btn ${selectedGroupFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedGroupFilter('all')}
          >
            All
          </button>
          {priceGroups.map(pg => (
            <button
              key={pg.price_group_id || pg.id}
              className={`pill-btn ${selectedGroupFilter === String(pg.price_group_id || pg.id) ? 'active' : ''}`}
              onClick={() => setSelectedGroupFilter(String(pg.price_group_id || pg.id))}
            >
              {pg.name}
            </button>
          ))}
          <button
            className={`pill-btn ${selectedGroupFilter === 'unassigned' ? 'active' : ''}`}
            onClick={() => setSelectedGroupFilter('unassigned')}
          >
            Default / Unassigned
          </button>
        </div>

        <div className="status-filter-select-wrap">
          <select 
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="filter-status-select"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="customer-table-card">
        <div className="table-responsive-wrapper">
          <table className="customers-data-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>Code</th>
                <th style={{ minWidth: '180px' }}>Customer / Store Name</th>
                <th style={{ minWidth: '175px' }}>Contact Details</th>
                <th style={{ minWidth: '175px' }}>Place & Route</th>
                <th style={{ width: '135px' }}>GST IN</th>
                <th style={{ width: '115px' }}>Credit Limit</th>
                <th style={{ width: '115px' }}>Outstanding</th>
                <th style={{ minWidth: '175px' }}>Assigned Price Group</th>
                <th style={{ width: '85px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '115px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="empty-table-cell">
                    Loading customer accounts from database...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-table-cell">
                    <div className="empty-state-box">
                      <Users size={38} className="empty-icon" />
                      <h4>No Customers Found</h4>
                      <p>No customer records match your filter criteria. Click "+ Add New Customer" to register an account.</p>
                      <button className="action-btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '12px' }}>
                        <Plus size={14} />
                        <span>Add First Customer</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const outBal = parseFloat(c.outstanding_balance || 0);
                  const isAssigned = Boolean(c.price_group_id);

                  return (
                    <tr key={c.customer_id || c.id}>
                      <td className="code-cell">
                        <span className="cust-code-badge">{c.customer_code || `#${c.customer_id || c.id}`}</span>
                      </td>
                      <td className="customer-name-cell">
                        <strong>{c.name}</strong>
                        {c.contact_person && (
                          <small className="contact-person-sub">
                            Prop: {c.contact_person}
                          </small>
                        )}
                      </td>
                      <td className="contact-cell">
                        <div className="contact-cell-inner">
                          {c.phone && (
                            <div className="contact-line">
                              <Phone size={12} />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="contact-line">
                              <Mail size={12} />
                              <span>{c.email}</span>
                            </div>
                          )}
                          {!c.phone && !c.email && <span className="text-muted">—</span>}
                        </div>
                      </td>
                      <td className="place-cell">
                        <div className="place-cell-inner">
                          <div className="place-line">
                            <MapPin size={12} />
                            <strong>{c.local_area || (c.place ? c.place.split(',')[0] : '—')}</strong>
                          </div>
                          {(c.district || c.state) && (
                            <small className="district-state-sub">
                              {[c.district, c.state].filter(Boolean).join(', ')}
                            </small>
                          )}
                          {c.route_area && (
                            <small className="route-sub">{c.route_area}</small>
                          )}
                          {!c.local_area && !c.place && !c.route_area && <span className="text-muted">—</span>}

                          {/* Customer GPS Location Tag */}
                          {c.latitude && c.longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`GPS: ${c.latitude}, ${c.longitude} (Click to open in Google Maps)`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px',
                                padding: '2px 6px',
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                width: 'fit-content'
                              }}
                            >
                              <Navigation size={10} />
                              <span>{parseFloat(c.latitude).toFixed(4)}, {parseFloat(c.longitude).toFixed(4)}</span>
                            </a>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '4px',
                                padding: '1px 5px',
                                background: '#f1f5f9',
                                color: '#94a3b8',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 500,
                                width: 'fit-content'
                              }}
                            >
                              No GPS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="gst-cell">
                        {c.gst_in && c.gst_in.trim() && !['URP', 'NON-GST'].includes(c.gst_in.trim().toUpperCase()) ? (
                          <span className="gst-badge-chip registered" title="GST Registered B2B Entity">
                            <CheckCircle2 size={11} className="gst-chip-icon" />
                            <span>{c.gst_in}</span>
                          </span>
                        ) : (
                          <span className="gst-badge-chip non-gst" title="Non-GST Unregistered Person (URP)">
                            Non-GST (URP)
                          </span>
                        )}
                      </td>
                      <td className="credit-cell">
                        <div className="credit-cell-inner">
                          <div className="credit-val">₹{Number(c.credit_limit || 0).toLocaleString('en-IN')}</div>
                          <small className="credit-days">{c.credit_days || 30} Days</small>
                        </div>
                      </td>
                      <td className="amount-cell">
                        <span className={`outstanding-tag ${outBal > 0 ? 'due' : 'settled'}`}>
                          ₹{Number(outBal).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="price-group-cell">
                        <div 
                          className={`price-group-pill ${isAssigned ? 'assigned' : 'default'}`}
                          title="Click to change Price Group"
                          onClick={(e) => handleOpenQuickMapModal(c, e)}
                        >
                          <Tag size={12} />
                          <span>{c.price_group_name || 'Default (MRP)'}</span>
                        </div>
                      </td>
                      <td className="status-cell">
                        <span className={`status-pill ${c.status === 'Active' ? 'in-stock' : 'out-stock'}`}>
                          {c.status || 'Active'}
                        </span>
                      </td>
                      <td className="customer-actions-cell">
                        <div className="customer-actions-inner">
                          {onIssueCreditNote && (
                            <button 
                              className="table-icon-action"
                              title="Issue Credit Note for this customer"
                              style={{ color: '#0284c7' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onIssueCreditNote(c.customer_id);
                              }}
                            >
                              <Receipt size={14} />
                            </button>
                          )}
                          <button 
                            className="table-icon-action map-group"
                            title="Map Selling Price Group"
                            onClick={(e) => handleOpenQuickMapModal(c, e)}
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                          <button 
                            className="table-icon-action edit"
                            title="Edit Customer"
                            onClick={(e) => handleOpenEditModal(c, e)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="table-icon-action delete"
                            title="Delete Customer"
                            onClick={(e) => handleDeleteCustomer(c.customer_id || c.id, c.name, e)}
                          >
                            <Trash2 size={14} />
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

      {/* Modal 1: Add or Edit Customer */}
      {showCustomerModal && (
        <div className="modal-backdrop" onClick={() => setShowCustomerModal(false)}>
          <div className="modal-dialog customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>{editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer Account'}</h3>
                {editingCustomer && (
                  <span className="cust-code-badge">{editingCustomer.customer_code}</span>
                )}
              </div>
              <button className="modal-close-btn" onClick={() => setShowCustomerModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="modal-form">
              <div className="modal-scrollable-body">
                {/* Customer Code & Name */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Customer / Store Name *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Sri Krishna Provision Stores"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Customer Code <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>(Auto-Generated)</span>
                    </label>
                    <input 
                      type="text"
                      readOnly
                      disabled
                      placeholder="CUST-001"
                      value={formData.customer_code}
                      style={{
                        backgroundColor: '#f1f5f9',
                        cursor: 'not-allowed',
                        color: '#334155',
                        fontWeight: '700',
                        letterSpacing: '0.5px'
                      }}
                      title="Customer code is automatically generated and cannot be edited"
                    />
                  </div>
                </div>

                {/* Contact Person & Phone */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Contact Person / Proprietor</label>
                    <input 
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. +91 98451 22340"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email"
                    placeholder="e.g. store@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                {/* GST Registration & Tax Classification Box */}
                <div className="gst-classification-box">
                  <div className="box-header-row">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <strong>Customer Tax Classification (GST vs. Non-GST)</strong>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group tax-type-group">
                      <label>GST Registration Status *</label>
                      <div className="tax-type-radios">
                        <label className={`tax-type-label ${taxType === 'GST' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="taxType" 
                            value="GST" 
                            checked={taxType === 'GST'} 
                            onChange={() => setTaxType('GST')}
                          />
                          <span>GST Registered (B2B)</span>
                        </label>
                        <label className={`tax-type-label ${taxType === 'NON_GST' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="taxType" 
                            value="NON_GST" 
                            checked={taxType === 'NON_GST'} 
                            onChange={() => {
                              setTaxType('NON_GST');
                              setFormData(prev => ({ ...prev, gst_in: '' }));
                            }}
                          />
                          <span>Non-GST / Retail (URP)</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        {taxType === 'GST' ? 'GST Identification Number (GSTIN) *' : 'GST Status'}
                      </label>
                      {taxType === 'GST' ? (
                        <input 
                          type="text"
                          required={taxType === 'GST'}
                          placeholder="e.g. 29AABCS1429B1Z8"
                          maxLength={15}
                          value={formData.gst_in}
                          onChange={(e) => setFormData({ ...formData, gst_in: e.target.value.toUpperCase() })}
                        />
                      ) : (
                        <div className="nongst-readonly-box">
                          <span>Unregistered Dealer / Retail Consumer (Non-GST / URP)</span>
                        </div>
                      )}
                      <small className="form-help-text">
                        {taxType === 'GST' 
                          ? '15-digit alphanumeric GSTIN code for B2B tax invoice' 
                          : 'Retail invoice will be generated without input tax credit'}
                      </small>
                    </div>
                  </div>
                </div>

                {/* Kerala Location Hierarchy: District -> Local Area */}
                <div className="location-hierarchy-box">
                  <div className="box-header-row">
                    <MapPin size={16} className="text-emerald-600" />
                    <strong>Location &amp; Beat Hierarchy (Kerala District &gt; Local Area)</strong>
                  </div>
                  <p className="box-desc">
                    Select a District in Kerala to display its commercial market areas, wholesale mandis, and retail beats.
                  </p>

                  {/* Row 1: District (Kerala) & Local Area */}
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>District in Kerala *</label>
                      <select 
                        value={formData.district}
                        required
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="location-select"
                      >
                        <option value="">-- Select District in Kerala --</option>
                        {getKeralaDistricts().map((dist) => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <div className="label-with-link-row">
                        <label>Local Area / Commercial Beat *</label>
                        {formData.district && (
                          <button 
                            type="button" 
                            className="inline-link-btn"
                            onClick={() => {
                              if (isCustomArea) {
                                setIsCustomArea(false);
                                const firstArea = getLocalAreasForKeralaDistrict(formData.district)[0] || '';
                                handleLocalAreaChange(firstArea);
                              } else {
                                setIsCustomArea(true);
                                handleCustomAreaInput('');
                              }
                            }}
                          >
                            {isCustomArea ? 'Select from predefined list' : '+ Custom Area'}
                          </button>
                        )}
                      </div>

                      {!isCustomArea ? (
                        <select 
                          value={formData.local_area}
                          required={!isCustomArea}
                          disabled={!formData.district}
                          onChange={(e) => handleLocalAreaChange(e.target.value)}
                          className="location-select"
                        >
                          <option value="">
                            {formData.district ? `-- Select Area in ${formData.district} --` : '-- Select District First --'}
                          </option>
                          {getLocalAreasForKeralaDistrict(formData.district).map((area) => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                          <option value="__custom__">+ Enter Custom / Other Area...</option>
                        </select>
                      ) : (
                        <input 
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. Broadway, Market Road, Town Square"
                          value={formData.local_area}
                          onChange={(e) => handleCustomAreaInput(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Row 2: Assigned Delivery Beat & Shop Address */}
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Assigned Delivery Route / Beat</label>
                      <input 
                        type="text"
                        placeholder="e.g. Broadway Beat (Ernakulam)"
                        value={formData.route_area}
                        onChange={(e) => setFormData({ ...formData, route_area: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Full Shop / Delivery Address</label>
                      <input 
                        type="text"
                        placeholder="e.g. Building 12, Market Canal Road, Near Metro"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* GPS Telemetry Coordinates */}
                  <div className="form-row-2" style={{ marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Navigation size={13} style={{ color: '#2563eb' }} />
                          <span>GPS Latitude</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleDetectBrowserLocation}
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <MapPin size={11} />
                          <span>Detect My GPS</span>
                        </button>
                      </div>
                      <input 
                        type="number"
                        step="0.0000001"
                        placeholder="e.g. 10.0276123"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        style={{ background: '#fff' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Navigation size={13} style={{ color: '#2563eb' }} />
                          <span>GPS Longitude</span>
                        </label>
                        {(formData.latitude || formData.longitude) && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, latitude: '', longitude: '' })}
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Clear GPS
                          </button>
                        )}
                      </div>
                      <input 
                        type="number"
                        step="0.0000001"
                        placeholder="e.g. 76.3016456"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        style={{ background: '#fff' }}
                      />
                    </div>
                  </div>

                  {/* Computed Location Preview */}
                  {(formData.local_area || formData.district) && (
                    <div className="location-summary-strip">
                      <MapPin size={13} className="text-emerald-600" />
                      <span>
                        Resolved Place: <strong>{composePlace(formData.local_area, formData.district)}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Selling Price Group Mapping */}
                <div className="price-group-assign-box">
                  <div className="box-header-row">
                    <Tag size={16} className="text-blue-500" />
                    <strong>Selling Price Group Tier Assignment</strong>
                  </div>
                  <p className="box-desc">
                    Map this customer to a specific Price Group (e.g. Customer Rate A, Customer Rate B, Wholesale Tier) to automatically apply negotiated product rates when orders are created.
                  </p>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Assigned Selling Price Group</label>
                      <select 
                        value={formData.price_group_id}
                        onChange={(e) => setFormData({ ...formData, price_group_id: e.target.value })}
                      >
                        <option value="">-- None / Default (Base Catalogue MRP) --</option>
                        {priceGroups.map((pg) => (
                          <option key={pg.price_group_id || pg.id} value={pg.price_group_id || pg.id}>
                            {pg.name} (#{pg.price_group_id || pg.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Account Status</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Credit Policy & Financials */}
                <div className="credit-policy-box">
                  <div className="box-header-row">
                    <CreditCard size={16} className="text-emerald-500" />
                    <strong>Credit Terms & Outstanding Ledger</strong>
                  </div>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label>Credit Limit (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={formData.credit_limit}
                        onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Credit Period (Days)</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="30"
                        value={formData.credit_days}
                        onChange={(e) => setFormData({ ...formData, credit_days: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Outstanding Balance (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={formData.outstanding_balance}
                        onChange={(e) => setFormData({ ...formData, outstanding_balance: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowCustomerModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={isSubmitting || !formData.name.trim() || !formData.phone.trim()}
                >
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Quick Map Selling Price Group */}
      {mappingCustomer && (
        <div className="modal-backdrop" onClick={() => setMappingCustomer(null)}>
          <div className="modal-dialog quick-map-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Map Selling Price Group</h3>
                <span className="cust-code-badge">{mappingCustomer.customer_code}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setMappingCustomer(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickMap} className="modal-form">
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '8px' }}>
                  Assign a price tier for <strong>{mappingCustomer.name}</strong> ({mappingCustomer.place || 'Trade Outlet'}):
                </p>
                <div className="form-group">
                  <label>Select Price Group</label>
                  <select 
                    value={quickPriceGroupId}
                    onChange={(e) => setQuickPriceGroupId(e.target.value)}
                    autoFocus
                  >
                    <option value="">-- Unassigned / Default Base MRP --</option>
                    {priceGroups.map((pg) => (
                      <option key={pg.price_group_id || pg.id} value={pg.price_group_id || pg.id}>
                        {pg.name} ({pg.description || 'Tier rate'})
                      </option>
                    ))}
                  </select>
                </div>
                <small className="form-hint-text">
                  All catalogue products configured under this group will automatically apply when billing this customer.
                </small>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setMappingCustomer(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Mapping...' : 'Save Group Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Bulk Import Customers from Excel / CSV */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal-dialog customer-modal" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Bulk Import Retail & Wholesale Customers</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Upload customer master contacts, GSTIN numbers, and credit policies from spreadsheet
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-scrollable-body" style={{ padding: '20px' }}>
              {/* Step 1: Download Template */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Step 1: Download Sample Excel Template</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Formatted with customer columns (Business Name, Contact Person, Phone, Email, GSTIN, District, Area, Credit Limit)
                  </p>
                </div>
                <button
                  type="button"
                  className="action-btn btn-outline"
                  onClick={handleDownloadCustomerTemplate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Download .xlsx Template</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div style={{ background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
                <UploadCloud size={32} color="#2563eb" style={{ margin: '0 auto 8px auto' }} />
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0f172a' }}>Choose Excel (.xlsx) or CSV File to Import</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>Drag and drop here or click to browse files</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleCustomerFileSelect}
                  style={{ display: 'none' }}
                  id="customer-import-file-input"
                />
                <label
                  htmlFor="customer-import-file-input"
                  className="action-btn btn-primary"
                  style={{ display: 'inline-flex', cursor: 'pointer' }}
                >
                  Select File from Computer
                </label>
              </div>

              {/* Step 3: Preview Parsed Rows */}
              {importedCustomerRows.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>
                    Parsed Preview ({importedCustomerRows.length} Customers Found)
                  </h4>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>#</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Customer / Business Name</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Phone</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>GSTIN</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>District & Area</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Credit Limit</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedCustomerRows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px' }}>{i + 1}</td>
                            <td style={{ padding: '6px 8px', fontWeight: '600' }}>{r.name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.phone}</td>
                            <td style={{ padding: '6px 8px' }}>
                              {r.gst_in ? (
                                <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                                  {r.gst_in}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Non-GST</span>
                              )}
                            </td>
                            <td style={{ padding: '6px 8px' }}>{r.district} {r.local_area && `(${r.local_area})`}</td>
                            <td style={{ padding: '6px 8px', fontWeight: '600' }}>₹{r.credit_limit}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                {r.status}
                              </span>
                            </td>
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
                onClick={() => { setShowImportModal(false); setImportedCustomerRows([]); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                disabled={importedCustomerRows.length === 0 || isImporting}
                onClick={handleExecuteCustomerImport}
                style={{ background: '#2563eb', color: '#ffffff' }}
              >
                {isImporting ? 'Importing Customers...' : `Import ${importedCustomerRows.length} Customers Now`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
