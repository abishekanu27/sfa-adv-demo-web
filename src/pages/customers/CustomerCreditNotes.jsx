import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  TrendingDown,
  User,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { fetchCreditNotesApi, createCreditNoteApi, deleteCreditNoteApi, fetchCustomersApi, fetchInvoicesApi, fetchCompanySettings } from '../../services/api';
import { InvoiceTemplateSheet } from '../../components/InvoiceTemplateSheet';
import './CustomerCreditNotes.css';

export const CustomerCreditNotes = ({ companySettings: initialCompanySettings, preselectedCustomerId = null }) => {
  const [creditNotes, setCreditNotes] = useState([]);
  const [metrics, setMetrics] = useState({
    total_credit_notes: 0,
    total_credit_amount: 0,
    total_tax_reversed: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdowns
  const [customers, setCustomers] = useState([]);
  const [companySettings, setCompanySettings] = useState(initialCompanySettings || null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(Boolean(preselectedCustomerId));
  const [viewingCreditNote, setViewingCreditNote] = useState(null);
  const [toast, setToast] = useState(null);

  // Create Form State
  const [formData, setFormData] = useState({
    customer_id: preselectedCustomerId || '',
    customer_name: '',
    customer_code: '',
    customer_phone: '',
    customer_gstin: '',
    invoice_number: '',
    credit_note_date: new Date().toISOString().split('T')[0],
    reason: 'Sales Return',
    amount: '',
    is_gst_applicable: true,
    gst_rate: 18,
    notes: '',
    adjust_customer_balance: true
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cnRes, custRes, compRes] = await Promise.all([
        fetchCreditNotesApi({
          search: searchQuery,
          status: statusFilter,
          startDate,
          endDate
        }),
        fetchCustomersApi(),
        initialCompanySettings ? Promise.resolve(initialCompanySettings) : fetchCompanySettings()
      ]);

      if (cnRes.success) {
        setCreditNotes(cnRes.creditNotes || []);
        if (cnRes.metrics) setMetrics(cnRes.metrics);
      }
      if (Array.isArray(custRes)) setCustomers(custRes);
      if (compRes) setCompanySettings(compRes);
    } catch (err) {
      console.error('Error loading credit notes:', err);
      showNotification('Failed to load credit notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter, startDate, endDate]);

  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      const match = customers.find(c => String(c.customer_id) === String(preselectedCustomerId));
      if (match) {
        handleCustomerSelect(match.customer_id);
      }
    }
  }, [preselectedCustomerId, customers]);

  const handleCustomerSelect = (custId) => {
    const selected = customers.find(c => String(c.customer_id) === String(custId));
    if (selected) {
      const hasGst = Boolean(selected.gst_in && !['URP', 'NON-GST', 'NIL', 'NONE'].includes(selected.gst_in.trim().toUpperCase()));
      setFormData(prev => ({
        ...prev,
        customer_id: selected.customer_id,
        customer_name: selected.name,
        customer_code: selected.customer_code || '',
        customer_phone: selected.phone || '',
        customer_gstin: selected.gst_in || '',
        is_gst_applicable: hasGst
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customer_id: '',
        customer_name: '',
        customer_code: '',
        customer_phone: '',
        customer_gstin: ''
      }));
    }
  };

  // Compute live tax breakdown from total credit amount
  const grossAmount = parseFloat(formData.amount) || 0;
  const effectiveGstRate = formData.is_gst_applicable ? (parseFloat(formData.gst_rate) || 18) : 0;
  const taxableValue = effectiveGstRate > 0 ? Math.round((grossAmount / (1 + effectiveGstRate / 100)) * 100) / 100 : grossAmount;
  const totalTaxAmt = Math.round((grossAmount - taxableValue) * 100) / 100;
  const cgstAmt = Math.round((totalTaxAmt / 2) * 100) / 100;
  const sgstAmt = Math.round((totalTaxAmt - cgstAmt) * 100) / 100;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name || grossAmount <= 0) {
      showNotification('Please select a customer and specify a valid credit amount', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: grossAmount,
        taxable_amount: taxableValue,
        cgst_amount: cgstAmt,
        sgst_amount: sgstAmt,
        total_tax: totalTaxAmt
      };

      const res = await createCreditNoteApi(payload);
      if (res.success) {
        showNotification(res.message || 'Credit note created successfully!');
        setShowCreateModal(false);
        setFormData({
          customer_id: '',
          customer_name: '',
          customer_code: '',
          customer_phone: '',
          customer_gstin: '',
          invoice_number: '',
          credit_note_date: new Date().toISOString().split('T')[0],
          reason: 'Sales Return',
          amount: '',
          is_gst_applicable: true,
          gst_rate: 18,
          notes: '',
          adjust_customer_balance: true
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Error creating credit note', 'error');
    }
  };

  const handleDelete = async (cn) => {
    if (!window.confirm(`Are you sure you want to delete credit note ${cn.credit_note_number}?`)) return;
    try {
      await deleteCreditNoteApi(cn.credit_note_id);
      showNotification(`Credit note ${cn.credit_note_number} deleted successfully`);
      loadData();
    } catch (err) {
      showNotification('Failed to delete credit note', 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      const rows = creditNotes.map(cn => ({
        'Credit Note #': cn.credit_note_number,
        'Date': cn.credit_note_date,
        'Customer Name': cn.customer_name,
        'Customer Code': cn.customer_code || '—',
        'Customer Phone': cn.customer_phone || '—',
        'Customer GSTIN': cn.customer_gstin || '—',
        'Reason': cn.reason,
        'Invoice Reference': cn.invoice_number || '—',
        'Taxable Value (₹)': parseFloat(cn.taxable_amount),
        'CGST (₹)': parseFloat(cn.cgst_amount),
        'SGST (₹)': parseFloat(cn.sgst_amount),
        'Total Tax (₹)': parseFloat(cn.total_tax),
        'Total Credit (₹)': parseFloat(cn.amount),
        'Status': cn.status,
        'Notes': cn.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Credit_Notes');
      XLSX.writeFile(wb, `Credit_Notes_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Exported credit notes to Excel!');
    } catch (err) {
      showNotification('Failed to export to Excel', 'error');
    }
  };

  return (
    <div className="credit-notes-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`cn-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="cn-header-card no-print">
        <div className="cn-header-left">
          <div className="cn-header-icon-badge">
            <Receipt size={24} color="#0284c7" />
          </div>
          <div>
            <div className="cn-title-row">
              <h1>Customer Credit Notes</h1>
              <span className="cn-badge">Sales Returns & Adjustments</span>
            </div>
            <p className="cn-subtitle">
              Issue formal GST credit notes for sales returns, damage compensations, and invoice price adjustments.
            </p>
          </div>
        </div>

        <div className="cn-header-actions">
          <button 
            type="button" 
            className="cn-btn cn-btn-secondary" 
            onClick={handleExportExcel}
            title="Export list to Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>
          <button 
            type="button" 
            className="cn-btn cn-btn-primary" 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Issue Credit Note</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="cn-metrics-grid no-print">
        <div className="cn-metric-card">
          <div className="cn-metric-top">
            <span>Total Credit Notes</span>
            <div className="cn-metric-icon bg-blue"><Receipt size={17} color="#0284c7" /></div>
          </div>
          <div className="cn-metric-val">{metrics.total_credit_notes}</div>
          <small className="cn-metric-sub">Issued to customer accounts</small>
        </div>

        <div className="cn-metric-card border-amber">
          <div className="cn-metric-top">
            <span>Total Credited Value</span>
            <div className="cn-metric-icon bg-amber"><DollarSign size={17} color="#d97706" /></div>
          </div>
          <div className="cn-metric-val text-amber">₹{metrics.total_credit_amount.toLocaleString('en-IN')}</div>
          <small className="cn-metric-sub">Deducted from receivables</small>
        </div>

        <div className="cn-metric-card border-purple">
          <div className="cn-metric-top">
            <span>Tax Credit Reversed</span>
            <div className="cn-metric-icon bg-purple"><TrendingDown size={17} color="#9333ea" /></div>
          </div>
          <div className="cn-metric-val text-purple">₹{metrics.total_tax_reversed.toLocaleString('en-IN')}</div>
          <small className="cn-metric-sub">GST tax adjusted / credit</small>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="cn-filter-card no-print">
        <div className="cn-search-wrap">
          <Search size={16} className="cn-search-icon" />
          <input
            type="text"
            placeholder="Search by CN number, customer name, code, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="cn-search-input"
          />
        </div>

        <div className="cn-filters-right">
          <div className="cn-date-inputs">
            <Calendar size={15} color="#64748b" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="cn-select"
          >
            <option value="All">All Statuses</option>
            <option value="Issued">Issued</option>
            <option value="Adjusted">Adjusted</option>
          </select>

          {(searchQuery || startDate || endDate || statusFilter !== 'All') && (
            <button
              type="button"
              className="cn-btn-reset"
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
                setStatusFilter('All');
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Credit Notes Table */}
      <div className="cn-table-wrapper">
        {loading ? (
          <div className="cn-loading-state">Loading credit notes...</div>
        ) : creditNotes.length === 0 ? (
          <div className="cn-empty-state">
            <Receipt size={40} color="#94a3b8" />
            <h3>No Credit Notes Found</h3>
            <p>Issue a credit note for customer returns, billing differences, or damaged products.</p>
            <button
              type="button"
              className="cn-btn cn-btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ marginTop: '12px' }}
            >
              <Plus size={15} />
              <span>Issue First Credit Note</span>
            </button>
          </div>
        ) : (
          <table className="cn-data-table">
            <thead>
              <tr>
                <th>Credit Note #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Reason</th>
                <th>Invoice Ref</th>
                <th style={{ textAlign: 'right' }}>Taxable (₹)</th>
                <th style={{ textAlign: 'right' }}>GST (₹)</th>
                <th style={{ textAlign: 'right' }}>Credit Total (₹)</th>
                <th>Status</th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.map(cn => (
                <tr key={cn.credit_note_id}>
                  <td className="cn-num-cell" onClick={() => setViewingCreditNote(cn)}>
                    <strong>{cn.credit_note_number}</strong>
                  </td>
                  <td>{cn.credit_note_date}</td>
                  <td>
                    <strong>{cn.customer_name}</strong>
                    {cn.customer_code && <small className="cn-code-tag">({cn.customer_code})</small>}
                    {cn.customer_gstin ? (
                      <span className="cn-gst-badge">GST: {cn.customer_gstin}</span>
                    ) : (
                      <span className="cn-non-gst-badge">Non-GST</span>
                    )}
                  </td>
                  <td>
                    <span className="cn-reason-tag">{cn.reason}</span>
                  </td>
                  <td>{cn.invoice_number || '—'}</td>
                  <td style={{ textAlign: 'right' }}>₹{parseFloat(cn.taxable_amount || 0).toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right' }}>₹{parseFloat(cn.total_tax || 0).toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                    ₹{parseFloat(cn.amount).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={`cn-status-pill ${String(cn.status).toLowerCase()}`}>
                      {cn.status}
                    </span>
                  </td>
                  <td className="no-print">
                    <div className="cn-actions-cell">
                      <button
                        type="button"
                        className="cn-icon-btn"
                        title="View & Print Credit Note"
                        onClick={() => setViewingCreditNote(cn)}
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        type="button"
                        className="cn-icon-btn delete"
                        title="Delete Credit Note"
                        onClick={() => handleDelete(cn)}
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

      {/* CREATE CREDIT NOTE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content-card cn-modal-card">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <Receipt size={20} color="#0284c7" />
                <h2>Issue Customer Credit Note</h2>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body cn-modal-body">
                {/* Customer Picker */}
                <div className="cn-form-grid">
                  <div className="cn-form-group">
                    <label>Select Customer Account *</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      required
                      className="cn-input"
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.name} {c.customer_code ? `(${c.customer_code})` : ''} - Due: ₹{Number(c.outstanding_balance || 0).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cn-form-group">
                    <label>Credit Note Date *</label>
                    <input
                      type="date"
                      value={formData.credit_note_date}
                      onChange={(e) => setFormData({ ...formData, credit_note_date: e.target.value })}
                      required
                      className="cn-input"
                    />
                  </div>

                  <div className="cn-form-group">
                    <label>Reason for Credit Note *</label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="cn-input"
                    >
                      <option value="Sales Return">Sales Return (Goods Returned by Retailer)</option>
                      <option value="Damaged / Leaked Goods">Damaged / Transit Breakage / Leaked Goods</option>
                      <option value="Billing / Rate Difference">Billing Rate / Price Difference Correction</option>
                      <option value="Post-Sale Scheme / Rebate">Post-Sale Scheme / Trade Discount Rebate</option>
                      <option value="Short Supply">Short Supply / Missing Items in Delivery</option>
                      <option value="Goodwill / Settlement">Goodwill / Final Settlement Credit</option>
                    </select>
                  </div>

                  <div className="cn-form-group">
                    <label>Linked Tax Invoice # (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-0005"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      className="cn-input"
                    />
                  </div>

                  <div className="cn-form-group full-width">
                    <label>Total Credit Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      className="cn-input cn-amount-input"
                    />
                  </div>
                </div>

                {/* Tax & GST Adjustment Strip */}
                <div className="cn-tax-strip">
                  <div className="cn-tax-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.is_gst_applicable}
                        onChange={(e) => setFormData({ ...formData, is_gst_applicable: e.target.checked })}
                      />
                      <span>Calculate &amp; Reverse GST on this Credit</span>
                    </label>
                  </div>

                  {formData.is_gst_applicable && (
                    <div className="cn-tax-calc-box">
                      <div className="calc-row">
                        <span>Base Taxable Amount:</span>
                        <strong>₹{taxableValue.toFixed(2)}</strong>
                      </div>
                      <div className="calc-row">
                        <span>CGST ({formData.gst_rate / 2}%):</span>
                        <strong>₹{cgstAmt.toFixed(2)}</strong>
                      </div>
                      <div className="calc-row">
                        <span>SGST ({formData.gst_rate / 2}%):</span>
                        <strong>₹{sgstAmt.toFixed(2)}</strong>
                      </div>
                      <div className="calc-row grand">
                        <span>Total Credit Note Value:</span>
                        <strong>₹{grossAmount.toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Balance Reduction Checkbox */}
                <div className="cn-checkbox-card">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.adjust_customer_balance}
                      onChange={(e) => setFormData({ ...formData, adjust_customer_balance: e.target.checked })}
                    />
                    <div>
                      <strong>Automatically adjust customer outstanding balance</strong>
                      <p>Deducts ₹{grossAmount.toFixed(2)} directly from customer's live pending ledger balance in real time.</p>
                    </div>
                  </label>
                </div>

                {/* Notes */}
                <div className="cn-form-group full-width" style={{ marginTop: '12px' }}>
                  <label>Auditor Notes / Reason Explanation</label>
                  <textarea
                    rows="2"
                    placeholder="Enter details on why this credit note was approved..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="cn-input"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cn-btn cn-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cn-btn cn-btn-primary"
                  disabled={grossAmount <= 0 || !formData.customer_name}
                >
                  Issue Credit Note (₹{grossAmount.toFixed(2)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE CREDIT NOTE VOUCHER MODAL */}
      {viewingCreditNote && (
        <div className="modal-overlay" onClick={() => setViewingCreditNote(null)}>
          <div className="modal-content-card cn-voucher-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95vw', padding: '20px' }}>
            <div className="modal-header no-print" style={{ marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                  Credit Note Voucher: {viewingCreditNote.credit_note_number}
                </h2>
                <small style={{ color: '#64748b' }}>Customer: {viewingCreditNote.customer_name} ({viewingCreditNote.customer_code || 'B2B'})</small>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="cn-btn cn-btn-primary"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setViewingCreditNote(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
              <InvoiceTemplateSheet
                activeTemplate="credit_note"
                companySettings={companySettings}
                showFormatBar={false}
                id="printable-credit-note"
                invoice={{
                  credit_note_number: viewingCreditNote.credit_note_number,
                  credit_note_date: viewingCreditNote.credit_note_date,
                  invoice_number: viewingCreditNote.invoice_number,
                  reason: viewingCreditNote.reason,
                  notes: viewingCreditNote.notes,
                  customer_name: viewingCreditNote.customer_name,
                  customer_code: viewingCreditNote.customer_code,
                  customer_phone: viewingCreditNote.customer_phone,
                  customer_gstin: viewingCreditNote.customer_gstin,
                  customer_address: viewingCreditNote.customer_address || viewingCreditNote.customer_place,
                  status: viewingCreditNote.status || 'Approved',
                  grand_total: parseFloat(viewingCreditNote.amount || 0),
                  amount: parseFloat(viewingCreditNote.amount || 0),
                  items: Array.isArray(viewingCreditNote.items) && viewingCreditNote.items.length > 0 
                    ? viewingCreditNote.items 
                    : [{
                        id: 1,
                        product_name: viewingCreditNote.reason || 'Goods Return / Price Adjustment',
                        name: viewingCreditNote.reason || 'Goods Return / Price Adjustment',
                        hsn: '1905',
                        qty: 1,
                        unit: 'Voucher',
                        rate: parseFloat(viewingCreditNote.taxable_amount || viewingCreditNote.amount || 0),
                        taxable_amount: parseFloat(viewingCreditNote.taxable_amount || viewingCreditNote.amount || 0),
                        cgst: parseFloat(viewingCreditNote.cgst_amount || 0),
                        sgst: parseFloat(viewingCreditNote.sgst_amount || 0),
                        total: parseFloat(viewingCreditNote.amount || 0),
                        gst_rate: viewingCreditNote.is_gst_applicable ? (viewingCreditNote.gst_rate || 18) : 0
                      }]
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCreditNotes;
