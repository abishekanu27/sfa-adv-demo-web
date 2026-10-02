import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Printer, 
  Receipt, 
  FileText, 
  Smartphone, 
  Check, 
  CheckCircle2, 
  Image as ImageIcon, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  QrCode, 
  Save, 
  RefreshCw, 
  Sparkles,
  Layers,
  Settings,
  HelpCircle,
  Shield
} from 'lucide-react';
import { fetchCompanySettings, updateCompanySettingsApi } from '../../services/api';
import { InvoiceTemplateSheet } from '../../components/InvoiceTemplateSheet';
import './SettingsPage.css';

export const SettingsPage = ({ initialTab = 'company', onSettingsUpdate }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'company' or 'templates'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Company Profile Form State
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    legal_name: '',
    portal_title: '',
    tagline: '',
    logo_url: '',
    primary_color: '#2563eb',
    secondary_color: '#7c3aed',
    email: '',
    phone: '',
    website: '',
    address: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    state_code: '',
    pincode: '',
    tax_id: '',
    gstin: '',
    pan_number: '',
    currency: 'INR (₹)',
    bank_name: '',
    account_holder: '',
    account_number: '',
    ifsc_code: '',
    bank_branch: '',
    upi_id: '',
    upi_qr_url: '',
    signature_url: '',
    terms_and_conditions: '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond 15 days.\n3. Subject to Bengaluru jurisdiction only.',
    credit_note_terms: '1. Amount credited to customer ledger balance.\n2. Subject to product quality verification.\n3. Subject to local jurisdiction.',
    purchase_order_terms: '1. Mention this PO Number on all Delivery Challans and Invoices.\n2. Materials subject to physical inspection & batch testing at inward gate.\n3. Payment will be released within 30 days of GRN generation.'
  });

  // Invoice Templates Configuration State
  const [invoiceSettings, setInvoiceSettings] = useState({
    active_template: 'gst', // 'gst' | 'normal' | 'mobile' | 'thermal' | 'credit_note' | 'purchase_order' | 'dotmatrix'
    invoice_title: 'TAX INVOICE',
    invoice_prefix: 'INV-2026-',
    show_logo: true,
    show_hsn: true,
    show_gst_breakdown: true,
    show_bank_details: true,
    show_upi_qr: true,
    show_signature: true,
    show_terms: true,
    thermal_width: '80mm', // '80mm' | '58mm'
    dot_matrix_columns: '80', // '80' | '132'
    signature_label: 'Authorized Signatory',
    terms_and_conditions: '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond 15 days.\n3. Subject to Bengaluru jurisdiction only.',
    credit_note_terms: '1. Amount credited to customer ledger balance.\n2. Subject to product quality verification.\n3. Subject to local jurisdiction.',
    purchase_order_terms: '1. Mention this PO Number on all Delivery Challans and Invoices.\n2. Materials subject to physical inspection & batch testing at inward gate.\n3. Payment will be released within 30 days of GRN generation.'
  });

  const [termsSubTab, setTermsSubTab] = useState('invoice'); // 'invoice' | 'credit_note' | 'purchase_order'

  // Sample data for live preview
  const sampleInvoice = {
    invoice_no: `${invoiceSettings.invoice_prefix || 'INV-'}0042`,
    date: '19-Sep-2026',
    due_date: '04-Oct-2026',
    salesman: 'Anand Krishna (Van 04)',
    customer: {
      name: 'Annapoorna Supermarket & Stores',
      contact: '+91 98450 12345',
      address: 'Shop #14, Main Market Road, Indiranagar',
      city: 'Bengaluru, Karnataka - 560038',
      gstin: '29AABCA1234A1Z1',
      state: 'Karnataka',
      state_code: '29'
    },
    items: [
      { id: 1, name: 'Masala Tea Premium 250g', hsn: '0902', qty: 20, unit: 'pkts', rate: 120.00, discount: 5, gst_rate: 5 },
      { id: 2, name: 'Whole Grain Atta 5kg', hsn: '1101', qty: 10, unit: 'bags', rate: 240.00, discount: 0, gst_rate: 0 },
      { id: 3, name: 'Refined Sunflower Oil 1L', hsn: '1512', qty: 15, unit: 'ltrs', rate: 135.00, discount: 2, gst_rate: 5 },
      { id: 4, name: 'Instant Noodles 70g (Pack of 12)', hsn: '1902', qty: 8, unit: 'cartons', rate: 180.00, discount: 10, gst_rate: 12 }
    ]
  };

  // Calculations for live preview
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    sampleInvoice.items.forEach(item => {
      const gross = item.qty * item.rate;
      const discAmt = gross * (item.discount / 100);
      const net = gross - discAmt;
      subtotal += gross;
      totalDiscount += discAmt;
      taxableAmount += net;

      if (invoiceSettings.active_template === 'gst' && item.gst_rate > 0) {
        const gstVal = net * (item.gst_rate / 100);
        totalCgst += gstVal / 2;
        totalSgst += gstVal / 2;
      }
    });

    const grandTotal = taxableAmount + totalCgst + totalSgst;
    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      totalCgst,
      totalSgst,
      grandTotal: Math.round(grandTotal)
    };
  };

  const totals = calculateTotals();

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await fetchCompanySettings();
        if (data) {
          setCompanyForm(prev => ({
            ...prev,
            ...data,
            credit_note_terms: data.credit_note_terms || prev.credit_note_terms,
            purchase_order_terms: data.purchase_order_terms || prev.purchase_order_terms
          }));
          if (data.invoice_settings) {
            setInvoiceSettings(prev => ({
              ...prev,
              ...data.invoice_settings,
              terms_and_conditions: data.invoice_settings.terms_and_conditions || data.terms_and_conditions || prev.terms_and_conditions,
              credit_note_terms: data.invoice_settings.credit_note_terms || data.credit_note_terms || prev.credit_note_terms,
              purchase_order_terms: data.invoice_settings.purchase_order_terms || data.purchase_order_terms || prev.purchase_order_terms
            }));
          }
        }
      } catch (err) {
        showNotification('Error loading settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Update tab if prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Save Settings Handler
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...companyForm,
        invoice_settings: invoiceSettings
      };
      const response = await updateCompanySettingsApi(payload);
      showNotification(response.message || 'Settings saved successfully in PostgreSQL!');
      if (onSettingsUpdate && response.settings) {
        onSettingsUpdate(response.settings);
      }
    } catch (err) {
      showNotification(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Logo file upload handler (converts image to data URL)
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification('Logo image must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCompanyForm(prev => ({
        ...prev,
        logo_url: reader.result
      }));
      showNotification('Logo loaded! Click Save to apply branding.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Trigger print preview for the active template
  const handlePrintPreview = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="settings-loading-state">
        <RefreshCw size={28} className="spin-icon" />
        <p>Loading enterprise settings & templates...</p>
      </div>
    );
  }

  return (
    <div className="settings-page-wrapper">
      {/* Toast Notification */}
      {toast && (
        <div className={`enterprise-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <HelpCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="settings-header-card">
        <div className="settings-header-left">
          <div className="settings-icon-pill">
            <Settings size={22} color="#2563eb" />
          </div>
          <div>
            <h1 className="settings-main-title">Settings & Invoice Templates</h1>
            <p className="settings-sub-title">
              Configure your Company details, Brand Identity (reflected in Login & Navigation), and multi-format Print Templates.
            </p>
          </div>
        </div>

        <div className="settings-header-actions">
          <button 
            type="button" 
            className="btn-settings-save"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? <RefreshCw size={16} className="spin-icon" /> : <Save size={16} />}
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="settings-tabs-bar">
        <button 
          className={`settings-tab-btn ${activeTab === 'company' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          <Building2 size={17} />
          <span>Company Profile & Branding</span>
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'templates' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <Printer size={17} />
          <span>GST & Print Templates Designer</span>
          <span className="tab-pill-badge">5 Layouts</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY PROFILE & BRANDING                                          */}
      {/* ========================================================================= */}
      {activeTab === 'company' && (
        <div className="settings-content-grid">
          {/* Left Column: Comprehensive Form */}
          <form className="settings-form-panel" onSubmit={handleSaveSettings}>
            
            {/* Section 1: Business Identity & Logo */}
            <div className="form-section-card">
              <div className="section-head">
                <Building2 size={18} color="#2563eb" />
                <h3>Business Identity & Logo</h3>
              </div>

              <div className="logo-upload-container">
                <div className="logo-preview-box">
                  {companyForm.logo_url ? (
                    <img 
                      src={companyForm.logo_url} 
                      alt="Company Logo" 
                      className="company-logo-img" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="logo-placeholder">
                      <ImageIcon size={32} color="#94a3b8" />
                      <span>No Logo Uploaded</span>
                    </div>
                  )}
                </div>

                <div className="logo-inputs-wrap">
                  <label className="upload-file-btn">
                    <ImageIcon size={15} />
                    <span>Upload Logo Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  <span className="logo-or-text">or specify Logo Image URL:</span>
                  <input 
                    type="url" 
                    placeholder="https://example.com/logo.png"
                    value={companyForm.logo_url}
                    onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                    className="logo-url-input"
                  />
                  <span className="field-hint">
                    PNG or JPG format recommended. Displayed on Login Page, Navigation Bar, and Invoices.
                  </span>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Company Display Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter company name"
                    value={companyForm.company_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                  />
                  <span className="field-hint">Used in Top Navbar, Sidebar, and Login screen</span>
                </div>

                <div className="form-field">
                  <label>Legal / Registered Trade Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter legal / registered trade name"
                    value={companyForm.legal_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                  />
                  <span className="field-hint">Official name printed on Tax Invoices</span>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Portal Title</label>
                  <input 
                    type="text" 
                    placeholder="Enter portal title"
                    value={companyForm.portal_title}
                    onChange={(e) => setCompanyForm({ ...companyForm, portal_title: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Tagline / Punchline</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Premium Distribution & Field Van Logistics Network"
                    value={companyForm.tagline}
                    onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Statutory GST & Tax Registration */}
            <div className="form-section-card">
              <div className="section-head">
                <Shield size={18} color="#0891b2" />
                <h3>GSTIN & Statutory Tax Information</h3>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>GSTIN Number *</label>
                  <input 
                    type="text" 
                    placeholder="29ABCDE1234F1Z5"
                    value={companyForm.gstin}
                    onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                    className="mono-field"
                  />
                  <span className="field-hint">15-digit alphanumeric Goods & Services Tax ID</span>
                </div>

                <div className="form-field">
                  <label>PAN Number</label>
                  <input 
                    type="text" 
                    placeholder="ABCDE1234F"
                    value={companyForm.pan_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, pan_number: e.target.value.toUpperCase() })}
                    className="mono-field"
                  />
                </div>

                <div className="form-field">
                  <label>State & State Code *</label>
                  <div className="input-split-2">
                    <input 
                      type="text" 
                      placeholder="State (e.g. Karnataka)"
                      value={companyForm.state}
                      onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                    />
                    <input 
                      type="text" 
                      placeholder="Code (29)"
                      value={companyForm.state_code}
                      onChange={(e) => setCompanyForm({ ...companyForm, state_code: e.target.value })}
                      style={{ width: '80px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Contact & Address */}
            <div className="form-section-card">
              <div className="section-head">
                <MapPin size={18} color="#16a34a" />
                <h3>Registered Office & Contact Details</h3>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Address Line 1</label>
                  <input 
                    type="text" 
                    placeholder="Plot No. / Building / Street Address"
                    value={companyForm.address_line1}
                    onChange={(e) => setCompanyForm({ ...companyForm, address_line1: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Address Line 2</label>
                  <input 
                    type="text" 
                    placeholder="Area / Locality / Landmark"
                    value={companyForm.address_line2}
                    onChange={(e) => setCompanyForm({ ...companyForm, address_line2: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>City</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bengaluru"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Pincode / Postal Code</label>
                  <input 
                    type="text" 
                    placeholder="560068"
                    value={companyForm.pincode}
                    onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Currency Symbol</label>
                  <select
                    value={companyForm.currency}
                    onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                  >
                    <option value="INR (₹)">Indian Rupee - INR (₹)</option>
                    <option value="USD ($)">US Dollar - USD ($)</option>
                    <option value="EUR (€)">Euro - EUR (€)</option>
                    <option value="GBP (£)">British Pound - GBP (£)</option>
                    <option value="AED (د.إ)">UAE Dirham - AED (د.إ)</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+91 98765 43210"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Billing Email</label>
                  <input 
                    type="email" 
                    placeholder="billing@company.com"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Official Website</label>
                  <input 
                    type="text" 
                    placeholder="www.company.com"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Bank Account & Payment Details */}
            <div className="form-section-card">
              <div className="section-head">
                <CreditCard size={18} color="#7c3aed" />
                <h3>Banking & Payment Collection Details</h3>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>Bank Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. HDFC Bank Ltd"
                    value={companyForm.bank_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, bank_name: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Account Holder Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter account holder name"
                    value={companyForm.account_holder}
                    onChange={(e) => setCompanyForm({ ...companyForm, account_holder: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Account Number</label>
                  <input 
                    type="text" 
                    placeholder="50200049281029"
                    value={companyForm.account_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, account_number: e.target.value })}
                    className="mono-field"
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>IFSC Code</label>
                  <input 
                    type="text" 
                    placeholder="HDFC0001234"
                    value={companyForm.ifsc_code}
                    onChange={(e) => setCompanyForm({ ...companyForm, ifsc_code: e.target.value.toUpperCase() })}
                    className="mono-field"
                  />
                </div>

                <div className="form-field">
                  <label>Branch Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Koramangala Branch, Bengaluru"
                    value={companyForm.bank_branch}
                    onChange={(e) => setCompanyForm({ ...companyForm, bank_branch: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>UPI ID (For Instant QR Code)</label>
                  <input 
                    type="text" 
                    placeholder="company@hdfcbank"
                    value={companyForm.upi_id}
                    onChange={(e) => setCompanyForm({ ...companyForm, upi_id: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Terms & Conditions */}
            <div className="form-section-card">
              <div className="section-head">
                <FileText size={18} color="#d97706" />
                <h3>Default Terms & Conditions / Signatory</h3>
              </div>

              <div className="form-field">
                <label>Terms & Conditions (Printed on invoices)</label>
                <textarea 
                  rows="3"
                  value={companyForm.terms_and_conditions}
                  onChange={(e) => setCompanyForm({ ...companyForm, terms_and_conditions: e.target.value })}
                  placeholder="Enter invoice terms and payment rules..."
                />
              </div>
            </div>

            <div className="form-submit-row">
              <button 
                type="submit" 
                className="btn-settings-save large-save-btn"
                disabled={saving}
              >
                {saving ? <RefreshCw size={17} className="spin-icon" /> : <CheckCircle2 size={17} />}
                <span>{saving ? 'Saving...' : 'Save & Update All Company Details'}</span>
              </button>
            </div>
          </form>

          {/* Right Column: Live Dynamic Branding Preview Card */}
          <div className="branding-preview-sidebar">
            <div className="preview-sticky-card">
              <div className="preview-card-head">
                <Sparkles size={18} color="#2563eb" />
                <h4>Live Dynamic Branding Display</h4>
              </div>
              <p className="preview-card-desc">
                Here is how your company identity dynamically renders across the entire system:
              </p>

              {/* Preview 1: Top Navigation Bar Header */}
              <div className="preview-mock-block">
                <span className="mock-title">1. Top Navigation Bar Display:</span>
                <div className="mock-nav-bar">
                  <div className="mock-nav-brand">
                    {companyForm.logo_url ? (
                      <img src={companyForm.logo_url} alt="Logo" className="mock-brand-img" />
                    ) : (
                      <div className="mock-brand-badge">
                        <Building2 size={15} color="#2563eb" />
                      </div>
                    )}
                    <span className="mock-nav-name">{companyForm.company_name || ''}</span>
                  </div>
                  <div className="mock-nav-right-icons">
                    <div className="mock-dot"></div>
                    <div className="mock-dot"></div>
                    <div className="mock-avatar">A</div>
                  </div>
                </div>
              </div>

              {/* Preview 2: Sidebar Brand Header */}
              <div className="preview-mock-block">
                <span className="mock-title">2. Sidebar Brand Header:</span>
                <div className="mock-sidebar-brand">
                  {companyForm.logo_url ? (
                    <img src={companyForm.logo_url} alt="Logo" className="mock-side-logo" />
                  ) : (
                    <div className="mock-side-badge">
                      <Building2 size={16} color="#ffffff" />
                    </div>
                  )}
                  <div className="mock-side-text">
                    <span className="mock-side-name">{companyForm.company_name || ''}</span>
                    <span className="mock-side-tag">ERP SUITE</span>
                  </div>
                </div>
              </div>

              {/* Preview 3: Login Page Brand Header */}
              <div className="preview-mock-block">
                <span className="mock-title">3. Login Page Branding:</span>
                <div className="mock-login-brand">
                  {companyForm.logo_url && (
                    <img src={companyForm.logo_url} alt="Logo" className="mock-login-logo" />
                  )}
                  <span className="mock-login-name">{companyForm.company_name || ''}</span>
                  <span className="mock-login-tagline">{companyForm.tagline || ''}</span>
                </div>
              </div>

              {/* Preview 4: Statutory GST Summary Card */}
              <div className="preview-mock-block">
                <span className="mock-title">4. Statutory Clearance Summary:</span>
                <div className="mock-gst-summary">
                  {companyForm.gstin?.trim() ? (
                    <div className="gst-stat-row">
                      <span>GSTIN:</span>
                      <strong>{companyForm.gstin.trim()}</strong>
                    </div>
                  ) : null}
                  {(companyForm.state?.trim() || companyForm.state_code?.trim()) ? (
                    <div className="gst-stat-row">
                      <span>State:</span>
                      <span>
                        {companyForm.state?.trim() || ''}
                        {companyForm.state_code?.trim() ? ` (Code: ${companyForm.state_code.trim()})` : ''}
                      </span>
                    </div>
                  ) : null}
                  {companyForm.bank_name?.trim() ? (
                    <div className="gst-stat-row">
                      <span>Bank:</span>
                      <span>{companyForm.bank_name.trim()}{companyForm.account_number?.trim() ? ` • ...${companyForm.account_number.trim().slice(-4)}` : ''}</span>
                    </div>
                  ) : null}
                  {!companyForm.gstin?.trim() && !companyForm.state?.trim() && !companyForm.state_code?.trim() && !companyForm.bank_name?.trim() && (
                    <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', padding: '6px 0' }}>
                      No GSTIN, state code, or bank details configured yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="branding-live-advisory">
                <CheckCircle2 size={16} color="#16a34a" />
                <span>All updates sync live to PostgreSQL and update throughout the app on save.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INVOICE & PRINT TEMPLATES DESIGNER                                  */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="templates-designer-container">
          
          {/* Controls Bar: Template Switcher & Config Toggles */}
          <div className="templates-controls-panel">
            <div className="templates-switch-row">
              <span className="control-label">Select Active Print Format:</span>
              <div className="template-format-pills">
                <button
                  type="button"
                  className={`format-pill-btn ${invoiceSettings.active_template === 'gst' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setInvoiceSettings({ ...invoiceSettings, active_template: 'gst', invoice_title: 'TAX INVOICE' });
                    setTermsSubTab('invoice');
                  }}
                >
                  <Receipt size={15} />
                  <span>GST Tax Invoice (A4)</span>
                </button>

                <button
                  type="button"
                  className={`format-pill-btn ${invoiceSettings.active_template === 'normal' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setInvoiceSettings({ ...invoiceSettings, active_template: 'normal', invoice_title: 'BILL OF SUPPLY / INVOICE' });
                    setTermsSubTab('invoice');
                  }}
                >
                  <FileText size={15} />
                  <span>Normal Invoice (Non-GST)</span>
                </button>

                <button
                  type="button"
                  className={`format-pill-btn ${invoiceSettings.active_template === 'mobile' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setInvoiceSettings({ ...invoiceSettings, active_template: 'mobile', invoice_title: 'MOBILE SPOT INVOICE' });
                    setTermsSubTab('invoice');
                  }}
                >
                  <Smartphone size={15} />
                  <span>Mobile Field Invoice</span>
                </button>

                <button
                  type="button"
                  className={`format-pill-btn ${invoiceSettings.active_template === 'thermal' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setInvoiceSettings({ ...invoiceSettings, active_template: 'thermal', invoice_title: 'CASH MEMO' });
                    setTermsSubTab('invoice');
                  }}
                >
                  <Printer size={15} />
                  <span>Thermal POS Receipt</span>
                </button>

                <button
                  type="button"
                  className={`format-pill-btn ${invoiceSettings.active_template === 'credit_note' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setInvoiceSettings({ ...invoiceSettings, active_template: 'credit_note', invoice_title: 'GST CREDIT NOTE' });
                    setTermsSubTab('credit_note');
                  }}
                >
                  <Receipt size={15} />
                  <span>Credit Note Template</span>
                </button>

                <button
                  type="button"
                  className={`format-pill-btn ${invoiceSettings.active_template === 'purchase_order' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setInvoiceSettings({ ...invoiceSettings, active_template: 'purchase_order', invoice_title: 'PURCHASE ORDER' });
                    setTermsSubTab('purchase_order');
                  }}
                >
                  <FileText size={15} />
                  <span>Purchase Order Template</span>
                </button>

                <button
                  type="button"
                  className={`format-pill-btn ${invoiceSettings.active_template === 'dotmatrix' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setInvoiceSettings({ ...invoiceSettings, active_template: 'dotmatrix', invoice_title: 'DELIVERY INVOICE' });
                    setTermsSubTab('invoice');
                  }}
                >
                  <Layers size={15} />
                  <span>Dot Matrix Continuous</span>
                </button>
              </div>
            </div>

            {/* Customization Checkboxes & Configuration Settings */}
            <div className="template-options-grid">
              <div className="opt-group">
                <label className="opt-checkbox">
                  <input 
                    type="checkbox"
                    checked={invoiceSettings.show_logo}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_logo: e.target.checked })}
                  />
                  <span>Show Company Logo</span>
                </label>
                <label className="opt-checkbox">
                  <input 
                    type="checkbox"
                    checked={invoiceSettings.show_hsn}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_hsn: e.target.checked })}
                  />
                  <span>Show HSN/SAC Code Column</span>
                </label>
                <label className="opt-checkbox">
                  <input 
                    type="checkbox"
                    checked={invoiceSettings.show_gst_breakdown}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_gst_breakdown: e.target.checked })}
                  />
                  <span>Show CGST / SGST Breakdown</span>
                </label>
              </div>

              <div className="opt-group">
                <label className="opt-checkbox">
                  <input 
                    type="checkbox"
                    checked={invoiceSettings.show_bank_details}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_bank_details: e.target.checked })}
                  />
                  <span>Show Bank Account & IFSC</span>
                </label>
                <label className="opt-checkbox">
                  <input 
                    type="checkbox"
                    checked={invoiceSettings.show_upi_qr}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_upi_qr: e.target.checked })}
                  />
                  <span>Show Instant UPI Payment QR</span>
                </label>
                <label className="opt-checkbox">
                  <input 
                    type="checkbox"
                    checked={invoiceSettings.show_signature}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_signature: e.target.checked })}
                  />
                  <span>Show Authorized Signatory Box</span>
                </label>
              </div>

              <div className="opt-group opt-inputs-group">
                <div className="mini-field">
                  <label>Document Title</label>
                  <input 
                    type="text" 
                    value={invoiceSettings.invoice_title}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_title: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="mini-field">
                  <label>Invoice Prefix</label>
                  <input 
                    type="text" 
                    value={invoiceSettings.invoice_prefix}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_prefix: e.target.value })}
                  />
                </div>

                {invoiceSettings.active_template === 'thermal' && (
                  <div className="mini-field">
                    <label>Thermal Roll Width</label>
                    <select
                      value={invoiceSettings.thermal_width}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, thermal_width: e.target.value })}
                    >
                      <option value="80mm">80mm Standard POS</option>
                      <option value="58mm">58mm Mobile Bluetooth</option>
                    </select>
                  </div>
                )}

                {invoiceSettings.active_template === 'dotmatrix' && (
                  <div className="mini-field">
                    <label>Stationery Columns</label>
                    <select
                      value={invoiceSettings.dot_matrix_columns}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, dot_matrix_columns: e.target.value })}
                    >
                      <option value="80">80 Column Standard</option>
                      <option value="132">132 Column Wide</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Document Terms & Conditions Editor Card */}
            <div className="template-terms-editor-card">
              <div className="terms-editor-header">
                <div className="terms-header-left">
                  <FileText size={16} color="#2563eb" />
                  <h4>Document Terms &amp; Conditions Editor</h4>
                </div>
                <div className="terms-type-pills">
                  <button
                    type="button"
                    className={`terms-subpill ${termsSubTab === 'invoice' ? 'subpill-active' : ''}`}
                    onClick={() => setTermsSubTab('invoice')}
                  >
                    <span>Standard Invoices</span>
                  </button>
                  <button
                    type="button"
                    className={`terms-subpill ${termsSubTab === 'credit_note' ? 'subpill-active' : ''}`}
                    onClick={() => setTermsSubTab('credit_note')}
                  >
                    <span>Credit Note</span>
                  </button>
                  <button
                    type="button"
                    className={`terms-subpill ${termsSubTab === 'purchase_order' ? 'subpill-active' : ''}`}
                    onClick={() => setTermsSubTab('purchase_order')}
                  >
                    <span>Purchase Order</span>
                  </button>
                </div>
              </div>

              <div className="terms-textarea-wrap">
                {termsSubTab === 'invoice' && (
                  <>
                    <label className="terms-field-label">
                      <span>Standard Invoices Terms &amp; Conditions (Printed on GST, Normal, Mobile &amp; Thermal Invoices):</span>
                    </label>
                    <textarea
                      rows={4}
                      className="terms-editor-textarea"
                      placeholder="1. Goods once sold will not be taken back or exchanged.&#10;2. Interest @ 18% p.a. will be charged if payment is delayed beyond 15 days.&#10;3. Subject to local jurisdiction."
                      value={invoiceSettings.terms_and_conditions !== undefined ? invoiceSettings.terms_and_conditions : (companyForm.terms_and_conditions || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompanyForm(prev => ({ ...prev, terms_and_conditions: val }));
                        setInvoiceSettings(prev => ({ ...prev, terms_and_conditions: val }));
                      }}
                    />
                  </>
                )}

                {termsSubTab === 'credit_note' && (
                  <>
                    <label className="terms-field-label">
                      <span>GST Credit Note Terms &amp; Conditions (Printed on Credit Notes &amp; Sales Return Vouchers):</span>
                    </label>
                    <textarea
                      rows={4}
                      className="terms-editor-textarea"
                      placeholder="1. Amount credited to customer ledger balance.&#10;2. Subject to product quality verification.&#10;3. Subject to local jurisdiction."
                      value={invoiceSettings.credit_note_terms !== undefined ? invoiceSettings.credit_note_terms : (companyForm.credit_note_terms || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompanyForm(prev => ({ ...prev, credit_note_terms: val }));
                        setInvoiceSettings(prev => ({ ...prev, credit_note_terms: val }));
                      }}
                    />
                  </>
                )}

                {termsSubTab === 'purchase_order' && (
                  <>
                    <label className="terms-field-label">
                      <span>Purchase Order Terms &amp; Conditions (Printed on PO &amp; Supplier Inward Gate Documents):</span>
                    </label>
                    <textarea
                      rows={4}
                      className="terms-editor-textarea"
                      placeholder="1. Mention this PO Number on all Delivery Challans and Invoices.&#10;2. Materials subject to physical inspection &amp; batch testing at inward gate.&#10;3. Payment will be released within 30 days of GRN generation."
                      value={invoiceSettings.purchase_order_terms !== undefined ? invoiceSettings.purchase_order_terms : (companyForm.purchase_order_terms || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompanyForm(prev => ({ ...prev, purchase_order_terms: val }));
                        setInvoiceSettings(prev => ({ ...prev, purchase_order_terms: val }));
                      }}
                    />
                  </>
                )}
                <div className="terms-help-row">
                  <small>💡 Note: Each new line entered here appears formatted as a clear condition in the printed document preview.</small>
                </div>
              </div>
            </div>

            {/* Print & Save Actions */}
            <div className="template-actions-strip">
              <div className="active-template-badge">
                <span>Active Template:</span>
                <strong>
                  {invoiceSettings.active_template === 'gst' && 'GST Tax Invoice (A4 Standard)'}
                  {invoiceSettings.active_template === 'normal' && 'Normal Commercial Invoice (Non-GST)'}
                  {invoiceSettings.active_template === 'mobile' && 'Mobile Field Sales Invoice'}
                  {invoiceSettings.active_template === 'thermal' && `Thermal POS Receipt (${invoiceSettings.thermal_width})`}
                  {invoiceSettings.active_template === 'credit_note' && 'GST Credit Note Voucher'}
                  {invoiceSettings.active_template === 'purchase_order' && 'Purchase Order Document'}
                  {invoiceSettings.active_template === 'dotmatrix' && `Dot Matrix Continuous (${invoiceSettings.dot_matrix_columns} Col)`}
                </strong>
              </div>

              <div className="strip-buttons">
                <button 
                  type="button" 
                  className="btn-print-preview"
                  onClick={handlePrintPreview}
                >
                  <Printer size={16} />
                  <span>Print Template Preview</span>
                </button>

                <button 
                  type="button" 
                  className="btn-settings-save"
                  onClick={handleSaveSettings}
                  disabled={saving}
                >
                  <Save size={16} />
                  <span>Save Template Defaults</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LIVE TEMPLATE PREVIEWS (Tailored styling based on active template)        */}
          {/* ========================================================================= */}
          <div className="live-preview-viewport">
            <InvoiceTemplateSheet
              companySettings={companyForm}
              invoiceSettings={invoiceSettings}
              activeTemplate={invoiceSettings.active_template}
              showFormatBar={false}
              id="printable-invoice"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
