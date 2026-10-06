import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Calendar,
  CreditCard,
  Building2,
  Eye,
  DollarSign,
  TrendingUp,
  Clock
} from 'lucide-react';
import {
  fetchInvoicesApi,
  createInvoiceApi,
  updateInvoiceStatusApi,
  deleteInvoiceApi,
  fetchCustomersApi,
  fetchProductsApi,
  fetchSalesExecutivesApi,
  fetchCompanySettings
} from '../../services/api';
import { InvoiceTemplateSheet, formatInvoiceDateTime, formatInvoiceDateOnly } from '../../components/InvoiceTemplateSheet';
import './InvoiceManagement.css';

export const InvoiceManagement = ({ companySettings: initialCompanySettings }) => {
  const [activeCompanySettings, setActiveCompanySettings] = useState(initialCompanySettings || null);

  useEffect(() => {
    if (initialCompanySettings) {
      setActiveCompanySettings(initialCompanySettings);
    } else {
      fetchCompanySettings().then(res => {
        if (res) setActiveCompanySettings(res);
      }).catch(err => console.error('Failed to load company branding', err));
    }
  }, [initialCompanySettings]);
  const [invoices, setInvoices] = useState([]);
  const [metrics, setMetrics] = useState({
    total_invoices: 0,
    total_billed: 0,
    total_paid: 0,
    total_balance: 0,
    total_tax: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [invoiceTypeTab, setInvoiceTypeTab] = useState('All'); // 'All' | 'GST' | 'NON_GST'

  // Customer and Product dropdowns
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesmen, setSalesmen] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [toast, setToast] = useState(null);

  // New Invoice Form
  const [formData, setFormData] = useState({
    invoice_type: 'GST', // 'GST' or 'NON_GST'
    customer_id: '',
    customer_name: '',
    customer_gstin: '',
    customer_phone: '',
    customer_address: '',
    salesman_id: '',
    salesman_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    payment_mode: 'UPI',
    paid_amount: 0,
    discount_amount: 0,
    round_off: '',
    reference_no: '',
    notes: '',
    items: []
  });

  // Current line item in add modal
  const [currItem, setCurrItem] = useState({
    product_id: '',
    product_name: '',
    sku: '',
    hsn_code: '1905',
    package_type: 'Box',
    qty: 1,
    rate: 0,
    gst_rate: 18
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetchInvoicesApi({
        search: searchQuery,
        startDate,
        endDate,
        status: statusFilter,
        invoice_type: invoiceTypeTab !== 'All' ? invoiceTypeTab : undefined
      });
      if (res.success) {
        setInvoices(res.invoices);
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      showNotification('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [cList, pList, sList] = await Promise.all([
        fetchCustomersApi(),
        fetchProductsApi(),
        fetchSalesExecutivesApi()
      ]);
      setCustomers(cList || []);
      setProducts(pList || []);
      setSalesmen(sList || []);
    } catch (err) {
      console.warn('Failed to load dropdowns:', err);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [searchQuery, startDate, endDate, statusFilter, invoiceTypeTab]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  // Handle Customer Select
  const handleCustomerSelect = (custId) => {
    const cust = customers.find(c => String(c.customer_id) === String(custId));
    if (cust) {
      setFormData(prev => ({
        ...prev,
        customer_id: cust.customer_id,
        customer_name: cust.name,
        customer_gstin: cust.gst_in || '',
        customer_phone: cust.phone || '',
        customer_address: cust.place || cust.address || ''
      }));
    }
  };

  // Handle Product Select for Item
  const handleProductSelect = (prodId) => {
    const prod = products.find(p => String(p.product_id) === String(prodId));
    if (prod) {
      const isNonGst = formData.invoice_type === 'NON_GST';
      const defaultGst = prod.gst_rate?.includes('5%') ? 5 : prod.gst_rate?.includes('12%') ? 12 : prod.gst_rate?.includes('28%') ? 28 : 18;
      setCurrItem(prev => ({
        ...prev,
        product_id: prod.product_id,
        product_name: prod.name,
        sku: prod.sku || '',
        hsn_code: prod.hsn_code || (isNonGst ? '' : '1905'),
        rate: parseFloat(prod.selling_price) || 100,
        gst_rate: isNonGst ? 0 : defaultGst
      }));
    }
  };

  // Add Item to Form
  const handleAddItem = () => {
    if (!currItem.product_name || currItem.qty <= 0) {
      showNotification('Please choose a valid product and quantity', 'error');
      return;
    }

    const isNonGst = formData.invoice_type === 'NON_GST';
    const effectiveGst = isNonGst ? 0 : (parseFloat(currItem.gst_rate) || 0);
    const taxable = currItem.qty * currItem.rate;
    const taxAmt = isNonGst ? 0 : taxable * (effectiveGst / 100);
    const total = taxable + taxAmt;

    const newItem = {
      ...currItem,
      gst_rate: effectiveGst,
      taxable_amount: Math.round(taxable * 100) / 100,
      tax_amount: Math.round(taxAmt * 100) / 100,
      total: Math.round(total * 100) / 100
    };

    const newItems = [...formData.items, newItem];
    const newSubtotal = newItems.reduce((acc, itm) => acc + (itm.qty * itm.rate), 0);
    const newTax = isNonGst ? 0 : newItems.reduce((acc, itm) => acc + (itm.qty * itm.rate * ((parseFloat(itm.gst_rate) || 0) / 100)), 0);
    const exact = Math.max(0, newSubtotal + newTax - (parseFloat(formData.discount_amount) || 0));
    const grand = Math.round(exact);

    setFormData(prev => ({
      ...prev,
      items: newItems,
      paid_amount: grand
    }));

    // Reset currItem
    setCurrItem({
      product_id: '',
      product_name: '',
      sku: '',
      hsn_code: isNonGst ? '' : '1905',
      package_type: 'Box',
      qty: 1,
      rate: 0,
      gst_rate: isNonGst ? 0 : 18
    });
  };

  // Remove Item
  const handleRemoveItem = (index) => {
    const isNonGst = formData.invoice_type === 'NON_GST';
    const newItems = formData.items.filter((_, i) => i !== index);
    const newSubtotal = newItems.reduce((acc, itm) => acc + (itm.qty * itm.rate), 0);
    const newTax = isNonGst ? 0 : newItems.reduce((acc, itm) => acc + (itm.qty * itm.rate * ((parseFloat(itm.gst_rate) || 0) / 100)), 0);
    const exact = Math.max(0, newSubtotal + newTax - (parseFloat(formData.discount_amount) || 0));
    const grand = Math.round(exact);

    setFormData(prev => ({
      ...prev,
      items: newItems,
      paid_amount: grand
    }));
  };

  // Create Invoice Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name) {
      showNotification('Please select or specify customer name', 'error');
      return;
    }
    if (formData.items.length === 0) {
      showNotification('Please add at least one product item', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        round_off: modalRoundOff,
        grand_total: modalGrandTotal
      };
      const res = await createInvoiceApi(payload);
      if (res.success) {
        showNotification(`Invoice ${res.invoice.invoice_number} created successfully!`);
        setShowCreateModal(false);
        loadInvoices();
        setFormData({
          invoice_type: 'GST',
          customer_id: '',
          customer_name: '',
          customer_gstin: '',
          customer_phone: '',
          customer_address: '',
          salesman_id: '',
          salesman_name: '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          payment_mode: 'UPI',
          paid_amount: 0,
          discount_amount: 0,
          round_off: '',
          reference_no: '',
          notes: '',
          items: []
        });
      }
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Error creating invoice', 'error');
    }
  };

  // Mark invoice as paid
  const handleMarkAsPaid = async (inv) => {
    try {
      await updateInvoiceStatusApi(inv.invoice_id, {
        payment_status: 'Paid',
        paid_amount: inv.grand_total,
        payment_mode: inv.payment_mode || 'Cash'
      });
      showNotification(`Invoice ${inv.invoice_number} marked as Paid`);
      loadInvoices();
    } catch (err) {
      showNotification('Failed to update invoice status', 'error');
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (inv) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${inv.invoice_number}?`)) return;
    try {
      await deleteInvoiceApi(inv.invoice_id);
      showNotification(`Invoice ${inv.invoice_number} deleted`);
      loadInvoices();
    } catch (err) {
      showNotification('Failed to delete invoice', 'error');
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      const exportRows = invoices.map(i => ({
        'Invoice Number': i.invoice_number,
        'Date': formatInvoiceDateTime(i.invoice_date, i.created_at),
        'Due Date': formatInvoiceDateOnly(i.due_date || i.invoice_date),
        'Customer Name': i.customer_name,
        'Customer GSTIN': i.customer_gstin || 'Unregistered',
        'Customer Phone': i.customer_phone || '',
        'Salesman': i.salesman_name || 'Direct',
        'Taxable Amount (₹)': parseFloat(i.subtotal),
        'CGST (₹)': parseFloat(i.cgst_amount),
        'SGST (₹)': parseFloat(i.sgst_amount),
        'IGST (₹)': parseFloat(i.igst_amount),
        'Total Tax (₹)': parseFloat(i.total_tax),
        'Total Discount (₹)': parseFloat(i.discount_amount || 0),
        'Round Off (₹)': parseFloat(i.round_off || 0),
        'Grand Total (₹)': parseFloat(i.grand_total),
        'Paid Amount (₹)': parseFloat(i.paid_amount),
        'Balance Due (₹)': parseFloat(i.balance_due),
        'Payment Status': i.payment_status,
        'Payment Mode': i.payment_mode
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
      XLSX.writeFile(wb, `Invoices_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Invoices exported successfully in Excel (.xlsx)!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to export invoices', 'error');
    }
  };

  // Calculate modal live totals
  const isModalNonGst = formData.invoice_type === 'NON_GST';
  const modalSubtotal = formData.items.reduce((acc, itm) => acc + (itm.qty * itm.rate), 0);
  const modalTax = isModalNonGst ? 0 : formData.items.reduce((acc, itm) => acc + (itm.qty * itm.rate * ((parseFloat(itm.gst_rate) || 0) / 100)), 0);
  const modalExactTotal = Math.max(0, modalSubtotal + modalTax - (parseFloat(formData.discount_amount) || 0));
  const autoRoundOff = Math.round((Math.round(modalExactTotal) - modalExactTotal) * 100) / 100;
  const modalRoundOff = (formData.round_off !== '' && formData.round_off !== undefined)
    ? (Math.round((parseFloat(formData.round_off) || 0) * 100) / 100)
    : autoRoundOff;
  const modalGrandTotal = Math.max(0, Math.round((modalExactTotal + modalRoundOff) * 100) / 100);

  return (
    <div className="invoice-page-container">
      {/* Toast */}
      {toast && (
        <div className={`enterprise-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="invoice-page-header">
        <div className="invoice-header-title">
          <div className="invoice-header-icon">
            <FileText size={22} />
          </div>
          <div>
            <h1>Invoices &amp; Billing Management</h1>
            <p>Generate GST-compliant tax invoices &amp; Non-GST retail cash bills, track receipts and export sales registers</p>
          </div>
        </div>

        <div className="invoice-header-actions">
          <button className="inv-btn inv-btn-secondary" onClick={handleExportToExcel} title="Export to Excel (.xlsx)">
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>
          <button className="inv-btn inv-btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="invoice-kpi-grid">
        <div className="invoice-kpi-card blue">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Total Invoiced</span>
            <DollarSign size={18} color="#3b82f6" />
          </div>
          <div className="kpi-card-value">₹{(metrics.total_billed || 0).toLocaleString('en-IN')}</div>
          <div className="kpi-card-sub">{metrics.total_invoices || 0} Invoices generated</div>
        </div>

        <div className="invoice-kpi-card emerald">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Total Collections</span>
            <TrendingUp size={18} color="#10b981" />
          </div>
          <div className="kpi-card-value">₹{(metrics.total_paid || 0).toLocaleString('en-IN')}</div>
          <div className="kpi-card-sub">Received via Cash, UPI &amp; Cheque</div>
        </div>

        <div className="invoice-kpi-card amber">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Balance Receivable</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div className="kpi-card-value">₹{(metrics.total_balance || 0).toLocaleString('en-IN')}</div>
          <div className="kpi-card-sub">Pending customer recovery</div>
        </div>

        <div className="invoice-kpi-card purple">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Total GST Tax</span>
            <Building2 size={18} color="#8b5cf6" />
          </div>
          <div className="kpi-card-value">₹{(metrics.total_tax || 0).toLocaleString('en-IN')}</div>
          <div className="kpi-card-sub">CGST + SGST + IGST collected</div>
        </div>
      </div>

      {/* 2 Invoice Category Tabs: All, GST Tax Invoices, Non-GST Retail Bills */}
      <div className="invoice-category-tabs">
        <button
          className={`category-tab ${invoiceTypeTab === 'All' ? 'active' : ''}`}
          onClick={() => setInvoiceTypeTab('All')}
        >
          <span>All Invoices</span>
          <span className="tab-counter">{invoices.length}</span>
        </button>
        <button
          className={`category-tab ${invoiceTypeTab === 'GST' ? 'active' : ''}`}
          onClick={() => setInvoiceTypeTab('GST')}
        >
          <Building2 size={14} />
          <span>GST Invoices</span>
        </button>
        <button
          className={`category-tab ${invoiceTypeTab === 'NON_GST' ? 'active' : ''}`}
          onClick={() => setInvoiceTypeTab('NON_GST')}
        >
          <CreditCard size={14} />
          <span>Non-GST Estimates</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="invoice-filter-bar">
        <div className="filter-left-group">
          <div className="inv-search-input-wrap">
            <Search size={15} className="inv-search-icon" />
            <input
              type="text"
              className="inv-search-input"
              placeholder="Search by invoice #, customer, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="date-picker-group">
            <span>From:</span>
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>To:</span>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <select
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          {(startDate || endDate || searchQuery || statusFilter !== 'All' || invoiceTypeTab !== 'All') && (
            <button
              className="inv-btn inv-btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
                setStatusFilter('All');
                setInvoiceTypeTab('All');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="invoice-table-wrapper">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No invoices found matching criteria. Click <strong>"Create Invoice"</strong> to generate one.
          </div>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Type</th>
                <th>Date</th>
                <th>Customer &amp; GSTIN</th>
                <th>Salesman</th>
                <th>Taxable (₹)</th>
                <th>GST (₹)</th>
                <th>Discount (₹)</th>
                <th>Round Off (₹)</th>
                <th>Total (₹)</th>
                <th>Balance (₹)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.invoice_id}>
                  <td className="invoice-number-cell" onClick={() => setViewingInvoice(inv)}>
                    {inv.invoice_number}
                  </td>
                  <td>
                    <span className={`inv-type-pill ${inv.invoice_type === 'NON_GST' ? 'non-gst' : 'gst'}`}>
                      {inv.invoice_type === 'NON_GST' ? 'Non-GST' : 'GST Tax'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {formatInvoiceDateTime(inv.invoice_date, inv.created_at)}
                    </div>
                  </td>
                  <td>
                    <strong>{inv.customer_name}</strong>
                    {inv.invoice_type === 'NON_GST' ? (
                      <span className="gst-tag retail" title="Non-GST Retail Customer">Retail</span>
                    ) : inv.customer_gstin ? (
                      <span className="gst-tag b2b" title={`GSTIN: ${inv.customer_gstin}`}>B2B</span>
                    ) : (
                      <span className="gst-tag b2c">B2C</span>
                    )}
                  </td>
                  <td>{inv.salesman_name || 'Direct'}</td>
                  <td>₹{parseFloat(inv.subtotal).toLocaleString('en-IN')}</td>
                  <td>
                    {inv.invoice_type === 'NON_GST' ? (
                      <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>0% (Exempt)</span>
                    ) : (
                      `₹${parseFloat(inv.total_tax).toLocaleString('en-IN')}`
                    )}
                  </td>
                  <td style={{ color: parseFloat(inv.discount_amount) > 0 ? '#dc2626' : '#94a3b8', fontWeight: parseFloat(inv.discount_amount) > 0 ? '600' : 'normal' }}>
                    {parseFloat(inv.discount_amount) > 0 ? `-₹${parseFloat(inv.discount_amount).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ color: parseFloat(inv.round_off) !== 0 ? (parseFloat(inv.round_off) > 0 ? '#15803d' : '#dc2626') : '#94a3b8', fontSize: '12px', fontWeight: parseFloat(inv.round_off) !== 0 ? '600' : 'normal' }}>
                    {parseFloat(inv.round_off) > 0 
                      ? `+₹${parseFloat(inv.round_off).toFixed(2)}` 
                      : (parseFloat(inv.round_off) < 0 ? `-₹${Math.abs(parseFloat(inv.round_off)).toFixed(2)}` : '0.00')}
                  </td>
                  <td style={{ fontWeight: '700' }}>₹{parseFloat(inv.grand_total).toLocaleString('en-IN')}</td>
                  <td style={{ color: parseFloat(inv.balance_due) > 0 ? '#b91c1c' : '#15803d', fontWeight: '600' }}>
                    ₹{parseFloat(inv.balance_due).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={`status-pill ${inv.payment_status.toLowerCase()}`}>
                      {inv.payment_status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <button
                        className="print-invoice-btn"
                        title={inv.invoice_type === 'NON_GST' ? 'View & Print Estimate' : 'View & Print Invoice'}
                        onClick={() => setViewingInvoice(inv)}
                      >
                        <Printer size={13} />
                        <span>Print</span>
                      </button>
                      {inv.payment_status !== 'Paid' && (
                        <button
                          className="icon-action-btn"
                          title="Mark Full Settlement"
                          onClick={() => handleMarkAsPaid(inv)}
                        >
                          <CheckCircle2 size={15} color="#15803d" />
                        </button>
                      )}
                      <button
                        className="icon-action-btn delete"
                        title="Delete Invoice"
                        onClick={() => handleDeleteInvoice(inv)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <div className="modal-header">
              <h2>{formData.invoice_type === 'NON_GST' ? 'Create Non-GST Estimate' : 'Create New GST Invoice'}</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {/* 2-OPTIONS SELECTOR: GST Tax Invoice vs Non-GST Bill of Supply */}
                <div className="invoice-type-selector-card">
                  <div className="type-selector-label">
                    <span>Select Invoice Category / Scheme *</span>
                  </div>
                  <div className="type-radio-group">
                    <div
                      className={`type-radio-card ${formData.invoice_type === 'GST' ? 'selected' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          invoice_type: 'GST',
                          items: prev.items.map(it => {
                            const prod = products.find(p => p.product_id === it.product_id);
                            const r = prod?.gst_rate?.includes('5%') ? 5 : prod?.gst_rate?.includes('12%') ? 12 : prod?.gst_rate?.includes('28%') ? 28 : 18;
                            const taxable = it.qty * it.rate;
                            const tax = taxable * (r / 100);
                            return { ...it, gst_rate: r, tax_amount: Math.round(tax * 100) / 100, total: Math.round((taxable + tax) * 100) / 100 };
                          })
                        }));
                        setCurrItem(prev => ({ ...prev, gst_rate: 18 }));
                      }}
                    >
                      <div className="radio-head">
                        <div className="radio-circle">
                          {formData.invoice_type === 'GST' && <div className="radio-circle-inner" />}
                        </div>
                        <div>
                          <strong>Option 1: GST Invoice</strong>
                          <span className="type-badge-pill gst">Standard B2B / B2C</span>
                        </div>
                      </div>
                      <p className="radio-desc">Includes customer GSTIN, HSN codes, and automatic CGST + SGST or IGST tax breakdown.</p>
                    </div>

                    <div
                      className={`type-radio-card ${formData.invoice_type === 'NON_GST' ? 'selected' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          invoice_type: 'NON_GST',
                          items: prev.items.map(it => ({
                            ...it,
                            gst_rate: 0,
                            tax_amount: 0,
                            total: it.taxable_amount
                          }))
                        }));
                        setCurrItem(prev => ({ ...prev, gst_rate: 0 }));
                      }}
                    >
                      <div className="radio-head">
                        <div className="radio-circle">
                          {formData.invoice_type === 'NON_GST' && <div className="radio-circle-inner" />}
                        </div>
                        <div>
                          <strong>Option 2: Non-GST Estimate</strong>
                          <span className="type-badge-pill non-gst">0% Tax Exempt</span>
                        </div>
                      </div>
                      <p className="radio-desc">Estimate for retail consumers, exempt items, or counter cash sales (0% tax).</p>
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Select Customer *</label>
                    <select
                      className="form-select"
                      value={formData.customer_id}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">-- Choose Existing Customer --</option>
                      {customers.map(c => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.name} {c.gst_in ? `[GSTIN: ${c.gst_in}]` : '[Retail Consumer]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="Customer or Store Name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label>{formData.invoice_type === 'NON_GST' ? 'GSTIN (Optional / Non-GST)' : 'Customer GSTIN (Optional)'}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={formData.invoice_type === 'NON_GST' ? 'Not applicable for retail bills' : 'e.g. 32AABCS1429B1Z2'}
                      value={formData.customer_gstin}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_gstin: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 98470 12345"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Assigned Salesman</label>
                    <select
                      className="form-select"
                      value={formData.salesman_id}
                      onChange={(e) => {
                        const sm = salesmen.find(s => String(s.id) === String(e.target.value));
                        setFormData(prev => ({
                          ...prev,
                          salesman_id: e.target.value,
                          salesman_name: sm ? sm.name : ''
                        }));
                      }}
                    >
                      <option value="">Direct Sales (Office Counter)</option>
                      {salesmen.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.department || 'Field'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Invoice Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Mode</label>
                    <select
                      className="form-select"
                      value={formData.payment_mode}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit">Credit (30 Days)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {/* Line Items Section */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                      Invoice Line Items {formData.invoice_type === 'NON_GST' && <span style={{ color: '#d97706', fontSize: '12px', fontWeight: '600' }}>(0% Non-GST Rates)</span>}
                    </h3>
                  </div>

                  {/* Add Item Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Product</label>
                      <select
                        className="form-select"
                        style={{ fontSize: '12px', padding: '7px' }}
                        value={currItem.product_id}
                        onChange={(e) => handleProductSelect(e.target.value)}
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map(p => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.name} (₹{p.selling_price})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Pkg Type</label>
                      <select
                        className="form-select"
                        style={{ fontSize: '12px', padding: '7px' }}
                        value={currItem.package_type}
                        onChange={(e) => setCurrItem(prev => ({ ...prev, package_type: e.target.value }))}
                      >
                        <option value="Box">Box</option>
                        <option value="Carton">Carton</option>
                        <option value="Bag">Bag</option>
                        <option value="Loose">Loose</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        style={{ fontSize: '12px', padding: '7px' }}
                        value={currItem.qty}
                        onChange={(e) => setCurrItem(prev => ({ ...prev, qty: parseFloat(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: '12px', padding: '7px' }}
                        value={currItem.rate}
                        onChange={(e) => setCurrItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                        {formData.invoice_type === 'NON_GST' ? 'GST Rate (0%)' : 'GST %'}
                      </label>
                      {formData.invoice_type === 'NON_GST' ? (
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '12px', padding: '7px', background: '#f1f5f9', color: '#64748b' }}
                          value="0% (Non-GST)"
                          disabled
                        />
                      ) : (
                        <select
                          className="form-select"
                          style={{ fontSize: '12px', padding: '7px' }}
                          value={currItem.gst_rate}
                          onChange={(e) => setCurrItem(prev => ({ ...prev, gst_rate: parseFloat(e.target.value) || 0 }))}
                        >
                          <option value={0}>0% (Nil)</option>
                          <option value={5}>5% (Standard 1)</option>
                          <option value={12}>12% (Standard 2)</option>
                          <option value={18}>18% (Standard 3)</option>
                          <option value={28}>28% (Luxury)</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="inv-btn inv-btn-primary"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                        onClick={handleAddItem}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>

                  {/* Items List Table */}
                  {formData.items.length > 0 && (
                    <table className="invoice-items-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>HSN</th>
                          <th>Package</th>
                          <th>Qty</th>
                          <th>Rate (₹)</th>
                          <th>Taxable (₹)</th>
                          <th>{formData.invoice_type === 'NON_GST' ? 'Tax' : 'GST (₹)'}</th>
                          <th>Total (₹)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((itm, idx) => (
                          <tr key={idx}>
                            <td>{itm.product_name}</td>
                            <td>{itm.hsn_code || '-'}</td>
                            <td>{itm.package_type}</td>
                            <td>{itm.qty}</td>
                            <td>₹{itm.rate}</td>
                            <td>₹{itm.taxable_amount}</td>
                            <td>
                              {formData.invoice_type === 'NON_GST' ? (
                                <span style={{ color: '#94a3b8' }}>0% (Exempt)</span>
                              ) : (
                                `₹${itm.tax_amount} (${itm.gst_rate}%)`
                              )}
                            </td>
                            <td style={{ fontWeight: '600' }}>₹{itm.total}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="item-delete-btn"
                                onClick={() => handleRemoveItem(idx)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Summary Footer */}
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '320px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Subtotal:</span>
                        <span>₹{modalSubtotal.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>GST Tax:</span>
                        <span>
                          {formData.invoice_type === 'NON_GST' ? '₹0.00 (Non-GST)' : `₹${modalTax.toFixed(2)}`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', color: '#dc2626' }}>
                        <span style={{ fontWeight: '600' }}>Total Discount (₹):</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          style={{
                            width: '110px',
                            textAlign: 'right',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: '1px solid #f87171',
                            background: '#ffffff',
                            color: '#dc2626',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                          value={formData.discount_amount}
                          onChange={(e) => {
                            const disc = parseFloat(e.target.value) || 0;
                            const exact = Math.max(0, modalSubtotal + modalTax - disc);
                            const grand = Math.round(exact);
                            setFormData(prev => ({
                              ...prev,
                              discount_amount: e.target.value,
                              paid_amount: grand
                            }));
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12.5px', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Round Off (₹):</span>
                          {formData.round_off !== '' && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, round_off: '' }))}
                              style={{ border: 'none', background: '#e0f2fe', color: '#0284c7', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                              title="Reset to Auto Nearest ₹"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={autoRoundOff >= 0 ? `+${autoRoundOff.toFixed(2)}` : autoRoundOff.toFixed(2)}
                          style={{
                            width: '90px',
                            textAlign: 'right',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            color: modalRoundOff >= 0 ? '#15803d' : '#dc2626'
                          }}
                          value={formData.round_off}
                          onChange={(e) => setFormData(prev => ({ ...prev, round_off: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: '700', fontSize: '15px', color: formData.invoice_type === 'NON_GST' ? '#d97706' : '#1d4ed8' }}>
                        <span>Grand Total:</span>
                        <span>₹{modalGrandTotal.toFixed(2)}</span>
                      </div>
                      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                          Amount Paid Now (₹):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px' }}
                          value={formData.paid_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="inv-btn inv-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inv-btn inv-btn-primary"
                >
                  {formData.invoice_type === 'NON_GST' ? 'Generate Estimate' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL (Matches Web Settings Templates Exactly) */}
      {viewingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ maxWidth: '900px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header no-print">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                  {viewingInvoice.invoice_type === 'NON_GST'
                    ? `Estimate Preview - ${viewingInvoice.invoice_number}`
                    : `GST Invoice Preview - ${viewingInvoice.invoice_number}`}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Customer: <strong>{viewingInvoice.customer_name}</strong> {viewingInvoice.customer_gstin ? `(GSTIN: ${viewingInvoice.customer_gstin})` : '(Non-GST)'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="inv-btn inv-btn-primary"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setViewingInvoice(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ background: '#f8fafc', padding: '20px 16px', overflowY: 'auto', flex: 1 }}>
              <InvoiceTemplateSheet
                invoice={viewingInvoice}
                companySettings={activeCompanySettings}
                invoiceSettings={activeCompanySettings?.invoice_settings}
                activeTemplate={
                  viewingInvoice.invoice_type === 'GST' ||
                  Boolean(viewingInvoice.customer_gstin && !['URP', 'NON-GST', 'NIL', 'NONE'].includes(String(viewingInvoice.customer_gstin).trim().toUpperCase()))
                    ? 'gst'
                    : 'normal'
                }
                showFormatBar={false}
                id="printable-invoice"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
