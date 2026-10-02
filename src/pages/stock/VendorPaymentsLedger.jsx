import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Building2, 
  DollarSign, 
  Download, 
  Calendar, 
  Clock, 
  ArrowUpRight,
  Receipt,
  FileText,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchVendorsApi, 
  fetchVendorMetricsApi, 
  fetchVendorPaymentsApi, 
  createVendorPaymentApi, 
  deleteVendorPaymentApi 
} from '../../services/api';
import './VendorPaymentsLedger.css';

export const VendorPaymentsLedger = ({ user, onGoToVendors }) => {
  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('payables'); // 'payables' | 'transactions'
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('All');

  // Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [preselectedVendor, setPreselectedVendor] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State
  const [payForm, setPayForm] = useState({
    vendor_id: '',
    vendor_name: '',
    invoice_no: '',
    amount_paid: '',
    payment_mode: 'Bank Transfer',
    reference_no: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [vList, payList] = await Promise.all([
        fetchVendorsApi(searchQuery),
        fetchVendorPaymentsApi(selectedVendorFilter)
      ]);
      setVendors(vList || []);
      setPayments(payList || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load vendor ledger data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedVendorFilter]);

  const openPaymentModal = (vendor = null) => {
    if (vendor) {
      setPreselectedVendor(vendor);
      setPayForm({
        vendor_id: vendor.vendor_id || vendor.id,
        vendor_name: vendor.supplier_company,
        invoice_no: '',
        amount_paid: vendor.outstanding > 0 ? vendor.outstanding : '',
        payment_mode: 'Bank Transfer',
        reference_no: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Balance clearance payment for ${vendor.supplier_company}`
      });
    } else {
      setPreselectedVendor(null);
      setPayForm({
        vendor_id: '',
        vendor_name: '',
        invoice_no: '',
        amount_paid: '',
        payment_mode: 'Bank Transfer',
        reference_no: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payForm.vendor_id) {
      showNotification('Please select a vendor', 'error');
      return;
    }
    if (!payForm.amount_paid || parseFloat(payForm.amount_paid) <= 0) {
      showNotification('Please enter a valid payment amount', 'error');
      return;
    }

    try {
      await createVendorPaymentApi(payForm);
      showNotification(`Payment of ₹${parseFloat(payForm.amount_paid).toLocaleString('en-IN')} recorded successfully!`);
      setShowPayModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to record payment', 'error');
    }
  };

  const handleDeletePayment = async (id, payNum) => {
    if (!window.confirm(`Delete payment #${payNum}? The amount will be restored to the vendor outstanding balance.`)) return;
    try {
      await deleteVendorPaymentApi(id);
      showNotification(`Payment #${payNum} deleted and ledger reverted`);
      loadData();
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete payment', 'error');
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'payables') {
      const rows = vendors.map(v => ({
        'Vendor Code': v.code || '',
        'Supplier Company': v.supplier_company,
        'Contact Person': v.contact_person || '',
        'Phone': v.phone || '',
        'GSTIN': v.gst_in || '',
        'Total Purchase (₹)': parseFloat(v.total_purchase || 0),
        'Advance Paid (₹)': parseFloat(v.advance_paid || 0),
        'Balance Outstanding (₹)': parseFloat(v.outstanding || 0),
        'Status': v.status || 'Active'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendor_Payables');
      XLSX.writeFile(wb, `Vendor_Payables_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const rows = payments.map(p => ({
        'Payment #': p.payment_number,
        'Vendor': p.vendor_name,
        'Invoice #': p.invoice_no || '',
        'Amount Paid (₹)': parseFloat(p.amount_paid || 0),
        'Payment Mode': p.payment_mode,
        'Reference #': p.reference_no || '',
        'Date': p.payment_date,
        'Status': p.status,
        'Notes': p.notes || ''
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payment_Transactions');
      XLSX.writeFile(wb, `Vendor_Payment_History_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    showNotification('Exported to Excel (.xlsx)');
  };

  // Aggregated metrics
  const totalPurchaseSum = vendors.reduce((acc, v) => acc + (parseFloat(v.total_purchase) || 0), 0);
  const totalPaidSum = vendors.reduce((acc, v) => acc + (parseFloat(v.advance_paid) || 0), 0);
  const totalOutstandingSum = vendors.reduce((acc, v) => acc + (parseFloat(v.outstanding) || 0), 0);

  return (
    <div className="vpl-container">
      {/* Toast */}
      {toast && (
        <div className={`vpl-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="vpl-header">
        <div className="vpl-header-left">
          <div className="vpl-header-icon-wrap">
            <CreditCard size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="vpl-title">Balance to Pay Vendor</h1>
            <p className="vpl-subtitle">
              Vendor procurement ledger, outstanding accounts payable, settlement recording, and disbursement audit.
            </p>
          </div>
        </div>

        <div className="vpl-header-actions">
          <button className="vpl-btn-secondary" onClick={handleExportExcel}>
            <Download size={16} />
            <span>Export Excel</span>
          </button>
          <button className="vpl-btn-primary" onClick={() => openPaymentModal()}>
            <Plus size={16} />
            <span>Record Vendor Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="vpl-kpi-grid">
        <div className="vpl-kpi-card">
          <div className="kpi-icon-box bg-blue-subtle">
            <Receipt size={20} className="text-blue" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Purchases</span>
            <h3 className="kpi-value">₹{totalPurchaseSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
            <span className="kpi-sub">Cumulative vendor bills</span>
          </div>
        </div>

        <div className="vpl-kpi-card">
          <div className="kpi-icon-box bg-emerald-subtle">
            <CheckCircle2 size={20} className="text-emerald" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Amount Paid</span>
            <h3 className="kpi-value text-emerald">₹{totalPaidSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
            <span className="kpi-sub">Settled disbursements</span>
          </div>
        </div>

        <div className="vpl-kpi-card border-red-highlight">
          <div className="kpi-icon-box bg-rose-subtle">
            <Clock size={20} className="text-rose" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label text-rose">Balance to Pay Vendors</span>
            <h3 className="kpi-value text-rose">₹{totalOutstandingSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
            <span className="kpi-sub font-semibold text-rose-muted">Pending Accounts Payable</span>
          </div>
        </div>

        <div className="vpl-kpi-card">
          <div className="kpi-icon-box bg-purple-subtle">
            <Building2 size={20} className="text-purple" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active Suppliers</span>
            <h3 className="kpi-value">{vendors.length}</h3>
            <span className="kpi-sub">Registered trade vendors</span>
          </div>
        </div>
      </div>

      {/* View Tabs & Search Bar */}
      <div className="vpl-controls-card">
        <div className="vpl-tabs-nav">
          <button 
            className={`vpl-tab-btn ${activeTab === 'payables' ? 'active' : ''}`}
            onClick={() => setActiveTab('payables')}
          >
            <span>Vendor Outstanding Balances ({vendors.length})</span>
          </button>
          <button 
            className={`vpl-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span>Disbursement History ({payments.length})</span>
          </button>
        </div>

        <div className="vpl-search-box">
          <Search size={16} className="text-muted" />
          <input 
            type="text"
            placeholder={activeTab === 'payables' ? "Search vendor name, code, GSTIN..." : "Search payment #, vendor, reference..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="vpl-table-container">
        {activeTab === 'payables' ? (
          <table className="vpl-table">
            <thead>
              <tr>
                <th>Vendor / Supplier</th>
                <th>Contact</th>
                <th>GSTIN</th>
                <th className="text-right">Total Purchase (₹)</th>
                <th className="text-right">Total Paid (₹)</th>
                <th className="text-right">Balance to Pay (₹)</th>
                <th className="text-center">Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <div className="vpl-spinner"></div>
                    <p className="text-muted mt-2">Loading vendor balances...</p>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10">
                    <p className="font-semibold text-gray-700">No vendors found</p>
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const outBal = parseFloat(v.outstanding || 0);
                  const isDue = outBal > 0;
                  return (
                    <tr key={v.vendor_id || v.id}>
                      <td>
                        <div className="vendor-info-cell">
                          <strong>{v.supplier_company}</strong>
                          <span className="text-muted text-xs">{v.place} • {v.code || 'V-ID'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <span>{v.contact_person || '-'}</span>
                          <span className="text-muted text-xs">{v.phone}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-muted text-xs">{v.gst_in || '-'}</span>
                      </td>
                      <td className="text-right font-semibold">
                        ₹{parseFloat(v.total_purchase || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-semibold text-emerald">
                        ₹{parseFloat(v.advance_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right">
                        <span className={`out-balance-badge ${isDue ? 'balance-due' : 'balance-cleared'}`}>
                          ₹{outBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`status-pill status-${(v.status || 'Active').toLowerCase()}`}>
                          {v.status || 'Active'}
                        </span>
                      </td>
                      <td className="text-center">
                        <button 
                          className="pay-now-btn"
                          title="Record Payment to this Vendor"
                          onClick={() => openPaymentModal(v)}
                        >
                          <CreditCard size={13} />
                          <span>Pay Now</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="vpl-table">
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Vendor / Supplier</th>
                <th>Invoice #</th>
                <th className="text-right">Amount Paid</th>
                <th>Mode</th>
                <th>Reference #</th>
                <th>Payment Date</th>
                <th className="text-center">Status</th>
                <th>Notes</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-8">
                    <div className="vpl-spinner"></div>
                    <p className="text-muted mt-2">Loading transactions...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10">
                    <Receipt size={40} className="text-muted mb-2 mx-auto" />
                    <p className="font-semibold text-gray-700">No payment transactions found</p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.v_payment_id || p.id}>
                    <td>
                      <span className="pay-number-tag">{p.payment_number}</span>
                    </td>
                    <td>
                      <strong>{p.vendor_name}</strong>
                    </td>
                    <td>
                      <span className="font-mono text-xs">{p.invoice_no || '-'}</span>
                    </td>
                    <td className="text-right font-bold text-emerald">
                      ₹{parseFloat(p.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="mode-pill">{p.payment_mode}</span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-muted">{p.reference_no || '-'}</span>
                    </td>
                    <td>
                      <span className="date-badge">
                        <Calendar size={13} className="text-muted mr-1" />
                        {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="status-tag status-received">{p.status || 'Completed'}</span>
                    </td>
                    <td>
                      <span className="notes-preview text-muted" title={p.notes || ''}>
                        {p.notes || '-'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button 
                        className="del-pay-btn"
                        title="Delete and revert balance"
                        onClick={() => handleDeletePayment(p.v_payment_id || p.id, p.payment_number)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="vpl-modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="vpl-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="vpl-modal-header">
              <div className="modal-title-wrap">
                <CreditCard size={20} className="text-primary" />
                <h3>Record Payment to Vendor</h3>
              </div>
              <button className="vpl-close-btn" onClick={() => setShowPayModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="vpl-form">
              <div className="vpl-form-grid">
                <div className="form-group">
                  <label>Select Vendor / Supplier *</label>
                  <select
                    required
                    value={payForm.vendor_id}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const ven = vendors.find(v => String(v.vendor_id || v.id) === String(vId));
                      setPayForm({
                        ...payForm,
                        vendor_id: vId,
                        vendor_name: ven ? ven.supplier_company : '',
                        amount_paid: ven && ven.outstanding > 0 ? ven.outstanding : payForm.amount_paid
                      });
                    }}
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_id || v.id} value={v.vendor_id || v.id}>
                        {v.supplier_company} (Balance Due: ₹{parseFloat(v.outstanding || 0).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount to Pay (₹) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="Enter payment amount"
                    value={payForm.amount_paid}
                    onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Payment Mode *</label>
                  <select
                    value={payForm.payment_mode}
                    onChange={(e) => setPayForm({ ...payForm, payment_mode: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Date *</label>
                  <input 
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Invoice # / Bill Reference</label>
                  <input 
                    type="text"
                    placeholder="e.g., INV-90823"
                    value={payForm.invoice_no}
                    onChange={(e) => setPayForm({ ...payForm, invoice_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>UTR / Cheque / Transaction Ref #</label>
                  <input 
                    type="text"
                    placeholder="e.g., UTR-20260904-893"
                    value={payForm.reference_no}
                    onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Remarks / Notes</label>
                <textarea 
                  rows="2"
                  placeholder="e.g., Paid towards raw materials purchase invoice clearance..."
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                />
              </div>

              <div className="vpl-modal-footer">
                <button type="button" className="vpl-btn-secondary" onClick={() => setShowPayModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="vpl-btn-primary">
                  <CheckCircle2 size={16} />
                  <span>Submit Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
